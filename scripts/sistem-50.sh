#!/usr/bin/env bash
# PyrosEco - Linux Tam Sistem Başlatıcı
# Antalya Manavgat - Oymapınar Yangın Sahası (28 Temmuz 2021 Modeli)
#
# Kullanım:
#   ./scripts/sistem-50.sh                 (Yangın yok, tüm düğümler yeşil/normal)
#   ./scripts/sistem-50.sh 11              (Düğüm #11'de yangın senaryosu - Poyraz yayılımı)
#   ./scripts/sistem-50.sh 11 2 0          (Düğüm #11'de 2x hızla anında yangın)
# Durdurmak için:
#   ./scripts/durdur.sh

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

FIRE_NODE="${1:-}"
FIRE_SPEED="${2:-1}"
FIRE_DELAY="${3:-45}"

echo "=============================================="
echo "🔥 PyrosEco - Manavgat / Oymapınar Yangın Sahası"
echo "=============================================="

# 1. Mosquitto Broker kontrolü / başlatma
if ! docker ps 2>/dev/null | grep -q "pyros-mosquitto"; then
  echo "[1/4] MQTT Broker (Mosquitto) başlatılıyor..."
  docker compose up -d 2>/dev/null || echo "[!] Docker kontrol edilemedi, yerel broker bekleniyor..."
fi

# 2. Çalışma dizini ve PID takibi
mkdir -p "$DIR/.pids"

# 3. Gateway Başlat
echo "[2/4] Edge Gateway (:5005 UDP -> MQTT) başlatılıyor..."
pnpm dev:gateway > "$DIR/.pids/gateway.log" 2>&1 &
echo $! > "$DIR/.pids/gateway.pid"

sleep 1

# 4. Backend Başlat
echo "[3/4] Backend Analiz & WebSocket Motoru (:8080 WSS) başlatılıyor..."
pnpm dev:backend > "$DIR/.pids/backend.log" 2>&1 &
echo $! > "$DIR/.pids/backend.pid"

sleep 1

# 5. Sensör Simülatörü Başlat
if [ -n "$FIRE_NODE" ]; then
  echo "[4/4] Sensör Simülatörü BAŞLATILIYOR -> YANGIN ALARMI: Düğüm #$FIRE_NODE (Hız: ${FIRE_SPEED}x, Gecikme: ${FIRE_DELAY}s)..."
  FIRE_NODE="$FIRE_NODE" FIRE_SPEED="$FIRE_SPEED" FIRE_DELAY_S="$FIRE_DELAY" pnpm dev:sensor > "$DIR/.pids/sensor.log" 2>&1 &
  echo $! > "$DIR/.pids/sensor.pid"
else
  echo "[4/4] Sensör Simülatörü BAŞLATILIYOR -> NOMİNAL (Yangın yok, 49 düğüm)..."
  pnpm dev:sensor > "$DIR/.pids/sensor.log" 2>&1 &
  echo $! > "$DIR/.pids/sensor.pid"
fi

echo ""
echo "✅ Sistem başarıyla ayağa kaldırıldı!"
echo "📡 Arayüzü açmak için:"
echo "   pnpm dev:web  (http://localhost:5173)"
echo ""
echo "🛑 Sistemi kapatmak için:"
echo "   ./scripts/durdur.sh"
echo "=============================================="

