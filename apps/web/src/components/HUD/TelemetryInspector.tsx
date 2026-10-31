import type { NodeRisk, SensorNode, TelemetryMessage } from "@pyros/shared";
import {
  Activity,
  AlertTriangle,
  Battery,
  LineChart as ChartIcon,
  CloudFog,
  Cpu,
  Droplets,
  Flame,
  Gauge,
  Layers,
  Radio,
  Share2,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TrendingUp,
  Wind,
  X,
  Zap,
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

interface TelemetryInspectorProps {
  station: SensorNode | null;
  telemetry: TelemetryMessage | null;
  risk: NodeRisk | null;
  history: TelemetryMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSelectStation?: (stationId: number) => void;
}

export const TelemetryInspector: React.FC<TelemetryInspectorProps> = ({
  station,
  telemetry,
  risk,
  history,
  isOpen,
  onClose,
  onSelectStation,
}) => {
  // Çıkış animasyonu sırasında DOM'un anında unmount olmasını engellemek için son referansı sakla
  const lastStationRef = useRef<SensorNode | null>(station);
  const lastTelemetryRef = useRef<TelemetryMessage | null>(telemetry);
  const lastRiskRef = useRef<NodeRisk | null>(risk);

  // İstasyon değiştiğinde eski istasyonun telemetrisinin sızmasını engelle
  if (station && lastStationRef.current && station.id !== lastStationRef.current.id) {
    lastTelemetryRef.current = null;
    lastRiskRef.current = null;
  }

  if (station) lastStationRef.current = station;
  if (telemetry) lastTelemetryRef.current = telemetry;
  if (risk) lastRiskRef.current = risk;

  const currentStation = station ?? lastStationRef.current;
  const currentTelemetry = telemetry ?? lastTelemetryRef.current;
  const currentRisk = risk ?? lastRiskRef.current;

  if (!currentStation) return null;

  const isFire = currentRisk?.level === "red";
  const isSmoldering = currentRisk?.level === "yellow";
  const riskScore = currentRisk?.score ?? 0;

  // 1. Fiziksel Metrik: Buhar Basıncı Açığı (VPD - kPa)
  const vpdValue =
    currentRisk?.vpd ??
    (() => {
      if (!currentTelemetry) return null;
      const t = currentTelemetry.temperature;
      const rh = currentTelemetry.humidity;
      const es = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
      const ea = es * (rh / 100);
      return Math.max(0, es - ea);
    })();

  const isCriticalVpd = (vpdValue ?? 0) > 2.2;
  const isElevatedVpd = (vpdValue ?? 0) > 1.2;

  // 2. Donanım & Protokol: Çalışma Modu ve Bayraklar
  const isAlertMode = currentTelemetry?.mode === 1;
  const flags = currentTelemetry?.flags ?? 0;
  const flagLowBattery = Boolean(flags & 0x01);
  const flagTamper = Boolean(flags & 0x02);
  const flagSensorError = Boolean(flags & 0x04);
  const flagEmergency = Boolean(flags & 0x08);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl shadow-black/80 rounded-2xl overflow-hidden focus:outline-none select-none font-sans antialiased data-[vaul-drawer-direction=right]:!top-14 data-[vaul-drawer-direction=right]:!bottom-3 data-[vaul-drawer-direction=right]:!right-3 data-[vaul-drawer-direction=right]:!h-[calc(100vh-4.25rem)] data-[vaul-drawer-direction=right]:!max-h-[calc(100vh-4.25rem)] data-[vaul-drawer-direction=right]:!w-[calc(100vw-1.5rem)] data-[vaul-drawer-direction=right]:sm:!w-[440px] data-[vaul-drawer-direction=right]:sm:!max-w-[440px] data-[vaul-drawer-direction=right]:!rounded-2xl data-[vaul-drawer-direction=right]:!border data-[vaul-drawer-direction=right]:!border-zinc-800">
        {/* Üst Başlık Şeridi: Net Hiyerarşi & Sade Tasarım */}
        <DrawerHeader className="relative px-4 pt-4 pb-2 bg-zinc-950 text-left">
          {/* 1. Satır: Kategori Kicker ve Canlı Durum İndikatörü */}
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                İSTASYON #{currentStation.id}
              </span>
              {currentStation.source === "wokwi" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-zinc-900 text-zinc-300 border border-zinc-800">
                  <Cpu className="h-3 w-3 text-sky-400" />
                  Wokwi ESP32
                </span>
              )}
              {isAlertMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                  <Flame className="h-2.5 w-2.5 text-rose-400" />
                  ACİL MOD (3s)
                </span>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                !currentTelemetry
                  ? "text-zinc-400"
                  : isFire
                    ? "text-red-400"
                    : isSmoldering
                      ? "text-amber-400"
                      : "text-emerald-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  !currentTelemetry
                    ? "bg-zinc-500 animate-pulse"
                    : isFire
                      ? "bg-red-400 animate-pulse"
                      : isSmoldering
                        ? "bg-amber-400 animate-pulse"
                        : "bg-emerald-400"
                }`}
              />
              {!currentTelemetry
                ? "Sinyal Bekleniyor"
                : isFire
                  ? "Aktif Yangın"
                  : isSmoldering
                    ? currentRisk?.stage === "pyrolysis"
                      ? "Piroliz Anomalisi"
                      : "Tütme Riski"
                    : "Stabil"}
            </span>
          </div>

          {/* 2. Satır: Ana İstasyon Adı */}
          <DrawerTitle className="text-lg font-semibold text-zinc-100 tracking-tight pt-1 leading-snug">
            {currentStation.name}
          </DrawerTitle>

          {/* 3. Satır: Koordinat Bilgileri */}
          <DrawerDescription className="text-xs text-zinc-400 flex items-center justify-between pt-1">
            <span className="font-mono text-zinc-300 whitespace-nowrap">
              {currentStation.lat.toFixed(4)}° N, {currentStation.lng.toFixed(4)}° E
            </span>
            <span className="flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
              LoRa EU868
            </span>
          </DrawerDescription>

          <DrawerClose className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors focus:outline-none cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Kapat</span>
          </DrawerClose>
        </DrawerHeader>

        {/* Tab Menüsü & İçerik Alanı */}
        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
          <Tabs defaultValue="telemetry" className="flex-1 flex flex-col overflow-hidden">
            {/* Segmented Control */}
            <div className="px-4 pb-3 pt-1 border-b border-zinc-800/80 bg-zinc-950 shrink-0">
              <TabsList className="grid grid-cols-3 gap-1 w-full bg-zinc-900/90 border border-zinc-800/80 h-10 p-1 rounded-xl">
                <TabsTrigger
                  value="telemetry"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 select-none cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-emerald-400" />
                  Telemetri
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 select-none cursor-pointer"
                >
                  <ChartIcon className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-amber-400" />
                  Analitik
                </TabsTrigger>
                <TabsTrigger
                  value="hardware"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 select-none cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-sky-400" />
                  Donanım
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Canlı Telemetri */}
            <TabsContent
              value="telemetry"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none"
            >
              {!currentTelemetry ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-6 text-center space-y-3 bg-zinc-900/30 rounded-xl border border-zinc-800/80">
                  <Radio className="h-10 w-10 text-zinc-600 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-200">Canlı Telemetri Bekleniyor</p>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                      {currentStation.source === "wokwi"
                        ? "Wokwi simülatöründen henüz UDP paketi iletilmedi."
                        : "Bu istasyon için henüz Gateway üzerinden paket iletilmedi."}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Yangın & Anomali Risk Skoru Kartı */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-400">Yangın & Anomali Risk Skoru</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          riskScore > 70
                            ? "text-red-400"
                            : riskScore > 30
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {riskScore} / 100
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800/80">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          riskScore > 70
                            ? "bg-red-500"
                            : riskScore > 30
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.max(4, riskScore)}%` }}
                      />
                    </div>
                  </div>

                  {/* 4 Temel Metrik (Sıcaklık, CO, Nem, CO2) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Sıcaklık */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                          Sıcaklık
                        </span>
                        {currentRisk?.rate.temperature !== undefined &&
                          currentRisk.rate.temperature !== 0 && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-medium ${
                                currentRisk.rate.temperature > 0
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {currentRisk.rate.temperature > 0
                                ? `+${currentRisk.rate.temperature.toFixed(1)}`
                                : currentRisk.rate.temperature.toFixed(1)}
                              °/dk
                            </span>
                          )}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                          {currentTelemetry.temperature.toFixed(1)}
                        </span>
                        <span className="text-xs font-normal text-zinc-400">°C</span>
                      </div>
                    </div>

                    {/* Karbonmonoksit */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          CO Gazı
                        </span>
                        {currentRisk?.rate.co !== undefined && currentRisk.rate.co !== 0 && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-medium ${
                              currentRisk.rate.co > 0
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {currentRisk.rate.co > 0
                              ? `+${currentRisk.rate.co.toFixed(1)}`
                              : currentRisk.rate.co.toFixed(1)}{" "}
                            ppm/dk
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                          {currentTelemetry.co.toFixed(1)}
                        </span>
                        <span className="text-xs font-normal text-zinc-400">ppm</span>
                      </div>
                    </div>

                    {/* Bağıl Nem */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Droplets className="h-3.5 w-3.5 text-sky-400" />
                          Bağıl Nem
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                          %{Math.round(currentTelemetry.humidity)}
                        </span>
                      </div>
                    </div>

                    {/* CO2 Seviyesi */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <CloudFog className="h-3.5 w-3.5 text-indigo-400" />
                          Karbondioksit
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                          {Math.round(currentTelemetry.co2)}
                        </span>
                        <span className="text-xs font-normal text-zinc-400">ppm</span>
                      </div>
                    </div>
                  </div>

                  {/* YENİ: VPD ve PM2.5 Fiziksel Analiz Kartları (Item 1 & Item 2) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Buhar Basıncı Açığı (VPD) */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Gauge className="h-3.5 w-3.5 text-orange-400" />
                          VPD Kuruluk
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isCriticalVpd
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : isElevatedVpd
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {isCriticalVpd ? "Kritik" : isElevatedVpd ? "Yüksek" : "Nominal"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
                          {vpdValue !== null ? vpdValue.toFixed(2) : "--"}
                        </span>
                        <span className="text-xs font-normal text-zinc-400">kPa</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-1 truncate">
                        Orman tutuşma potansiyeli
                      </span>
                    </div>

                    {/* PM2.5 Duman & Partikül */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Layers className="h-3.5 w-3.5 text-purple-400" />
                          PM2.5 Duman
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          SPS30
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
                          {currentTelemetry.pm25 !== null
                            ? Math.round(currentTelemetry.pm25)
                            : "--"}
                        </span>
                        <span className="text-xs font-normal text-zinc-400">µg/m³</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-1 truncate">
                        Lazer optik partikül yoğunluğu
                      </span>
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
                        {currentTelemetry.windDirection !== null
                          ? `${Math.round(currentTelemetry.windDirection)}° Azimut`
                          : "İnterpole"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-zinc-100">
                          {currentTelemetry.windSpeed !== null
                            ? currentTelemetry.windSpeed.toFixed(1)
                            : "3.5"}
                        </span>
                        <span className="text-xs font-normal text-zinc-400">m/s</span>
                      </div>
                      <span className="text-xs text-zinc-300 font-medium">
                        {currentTelemetry.windDirection !== null
                          ? `${getCompass(currentTelemetry.windDirection)} Rüzgârı`
                          : "Bölgesel Akış"}
                      </span>
                    </div>
                  </div>

                  {/* Batarya & Donanım Modu Şeridi */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4 text-emerald-400" />
                      <span className="text-zinc-400 font-medium">Batarya:</span>
                      <span className="font-mono font-semibold text-zinc-100">
                        %{currentTelemetry.battery}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-zinc-400">
                        {isAlertMode ? "Mod: 3s Alarm" : "Mod: 60s Normal"}
                      </span>
                      {flags > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono">
                          Bayrak: {flags}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* TAB 2: Analitik & Füzyon (Item 1: accel, delta, signals, confirmedBy, pm25 grafiği) */}
            <TabsContent
              value="analytics"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none"
            >
              {history.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center space-y-3 bg-zinc-900/30 rounded-xl border border-zinc-800/80">
                  <Activity className="h-10 w-10 text-zinc-600 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-200">Kayıtlı Örnek Bulunamadı</p>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                      Telemetri paketleri geldikçe canlı zaman serisi trendi burada
                      görselleştirilir.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Canlı Çok Kanallı Grafik (Sıcaklık, CO ve PM2.5) */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-amber-400" />
                        Telemetri Trendi ({history.length} Örnek)
                      </span>
                      <div className="flex items-center gap-2.5 text-[10px] font-mono">
                        <span className="text-rose-400">● Sıcaklık</span>
                        <span className="text-amber-400">● CO</span>
                        <span className="text-purple-400">● PM2.5</span>
                      </div>
                    </div>

                    <div className="h-44 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={history}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis dataKey="receivedAt" hide />
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
                          <Line
                            type="monotone"
                            dataKey="pm25"
                            name="PM2.5 (µg/m³)"
                            stroke="#c084fc"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 4 Bağımsız Sensör Füzyon Sinyal Matrisi (Item 1) */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                        4'lü Sensör Füzyon Matrisi
                      </span>
                      <span className="font-mono text-[11px] font-bold text-sky-400">
                        {currentRisk?.signalCount ?? 0} / 4 Sinyal Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* earlyGas */}
                      <div
                        className={`p-2.5 rounded-lg border ${
                          currentRisk?.signals.earlyGas
                            ? "bg-rose-950/60 border-rose-700 text-rose-200"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Erken Piroliz Gazı</span>
                          <span className="font-mono font-bold">
                            {currentRisk?.signals.earlyGas ? "TETİK" : "OK"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          SGP40 VOC Endeksi
                        </span>
                      </div>

                      {/* carbonMonoxide */}
                      <div
                        className={`p-2.5 rounded-lg border ${
                          currentRisk?.signals.carbonMonoxide
                            ? "bg-amber-950/60 border-amber-700 text-amber-200"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Karbonmonoksit</span>
                          <span className="font-mono font-bold">
                            {currentRisk?.signals.carbonMonoxide ? "TETİK" : "OK"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          MQ-7 Elektrokimyasal
                        </span>
                      </div>

                      {/* smoke */}
                      <div
                        className={`p-2.5 rounded-lg border ${
                          currentRisk?.signals.smoke
                            ? "bg-purple-950/60 border-purple-700 text-purple-200"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Duman & Partikül</span>
                          <span className="font-mono font-bold">
                            {currentRisk?.signals.smoke ? "TETİK" : "OK"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          SPS30 Lazer Optik
                        </span>
                      </div>

                      {/* combustion */}
                      <div
                        className={`p-2.5 rounded-lg border ${
                          currentRisk?.signals.combustion
                            ? "bg-red-950/60 border-red-700 text-red-200"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Termal Alevlenme</span>
                          <span className="font-mono font-bold">
                            {currentRisk?.signals.combustion ? "TETİK" : "OK"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          BME688 Isı Dalgası
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* İvme & Flashover (2. Türev) ve EWMA Taban Sapması (Item 1) */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5 text-xs">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      İkinci Türev (İvme) & Taban Sapması
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Sıcaklık İvmesi */}
                      <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">
                          Sıcaklık İvmesi (Flashover)
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono font-bold text-sm text-zinc-200">
                            {currentRisk?.accel.temperature !== undefined
                              ? currentRisk.accel.temperature > 0
                                ? `+${currentRisk.accel.temperature.toFixed(2)}`
                                : currentRisk.accel.temperature.toFixed(2)
                              : "0.00"}
                          </span>
                          <span className="text-[10px] text-zinc-500">°C/dk²</span>
                        </div>
                      </div>

                      {/* CO2 İvmesi */}
                      <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">CO₂ İvmesi</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-mono font-bold text-sm text-zinc-200">
                            {currentRisk?.accel.co2 !== undefined
                              ? currentRisk.accel.co2 > 0
                                ? `+${currentRisk.accel.co2.toFixed(1)}`
                                : currentRisk.accel.co2.toFixed(1)
                              : "0.0"}
                          </span>
                          <span className="text-[10px] text-zinc-500">ppm/dk²</span>
                        </div>
                      </div>
                    </div>

                    {/* EWMA Taban Sapma Tablosu */}
                    <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold block">
                        Temiz Ortam EWMA Taban Sapmaları (Δ):
                      </span>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-0.5">
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Δ Sıcaklık:</span>
                          <span className="text-zinc-200 font-bold">
                            {currentRisk?.delta.temperature
                              ? `${currentRisk.delta.temperature > 0 ? "+" : ""}${currentRisk.delta.temperature.toFixed(1)}°`
                              : "--"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Δ CO Gazı:</span>
                          <span className="text-amber-400 font-bold">
                            {currentRisk?.delta.co
                              ? `${currentRisk.delta.co > 0 ? "+" : ""}${currentRisk.delta.co.toFixed(1)} ppm`
                              : "--"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[10px] block">Δ CO₂:</span>
                          <span className="text-zinc-200 font-bold">
                            {currentRisk?.delta.co2
                              ? `${currentRisk.delta.co2 > 0 ? "+" : ""}${Math.round(currentRisk.delta.co2)} ppm`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Komşu İstasyon Doğrulaması (Item 1: confirmedBy) */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-emerald-400" />
                        Çapraz Komşu Teyidi
                      </span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          currentRisk?.confirmed ? "text-emerald-400" : "text-zinc-400"
                        }`}
                      >
                        {currentRisk?.confirmed
                          ? `${currentRisk.confirmedBy.length} Komşu Doğruladı`
                          : "Tekil İstasyon"}
                      </span>
                    </div>

                    {currentRisk && currentRisk.confirmedBy.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-zinc-400">Doğrulayan Düğümler:</span>
                        {currentRisk.confirmedBy.map((nId) => (
                          <button
                            key={nId}
                            type="button"
                            onClick={() => onSelectStation?.(nId)}
                            className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-mono text-[11px] font-bold transition-colors cursor-pointer"
                            title={`Düğüm #${nId} detayına odaklan`}
                          >
                            #{nId}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        300m etki yarıçapında yangını doğrulayan başka komşu istasyon henüz yok.
                      </p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* TAB 3: Donanım & Sensör Tanı Tablosu (Item 2: flags & mode) */}
            <TabsContent
              value="hardware"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none"
            >
              {/* Donanım Sağlık ve Bayrak Tanı Paneli (Item 2) */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-zinc-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Donanım & Protokol Tanısı</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    Bayrak Kodu: 0x{flags.toString(16).padStart(2, "0")}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-400">LoRaWAN Çalışma Modu</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        isAlertMode ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {isAlertMode ? "ALARM (3 sn döngü)" : "NORMAL (60 sn uyku)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-400">Batarya / Düşük Voltaj (0x01)</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        flagLowBattery ? "text-rose-400 font-bold" : "text-emerald-400"
                      }`}
                    >
                      {flagLowBattery ? "DÜŞÜK VOLTAJ UYARISI" : "NORMAL (LiFePO4 OK)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-400">Kasa Sabotaj Switch (0x02)</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        flagTamper ? "text-rose-400 font-bold" : "text-emerald-400"
                      }`}
                    >
                      {flagTamper ? "KAPAK AÇIK / İHLAL" : "GÜVENLİ (Mühürlü)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-400">Sensör Kalibrasyon (0x04)</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        flagSensorError ? "text-amber-400 font-bold" : "text-emerald-400"
                      }`}
                    >
                      {flagSensorError ? "I2C BUS / OKUMA HATASI" : "TÜM SENSÖRLER SAĞLIKLI"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-400">Yüksek Öncelikli Paket (0x08)</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        flagEmergency ? "text-rose-400 font-bold" : "text-zinc-400"
                      }`}
                    >
                      {flagEmergency ? "ACİL ÖNCELİKLİ YAYIN" : "STANDART TELEMETRİ"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensör Modülleri Detayları */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3 text-xs">
                <span className="text-zinc-300 font-semibold block">
                  Sensör Donanım Konfigürasyonu
                </span>
                <div className="space-y-2 divide-y divide-zinc-800/40">
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-zinc-400">Mikrodenetleyici</span>
                    <span className="text-zinc-200 font-mono">
                      {currentStation.source === "wokwi"
                        ? "ESP32-WROOM-32E (Wokwi)"
                        : "Nordic nRF52840 / SX1262 LoRa"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">CO Gazı</span>
                    <span className="text-zinc-200 font-medium">MQ-7 Elektrokimyasal Sensör</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Ortam & Gaz</span>
                    <span className="text-zinc-200 font-medium">BME688 (Sıcaklık, Nem, VOC)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Partikül Duman</span>
                    <span className="text-zinc-200 font-medium">
                      Sensirion SPS30 Lazer Optik PM2.5
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-400">Protokol</span>
                    <span className="text-sky-300 font-mono">PyrosFrame v3 (AES-128-CCM, 29B)</span>
                  </div>
                </div>
              </div>

              {/* Enerji & Güç */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/20 via-zinc-900/60 to-zinc-900/40 border border-emerald-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Enerji & Pil Yönetimi
                  </span>
                  <span className="font-mono text-emerald-300">3+ Yıl Ömür</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  İki kademeli hiyerarşik ölçüm mimarisi sayesinde normal koşullarda sistem derin
                  uykuda (deep-sleep) çalışır; piroliz veya gaz anomalisi sezildiğinde 3 sn acil
                  moduna geçerek erken uyarı sağlar.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Standart DrawerFooter */}
        <DrawerFooter className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 flex flex-row items-center justify-between shrink-0 m-0">
          <div className="flex items-center gap-2">
            <Radio
              className={`h-3.5 w-3.5 ${currentTelemetry ? "text-emerald-400" : "text-zinc-600"}`}
            />
            <span>Paket İletimi:</span>
            <span className="font-mono text-zinc-200">
              {currentTelemetry
                ? new Date(currentTelemetry.receivedAt).toLocaleTimeString()
                : "Bekleniyor..."}
            </span>
          </div>
          <span className="font-mono text-[11px] text-zinc-500">
            {currentTelemetry ? "AES-128-CCM: MÜHÜRLÜ" : "LİNK: BEKLEMEDE"}
          </span>
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
