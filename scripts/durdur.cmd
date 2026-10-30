@echo off
rem PyrosEco - wokwi-test.cmd / sistem-50.cmd ile acilan pencereleri ve surecleri kapatir.
rem Yalnizca bu scriptlerin actigi pencereleri bulur (komut satirina gore);
rem elle acilan pencerelere ve Mosquitto Windows servisine dokunmaz.
rem Scriptleri yonetici penceresinden actiysaniz bunu da yonetici penceresinden calistirin.

powershell -NoProfile -Command ^
  "$p = Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'pnpm dev:(gateway|backend|sensor|monitor)|mosquitto_sub.exe.*sensors/') -or ($_.Name -eq 'mosquitto.exe' -and $_.CommandLine -match ' -v\s*$') };" ^
  "foreach ($x in $p) { taskkill /PID $x.ProcessId /T /F *> $null; Write-Host ('[ok] kapatildi: ' + $x.ProcessId + '  ' + $x.CommandLine) };" ^
  "if (-not $p) { Write-Host 'Calisan PyrosEco penceresi bulunamadi.' }"
