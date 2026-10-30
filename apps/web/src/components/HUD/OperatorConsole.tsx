import { Compass, Cpu, Flame, RotateCcw, Wind } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface OperatorConsoleProps {
  activeFireNodeId: number | null;
  windDirection: number;
  windSpeed: number;
  showWindLayer: boolean;
  onToggleFire: (nodeId: number) => void;
  onWindDirectionChange: (deg: number) => void;
  onToggleWindLayer: () => void;
  onResetCamera: () => void;
}

export const OperatorConsole: React.FC<OperatorConsoleProps> = ({
  activeFireNodeId,
  windDirection,
  windSpeed,
  showWindLayer,
  onToggleFire,
  onWindDirectionChange,
  onToggleWindLayer,
  onResetCamera,
}) => {
  return (
    <div className="fixed bottom-4 left-4 z-30 w-72 max-w-[calc(100vw-2rem)] select-none">
      <Card className="border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl">
        <CardHeader className="py-2.5 px-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
          <CardTitle className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Compass className="h-3.5 w-3.5 text-zinc-400" />
            <span>OPERATÖR KONSOLU</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetCamera}
            className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-zinc-100"
            title="Kamerayı Kuşbakışı Sıfırla"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Sıfırla
          </Button>
        </CardHeader>

        <CardContent className="p-3 space-y-3 text-xs font-mono">
          {/* 1. Yangın Senaryosu Butonları */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Senaryo Tetikleyicisi
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeFireNodeId === 14 ? "destructive" : "outline"}
                size="sm"
                className="w-full text-[11px] h-7"
                onClick={() => onToggleFire(14)}
              >
                <Flame className="h-3 w-3 mr-1" />
                {activeFireNodeId === 14 ? "Durdur" : "Düğüm #14"}
              </Button>

              <Button
                variant={activeFireNodeId === 31 ? "destructive" : "outline"}
                size="sm"
                className="w-full text-[11px] h-7"
                onClick={() => onToggleFire(31)}
              >
                <Cpu className="h-3 w-3 mr-1 text-sky-400" />
                {activeFireNodeId === 31 ? "Durdur" : "Wokwi #31"}
              </Button>
            </div>
          </div>

          {/* 2. Rüzgâr Azimut Slider */}
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-500 uppercase tracking-wider">Rüzgâr Azimutu</span>
              <span className="text-zinc-200 font-bold">
                {windDirection}° ({getCompassDirection(windDirection)})
              </span>
            </div>
            <Slider
              value={[windDirection]}
              min={0}
              max={360}
              step={5}
              onValueChange={([val]) => onWindDirectionChange(val)}
              className="py-1"
            />
            <div className="flex justify-between text-[9px] text-zinc-600">
              <span>0° (K)</span>
              <span>90° (D)</span>
              <span>180° (G)</span>
              <span>270° (B)</span>
              <span>360° (K)</span>
            </div>
          </div>

          {/* 3. Açılıp Kapanabilir Rüzgâr Katmanı Butonu */}
          <div className="pt-2 border-t border-zinc-800/60">
            <Button
              variant={showWindLayer ? "secondary" : "outline"}
              size="sm"
              className={`w-full text-[10px] h-6 flex items-center justify-between ${
                showWindLayer
                  ? "border-amber-600/60 bg-amber-950/40 text-amber-300"
                  : "text-zinc-400"
              }`}
              onClick={onToggleWindLayer}
            >
              <span className="flex items-center">
                <Wind className="h-3 w-3 mr-1.5 text-amber-400" />
                Rüzgâr Vektör Katmanı
              </span>
              <span className="font-bold text-[9px] uppercase">
                {showWindLayer ? "AÇIK" : "KAPALI"}
              </span>
            </Button>
          </div>

          {/* 4. Durum Özeti */}
          <div className="pt-1 text-[10px] text-zinc-500 flex justify-between items-center">
            <span>Rüzgâr Şiddeti:</span>
            <span className="text-zinc-300">{windSpeed} m/s (Hafif Esinti)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function getCompassDirection(deg: number): string {
  const directions = [
    "Kuzey",
    "Kuzeydoğu",
    "Doğu",
    "Güneydoğu",
    "Güney",
    "Güneybatı",
    "Batı",
    "Kuzeybatı",
  ];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}
