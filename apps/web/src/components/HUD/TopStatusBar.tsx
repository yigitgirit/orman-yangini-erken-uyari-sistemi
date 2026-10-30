import { Activity, Radio, ShieldAlert, Trees, Wind } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import type { EnvironmentalImpact } from "../../types/simulation";

interface TopStatusBarProps {
  totalStations: number;
  activeFireNodeId: number | null;
  windDirection: number;
  windSpeed: number;
  impact: EnvironmentalImpact;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  totalStations,
  activeFireNodeId,
  windDirection,
  windSpeed,
  impact,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-10 px-3 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-between text-xs font-mono text-zinc-300 select-none">
      {/* Sol: Sistem ve İstasyon Kimliği */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-zinc-100 font-semibold tracking-wider text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PYROSECO</span>
          <span className="text-[10px] text-zinc-500 font-normal">
            | MARMARİS BALAN DAĞI 3D DEM
          </span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-800" />

        <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px]">
          <Radio className="h-3.5 w-3.5 text-zinc-400" />
          <span>İSTASYON:</span>
          <span className="text-zinc-200 font-bold">
            {totalStations}/{totalStations}
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
            SİSTEM STABİL (Sıfır Anomali)
          </Badge>
        )}
      </div>

      {/* Sağ: Rüzgâr ve Çevresel Etki Metrikleri */}
      <div className="flex items-center space-x-3 text-[11px]">
        <div className="hidden md:flex items-center space-x-1 text-zinc-400">
          <Wind className="h-3.5 w-3.5 text-amber-400" />
          <span>RÜZGÂR:</span>
          <span className="text-zinc-200 font-semibold">
            {windDirection}° ({windSpeed} m/s)
          </span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-800 hidden md:block" />

        <div className="flex items-center space-x-1 text-zinc-400">
          <Trees className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden lg:inline">ÖNLENEN EMİSYON:</span>
          <span className="text-emerald-300 font-bold">{impact.preventedCo2Tons} T CO₂</span>
          {impact.riskAreaHectares > 0 && (
            <span className="text-zinc-500 text-[10px]">({impact.riskAreaHectares} Ha)</span>
          )}
        </div>
      </div>
    </header>
  );
};
