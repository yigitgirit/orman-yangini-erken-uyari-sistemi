@echo off
rem PyrosEco - Tek basina Wokwi testi (dugum 50)
rem Gateway, backend, MQTT dinleyici ve izleme ekranini (7x7 izgara + Wokwi ayrintisi)
rem ayri pencerelerde acar. Simulator calismadigi icin izgara hucreleri "sessiz" (gri) gorunur.
rem Wokwi simulasyonu VS Code'dan elle baslatilir (asagidaki adimlar).
rem
rem Kullanim:  scripts\wokwi-test.cmd
rem Kapatmak:  scripts\durdur.cmd

setlocal
cd /d "%~dp0.."
set "ROOT=%CD%"
set "MOSQUITTO_DIR=C:\Program Files\mosquitto"
set "RUN=start"
if "%PYROS_KURU%"=="1" set "RUN=echo [kuru] start"

echo.
echo === PyrosEco: tek basina Wokwi testi - dugum 50 ===
echo.
call "%~dp0_kontrol.cmd" || goto :hata

%RUN% "PyrosEco Gateway" /D "%ROOT%" cmd /k pnpm dev:gateway
ping -n 3 127.0.0.1 >nul
%RUN% "PyrosEco Backend" /D "%ROOT%" cmd /k pnpm dev:backend
ping -n 5 127.0.0.1 >nul
rem MQTT dinleyici backend'in salt-okur hesabiyla baglanir (sifre .env'den)
for /f "usebackq tokens=1,* delims==" %%a in ("%ROOT%\.env") do if "%%a"=="MQTT_BACKEND_PASSWORD" set "MQTT_BACKEND_PASSWORD=%%b"
%RUN% "PyrosEco MQTT - dugum 50" cmd /k ""%MOSQUITTO_DIR%\mosquitto_sub.exe" -h localhost -u backend -P %MQTT_BACKEND_PASSWORD% -t sensors/50/telemetry -v"
%RUN% "PyrosEco Izleme" /D "%ROOT%" cmd /k "mode con: cols=120 lines=40 && pnpm dev:monitor"

echo.
echo [ok] 4 pencere acildi: Gateway, Backend, MQTT - dugum 50, Izleme
echo.
echo Simdi Wokwi'yi baslatin:
echo   1. VS Code: %ROOT%\firmware klasorunu acin
echo   2. PlatformIO Build (varsayilan ortam: wokwi)
echo   3. diagram.json acin, F1 - "Wokwi: Start Simulator"
echo      Baslatmadan once: gaz sensoru dusuk, battery potansiyometresi ortada
echo.
echo Kontrol:
echo   Gateway penceresi : "son 5 sn: N gecerli, 0 gecersiz paket"
echo   MQTT penceresi    : 5 sn'de bir sensors/50/telemetry {...}
echo   Izleme penceresi  : izgara gri "sessiz" - simulator kapali, bu normal
echo                       ESP32 - Wokwi satiri ~50 sn sonra "normal, skor 0"
echo.
echo Senaryo: voc potansiyometresi saga = piroliz (sari),
echo          + gaz sensoru ve pm25 yukari = icin icin yanma,
echo          + co2 sona ve DHT22 sicakligi 70 C uzeri = alevli yanma (kirmizi),
echo          battery sola = dusuk pil bayragi (0x1).
echo Ruzgar:  vane potansiyometresi = yon (0-360 derece, geldigi yon),
echo          doner kodlayici KY-040 = hiz (her adim 0.5 m/s, baslangic 3.5 m/s).
echo.
echo Kapatmak icin: scripts\durdur.cmd
exit /b 0

:hata
echo.
echo [HATA] On kontroller basarisiz, hicbir pencere acilmadi.
exit /b 1
