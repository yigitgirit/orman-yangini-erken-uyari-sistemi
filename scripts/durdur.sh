#!/usr/bin/env bash
# PyrosEco - Linux Süreç Durdurucu

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🛑 PyrosEco servisleri durduruluyor..."

if [ -d "$DIR/.pids" ]; then
  for pidfile in "$DIR/.pids"/*.pid; do
    if [ -f "$pidfile" ]; then
      PID=$(cat "$pidfile")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        echo "  [ok] PID $PID sonlandırıldı."
      fi
      rm -f "$pidfile"
    fi
  done
  rm -rf "$DIR/.pids"
fi

# pnpm dev süreçlerini de temizle
pkill -f "node --watch src/index.ts" 2>/dev/null || true
pkill -f "pnpm dev:(gateway|backend|sensor)" 2>/dev/null || true

echo "✅ Tüm PyrosEco arka plan servisleri durduruldu."

