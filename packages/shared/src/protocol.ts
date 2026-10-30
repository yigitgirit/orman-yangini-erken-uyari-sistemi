// PyrosFrame: 10 baytlık ikili çerçeve (GENEL_PLAN §2)
//
// | Bayt | Alan                     | Kodlama                                   |
// |------|--------------------------|-------------------------------------------|
// | 0    | nodeId                   | uint8                                     |
// | 1-2  | temperature              | uint16 BE, °C x 10 (virgülsüz)            |
// | 3    | humidity                 | uint8, %                                  |
// | 4    | co                       | uint8, ppm (0-255)                        |
// | 5    | aqi                      | uint8, Hava Kalitesi İndeksi              |
// | 6    | windSpeed                | uint8, m/s x 4 (0-63.75 m/s)              |
// | 7    | windDirection            | uint8, derece / 2 (0-358°)                |
// | 8    | battery & flags          | üst 4 bit: batarya/10 (0-10), alt 4 bit: bayraklar |
// | 9    | crc8                     | CRC-8 (poly 0x07), bayt 0-8 üzerinden     |
//
// TODO: Yangında salınan ek gazlar (CO2, VOC, PM2.5, NOx...) eklenecekse çerçeve
//       genişletilmeli (ör. FRAME_SIZE artırılıp sürüm alanı eklenerek ya da TLV yapısıyla).

export const FRAME_SIZE = 10;

/** Bayt ofsetleri */
export const OFFSET = {
  nodeId: 0,
  temperature: 1,
  humidity: 3,
  co: 4,
  aqi: 5,
  windSpeed: 6,
  windDirection: 7,
  batteryFlags: 8,
  crc: 9,
} as const;

/** Bayt 8 alt 4 bit durum bayrakları (enum yerine `as const`) */
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
  temperature: number; // °C
  humidity: number; // %
  co: number; // ppm
  aqi: number;
  windSpeed: number; // m/s
  windDirection: number; // derece
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

/** PyrosFrame -> 10 bayt (şablon uygulama) */
export function packFrame(f: PyrosFrame): Buffer {
  const buf = Buffer.alloc(FRAME_SIZE);
  buf.writeUInt8(clamp(f.nodeId, 0, 255), OFFSET.nodeId);
  buf.writeUInt16BE(clamp(f.temperature * 10, 0, 0xffff), OFFSET.temperature);
  buf.writeUInt8(clamp(f.humidity, 0, 100), OFFSET.humidity);
  buf.writeUInt8(clamp(f.co, 0, 255), OFFSET.co);
  buf.writeUInt8(clamp(f.aqi, 0, 255), OFFSET.aqi);
  buf.writeUInt8(clamp(f.windSpeed * 4, 0, 255), OFFSET.windSpeed);
  buf.writeUInt8(clamp((f.windDirection % 360) / 2, 0, 179), OFFSET.windDirection);
  const batteryNibble = clamp(f.battery / 10, 0, 10);
  buf.writeUInt8((batteryNibble << 4) | (f.flags & 0x0f), OFFSET.batteryFlags);
  buf.writeUInt8(crc8(buf.subarray(0, OFFSET.crc)), OFFSET.crc);
  return buf;
}

/** 10 bayt -> PyrosFrame (uzunluk + CRC doğrulamalı, şablon uygulama) */
export function unpackFrame(buf: Buffer): PyrosFrame {
  if (buf.length !== FRAME_SIZE) {
    throw new Error(`PyrosFrame: beklenen ${FRAME_SIZE} bayt, gelen ${buf.length}`);
  }
  const expected = crc8(buf.subarray(0, OFFSET.crc));
  if (expected !== buf.readUInt8(OFFSET.crc)) {
    throw new Error("PyrosFrame: CRC8 dogrulamasi basarisiz");
  }
  const bf = buf.readUInt8(OFFSET.batteryFlags);
  return {
    nodeId: buf.readUInt8(OFFSET.nodeId),
    temperature: buf.readUInt16BE(OFFSET.temperature) / 10,
    humidity: buf.readUInt8(OFFSET.humidity),
    co: buf.readUInt8(OFFSET.co),
    aqi: buf.readUInt8(OFFSET.aqi),
    windSpeed: buf.readUInt8(OFFSET.windSpeed) / 4,
    windDirection: buf.readUInt8(OFFSET.windDirection) * 2,
    battery: (bf >> 4) * 10,
    flags: bf & 0x0f,
  };
}
