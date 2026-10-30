import { Activity, Cpu, Mountain, Radio, RadioTower, ShieldCheck, Signal, X } from "lucide-react";
import type React from "react";
import { useRef } from "react";
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
import type { GatewayInfo } from "../../types/simulation";

interface GatewayInspectorProps {
  gateway: GatewayInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (stationId: number) => void;
}

export const GatewayInspector: React.FC<GatewayInspectorProps> = ({
  gateway,
  isOpen,
  onClose,
  onSelectStation,
}) => {
  // Kapanma animasyonu sırasında içeriğin anında yok olmasını engellemek için son referansı sakla
  const lastGatewayRef = useRef<GatewayInfo | null>(gateway);
  if (gateway) lastGatewayRef.current = gateway;
  const currentGateway = gateway ?? lastGatewayRef.current;

  if (!currentGateway) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="bg-zinc-950 border border-zinc-800/90 text-zinc-100 shadow-2xl shadow-black/80 rounded-2xl overflow-hidden focus:outline-none font-sans antialiased select-none data-[vaul-drawer-direction=right]:top-11 data-[vaul-drawer-direction=right]:bottom-2.5 data-[vaul-drawer-direction=right]:right-2.5 data-[vaul-drawer-direction=right]:h-[calc(100vh-3.5rem)] data-[vaul-drawer-direction=right]:max-h-[calc(100vh-3.5rem)] data-[vaul-drawer-direction=right]:w-[calc(100vw-1.25rem)] data-[vaul-drawer-direction=right]:sm:w-[420px] data-[vaul-drawer-direction=right]:sm:max-w-[420px] data-[vaul-drawer-direction=right]:rounded-2xl data-[vaul-drawer-direction=right]:border data-[vaul-drawer-direction=right]:border-zinc-800">
        {/* Üst Başlık Şeridi: Net Hiyerarşi & Sade Tasarım */}
        <DrawerHeader className="relative px-4 pt-4 pb-2 bg-zinc-950 text-left">
          {/* 1. Satır: Kategori Kicker ve Zarif Canlı Durum İndikatörü */}
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                AĞ GEÇİDİ #{currentGateway.id}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-zinc-900 text-zinc-300 border border-zinc-800">
                <RadioTower className="h-3 w-3 text-sky-400" />
                Röle Kulesi
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Çevrimiçi
            </span>
          </div>

          {/* 2. Satır: Ana Kule Adı */}
          <DrawerTitle className="text-lg font-semibold text-zinc-100 tracking-tight pt-1 leading-snug">
            {currentGateway.name}
          </DrawerTitle>

          {/* 3. Satır: Konum ve Rakım Bilgileri */}
          <DrawerDescription className="text-xs text-zinc-400 flex items-center gap-2 pt-0.5">
            <span className="font-mono text-zinc-300">
              {currentGateway.lat.toFixed(4)}° N, {currentGateway.lng.toFixed(4)}° E
            </span>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1 text-zinc-300 font-medium">
              <Mountain className="h-3.5 w-3.5 text-zinc-500" />
              {currentGateway.elevation} m Rakım
            </span>
          </DrawerDescription>

          <DrawerClose className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Kapat</span>
          </DrawerClose>
        </DrawerHeader>

        {/* Tab Menüsü & İçerik Alanı */}
        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
          <Tabs defaultValue="coverage" className="flex-1 flex flex-col overflow-hidden">
            {/* Segmented Control: Kusursuz Boşluk & Çerçeveli Ayırıcı */}
            <div className="px-4 pb-3 pt-1 border-b border-zinc-800/80 bg-zinc-950 shrink-0">
              <TabsList className="grid grid-cols-3 gap-1 w-full bg-zinc-900/90 border border-zinc-800/80 h-10 p-1 rounded-xl">
                <TabsTrigger
                  value="coverage"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent ring-0 ring-offset-0 ring-transparent [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important] data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-none hover:text-zinc-200 hover:bg-zinc-800/40 select-none cursor-pointer"
                >
                  <Radio className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-sky-400" />
                  Kapsama
                </TabsTrigger>
                <TabsTrigger
                  value="rf"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent ring-0 ring-offset-0 ring-transparent [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important] data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-none hover:text-zinc-200 hover:bg-zinc-800/40 select-none cursor-pointer"
                >
                  <Signal className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-emerald-400" />
                  RF Sinyal
                </TabsTrigger>
                <TabsTrigger
                  value="nodes"
                  className="group rounded-lg text-xs font-medium text-zinc-400 border border-transparent h-full transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent ring-0 ring-offset-0 ring-transparent [--tw-ring-shadow:none!important] [--tw-ring-offset-shadow:none!important] data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-none hover:text-zinc-200 hover:bg-zinc-800/40 select-none cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 mr-1.5 transition-colors text-zinc-500 group-hover:text-zinc-300 group-data-[state=active]:text-amber-400" />
                  Düğümler
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Kapsama ve Altyapı */}
            <TabsContent
              value="coverage"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none ring-0"
            >
              {/* Kapsama ve Düğüm Özet Kartları */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 hover:border-zinc-700/80 transition-colors">
                  <div className="text-xs font-medium text-zinc-400 flex items-center justify-between">
                    <span>Menzil</span>
                    <Radio className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      {(currentGateway.radiusMeters / 1000).toFixed(1)}
                    </span>
                    <span className="text-xs font-normal text-zinc-400">km</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Dairesel LoRaWAN</div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 hover:border-zinc-700/80 transition-colors">
                  <div className="text-xs font-medium text-zinc-400 flex items-center justify-between">
                    <span>Bağlı İstasyon</span>
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                      {currentGateway.connectedNodes.length}
                    </span>
                    <span className="text-xs font-normal text-zinc-400">/ 31 İstasyon</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Aktif Telemetri</div>
                </div>
              </div>

              {/* Saha Donanımı & Enerji Altyapısı */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 border-b border-zinc-800/80 pb-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Kule Enerji ve Ağ Altyapısı
                </div>
                <div className="space-y-2.5 text-xs divide-y divide-zinc-800/40">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-400">Backhaul Uplink</span>
                    <span className="text-zinc-200 font-medium">{currentGateway.backhaul}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-400">Frekans Kanalı</span>
                    <span className="font-mono text-zinc-200">{currentGateway.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-400">LoRa Yoğunlaştırıcı</span>
                    <span className="text-zinc-200 font-medium">Semtech SX1302</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-400">Anten Tipi & Kazanç</span>
                    <span className="text-zinc-200 font-medium">8.5 dBi Fiberglass Omni</span>
                  </div>
                </div>
              </div>

              {/* Uptime ve Güvenilirlik */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Kesintisiz Çalışma (Uptime)</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {currentGateway.uptime}
                </span>
              </div>
            </TabsContent>

            {/* TAB 2: RF Sinyal ve Sağlık */}
            <TabsContent
              value="rf"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none ring-0"
            >
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <Signal className="h-4 w-4 text-sky-400" />
                    LoRaWAN RF & İletişim Metrikleri
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {currentGateway.frequency}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-xs text-zinc-400 block">Ortalama Sinyal (RSSI)</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-zinc-100">
                        {currentGateway.rssiAvgDbm}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">dBm</span>
                    </div>
                    <span className="text-xs text-emerald-400 block mt-1">Mükemmel Kapsama</span>
                  </div>

                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-xs text-zinc-400 block">Sinyal/Gürültü (SNR)</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-zinc-100">
                        +{currentGateway.snrAvgDb}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">dB</span>
                    </div>
                    <span className="text-xs text-emerald-400 block mt-1">Sıfır Parazit</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/60">
                  <div>
                    <span className="text-zinc-400 block">Paket Başarım Oranı</span>
                    <span className="text-sm font-semibold font-mono text-emerald-400 mt-0.5 block">
                      %{currentGateway.packetSuccessRate} PDR
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">CRC Hata Oranı</span>
                    <span className="text-sm font-semibold font-mono text-zinc-300 mt-0.5 block">
                      %0.02 (Nominal)
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Kapsanan İstasyonlar */}
            <TabsContent
              value="nodes"
              className="flex-1 overflow-y-auto px-4 pt-3.5 pb-4 space-y-3 custom-scrollbar mt-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none ring-0"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">
                  Kapsanan İstasyonlar ({currentGateway.connectedNodes.length})
                </span>
                <span className="text-xs text-zinc-500">Tıklayarak incele</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {currentGateway.connectedNodes.map((nodeId) => (
                  <button
                    type="button"
                    key={nodeId}
                    onClick={() => onSelectStation(nodeId)}
                    className="p-2.5 bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span className="text-zinc-500 font-mono text-[11px]">#</span>
                    <span className="font-mono font-semibold text-sm">{nodeId}</span>
                    {nodeId === 31 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Standart DrawerFooter Bileşeni */}
        <DrawerFooter className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 flex flex-row items-center justify-between shrink-0 m-0">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>Kule Telemetrisi Senkronize</span>
          </div>
          <span className="font-medium text-zinc-400">Son Heartbeat: Anlık</span>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
