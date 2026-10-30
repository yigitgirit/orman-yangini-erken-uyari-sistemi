import { WifiOff } from "lucide-react";
import type React from "react";
import type { ConnectionStatus } from "../../services/websocketClient";

interface OfflineBannerProps {
  status: ConnectionStatus;
  isMockMode: boolean;
  wsUrl: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ status, isMockMode, wsUrl }) => {
  // Mock modunda veya bağlıyken banner gösterilmez
  if (isMockMode || status === "connected") return null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100vw-2rem)] select-none pointer-events-none">
      <div className="bg-zinc-950/95 border border-amber-900/60 rounded-xl px-4 py-3 shadow-2xl shadow-black/80 flex items-start gap-3 backdrop-blur-md">
        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 shrink-0 mt-0.5">
          <WifiOff className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-100 font-mono tracking-wide">
              {status === "connecting"
                ? "CANLI BAĞLANTI KURULUYOR..."
                : "MERKEZİ SUNUCU BAĞLANTISI BEKLENİYOR"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
            {status === "connecting"
              ? `Operasyon merkezine (${wsUrl}) bağlanılıyor.`
              : `Canlı WebSocket yayını aktif değil. Arka planda sunucu yoklanıyor.`}
          </p>
        </div>
      </div>
    </div>
  );
};
