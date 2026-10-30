// Katman 1 (donanim): ESP32 sensor dugumu (NODE_ID 50)
// Sensorleri okur -> PyrosFrame v2 (16 bayt) -> UDP -> apps/gateway :5005
// 49 simule dugumle ayni protokol ve ayni hiyerarsik olcum mantigi.
//
// Wokwi:      pio run -e wokwi  -> diagram.json -> "Wokwi: Start Simulator"
// Gercek kart: include/secrets.h -> pio run -e esp32dev -t upload

#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>
#include <WiFiUdp.h>

#include "config.h"
#include "pyros_frame.h"

using namespace pyros;

DHT dht(DHT_PIN, DHT_TYPE);
WiFiUDP udp;

struct Baseline {
  float co = NAN;
  float voc = NAN;
};

Baseline baseline;
Mode mode = MODE_NORMAL;
unsigned long lastAnomalyAt = 0;
unsigned long lastSendAt = 0;
bool hadAnomaly = false;
float lastTemperature = 25.0f;
float lastHumidity = 50.0f;

// ADC (0-4095) -> 0..1
float readUnit(uint8_t pin) { return analogRead(pin) / 4095.0f; }

// Potansiyometrenin alt yarisi normal araligi, ust yarisi yangin araligini tarar
// (orta konum = tipik orman havasi), boylece demoda kucuk hareketler anlamli olur.
float readScaled(uint8_t pin, float low, float normal, float high) {
  float x = readUnit(pin);
  return x < 0.5f ? low + (normal - low) * (x / 0.5f) : normal + (high - normal) * ((x - 0.5f) / 0.5f);
}

float readBatteryPercent() {
#ifdef WOKWI
  return readUnit(BATTERY_PIN) * 100.0f;  // Potansiyometre dogrudan yuzde
#else
  float volts = analogReadMilliVolts(BATTERY_PIN) / 1000.0f * BATTERY_DIVIDER;
  float pct = (volts - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
#endif
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("WiFi'ye baglaniliyor: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.printf("\nWiFi baglandi, IP: %s\n", WiFi.localIP().toString().c_str());
}

Frame readSensors() {
  Frame f{};
  f.nodeId = NODE_ID;
  f.flags = FLAG_NONE;

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    f.flags |= FLAG_SENSOR_FAULT;  // Son gecerli degeri gonder, arizayi bayrakla bildir
  } else {
    lastTemperature = t;
    lastHumidity = h;
  }
  f.temperature = lastTemperature;
  f.humidity = lastHumidity;

  f.co = readScaled(CO_PIN, 0.0f, 0.3f, 100.0f);
  f.vocIndex = readScaled(VOC_PIN, 50.0f, 100.0f, 500.0f);
  f.co2 = readScaled(CO2_PIN, 400.0f, 420.0f, 5000.0f);

  // Uc (edge) karari: gaz tabandan saptiysa alarm moduna gec, ALERT_HOLD_MS sakinse geri don
  if (isnan(baseline.co)) {
    baseline.co = f.co;
    baseline.voc = f.vocIndex;
  }
  bool anomaly = (f.vocIndex - baseline.voc > ALERT_VOC_DELTA) || (f.co - baseline.co > ALERT_CO_DELTA_PPM);
  if (anomaly) {
    lastAnomalyAt = millis();
    hadAnomaly = true;
  } else if (mode == MODE_NORMAL) {
    // Taban yalnizca temizken guncellenir
    baseline.co += BASELINE_ALPHA * (f.co - baseline.co);
    baseline.voc += BASELINE_ALPHA * (f.vocIndex - baseline.voc);
  }
  mode = (hadAnomaly && millis() - lastAnomalyAt < ALERT_HOLD_MS) ? MODE_ALERT : MODE_NORMAL;
  f.mode = mode;

  // PM2.5 sensoru (fanli, enerji yiyen) yalnizca alarm modunda olculur
  f.pm25 = mode == MODE_ALERT ? readScaled(PM25_PIN, 0.0f, 12.0f, 1000.0f) : NAN;

  f.windSpeed = NAN;  // Bu dugumde anemometre yok
  f.windDirection = NAN;

  f.battery = readBatteryPercent();
  if (f.battery < LOW_BATTERY_PERCENT) f.flags |= FLAG_LOW_BATTERY;
  return f;
}

void sendFrame(const Frame& f) {
  uint8_t buf[FRAME_SIZE];
  pack(f, buf);

  bool ok = udp.beginPacket(GATEWAY_HOST, GATEWAY_UDP_PORT) && udp.write(buf, FRAME_SIZE) == FRAME_SIZE &&
            udp.endPacket();

  Serial.printf("[%s] T=%.1fC RH=%.0f%% CO=%.1fppm CO2=%.0fppm VOC=%.0f PM=", f.mode == MODE_ALERT ? "ALARM" : "normal",
                f.temperature, f.humidity, f.co, f.co2, f.vocIndex);
  if (isnan(f.pm25)) Serial.print("-");
  else Serial.printf("%.0f", f.pm25);
  Serial.printf(" pil=%%%.0f bayrak=0x%X -> ", f.battery, f.flags);
  for (size_t i = 0; i < FRAME_SIZE; i++) Serial.printf("%02X", buf[i]);
  Serial.println(ok ? " gonderildi" : " GONDERILEMEDI");
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);  // 0-3.3V
  connectWiFi();
  Serial.printf("Dugum %d -> %s:%d (UDP)\n", NODE_ID, GATEWAY_HOST, GATEWAY_UDP_PORT);
}

void loop() {
  connectWiFi();
  unsigned long interval = mode == MODE_ALERT ? INTERVAL_ALERT_MS : INTERVAL_NORMAL_MS;
  if (millis() - lastSendAt >= interval) {
    lastSendAt = millis();
    sendFrame(readSensors());
  }
}
