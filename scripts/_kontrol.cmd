@echo off
rem Ortak on kontroller (wokwi-test.cmd ve sistem-50.cmd cagirir):
rem pnpm, bagimliliklar, MQTT broker, bos portlar. Hata varsa errorlevel 1 doner.

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [HATA] pnpm bulunamadi. Kurmak icin: npm install -g pnpm
  exit /b 1
)
echo [ok] pnpm bulundu

if not exist "%ROOT%\node_modules" (
  echo [bilgi] Bagimliliklar kuruluyor...
  call pnpm install || exit /b 1
)
echo [ok] Bagimliliklar kurulu

rem Broker kilitli: yalnizca gateway yazar, backend okur (mosquitto\config\acl)
if not exist "%ROOT%\mosquitto\config\passwd" (
  echo [bilgi] MQTT kullanicilari olusturuluyor...
  node "%ROOT%\scripts\mqtt-kullanicilar.ts" || exit /b 1
)
echo [ok] MQTT kullanicilari hazir

rem Sensor -> gateway paketleri AES-128-CCM ile muhurlu: ana anahtar .env'de, ESP32 anahtari node_key.h'de
if not exist "%ROOT%\firmware\include\node_key.h" (
  echo [bilgi] Sensor anahtarlari olusturuluyor...
  node "%ROOT%\scripts\anahtarlar.ts" || exit /b 1
  echo [bilgi] Wokwi icin firmware'i yeniden derleyin: anahtar yeni olustu
)
echo [ok] Sensor anahtarlari hazir

call :tcpDinleniyor 1883
if errorlevel 1 (
  if not exist "%MOSQUITTO_DIR%\mosquitto.exe" (
    echo [HATA] MQTT broker calismiyor ve %MOSQUITTO_DIR%\mosquitto.exe bulunamadi.
    exit /b 1
  )
  echo [bilgi] MQTT broker calismiyor, kilitli ayarlarla ayri pencerede baslatiliyor...
  %RUN% "PyrosEco Broker" /D "%ROOT%\mosquitto\config" "%MOSQUITTO_DIR%\mosquitto.exe" -c mosquitto.windows.conf -v
  ping -n 3 127.0.0.1 >nul
) else (
  rem Sifresiz baglanti kabul ediliyorsa calisan broker bizimki degil (genelde Windows mosquitto servisi)
  "%MOSQUITTO_DIR%\mosquitto_pub.exe" -h localhost -t pyros/kontrol -m test >nul 2>&1
  if not errorlevel 1 (
    echo [HATA] 1883'te SIFRESIZ bir MQTT broker calisiyor, herkes sahte veri yazabilir.
    echo        Muhtemelen Windows mosquitto servisi. Yonetici CMD'de bir kez:
    echo          sc stop mosquitto
    echo          sc config mosquitto start= demand
    echo        Sonra bu scripti tekrar calistirin; kilitli broker kendisi baslar.
    exit /b 1
  )
  echo [ok] MQTT broker calisiyor: 1883, sifresiz giris kapali
)

call :udpDinleniyor 5005
if not errorlevel 1 (
  echo [HATA] UDP 5005 kullanimda: bir gateway zaten calisiyor.
  echo        Once eski pencereleri kapatin ya da scripts\durdur.cmd calistirin.
  exit /b 1
)
call :tcpDinleniyor 8080
if not errorlevel 1 (
  echo [HATA] TCP 8080 kullanimda: bir backend zaten calisiyor.
  echo        Once eski pencereleri kapatin ya da scripts\durdur.cmd calistirin.
  exit /b 1
)
echo [ok] UDP 5005 ve TCP 8080 bos
exit /b 0

:tcpDinleniyor
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %1 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %errorlevel%

:udpDinleniyor
powershell -NoProfile -Command "if (Get-NetUDPEndpoint -LocalPort %1 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %errorlevel%
