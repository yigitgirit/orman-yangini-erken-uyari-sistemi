# orman-yangini-erken-uyari-sistemi

PyrosEco: alev çıkmadan önce (piroliz / için için yanma evresinde) orman yangınını gaz sensörleriyle tespit eden IoT sistemi.

```
49 simüle düğüm (apps/sensor-sim) ─┐
                                   ├─ PyrosFrame v2 (16 bayt, UDP :5005) → gateway → MQTT sensors/{id}/telemetry → backend → WebSocket :8080
ESP32 / Wokwi, düğüm 50 (firmware) ┘
```

## Hızlı başlangıç (Windows)

Gereksinimler: Node.js 24+, pnpm, Mosquitto (servis olarak ya da `C:\Program Files\mosquitto`), Wokwi için VS Code + PlatformIO + Wokwi eklentisi.

| Script | Ne yapar |
|---|---|
| `scripts\wokwi-test.cmd` | Tek başına Wokwi testi: gateway, backend, `sensors/50` MQTT dinleyicisi ve 7x7 ızgaralı izleme ekranı (simülatör kapalı olduğu için ızgara gri) |
| `scripts\sistem-50.cmd` | 49 simüle düğüm + Wokwi: gateway, backend, simülatör ve 7x7 ızgaralı izleme ekranı |
| `scripts\sistem-50.cmd 28` | Aynısı, D7'de (Wokwi'nin komşusu) 4x hızlı yangın senaryosuyla |
| `scripts\sistem-50.cmd 25 1 60` | D4'te gerçek hızda yangın, 60 sn taban süresi |
| `scripts\durdur.cmd` | Bu scriptlerin açtığı pencereleri kapatır |

Her bileşen ayrı bir pencerede açılır. Scriptler önce broker'ı, bağımlılıkları ve portların (UDP 5005, TCP 8080) boş olduğunu kontrol eder; broker çalışmıyorsa ayrı pencerede başlatır.
Wokwi simülasyonu VS Code'dan elle başlatılır: `firmware` klasörü → PlatformIO Build → `diagram.json` → F1 → `Wokwi: Start Simulator`.

> CMD pencerelerinin içine tıklamayın: Hızlı Düzenleme modu açılır ve içindeki program donar (Esc ile çıkılır).

## Elle çalıştırma

```
pnpm dev:gateway
pnpm dev:backend
pnpm dev:monitor              # canlı 50 düğüm izleme ekranı
pnpm dev:sensor               # FIRE_NODE=25 FIRE_SPEED=4 FIRE_DELAY_S=280 ile yangın senaryosu
```

## Frontend için WebSocket (ws://localhost:8080)

Tipler: `packages/shared/src/types.ts` (`WsMessage`).

| Mesaj | Ne zaman | İçerik |
|---|---|---|
| `nodes` | Bağlanınca | 50 düğümün koordinatı, adı, kaynağı (`sim`/`wokwi`), `hasAnemometer` |
| `telemetry` | Her ölçümde | Ham anlık değerler: sıcaklık, nem, CO, CO2, VOC, PM2.5, rüzgâr (yalnızca istasyonlarda), pil, mod, bayraklar |
| `risk` | Her ölçümde | Seviye (green/yellow/red), evre, skor, sinyal aileleri, MCE, sapma, türev, komşu doğrulaması |
| `wind` | Bağlanınca + 2 sn'de bir | **Her düğüm için** rüzgâr: istasyonlarda ölçüm (`measured: true`), diğerlerinde istasyonlardan tahmin (IDW) + bölgesel ortalama |
| `impact` | Bağlanınca + yeni yangında | Erken tespit edilen yangın, kurtarılan alan, önlenen CO2 |

Rüzgâr yönü: `directionFrom` = rüzgârın geldiği yön (meteorolojik), `directionTo` = okun göstereceği yön, `u`/`v` = akış bileşenleri (m/s; u doğu, v kuzey) - 3B ok için doğrudan vektör olarak kullanılabilir.
Rüzgâr istasyonları: A1, A4, A7, D1, D4, D7, G1, G4, G7 ve Wokwi (50).

## Gerçek ESP32 kartı

`firmware/include/secrets.example.h` dosyasını `secrets.h` olarak kopyalayıp WiFi bilgilerini ve gateway'in çalıştığı bilgisayarın IP'sini girin (`secrets.h` git'e girmez), sonra `pio run -e esp32dev -t upload`. Bilgisayarın güvenlik duvarında UDP 5005'e izin verin.
