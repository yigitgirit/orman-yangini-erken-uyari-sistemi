import type { ImpactSummary } from "@pyros/shared";
import { Activity, Radio, ShieldAlert, Trees, Wind } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionStatus } from "../../services/websocketClient";

interface TopStatusBarProps {
  totalStations: number;
  activeFireNodeId: number | null;
  windDirection: number;
  windSpeed: number;
  impact: ImpactSummary;
  connectionStatus: ConnectionStatus;
  isMockMode: boolean;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  totalStations,
  activeFireNodeId,
  windDirection,
  windSpeed,
  impact,
  connectionStatus,
  isMockMode,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-10 px-3 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-between text-xs font-mono text-zinc-300 select-none">
      {/* Sol: Sistem ve Bağlantı Rozeti */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-zinc-100 font-semibold tracking-wider text-[11px]">
          <span
            className={`h-2 w-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-emerald-500 animate-pulse"
                : connectionStatus === "connecting"
                  ? "bg-sky-500 animate-pulse"
                  : "bg-amber-500"
            }`}
          />
          <span>PYROSECO</span>
          <span className="text-[10px] text-zinc-500 font-normal">| MARMARİS BALAN DAĞI</span>
        </div>

        {/* Bağlantı Durum Etiketi */}
        {isMockMode ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            SİMÜLASYON MODU
          </span>
        ) : connectionStatus === "connected" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            WSS CANLI
          </span>
        ) : connectionStatus === "connecting" ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
            BAĞLANIYOR...
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
            ÇEVRİMDIŞI
          </span>
        )}

        <div className="h-3 w-[1px] bg-zinc-800" />

        <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px]">
          <Radio className="h-3.5 w-3.5 text-zinc-400" />
          <span>İSTASYON:</span>
          <span className="text-zinc-200 font-bold">
            {totalStations > 0 ? `${totalStations}/${totalStations}` : "0"}
          </span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-800 hidden sm:block" />

        <div className="hidden sm:flex items-center space-x-1.5 text-zinc-400 text-[11px]">
          <Activity className="h-3.5 w-3.5 text-sky-400" />
          <span>LORA GW:</span>
          <span className="text-sky-300">2/2 ÇEVRİMİÇİ</span>
        </div>
      </div>

      {/* Orta: Anlık Durum Rozeti */}
      <div className="flex items-center space-x-2">
        {activeFireNodeId ? (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <ShieldAlert className="h-3 w-3" />
            <span>KRİTİK ANOMALİ: DÜĞÜM #{activeFireNodeId}</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-emerald-400 border-emerald-900/60 bg-emerald-950/30"
          >
            SİSTEM STABİL
          </Badge>
        )}
      </div>

      {/* Sağ: Rüzgâr ve Çevresel Etki Metrikleri */}
      <div className="flex items-center space-x-3 text-[11px]">
        <div className="hidden md:flex items-center space-x-1 text-zinc-400">
          <Wind className="h-3.5 w-3.5 text-amber-400" />
          <span>RÜZGÂR:</span>
          <span className="text-zinc-200 font-semibold">
            {windDirection}° ({windSpeed.toFixed(1)} m/s)
          </span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-800 hidden md:block" />

        <div className="flex items-center space-x-1 text-zinc-400">
          <Trees className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden lg:inline">ÖNLENEN EMİSYON:</span>
          <span className="text-emerald-300 font-bold">{impact.preventedCo2Tons} T CO₂</span>
          {impact.savedHectares > 0 && (
            <span className="text-zinc-500 text-[10px]">
              ({impact.savedHectares.toFixed(1)} Ha)
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
