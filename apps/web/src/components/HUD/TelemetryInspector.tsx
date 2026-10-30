import {
  Activity,
  AlertTriangle,
  Battery,
  LineChart as ChartIcon,
  CloudFog,
  Cpu,
  Droplets,
  Mountain,
  Radio,
  ShieldCheck,
  Thermometer,
  TrendingUp,
  Wind,
  X,
} from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  // Çıkış animasyonu sırasında DOM'un anında unmount olmasını engellemek için son referansı sakla
  const lastStationRef = useRef<SensorStation | null>(station);
  const lastReadingRef = useRef<TelemetryReading | null>(reading);

  if (station) lastStationRef.current = station;
  if (reading) lastReadingRef.current = reading;

  const currentStation = station ?? lastStationRef.current;
  const currentReading = reading ?? lastReadingRef.current;

  if (!currentStation || !currentReading) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="bg-zinc-950 border border-zinc-800/90 text-zinc-100 shadow-2xl shadow-black/80 rounded-2xl overflow-hidden focus:outline-none select-none font-sans antialiased data-[vaul-drawer-direction=right]:top-11 data-[vaul-drawer-direction=right]:bottom-2.5 data-[vaul-drawer-direction=right]:right-2.5 data-[vaul-drawer-direction=right]:h-[calc(100vh-3.5rem)] data-[vaul-drawer-direction=right]:max-h-[calc(100vh-3.5rem)] data-[vaul-drawer-direction=right]:w-[calc(100vw-1.25rem)] data-[vaul-drawer-direction=right]:sm:w-[420px] data-[vaul-drawer-direction=right]:sm:max-w-[420px] data-[vaul-drawer-direction=right]:rounded-2xl data-[vaul-drawer-direction=right]:border data-[vaul-drawer-direction=right]:border-zinc-800">
        {/* Üst Başlık Şeridi: Net Hiyerarşi & Sade Tasarım */}
        <DrawerHeader className="relative px-4 pt-4 pb-2 bg-zinc-950 text-left">
          {/* 1. Satır: Kategori Kicker ve Zarif Canlı Durum İndikatörü */}
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                İSTASYON #{currentStation.id}
              </span>
              {currentStation.isHardware && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-zinc-900 text-zinc-300 border border-zinc-800">
                  <Cpu className="h-3 w-3 text-sky-400" />
                  Wokwi ESP32
                </span>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                currentReading.riskLevel === "fire"
                  ? "text-red-400"
                  : currentReading.riskLevel === "smoldering"
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentReading.riskLevel === "fire"
                    ? "bg-red-400 animate-pulse"
                    : currentReading.riskLevel === "smoldering"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-emerald-400"
                }`}
              />
              {currentReading.riskLevel === "fire"
                ? "Aktif Yangın"
                : currentReading.riskLevel === "smoldering"
                  ? "Tütme Riski"
                  : "Stabil"}
            </span>
          </div>

          {/* 2. Satır: Ana İstasyon Adı */}
          <DrawerTitle className="text-lg font-semibold text-zinc-100 tracking-tight pt-1 leading-snug">
            {currentStation.name}
          </DrawerTitle>

          {/* 3. Satır: Koordinat ve Rakım Bilgileri */}
          <DrawerDescription className="text-xs text-zinc-400 flex items-center gap-2 pt-0.5">
            <span className="font-mono text-zinc-300">
              {currentStation.lat.toFixed(4)}° N, {currentStation.lng.toFixed(4)}° E
            </span>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1 text-zinc-300 font-medium">
              <Mountain className="h-3.5 w-3.5 text-zinc-500" />
              {currentStation.elevation} m Rakım
            </span>
          </DrawerDescription>

          <DrawerClose className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Kapat</span>
          </DrawerClose>
        </DrawerHeader>

        {/* Tab Menüsü & İçerik Alanı */}
        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
          <Tabs defaultValue="telemetry" className="flex-1 flex flex-col overflow-hidden">
            {/* Segmented Control: Kusursuz Boşluk & Çerçeveli Ayırıcı */}
            <div className="px-4 pb-3 pt-1 border-b border-zinc-800/80 bg-zinc-950 shrink-0">
              <TabsList className="grid grid-cols-3 gap-1 w-full bg-zinc-900/90 border border-zinc-800/80 h-10 p-1 rounded-xl">
                <TabsTrigger
                  value="telemetry"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent ring-0 ring-offset-0 ring-transparent [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important] data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-none hover:text-zinc-200 hover:bg-zinc-800/40 select-none cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-emerald-400" />
                  Telemetri
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent ring-0 ring-offset-0 ring-transparent [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important] data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-none hover:text-zinc-200 hover:bg-zinc-800/40 select-none cursor-pointer"
                >
                  <ChartIcon className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-amber-400" />
                  Analitik
                </TabsTrigger>
                <TabsTrigger
                  value="hardware"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent ring-0 ring-offset-0 ring-transparent [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important] data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-none hover:text-zinc-200 hover:bg-zinc-800/40 select-none cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-sky-400" />
                  Donanım
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Canlı Telemetri */}
            <TabsContent
              value="telemetry"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important]"
            >
              {/* Yangın & Anomali Risk Skoru Kartı */}
              <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-400">Yangın & Anomali Risk Skoru</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      currentReading.riskScore > 70
                        ? "text-red-400"
                        : currentReading.riskScore > 30
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {currentReading.riskScore} / 100
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800/80">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      currentReading.riskScore > 70
                        ? "bg-red-500"
                        : currentReading.riskScore > 30
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(4, currentReading.riskScore)}%` }}
                  />
                </div>
              </div>

              {/* 4 Temel Metrik (Okunaklı & Yüksek Kontrastlı Grid) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Sıcaklık */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                      Sıcaklık
                    </span>
                    {currentReading.tempRate !== 0 && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          currentReading.tempRate > 0
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {currentReading.tempRate > 0
                          ? `+${currentReading.tempRate}`
                          : currentReading.tempRate}
                        °/dk
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      {currentReading.temperature}
                    </span>
                    <span className="text-xs font-normal text-zinc-400">°C</span>
                  </div>
                </div>

                {/* Karbonmonoksit */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      CO Gazı
                    </span>
                    {currentReading.coRate !== 0 && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          currentReading.coRate > 0
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {currentReading.coRate > 0
                          ? `+${currentReading.coRate}`
                          : currentReading.coRate}{" "}
                        ppm/dk
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      {currentReading.co}
                    </span>
                    <span className="text-xs font-normal text-zinc-400">ppm</span>
                  </div>
                </div>

                {/* Bağıl Nem */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Droplets className="h-3.5 w-3.5 text-sky-400" />
                      Bağıl Nem
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      %{currentReading.humidity}
                    </span>
                  </div>
                </div>

                {/* AQI İndeksi */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <CloudFog className="h-3.5 w-3.5 text-indigo-400" />
                      Hava Kalitesi
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      {currentReading.aqi}
                    </span>
                    <span className="text-xs font-normal text-zinc-400">/ 500 AQI</span>
                  </div>
                </div>
              </div>

              {/* Rüzgâr Durum Kutusu */}
              <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1.5 hover:border-zinc-700/80 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                    <Wind className="h-3.5 w-3.5 text-zinc-400" />
                    Yerel Rüzgâr
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {currentReading.windDirection}° Azimut
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100">
                      {currentReading.windSpeed}
                    </span>
                    <span className="text-xs font-normal text-zinc-400">m/s</span>
                  </div>
                  <span className="text-xs text-zinc-300 font-medium">
                    {getCompass(currentReading.windDirection)} Rüzgârı
                  </span>
                </div>
              </div>

              {/* Batarya Bilgi Şeridi */}
              <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-emerald-400" />
                  <span className="text-zinc-400 font-medium">Batarya:</span>
                  <span className="font-mono font-semibold text-zinc-100">
                    %{currentReading.battery} (3.92V)
                  </span>
                </div>
                <span className="text-zinc-500 text-xs">3.7V LiFePO4 Güneş Destekli</span>
              </div>
            </TabsContent>

            {/* TAB 2: Analitik & Zaman Serisi */}
            <TabsContent
              value="analytics"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important]"
            >
              {/* Canlı Grafik */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    Canlı Telemetri Trendi (25s)
                  </span>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-rose-400">● Sıcaklık</span>
                    <span className="text-amber-400">● CO ppm</span>
                  </div>
                </div>

                <div className="h-44 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="updatedAt" hide />
                      <YAxis stroke="#52525b" fontSize={10} domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#27272a",
                          fontSize: "11px",
                          fontFamily: "sans-serif",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        name="Sıcaklık (°C)"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="co"
                        name="CO (ppm)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Türevsel Erken Algılama Analizi */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
                <span className="text-xs font-semibold text-zinc-300 block">
                  Türevsel Erken Algılama İndikatörleri
                </span>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-xs text-zinc-400 block">Sıcaklık Artış Hızı (ΔT/Δt)</span>
                    <div className="mt-1">
                      <span
                        className={`text-base font-bold font-mono ${
                          currentReading.tempRate > 1.5 ? "text-rose-400" : "text-zinc-100"
                        }`}
                      >
                        {currentReading.tempRate > 0
                          ? `+${currentReading.tempRate}`
                          : currentReading.tempRate}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono ml-1">°C/dk</span>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-xs text-zinc-400 block">CO Gaz Artış Hızı (ΔCO/Δt)</span>
                    <div className="mt-1">
                      <span
                        className={`text-base font-bold font-mono ${
                          currentReading.coRate > 5 ? "text-amber-400" : "text-zinc-100"
                        }`}
                      >
                        {currentReading.coRate > 0
                          ? `+${currentReading.coRate}`
                          : currentReading.coRate}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono ml-1">ppm/dk</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Donanım & Sensörler */}
            <TabsContent
              value="hardware"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important]"
            >
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 border-b border-zinc-800/80 pb-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Saha Sensör Modülü Özellikleri
                </div>

                <div className="space-y-2.5 text-xs divide-y divide-zinc-800/40">
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-zinc-400">Mikrodenetleyici</span>
                    <span className="text-zinc-200 font-mono">
                      {currentStation.isHardware
                        ? "ESP32-WROOM-32E (Wokwi)"
                        : "Nordic nRF52840 / LoRa"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Gaz Algılama Sensörü</span>
                    <span className="text-zinc-200 font-medium">MQ-7 Elektrokimyasal CO</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Ortam Sensörü</span>
                    <span className="text-zinc-200 font-medium">Bosch BME680 (Nem, Sıcaklık)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Rüzgâr Anemometresi</span>
                    <span className="text-zinc-200 font-medium">Hall-Effect Sayısal Sensör</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">İletişim Altyapısı</span>
                    <span className="text-sky-300 font-mono">LoRaWAN 868 MHz (Semtech SX1262)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Telemetri Paketi</span>
                    <span className="text-zinc-200 font-mono">10-Bayt Binary + CRC-8</span>
                  </div>
                </div>
              </div>

              {/* Coğrafi Konum Kartı */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 text-xs">
                <span className="text-zinc-400 font-medium block">Topografik Arazi Konumu</span>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Enlem / Boylam:</span>
                    <span className="text-zinc-200 font-mono">
                      {currentStation.lat.toFixed(4)}°N, {currentStation.lng.toFixed(4)}°E
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Zirve Rakımı:</span>
                    <span className="text-zinc-200 font-medium">
                      {currentStation.elevation} Metre
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Standart DrawerFooter Bileşeni */}
        <DrawerFooter className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 flex flex-row items-center justify-between shrink-0 m-0">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>Son İletim:</span>
            <span className="font-mono text-zinc-200">{currentReading.updatedAt}</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-500">CRC-8: DOĞRULANDI</span>
        </DrawerFooter>
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
