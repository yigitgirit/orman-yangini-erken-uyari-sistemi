#pragma once

// ---- Ag ayarlari ----
#ifdef WOKWI
// Wokwi'nin sanal WiFi'si; host.wokwi.internal bilgisayardaki gateway'e gider
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define GATEWAY_HOST "host.wokwi.internal"
#else
// Gercek kart: WiFi bilgileri ve gateway'in calistigi bilgisayarin IP'si secrets.h'de
// (secrets.example.h'yi secrets.h olarak kopyalayip doldurun; git'e girmez)
#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "include/secrets.h yok: include/secrets.example.h dosyasini kopyalayip doldurun"
#endif
#endif

#define GATEWAY_UDP_PORT 5005  // apps/gateway (UDP_PORT)
#define NODE_ID 50             // packages/shared/src/nodes.ts: "ESP32 (Wokwi)"

// ---- Sensor pinleri (hepsi ADC1: WiFi acikken ADC2 okunamaz) ----
#define DHT_PIN 15       // DHT22: sicaklik + nem (gercek tasarimda SHT4x)
#define DHT_TYPE DHT22
#define CO_PIN 34        // Gaz sensoru AOUT -> CO (gercek tasarimda elektrokimyasal CO)
#define VOC_PIN 32       // Potansiyometre -> VOC indeksi (gercek tasarimda BME688)
#define CO2_PIN 33       // Potansiyometre -> CO2 (gercek tasarimda SCD41 NDIR)
#define PM25_PIN 36      // Potansiyometre -> PM2.5 (gercek tasarimda SPS30, yalnizca alarmda)
#define BATTERY_PIN 35   // Potansiyometre (Wokwi) / pil gerilim bolucu (gercek kart)

// ---- Pil (gercek kart): LiPo -> 2:1 gerilim bolucu -> BATTERY_PIN ----
#define BATTERY_DIVIDER 2.0f
#define BATTERY_EMPTY_V 3.3f
#define BATTERY_FULL_V 4.2f
#define LOW_BATTERY_PERCENT 20

// ---- Hiyerarsik olcum (packages/shared/src/constants.ts ile ayni) ----
#define INTERVAL_NORMAL_MS 5000
#define INTERVAL_ALERT_MS 1000
#define ALERT_HOLD_MS 60000        // Son anomaliden sonra alarm modunda kalma suresi
#define ALERT_VOC_DELTA 30         // Tabandan bu kadar sapma -> alarm modu
#define ALERT_CO_DELTA_PPM 1.5f
#define BASELINE_ALPHA 0.05f       // Uctaki taban EWMA katsayisi
