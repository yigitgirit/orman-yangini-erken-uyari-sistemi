# orman-yangini-erken-uyari-sistemi

PyrosEco: alev çıkmadan önce (piroliz / için için yanma evresinde) orman yangınını gaz sensörleriyle tespit eden IoT sistemi.

```
49 simüle düğüm (apps/sensor-sim) ─┐
                                   ├─ PyrosFrame v3 (AES-128-CCM, 29 bayt, UDP :5005) → gateway → MQTT sensors/{id}/telemetry → backend → WebSocket :8080
ESP32 / Wokwi, düğüm 50 (firmware) ┘
```

## Hızlı başlangıç (Windows)

Gereksinimler: Node.js 24+, pnpm, Mosquitto (servis olarak ya da `C:\Program Files\mosquitto`), Wokwi için VS Code + PlatformIO + Wokwi eklentisi.

| Script                          | Ne yapar                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts\wokwi-test.cmd`        | Tek başına Wokwi testi: gateway, backend, `sensors/50` MQTT dinleyicisi ve 7x7 ızgaralı izleme ekranı (simülatör kapalı olduğu için ızgara gri) |
| `scripts\sistem-50.cmd`         | 49 simüle düğüm + Wokwi: gateway, backend, simülatör ve 7x7 ızgaralı izleme ekranı                                                              |
| `scripts\sistem-50.cmd 28`      | Aynısı, D7'de (Wokwi'nin komşusu) 4x hızlı yangın senaryosuyla                                                                                  |
| `scripts\sistem-50.cmd 25 1 60` | D4'te gerçek hızda yangın, 60 sn taban süresi                                                                                                   |
| `scripts\durdur.cmd`            | Bu scriptlerin açtığı pencereleri kapatır                                                                                                       |

Her bileşen ayrı bir pencerede açılır. Scriptler önce MQTT kullanıcılarını, broker'ı (kilitli olduğunu), bağımlılıkları ve portların (UDP 5005, TCP 8080) boş olduğunu kontrol eder; broker çalışmıyorsa ayrı pencerede başlatır.
Wokwi simülasyonu VS Code'dan elle başlatılır: `firmware` klasörü → PlatformIO Build → `diagram.json` → F1 → `Wokwi: Start Simulator`.

> CMD pencerelerinin içine tıklamayın: Hızlı Düzenleme modu açılır ve içindeki program donar (Esc ile çıkılır).

## Sensör → gateway güvenliği (AES-128-CCM)

Gateway yalnızca sensörlerin kendi anahtarıyla mühürlediği paketleri kabul eder; gerisini sebebiyle sayıp atar (`[gateway] son 5 sn: 49 gecerli, 5 REDDEDILDI (4 muhur, 1 tekrar)`).

- **Paket (PyrosFrame v3, 29 bayt):** sürüm + düğüm no + sayaç (açık ama mühürlü) | 15 bayt ölçüm (şifreli) | 8 bayt etiket. Ayrıntı: `packages/shared/src/secure.ts`, `firmware/include/pyros_secure.h`.
- **Neden CCM:** Zigbee, BLE, Thread ve Matter'ın kullandığı yöntem; 8 baytlık etiketle paket küçük kalır (pil, LoRa yayın süresi) ve sayaç hatasına GCM'den dayanıklıdır.
- **Düğüm başına anahtar:** `anahtar = HMAC-SHA256(PYROS_MASTER_KEY, düğüm no)`. Çalınan bir sensör yalnızca kendisini temsil edebilir.
- **Tekrar koruması:** her paketin sayacı bir öncekinden büyük olmalı. Gateway son sayaçları `apps/gateway/.sayaclar.json` dosyasında tutar, yeniden başlasa da eski paket kabul edilmez. ESP32 sayacı saatten (NTP) ve kalıcı bellekten (NVS) başlatır, yeniden başlatmada geri gitmez.
- **Şifresiz v2 paketler reddedilir.**
- `pnpm keys`: `.env`'de `PYROS_MASTER_KEY` yoksa üretir ve ESP32'nin anahtarını `firmware/include/node_key.h` dosyasına yazar (ikisi de git'e girmez). Scriptler `node_key.h` yoksa kendisi çağırır. **Anahtar değişince firmware'i yeniden derleyin.** Takım arkadaşlarının aynı `PYROS_MASTER_KEY` değerini kullanması gerekir.
- `pnpm saldiri` (gateway çalışırken): şifresiz paket, rastgele anahtar, çalınan sensörün anahtarı, değiştirilmiş paket, değiştirilmiş düğüm no ve tekrar gönderim saldırılarını dener; gateway penceresinde hepsi `REDDEDILDI` görünür, gerçek paket bir kez kabul edilir.

## MQTT güvenliği

Broker kilitli: sensör verisini (`sensors/+/telemetry`) **yalnızca gateway yazabilir**, backend yalnızca okur. Şifresiz bağlantı ve listede olmayan her konu reddedilir (`mosquitto/config/acl`). Broker yalnızca bu bilgisayardan erişilebilir (`127.0.0.1`).

- `pnpm mqtt:users`: `.env`'de `MQTT_GATEWAY_PASSWORD` / `MQTT_BACKEND_PASSWORD` yoksa rastgele üretip ekler ve `mosquitto/config/passwd` dosyasını yazar (ikisi de git'e girmez). Scriptler bu dosya yoksa kendisi çağırır.
- Windows'ta Mosquitto **servis** olarak kuruluysa varsayılan (şifresiz) ayarla 1883'ü tutar; scriptler bunu fark edip durur. Yönetici CMD'de bir kez `sc stop mosquitto` ve `sc config mosquitto start= demand`; sonra scriptler kilitli broker'ı `mosquitto\config\mosquitto.windows.conf` ile kendisi başlatır.
- Elle dinlemek için: `mosquitto_sub -h localhost -u backend -P <MQTT_BACKEND_PASSWORD> -t "sensors/#" -v`

## Elle çalıştırma

```
pnpm dev:gateway
pnpm dev:backend
pnpm dev:monitor              # canlı 50 düğüm izleme ekranı
pnpm dev:sensor               # FIRE_NODE=25 FIRE_SPEED=4 FIRE_DELAY_S=280 ile yangın senaryosu
```

## Frontend için WebSocket (wss://localhost:8080)

Backend varsayılan olarak kendinden imzalı sertifikayla `wss://` dinler; tarayıcılar bu bağlantıyı sessizce reddeder. Bu yüzden `apps/web` backend'e doğrudan değil, kendi sunucusu üzerinden `/ws` yoluyla bağlanır (`vite.config.ts` bunu backend'e wss ile aktarır). Başka bir adres için `VITE_WS_URL`.

Tipler: `packages/shared/src/types.ts` (`WsMessage`).

| Mesaj       | Ne zaman                   | İçerik                                                                                                                          |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`     | Bağlanınca                 | 50 düğümün koordinatı, adı, kaynağı (`sim`/`wokwi`), `hasAnemometer`                                                            |
| `telemetry` | Her ölçümde                | Ham anlık değerler: sıcaklık, nem, CO, CO2, VOC, PM2.5, rüzgâr (yalnızca istasyonlarda), pil, mod, bayraklar                    |
| `risk`      | Her ölçümde                | Seviye (green/yellow/red), evre, skor, sinyal aileleri, MCE, sapma, türev, komşu doğrulaması                                    |
| `wind`      | Bağlanınca + 2 sn'de bir   | **Her düğüm için** rüzgâr: istasyonlarda ölçüm (`measured: true`), diğerlerinde istasyonlardan tahmin (IDW) + bölgesel ortalama |
| `impact`    | Bağlanınca + yeni yangında | Erken tespit edilen yangın, kurtarılan alan, önlenen CO2                                                                        |

Rüzgâr yönü: `directionFrom` = rüzgârın geldiği yön (meteorolojik), `directionTo` = okun göstereceği yön, `u`/`v` = akış bileşenleri (m/s; u doğu, v kuzey) - 3B ok için doğrudan vektör olarak kullanılabilir.
Rüzgâr istasyonları: A1, A4, A7, D1, D4, D7, G1, G4, G7 ve Wokwi (50).

## Gerçek ESP32 kartı

`firmware/include/secrets.example.h` dosyasını `secrets.h` olarak kopyalayıp WiFi bilgilerini ve gateway'in çalıştığı bilgisayarın IP'sini girin (`secrets.h` git'e girmez), sonra `pio run -e esp32dev -t upload`. Bilgisayarın güvenlik duvarında UDP 5005'e izin verin.
