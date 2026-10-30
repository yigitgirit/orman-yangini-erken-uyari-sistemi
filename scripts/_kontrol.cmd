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

call :tcpDinleniyor 1883
if errorlevel 1 (
  if not exist "%MOSQUITTO_DIR%\mosquitto.exe" (
    echo [HATA] MQTT broker calismiyor ve %MOSQUITTO_DIR%\mosquitto.exe bulunamadi.
    exit /b 1
  )
  echo [bilgi] MQTT broker calismiyor, ayri pencerede baslatiliyor...
  %RUN% "PyrosEco Broker" "%MOSQUITTO_DIR%\mosquitto.exe" -v
  ping -n 3 127.0.0.1 >nul
) else (
  echo [ok] MQTT broker calisiyor: 1883
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
