import {
  AlertTriangle,
  Battery,
  CloudFog,
  Cpu,
  Droplets,
  Mountain,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import type React from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { SensorStation, TelemetryReading } from "../../types/simulation";

interface TelemetryInspectorProps {
  station: SensorStation | null;
  reading: TelemetryReading | null;
  history: TelemetryReading[];
  isOpen: boolean;
  onClose: () => void;
}

export const TelemetryInspector: React.FC<TelemetryInspectorProps> = ({
  station,
  reading,
  history,
  isOpen,
  onClose,
}) => {
  if (!station || !reading) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent
        direction="right"
        className="w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 text-zinc-100 font-mono select-none"
      >
        {/* Üst Başlık Şeridi */}
        <DrawerHeader className="relative pb-3 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between pr-7">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-500 text-xs">İSTASYON #{station.id}</span>
              {station.isHardware && (
                <Badge
                  variant="outline"
                  className="border-sky-700 bg-sky-950/60 text-sky-300 text-[10px]"
                >
                  <Cpu className="h-3 w-3 mr-1" />
                  WOKWI DONANIM
                </Badge>
              )}
            </div>
            <Badge
              variant={reading.riskLevel === "fire" ? "destructive" : "outline"}
              className={
                reading.riskLevel === "smoldering"
                  ? "border-amber-600 bg-amber-950/60 text-amber-300"
                  : reading.riskLevel === "normal"
                    ? "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                    : ""
              }
            >
              {reading.riskLevel === "fire"
                ? "AKTİF YANGIN"
                : reading.riskLevel === "smoldering"
                  ? "TÜTME ANOMALİSİ"
                  : "STABİL"}
            </Badge>
          </div>

          <DrawerTitle className="text-sm font-semibold text-zinc-100 pt-1">
            {station.name}
          </DrawerTitle>

          <DrawerDescription className="text-[11px] text-zinc-400 flex items-center space-x-3 pt-0.5">
            <span>Enlem: {station.lat.toFixed(4)}°</span>
            <span>Boylam: {station.lng.toFixed(4)}°</span>
            <span className="flex items-center">
              <Mountain className="h-3 w-3 mr-1 text-zinc-500" />
              {station.elevation} m
            </span>
          </DrawerDescription>

          <DrawerClose className="absolute right-3 top-3 rounded-xs p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Kapat</span>
          </DrawerClose>
        </DrawerHeader>

        {/* Scrollable Gövde (Custom Scrollbar Entegre) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 custom-scrollbar bg-zinc-950">
          {/* 1. Anlık Metrikler Grid (Sıcaklık, CO, Nem, AQI, Rüzgâr) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xs bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                <span className="flex items-center">
                  <Thermometer className="h-3 w-3 mr-1 text-rose-400" />
                  SICAKLIK
                </span>
                {reading.tempRate !== 0 && (
                  <span
                    className={reading.tempRate > 0 ? "text-rose-400 font-bold" : "text-zinc-500"}
                  >
                    {reading.tempRate > 0 ? `+${reading.tempRate}` : reading.tempRate}°/dk
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-zinc-100 pt-1">
                {reading.temperature} <span className="text-xs font-normal text-zinc-500">°C</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xs bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                <span className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-400" />
                  KARBONMONOKSİT
                </span>
                {reading.coRate !== 0 && (
                  <span
                    className={reading.coRate > 0 ? "text-amber-400 font-bold" : "text-zinc-500"}
                  >
                    {reading.coRate > 0 ? `+${reading.coRate}` : reading.coRate} ppm/dk
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-zinc-100 pt-1">
                {reading.co} <span className="text-xs font-normal text-zinc-500">ppm</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xs bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                <span className="flex items-center">
                  <Droplets className="h-3 w-3 mr-1 text-sky-400" />
                  BAĞIL NEM
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-200 pt-1">%{reading.humidity}</div>
            </div>

            <div className="p-2.5 rounded-xs bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                <span className="flex items-center">
                  <CloudFog className="h-3 w-3 mr-1 text-indigo-400" />
                  HAVA KALİTESİ (AQI)
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-200 pt-1">
                {reading.aqi} <span className="text-[10px] font-normal text-zinc-500">/ 500</span>
              </div>
            </div>

            <div className="col-span-2 p-2.5 rounded-xs bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                <span className="flex items-center">
                  <Wind className="h-3 w-3 mr-1 text-zinc-400" />
                  RÜZGÂR (HIZ & YÖN)
                </span>
                <span className="text-zinc-300 font-semibold">{reading.windDirection}° Azimut</span>
              </div>
              <div className="text-base font-bold text-zinc-100 pt-1 flex items-center justify-between">
                <span>{reading.windSpeed} m/s</span>
                <span className="text-xs font-normal text-zinc-400">
                  {getCompass(reading.windDirection)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Anomali Skoru ve Batarya */}
          <div className="p-2.5 rounded-xs bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Yangın Anomali Skoru:</span>
              <span
                className={`font-bold ${
                  reading.riskScore > 60
                    ? "text-rose-400"
                    : reading.riskScore > 30
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                {reading.riskScore} / 100
              </span>
            </div>

            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  reading.riskScore > 60
                    ? "bg-rose-500"
                    : reading.riskScore > 30
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${reading.riskScore}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
              <span className="flex items-center">
                <Battery className="h-3 w-3 mr-1 text-emerald-400" />
                Pil Seviyesi: %{reading.battery}
              </span>
              <span>Son Telemetri: {reading.updatedAt}</span>
            </div>
          </div>

          {/* 3. Recharts Canlı Zaman Serisi Türev Grafiği */}
          <div className="space-y-2 pt-1 pb-4">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider flex justify-between">
              <span>Gaz (CO) ve Sıcaklık Eğrisi</span>
              <span className="text-[10px] text-zinc-500">Son 25 Sn</span>
            </div>

            <div className="h-44 w-full rounded-xs bg-zinc-900/90 border border-zinc-800 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="updatedAt" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      fontSize: "10px",
                      color: "#e4e4e7",
                      borderRadius: "2px",
                    }}
                    itemStyle={{ padding: "0px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="co"
                    name="CO (ppm)"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Sıcaklık (°C)"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-4 text-[10px] text-zinc-400">
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-1" />
                CO (ppm)
              </span>
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-rose-500 mr-1" />
                Sıcaklık (°C)
              </span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function getCompass(deg: number): string {
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
