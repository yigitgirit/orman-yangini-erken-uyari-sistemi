// PyrosFrame v2 kodlayici (packages/shared/src/protocol.ts ile bayt bayt ayni)
// Agda tek basina gonderilmez: pyros_secure.h ilk 15 baytini sifreleyip v3 olarak muhurler.
//
// | Bayt  | Alan          | Kodlama                                                   |
// |-------|---------------|-----------------------------------------------------------|
// | 0     | baslik        | bit7-5: surum (2), bit4: mod (0 normal/1 alarm), bit3-0: bayraklar |
// | 1     | nodeId        | uint8                                                     |
// | 2-3   | temperature   | int16 BE, °C x 10                                         |
// | 4     | humidity      | uint8, %                                                  |
// | 5-6   | co            | uint16 BE, ppm x 10                                       |
// | 7-8   | co2           | uint16 BE, ppm                                            |
// | 9     | vocIndex      | uint8, indeks / 2                                         |
// | 10-11 | pm25          | uint16 BE, µg/m³; 0xFFFF = olculmedi                      |
// | 12    | windSpeed     | uint8, m/s x 4; 0xFF = anemometre yok                     |
// | 13    | windDirection | uint8, derece / 2; 0xFF = anemometre yok                  |
// | 14    | battery       | uint8, %                                                  |
// | 15    | crc8          | CRC-8 (poly 0x07), bayt 0-14 uzerinden                    |
#pragma once

#include <math.h>
#include <stddef.h>
#include <stdint.h>

namespace pyros {

constexpr size_t FRAME_SIZE = 16;
constexpr uint8_t FRAME_VERSION = 2;
constexpr uint16_t NO_PM25 = 0xFFFF;
constexpr uint8_t NO_WIND = 0xFF;

enum Mode : uint8_t { MODE_NORMAL = 0, MODE_ALERT = 1 };

enum Flag : uint8_t {
  FLAG_NONE = 0b0000,
  FLAG_LOW_BATTERY = 0b0001,
  FLAG_SENSOR_FAULT = 0b0010,
  FLAG_TAMPER = 0b0100,
};

struct Frame {
  uint8_t nodeId;
  Mode mode;
  float temperature;    // °C
  float humidity;       // %
  float co;             // ppm
  float co2;            // ppm
  float vocIndex;       // 0-500
  float pm25;           // µg/m³, NAN = olculmedi
  float windSpeed;      // m/s, NAN = anemometre yok
  float windDirection;  // derece, NAN = anemometre yok
  float battery;        // %
  uint8_t flags;        // Flag bit maskesi
};

// CRC-8 (poly 0x07, init 0x00)
inline uint8_t crc8(const uint8_t* data, size_t len) {
  uint8_t crc = 0;
  for (size_t i = 0; i < len; i++) {
    crc ^= data[i];
    for (int b = 0; b < 8; b++) crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x07) : (uint8_t)(crc << 1);
  }
  return crc;
}

inline long clampRound(float v, long lo, long hi) {
  long r = lroundf(v);
  return r < lo ? lo : (r > hi ? hi : r);
}

inline void put16(uint8_t* buf, size_t offset, uint16_t v) {
  buf[offset] = (uint8_t)(v >> 8);
  buf[offset + 1] = (uint8_t)(v & 0xFF);
}

inline void pack(const Frame& f, uint8_t out[FRAME_SIZE]) {
  out[0] = (uint8_t)((FRAME_VERSION << 5) | ((f.mode & 0x01) << 4) | (f.flags & 0x0F));
  out[1] = f.nodeId;
  put16(out, 2, (uint16_t)(int16_t)clampRound(f.temperature * 10, -32768, 32767));
  out[4] = (uint8_t)clampRound(f.humidity, 0, 100);
  put16(out, 5, (uint16_t)clampRound(f.co * 10, 0, 0xFFFF));
  put16(out, 7, (uint16_t)clampRound(f.co2, 0, 0xFFFF));
  out[9] = (uint8_t)clampRound(f.vocIndex / 2, 0, 255);
  put16(out, 10, isnan(f.pm25) ? NO_PM25 : (uint16_t)clampRound(f.pm25, 0, NO_PM25 - 1));
  out[12] = isnan(f.windSpeed) ? NO_WIND : (uint8_t)clampRound(f.windSpeed * 4, 0, 254);
  out[13] = isnan(f.windDirection) ? NO_WIND
                                   : (uint8_t)clampRound(fmodf(f.windDirection, 360) / 2, 0, 179);
  out[14] = (uint8_t)clampRound(f.battery, 0, 100);
  out[15] = crc8(out, FRAME_SIZE - 1);
}

}  // namespace pyros
