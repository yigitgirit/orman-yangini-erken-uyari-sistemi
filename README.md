# PyrosEco 🌲🔥

> **Orman Yangını Erken Uyarı ve Siber-Fiziksel Operasyon Sistemi**  
> Yangınları alevler yükselmeden önce — henüz piroliz ve için için yanma evresinde — çok sensörlü gaz füzyonu, kriptografik LoRaWAN protokolü ve 3B topografik Rothermel yayılım modeliyle tespit eden yeni nesil erken uyarı platformu.

---

## 🏛️ Sistem Mimarisi

```text
┌─────────────────────────────────┐
│     Saha Sensör Düğümleri       │
│  (49 Simüle Düğüm + ESP32/Wokwi)│
└────────────────┬────────────────┘
                 │  PyrosFrame v3 (AES-128-CCM, 29 Bayt, UDP :5005)
                 ▼
┌─────────────────────────────────┐
│        LoRaWAN Gateway          │
│   (Mühür Doğrulama & Replay)    │
└────────────────┬────────────────┘
                 │  Kilitli MQTT (sensors/{id}/telemetry, ACL Korumalı)
                 ▼
┌─────────────────────────────────┐
│     Çekirdek Analiz Motoru      │
│ (VPD, EWMA, MCE, Rothermel 3D)  │
└───────┬─────────────────┬───────┘
        │                 │
        │ SQLite (WAL)    │ WebSocket TLS (:8080)
        ▼                 ▼
┌──────────────┐  ┌────────────────────────────────────────┐
│  pyros.db    │  │       3B Web Operasyon Merkezi         │
│  (Arşiv)     │  │ (MapLibre 3D, Rüzgâr Motoru, TanStack) │
└──────────────┘  └────────────────────────────────────────┘
```

---

## ✨ Temel Özellikler

* **🔥 Erken Piroliz ve Çoklu Sensör Füzyonu:** BME688, SGP40, MQ-7 ve SPS30 sensör verilerini birleştirerek alev oluşmadan 5-15 dakika önce gaz anomalilerini yakalar.
* **🌡️ Fiziksel İndisler ve Anomali Analizi:**
  * **Vapor Pressure Deficit (VPD):** Yaprak ve örtü kuruluk derecesini ölçerek parlama yatkınlığını hesaplar.
  * **İvme ($\Delta^2/\Delta t^2$):** Sıcaklık ve $\text{CO}_2$ artış hızının türevini alarak anlık alevlenme (*flashover*) riskini sezer.
  * **4'lü Sinyal Matrisi:** Erken gaz, karbonmonoksit, duman ve termal sinyalleri bağımsız doğrular.
  * **Çapraz Komşu Teyidi:** 300m etki alanındaki istasyonlarla çapraz doğrulama yaparak yanlış alarmları önler.
* **🗺️ 3B Topografik Operasyon Haritası:** Marmaris Balan Dağı & Bördübet arazisinde 50 stratejik istasyon; MapLibre GL 3D ve yükseklik modeli.
* **📐 Rothermel & Huygens Yangın Yayılım Modeli:** Rüzgâr yönü ve arazi eğimine göre 15, 30 ve 60 dakikalık eliptik yayılım konturlarını ve tahliye zonlarını hesaplar.
* **💨 60 FPS Rüzgâr Parçacık Motoru:** Gerçek zamanlı meteorolojik rüzgâr akış çizgilerini $O(1)$ örnekleme ile kasmadan 3B harita üzerinde canlandırır.
* **🔐 Uçtan Uca Donanımsal Güvenlik (PyrosFrame v3):**
  * AES-128-CCM mühürlü 29 baytlık kompakt paket yapısı ile LoRa ToA süresini ~48 ms'ye indirir (3+ yıl pil ömrü).
  * HMAC-SHA256 türetilmiş düğüm anahtarları ve monotonik sayaç koruması (Replay Attack engelleme).
  * Kilitli Mosquitto broker (sadece gateway yazar, backend okur).
* **📋 TanStack Table Tarihsel Veritabanı Arşivi:** SQLite üzerinde saklanan 60.000+ telemetri kaydı için sunucu taraflı sayfalandırma, filtreleme, sıralama ve CSV dışa aktarma (tamamen shadcn/ui bileşenleri ile).
* **⚙️ Yönetici Operasyon Paneli:** Harita üzerinde interaktif yeni istasyon/gateway ekleme, kapsama alanı analizi ve dinamik topoloji yönetimi.

---

## ⚡ Hızlı Başlangıç

### Gereksinimler
* **Node.js** 24+
* **pnpm** 10+
* **Docker** (Mosquitto MQTT broker için)

### 1. Kurulum ve Ortam Hazırlığı
```bash
# Bağımlılıkları yükleyin
pnpm install

# .env dosyasını oluşturun
cp .env.example .env

# MQTT şifrelerini ve AES-128-CCM anahtarlarını üretin
pnpm mqtt:users
pnpm keys

# Topoloji ve veritabanı tohumlarını ilklendirin
pnpm db:seed
```

### 2. Sistemi Başlatma
```bash
# 1. Kilitli MQTT Broker'ı başlatın
pnpm broker:up

# 2. Tüm servisleri (Gateway, Backend, Simülatör ve Web) tek komutla çalıştırın
pnpm dev:all
```
* **Web Arayüzü:** `http://localhost:5173`
* **WebSocket TLS:** `wss://localhost:8080`
* **Gateway UDP:** `127.0.0.1:5005`

---

## 🎯 Canlı Yangın Senaryoları

Sistem çalışırken farklı yangın tiplerini test etmek için dinamik senaryo yöneticisini kullanabilirsiniz:

```bash
# İnteraktif senaryo menüsü
pnpm senaryo

# Belirli bir düğümde yangın başlatma
FIRE_NODE=25 FIRE_SPEED=2 pnpm dev:sensor
```

* **Standart Orman Yangını:** Düğüm #25 (Merkez Trafo) — Piroliz, için için yanma ve alevli evreler.
* **Sinsi Piknik / İhmal Ateşi:** Düşük ısı, yoğun CO ve duman emisyonu.
* **Kuru Fırtına / Hızlı Alevlenme:** Şiddetli poyraz hamleleriyle hızlı rüzgâr altı yayılım.
* **Yalancı Pozitif (False Alarm):** Sadece tekil gaz sıçraması (komşu teyidi olmadan alarm tetiklenmez).

---

## 🛠️ Monorepo Yapısı

* **`apps/web`**: React 19, Vite, Tailwind CSS, MapLibre GL 3D, TanStack Table, shadcn/ui.
* **`apps/backend`**: Node.js, `ws`, `node:sqlite`, Rothermel yayılım motoru, sensör füzyon analizi.
* **`apps/gateway`**: LoRaWAN UDP dinleyicisi, AES-128-CCM doğrulama, MQTT yayıncısı.
* **`apps/sensor-sim`**: 49 düğümlü dijital ikiz, mikro-meteorolojik rüzgâr ve yayılım simülatörü.
* **`firmware`**: Gerçek ESP32 / Wokwi simülasyonu için PlatformIO C++ firmware kodu (`mbedtls` CCM).
* **`packages/shared`**: Ortak Zod şemaları, PyrosFrame ikili protokolü, SQLite veritabanı sürücüsü ve tipler.
