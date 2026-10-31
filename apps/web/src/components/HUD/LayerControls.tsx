import { ChevronDown, ChevronUp, Compass, Layers, RadioTower, Wind } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface LayerControlsProps {
  showWindParticles: boolean;
  onToggleWindParticles: () => void;
  showGatewayCoverage: boolean;
  onToggleGatewayCoverage: () => void;
  showStationVectors: boolean;
  onToggleStationVectors: () => void;
  windDirection?: number;
  windSpeed?: number;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  showWindParticles,
  onToggleWindParticles,
  showGatewayCoverage,
  onToggleGatewayCoverage,
  showStationVectors,
  onToggleStationVectors,
  windDirection,
  windSpeed,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <aside
      aria-label="Harita Katman Kontrolleri"
      className="fixed bottom-4 left-4 z-20 bg-zinc-950/90 border border-zinc-800 text-zinc-100 rounded-xl backdrop-blur-md shadow-2xl shadow-black/60 select-none font-sans text-xs transition-all w-60 overflow-hidden"
    >
      {/* Başlık ve Genişlet/Daralt Başlığı */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-zinc-300 hover:text-zinc-100 bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer border-b border-zinc-800/80"
      >
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <Layers className="h-3.5 w-3.5 text-sky-400" />
          <span className="font-semibold text-xs tracking-wider uppercase font-mono text-zinc-200">
            Katmanlar
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>

      {/* Katman Toggle Listesi */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {/* 1. Rüzgâr Parçacık Akışı */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Wind className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <div className="truncate">
                <span className="text-zinc-200 block text-xs leading-none">Rüzgâr Akışı</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {windDirection !== undefined && windSpeed !== undefined
                    ? `${windDirection}° • ${windSpeed.toFixed(1)} m/s`
                    : "Streamline Animasyonu"}
                </span>
              </div>
            </div>
            <Switch
              checked={showWindParticles}
              onCheckedChange={onToggleWindParticles}
              aria-label="Rüzgâr parçacık akışını aç veya kapat"
              className="data-[state=checked]:bg-sky-500 h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4 cursor-pointer"
            />
          </div>

          {/* 2. Gateway Kapsama Alanları */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <RadioTower className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="text-zinc-200 block text-xs leading-none">Gateway Kapsama</span>
                <span className="text-[10px] text-zinc-400 font-mono">LoRaWAN Menzil Alanı</span>
              </div>
            </div>
            <Switch
              checked={showGatewayCoverage}
              onCheckedChange={onToggleGatewayCoverage}
              aria-label="Gateway kapsama alanını aç veya kapat"
              className="data-[state=checked]:bg-blue-500 h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4 cursor-pointer"
            />
          </div>

          {/* 3. İstasyon Rüzgâr Vektörleri */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <Compass className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-zinc-200 block text-xs leading-none">İstasyon Okları</span>
                <span className="text-[10px] text-zinc-400 font-mono">3D Vektör Çizgileri</span>
              </div>
            </div>
            <Switch
              checked={showStationVectors}
              onCheckedChange={onToggleStationVectors}
              aria-label="İstasyon rüzgâr oklarını aç veya kapat"
              className="data-[state=checked]:bg-emerald-500 h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4 cursor-pointer"
            />
          </div>
        </div>
      )}
    </aside>
  );
};
