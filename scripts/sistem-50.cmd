@echo off
rem PyrosEco - 50 sensorlu tam sistem: 49 simule dugum + Wokwi ESP32 (dugum 50)
rem Gateway, backend, simulator ve 50 dugumlu izleme ekranini ayri pencerelerde acar.
rem
rem Kullanim:
rem   scripts\sistem-50.cmd                 yangin yok (yanlis alarm kontrolu)
rem   scripts\sistem-50.cmd 28              D7'de yangin (Wokwi'nin komsusu), 4x hizli
rem   scripts\sistem-50.cmd 25 1 60         D4'te yangin, gercek hiz, 60 sn taban suresi
rem     1. arguman: yangin dugumu (1-49)
rem     2. arguman: hiz katsayisi (varsayilan 4)
rem     3. arguman: yangin baslamadan once gecen simulasyon saniyesi (varsayilan 200)
rem Kapatmak: scripts\durdur.cmd

setlocal
cd /d "%~dp0.."
set "ROOT=%CD%"
set "MOSQUITTO_DIR=C:\Program Files\mosquitto"
set "RUN=start"
if "%PYROS_KURU%"=="1" set "RUN=echo [kuru] start"

set "FIRE=%~1"
set "SPEED=%~2"
set "DELAY=%~3"
if "%SPEED%"=="" set "SPEED=4"
if "%DELAY%"=="" set "DELAY=200"

echo.
echo === PyrosEco: 50 sensorlu tam sistem ===
echo.
call "%~dp0_kontrol.cmd" || goto :hata

%RUN% "PyrosEco Gateway" /D "%ROOT%" cmd /k pnpm dev:gateway
ping -n 3 127.0.0.1 >nul
%RUN% "PyrosEco Backend" /D "%ROOT%" cmd /k pnpm dev:backend
ping -n 5 127.0.0.1 >nul
%RUN% "PyrosEco Izleme - 50 dugum" /D "%ROOT%" cmd /k "mode con: cols=120 lines=40 && pnpm dev:monitor"

if "%FIRE%"=="" (
  set "FIRE_NODE="
  echo [bilgi] Yangin senaryosu yok: tum dugumler yesil kalmali
) else (
  set "FIRE_NODE=%FIRE%"
  set "FIRE_SPEED=%SPEED%"
  set "FIRE_DELAY_S=%DELAY%"
  echo [bilgi] Yangin: dugum %FIRE%, hiz x%SPEED%, %DELAY% simulasyon sn sonra
)
%RUN% "PyrosEco Simulator - 49 dugum" /D "%ROOT%" cmd /k pnpm dev:sensor

echo.
echo [ok] 4 pencere acildi: Gateway, Backend, Izleme - 50 dugum, Simulator - 49 dugum
echo.
echo Simdi Wokwi'yi baslatin - dugum 50:
echo   VS Code: %ROOT%\firmware, PlatformIO Build, diagram.json, F1 - "Wokwi: Start Simulator"
echo.
echo Kontrol:
echo   Izleme penceresi  : "Canli: 50/50", yangin yokken hepsi yesil
echo   Gateway penceresi : "50 dugum", "0 gecersiz paket"
echo   Yangin varsa      : Son olaylar P - I - A sirasiyla, "dogrulandi: N komsu"
echo   Dugum 28 yangininda Wokwi'nin voc potansiyometresini cevirin: dugum 50 komsu olarak dogrulanir
echo.
echo Kapatmak icin: scripts\durdur.cmd
exit /b 0

:hata
echo.
echo [HATA] On kontroller basarisiz, hicbir pencere acilmadi.
exit /b 1
