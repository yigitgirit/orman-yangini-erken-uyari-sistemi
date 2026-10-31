# PyrosEco 🌲🔥

> **Orman Yangını Erken Uyarı ve Siber-Fiziksel Operasyon Platformu**  
> Yangınları alevler yükselmeden önce — piroliz ve için için yanma evresinde — çoklu sensör füzyonu, kriptografik LoRaWAN protokolü ve 3B topografik yangın yayılım modellemesiyle tespit eden izleme ve operasyon sistemi.

---

## 🏛️ Sistem Mimarisi

```text
┌──────────────────────────────────────────────┐
│            Saha Sensör Düğümleri             │
│    (Sanal Düğümler + ESP32 Donanım/Wokwi)    │
└──────────────────────┬───────────────────────┘
                       │  PyrosFrame v3 (AES-128-CCM, 29 Bayt, UDP)
                       ▼
┌──────────────────────────────────────────────┐
│               LoRaWAN Gateway                │
│    (Kriptografik Mühür Doğrulama & Replay)   │
└──────────────────────┬───────────────────────┘
                       │  Yetkilendirilmiş MQTT (ACL Korumalı)
                       ▼
┌──────────────────────────────────────────────┐
│            Çekirdek Analiz Motoru            │
│ (Füzyon, EWMA Tabanı, VPD, Rothermel Yayılım) │
└──────────────┬────────────────┬──────────────┘
               │                │
 SQLite (WAL)  ▼                ▼  WebSocket TLS
      ┌────────────────┐  ┌────────────────────────────────────────┐
      │    pyros.db    │  │       3B Web Operasyon Merkezi         │
      │ (Telemetriler) │  │ (MapLibre 3D, Rüzgâr Motoru, TanStack) │
      └────────────────┘  └────────────────────────────────────────┘
```

---

## 🛠️ Kullanılan Teknolojiler

| Katman | Teknoloji / Kütüphaneler |
| :--- | :--- |
| **Gömülü Sistem & Simülasyon** | ESP32, C++ (PlatformIO), Wokwi, `mbedtls` (AES-128-CCM), Node.js UDP |
| **Haberleşme & Mesajlaşma** | LoRaWAN ikili protokolü (PyrosFrame v3), Mosquitto MQTT (ACL kilitli), TLS WebSocket |
| **Backend & Analitik** | Node.js 24 (`node:sqlite`), Zod, Rothermel & Huygens Yangın Yayılım Fiziği |
| **Frontend & Görselleştirme** | React 19, TypeScript, Vite, Tailwind CSS, MapLibre GL 3D, Recharts |
| **UI & Veri Tablosu** | TanStack Table v8, shadcn/ui, Radix UI Primitives, Lucide Icons |

---

## ✨ Temel Yetenekler

* **Çok Sensörlü Gaz Füzyonu:** Sıcaklık, bağıl nem, CO gazı, VOC endeksi, $\text{CO}_2$ ve partikül duman (PM2.5) verilerini birleştirerek termal alev öncesi erken anomali tespiti.
* **Fiziksel İndisler ve Anomali Analizi:**
  * **Buhar Basıncı Açığı (VPD):** Ortam sıcaklığı ve neminden orman örtüsünün kuruluk ve tutuşma potansiyeli hesabı.
  * **İvme ($\Delta^2/\Delta t^2$):** Sıcaklık ve gaz artış hızının ikinci türeviyle ani alevlenme (*flashover*) tespiti.
  * **4'lü Sinyal Matrisi:** Erken gaz, karbonmonoksit, duman ve yanma sinyallerinin bağımsız doğrulanması.
  * **Çapraz Komşu Teyidi:** Yangın başlangıç noktası etrafındaki komşu istasyonlarla çapraz teyit mekanizması.
* **3B Topografik Operasyon Haritası:** Sayısal yükseklik modeli ve harita katmanları üzerinde istasyonlar, kuleler ve yayılım alanları.
* **Rothermel Yangın Yayılım Modeli:** Rüzgâr yönü, hamle hızı ve arazi eğimine bağlı 15, 30 ve 60 dakikalık eliptik yayılım tahmin konturları.
* **Akışkan Rüzgâr Parçacık Katmanı:** Vektör alanı üzerinde meteorolojik rüzgâr akış çizgilerinin 3B harita animasyonu.
* **Protokol ve Paket Güvenliği:**
  * AES-128-CCM mühürlü 29 baytlık kompakt ikili paket yapısı.
  * Düğüm bazlı HMAC-SHA256 anahtar türetimi ve sayaç tabanlı tekrar saldırısı (Replay Attack) koruması.
  * Kilitli MQTT erişim kontrol listesi (ACL).
* **Tarihsel Telemetri Arşivi:** SQLite üzerinde saklanan telemetriler için sunucu taraflı sayfalandırma, filtreleme, çift yönlü sıralama ve CSV dışa aktarma (TanStack Table & shadcn/ui).
* **Yönetici Paneli:** Canlı harita üzerinde düğüm ve gateway ekleme/silme, kapsama alanı yarıçap analizi ve topoloji yönetimi.

---

## ⚡ Kurulum ve Çalıştırma

### Gereksinimler
* **Node.js** 24+
* **pnpm** 10+
* **Docker** (Mosquitto MQTT broker için)

### 1. Hazırlık
```bash
# Bağımlılıkları yükleyin
pnpm install

# Çevre değişkenleri şablonunu kopyalayın
cp .env.example .env

# MQTT servis kullanıcılarını ve AES-128-CCM anahtarını üretin
pnpm mqtt:users
pnpm keys

# Topoloji ve veritabanını ilklendirin
pnpm db:seed
```

### 2. Başlatma
```bash
# 1. Mosquitto MQTT Broker'ı Docker ile arka planda başlatın
pnpm broker:up

# 2. Tüm servisleri (Gateway, Backend, Simülatör ve Web) tek komutla çalıştırın
pnpm dev:all
```

* **Web Arayüzü:** `http://localhost:5173`
* **Backend WebSocket:** `wss://localhost:8080`
* **Gateway UDP Dinleyicisi:** `127.0.0.1:5005`

---

## 🎯 Test Senaryoları

Sistem çalışırken farklı yangın senaryolarını test etmek için:

```bash
# Dinamik senaryo enjektörü
pnpm senaryo
```

---

## 📁 Proje Dizin Yapısı

```text
├── apps/
│   ├── web/          # React 19 + MapLibre 3D + TanStack Table arayüzü
│   ├── backend/      # Çekirdek analiz motoru, Rothermel fiziği ve SQLite sürücüsü
│   ├── gateway/      # UDP -> MQTT paket doğrulama ve kriptografik filtre servisi
│   └── sensor-sim/   # Çoklu düğüm telemetri ve rüzgâr simülatörü
├── packages/
│   └── shared/       # Zod şemaları, PyrosFrame ikili protokolü, veri tabanı ve tipler
├── firmware/         # ESP32 C++ PlatformIO donanım kodu
└── scripts/          # Anahtar üretimi, MQTT ACL ve senaryo araçları
```
