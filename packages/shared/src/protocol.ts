// PyrosFrame v2: 16 baytlık ikili çerçeve (LoRa yük sınırına uygun)
// Ağda tek başına gönderilmez: secure.ts ilk 15 baytını AES-128-CCM ile şifreleyip v3 olarak mühürler.
//
// | Bayt  | Alan          | Kodlama                                                   |
// |-------|---------------|-----------------------------------------------------------|
// | 0     | başlık        | bit7-5: sürüm (2), bit4: mod (0 normal/1 alarm), bit3-0: bayraklar |
// | 1     | nodeId        | uint8                                                     |
// | 2-3   | temperature   | int16 BE, °C x 10 (eksi dereceler dahil)                  |
// | 4     | humidity      | uint8, %                                                  |
// | 5-6   | co            | uint16 BE, ppm x 10 (0-6553.5 ppm) - elektrokimyasal      |
// | 7-8   | co2           | uint16 BE, ppm - NDIR                                     |
// | 9     | vocIndex      | uint8, indeks / 2 (0-510) - BME688 (H2 + VOC)             |
// | 10-11 | pm25          | uint16 BE, µg/m³; 0xFFFF = ölçülmedi (sensör uykuda)      |
// | 12    | windSpeed     | uint8, m/s x 4 (0-63.5); 0xFF = anemometre yok           |
// | 13    | windDirection | uint8, derece / 2 (0-358°); 0xFF = anemometre yok        |
// | 14    | battery       | uint8, % (0-100)                                          |
// | 15    | crc8          | CRC-8 (poly 0x07), bayt 0-14 üzerinden                    |

export const FRAME_SIZE = 16;
export const FRAME_VERSION = 2;

/** "Ölçülmedi / sensör yok" işaretleri */
export const NO_PM25 = 0xffff;
export const NO_WIND = 0xff;

/** Bayt ofsetleri */
export const OFFSET = {
  header: 0,
  nodeId: 1,
  temperature: 2,
  humidity: 4,
  co: 5,
  co2: 7,
  vocIndex: 9,
  pm25: 10,
  windSpeed: 12,
  windDirection: 13,
  battery: 14,
  crc: 15,
} as const;

/** Düğüm çalışma modu (hiyerarşik ölçüm, enum yerine `as const`) */
export const NodeMode = {
  Normal: 0, // Seyrek gönderim, PM2.5 kapalı
  Alert: 1, // Sık gönderim, tüm sensörler açık
} as const;
export type NodeMode = (typeof NodeMode)[keyof typeof NodeMode];

/** Başlık baytı alt 4 bit durum bayrakları */
export const StatusFlag = {
  None: 0b0000,
  LowBattery: 0b0001,
  SensorFault: 0b0010,
  Tamper: 0b0100,
  Reserved: 0b1000,
} as const;
export type StatusFlag = (typeof StatusFlag)[keyof typeof StatusFlag];

/** Çözülmüş (insan okunur) PyrosFrame */
export interface PyrosFrame {
  nodeId: number;
  mode: NodeMode;
  temperature: number; // °C
  humidity: number; // %
  co: number; // ppm
  co2: number; // ppm
  vocIndex: number; // 0-500, ~100 = taban
  pm25: number | null; // µg/m³, null = ölçülmedi
  windSpeed: number | null; // m/s, null = anemometre yok
  windDirection: number | null; // derece (rüzgârın geldiği yön)
  battery: number; // %
  flags: number; // StatusFlag bit maskesi
}

/** CRC-8 (poly 0x07, init 0x00) */
export function crc8(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

/** PyrosFrame -> 16 bayt */
export function packFrame(f: PyrosFrame): Buffer {
  const buf = Buffer.alloc(FRAME_SIZE);
  const header = (FRAME_VERSION << 5) | ((f.mode & 0x01) << 4) | (f.flags & 0x0f);
  buf.writeUInt8(header, OFFSET.header);
  buf.writeUInt8(clamp(f.nodeId, 0, 255), OFFSET.nodeId);
  buf.writeInt16BE(clamp(f.temperature * 10, -32768, 32767), OFFSET.temperature);
  buf.writeUInt8(clamp(f.humidity, 0, 100), OFFSET.humidity);
  buf.writeUInt16BE(clamp(f.co * 10, 0, 0xffff), OFFSET.co);
  buf.writeUInt16BE(clamp(f.co2, 0, 0xffff), OFFSET.co2);
  buf.writeUInt8(clamp(f.vocIndex / 2, 0, 255), OFFSET.vocIndex);
  buf.writeUInt16BE(f.pm25 === null ? NO_PM25 : clamp(f.pm25, 0, NO_PM25 - 1), OFFSET.pm25);
  buf.writeUInt8(f.windSpeed === null ? NO_WIND : clamp(f.windSpeed * 4, 0, 254), OFFSET.windSpeed);
  buf.writeUInt8(
    f.windDirection === null ? NO_WIND : clamp((f.windDirection % 360) / 2, 0, 179),
    OFFSET.windDirection,
  );
  buf.writeUInt8(clamp(f.battery, 0, 100), OFFSET.battery);
  buf.writeUInt8(crc8(buf.subarray(0, OFFSET.crc)), OFFSET.crc);
  return buf;
}

/** 16 bayt -> PyrosFrame (uzunluk + sürüm + CRC doğrulamalı) */
export function unpackFrame(buf: Buffer): PyrosFrame {
  if (buf.length !== FRAME_SIZE) {
    throw new Error(`PyrosFrame: beklenen ${FRAME_SIZE} bayt, gelen ${buf.length}`);
  }
  const expected = crc8(buf.subarray(0, OFFSET.crc));
  if (expected !== buf.readUInt8(OFFSET.crc)) {
    throw new Error("PyrosFrame: CRC8 dogrulamasi basarisiz");
  }
  const header = buf.readUInt8(OFFSET.header);
  const version = header >> 5;
  if (version !== FRAME_VERSION) {
    throw new Error(`PyrosFrame: desteklenmeyen surum ${version}`);
  }
  const pm25 = buf.readUInt16BE(OFFSET.pm25);
  const windSpeed = buf.readUInt8(OFFSET.windSpeed);
  const windDirection = buf.readUInt8(OFFSET.windDirection);
  return {
    nodeId: buf.readUInt8(OFFSET.nodeId),
    mode: ((header >> 4) & 0x01) as NodeMode,
    temperature: buf.readInt16BE(OFFSET.temperature) / 10,
    humidity: buf.readUInt8(OFFSET.humidity),
    co: buf.readUInt16BE(OFFSET.co) / 10,
    co2: buf.readUInt16BE(OFFSET.co2),
    vocIndex: buf.readUInt8(OFFSET.vocIndex) * 2,
    pm25: pm25 === NO_PM25 ? null : pm25,
    windSpeed: windSpeed === NO_WIND ? null : windSpeed / 4,
    windDirection: windDirection === NO_WIND ? null : windDirection * 2,
    battery: buf.readUInt8(OFFSET.battery),
    flags: header & 0x0f,
  };
}
