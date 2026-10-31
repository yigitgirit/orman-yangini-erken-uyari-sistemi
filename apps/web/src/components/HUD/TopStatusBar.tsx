import type { ImpactSummary } from "@pyros/shared";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Database,
  Eye,
  Lock,
  Map as MapIcon,
  Radio,
  RadioTower,
  ShieldCheck,
  Trees,
} from "lucide-react";
import type React from "react";
import type { ConnectionStatus } from "../../services/websocketClient";

interface TopStatusBarProps {
  totalStations: number;
  totalGateways: number;
  activeFireNodeId: number | null;
  onResetCamera: () => void;
  onFocusFire?: () => void;
  impact: ImpactSummary;
  connectionStatus: ConnectionStatus;
  isAdmin?: boolean;
  onOpenLogin?: () => void;
  activeView?: "map" | "archive";
  onToggleView?: (view: "map" | "archive") => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  totalStations,
  totalGateways,
  activeFireNodeId,
  onResetCamera,
  onFocusFire,
  impact,
  connectionStatus,
  isAdmin = false,
  onOpenLogin,
  activeView = "map",
  onToggleView,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-11 px-2.5 sm:px-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-sans text-zinc-300 select-none overflow-hidden whitespace-nowrap">
      {/* 1. Sol Bölüm: Sistem Kimliği ve Ağ Sayaçları */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold tracking-wider text-xs">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              activeFireNodeId
                ? "bg-rose-500"
                : connectionStatus === "connected"
                  ? "bg-emerald-400"
                  : connectionStatus === "connecting"
                    ? "bg-sky-400 animate-pulse"
                    : "bg-amber-400"
            }`}
          />
          <span className="font-bold tracking-tight text-zinc-100 text-xs sm:text-sm">
            PYROSECO
          </span>
        </div>

        {/* Sensör ve Gateway Sayaçları (sm ve üstü ekranlarda) */}
        <div className="hidden sm:flex items-center gap-2.5 pl-2.5 border-l border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <strong className="text-zinc-200 font-medium">{totalStations}</strong> Düğüm
          </span>
          <span className="inline-flex items-center gap-1">
            <RadioTower className="h-3.5 w-3.5 text-sky-400" />
            <strong className="text-zinc-200 font-medium">{totalGateways}</strong> Kule
          </span>
        </div>
      </div>

      {/* 2. Orta Bölüm: Statü Badge'i (Her Ekranda Matematiksel Olarak TAM ORTADA) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-auto">
        {activeFireNodeId ? (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-rose-950/90 border border-rose-700 text-rose-200 text-xs font-semibold shadow-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse shrink-0" />
            <span className="whitespace-nowrap font-mono text-xs">
              <span className="hidden sm:inline">YANGIN: </span>DÜĞÜM #{activeFireNodeId}
            </span>
            {onFocusFire && (
              <button
                type="button"
                onClick={onFocusFire}
                className="flex items-center gap-1 ml-1 px-1.5 sm:px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                title="Yangın Başlangıç Merkezine Odaklan"
              >
                <Eye className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Odaklan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-zinc-300 font-medium whitespace-nowrap hidden md:inline">
              SİSTEM STABİL (0 ALARM)
            </span>
            <span className="text-zinc-300 font-medium whitespace-nowrap md:hidden">STABİL</span>
          </div>
        )}
      </div>

      {/* 3. Sağ Bölüm: Ekolojik Etki, Operasyon Kontrolleri ve Yönetici */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 ml-auto">
        {/* Ekolojik Etki / Önlenen Karbon (xl ve üstü geniş ekranlarda) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
          <Trees className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-zinc-500">ÖNLENEN:</span>
          <span className="text-emerald-400 font-semibold">{impact.preventedCo2Tons} T CO₂</span>
          {impact.savedHectares > 0 && (
            <span className="text-zinc-500 text-[10px]">
              ({impact.savedHectares.toFixed(1)} ha)
            </span>
          )}
        </div>

        {/* Sayfa / Görünüm Değiştirici (3D Harita <-> Veritabanı Arşivi) */}
        {onToggleView && (
          <button
            type="button"
            onClick={() => onToggleView(activeView === "map" ? "archive" : "map")}
            className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeView === "archive"
                ? "bg-sky-950 border-sky-700 text-sky-200"
                : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100"
            }`}
            title={activeView === "map" ? "Veritabanı Arşiv Tablosunu Aç" : "3D Haritaya Dön"}
          >
            {activeView === "map" ? (
              <>
                <Database className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span className="hidden sm:inline">Arşiv</span>
              </>
            ) : (
              <>
                <MapIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">3D Harita</span>
              </>
            )}
          </button>
        )}

        {/* Kamera Sıfırla Butonu (Sadece Harita Görünümündeyken) */}
        {activeView === "map" && (
          <button
            type="button"
            onClick={onResetCamera}
            className="h-7 px-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="Kamerayı Marmaris Balan Dağı Merkezine Sıfırla"
          >
            <Compass className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="hidden sm:inline">Kamera</span>
          </button>
        )}

        <div className="h-3.5 w-[1px] bg-zinc-800 hidden sm:block" />

        {/* Yönetici Girişi / Rozeti */}
        {isAdmin ? (
          <div className="h-7 px-2 sm:px-2.5 rounded-md bg-emerald-950/70 border border-emerald-700/80 text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Yönetici</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="h-7 px-2 sm:px-2.5 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[11px] text-zinc-200 hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Yönetici Girişi"
          >
            <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}
      </div>
    </header>
  );
};
