import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Lock,
  LogOut,
  Radio,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminPanelProps {
  isAdmin: boolean;
  adminNotice: { text: string; type: "success" | "error" } | null;
  adminAuthError: string | null;
  onLogin: (u: string, p: string) => void;
  onLogout: () => void;
  onResetDefaults: () => void;
  onCreateNode: (params: {
    name: string;
    lat: number;
    lng: number;
    hasAnemometer: boolean;
  }) => void;
  onCreateGateway: (params: {
    name: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  }) => void;
  onDeleteNode: (nodeId: number) => void;
  onDeleteGateway: (gatewayId: number) => void;
  adminMode: "none" | "add_node" | "add_gateway" | "delete";
  setAdminMode: (mode: "none" | "add_node" | "add_gateway" | "delete") => void;
  pendingClickCoords: { lat: number; lng: number } | null;
  setPendingClickCoords: (c: { lat: number; lng: number } | null) => void;
  pendingDeleteTarget: { type: "node" | "gateway"; id: number; name: string } | null;
  setPendingDeleteTarget: (
    t: { type: "node" | "gateway"; id: number; name: string } | null,
  ) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isAdmin,
  adminNotice,
  adminAuthError,
  onLogin,
  onLogout,
  onResetDefaults,
  onCreateNode,
  onCreateGateway,
  onDeleteNode,
  onDeleteGateway,
  adminMode,
  setAdminMode,
  pendingClickCoords,
  setPendingClickCoords,
  pendingDeleteTarget,
  setPendingDeleteTarget,
  isLoginModalOpen,
  setIsLoginModalOpen,
}) => {
  // Giriş Formu State
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  // Düğüm Ekleme Formu
  const [nodeName, setNodeName] = useState("");
  const [hasAnemometer, setHasAnemometer] = useState(false);

  // Gateway Ekleme Formu
  const [gatewayName, setGatewayName] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(1200);

  // Sıfırlama Onay Modalı
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Başarılı giriş sonrasında modalı otomatik kapat ve şifreyi temizle
  useEffect(() => {
    if (isAdmin && isLoginModalOpen) {
      setIsLoginModalOpen(false);
      setPassword("");
    }
  }, [isAdmin, isLoginModalOpen, setIsLoginModalOpen]);

  // Haritaya tıklandığında varsayılan isimleri doldur
  useEffect(() => {
    if (pendingClickCoords) {
      if (adminMode === "add_node") {
        setNodeName("Balan Dağı Yeni İstasyon");
        setHasAnemometer(false);
      } else if (adminMode === "add_gateway") {
        setGatewayName("GW Balan Yeni Röle Kulesi");
        setRadiusMeters(1200);
      }
    }
  }, [pendingClickCoords, adminMode]);

  const isWokwiDelete =
    pendingDeleteTarget?.type === "node" &&
    (pendingDeleteTarget.id === 50 || pendingDeleteTarget.name.toLowerCase().includes("wokwi"));

  return (
    <>
      {/* 1. Bildirim Toast / Banner */}
      {adminNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {adminNotice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          )}
          <span className="text-zinc-200 font-medium">{adminNotice.text}</span>
        </div>
      )}

      {/* 2. Admin Toolbar (Sol Üst Harita Üzerinde) */}
      {isAdmin && (
        <div className="absolute top-14 left-3 sm:left-4 z-30 flex flex-col gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800 shadow-lg">
            <div className="flex items-center gap-1 px-2 py-1 border-r border-zinc-800 text-[11px] font-mono text-emerald-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">YÖNETİCİ</span>
            </div>

            {/* Düğüm Ekle Aracı */}
            <button
              type="button"
              onClick={() => setAdminMode(adminMode === "add_node" ? "none" : "add_node")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                adminMode === "add_node"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900"
              }`}
              title="Haritaya tıklayarak yeni sensör düğümü ekleyin"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Düğüm</span>
            </button>

            {/* Gateway Ekle Aracı */}
            <button
              type="button"
              onClick={() => setAdminMode(adminMode === "add_gateway" ? "none" : "add_gateway")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                adminMode === "add_gateway"
                  ? "bg-sky-950 text-sky-300 border border-sky-700"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900"
              }`}
              title="Haritaya tıklayarak LoRaWAN kapsama kulesi kurun"
            >
              <RadioTower className="h-3.5 w-3.5" />
              <span>Gateway</span>
            </button>

            {/* Silme Modu Aracı */}
            <button
              type="button"
              onClick={() => setAdminMode(adminMode === "delete" ? "none" : "delete")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                adminMode === "delete"
                  ? "bg-rose-950 text-rose-300 border border-rose-700"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900"
              }`}
              title="Silmek istediğiniz düğüm veya gateway üzerine tıklayın"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Sil</span>
            </button>

            {/* Sıfırlama Aracı */}
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Topolojiyi varsayılan 50 düğüm ve 3 gateway'e döndür"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sıfırla</span>
            </button>

            {/* Oturumu Kapat */}
            <button
              type="button"
              onClick={() => {
                setAdminMode("none");
                onLogout();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors ml-0.5 border-l border-zinc-800 cursor-pointer"
              title="Yönetici oturumunu kapat"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>

          {/* Aktif Mod Yönerge İpucu */}
          {adminMode !== "none" && (
            <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-medium text-zinc-300 shadow-md flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <span>
                {adminMode === "add_node" &&
                  "📍 Haritada yeni düğüm eklemek istediğiniz noktaya tıklayın."}
                {adminMode === "add_gateway" &&
                  "🗼 Haritada yeni gateway kulesi kurmak istediğiniz noktaya tıklayın."}
                {adminMode === "delete" &&
                  "🗑️ Silmek istediğiniz düğüm veya gateway kulesine tıklayın."}
              </span>
              <button
                type="button"
                onClick={() => setAdminMode("none")}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. shadcn Dialog: Yönetici Giriş Dialogu */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>Yönetici Girişi</span>
            </DialogTitle>
            <DialogDescription>
              Saha düğümü ve gateway topolojisini yönetmek için oturum açın.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLogin(username, password);
            }}
            className="space-y-4 text-xs pt-1"
          >
            <div>
              <label htmlFor="admin-username" className="text-zinc-300 font-medium block mb-1.5">
                Kullanıcı Adı
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="text-zinc-300 font-medium block mb-1.5">
                Yönetici Şifresi
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="••••••••"
                required
              />
              <span className="text-[11px] text-zinc-400 block mt-1">
                Varsayılan şifre .env dosyasındaki ADMIN_PASSWORD satırındadır (ör. admin123).
              </span>
            </div>

            {adminAuthError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors"
              >
                Giriş Yap
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. shadcn Dialog: Yeni Düğüm Ekleme */}
      <Dialog
        open={Boolean(pendingClickCoords && adminMode === "add_node")}
        onOpenChange={(open) => !open && setPendingClickCoords(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400" />
              <span>Yeni Düğüm Ekle</span>
            </DialogTitle>
            <DialogDescription>
              Marmaris Balan Dağı haritasında seçilen koordinata yeni bir sensör düğümü
              yerleştirilir.
            </DialogDescription>
          </DialogHeader>

          {pendingClickCoords && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreateNode({
                  name: nodeName.trim() || "Balan Dağı Yeni İstasyon",
                  lat: Number(pendingClickCoords.lat.toFixed(6)),
                  lng: Number(pendingClickCoords.lng.toFixed(6)),
                  hasAnemometer,
                });
                setPendingClickCoords(null);
                setAdminMode("none");
              }}
              className="space-y-4 text-xs pt-1"
            >
              <div>
                <label htmlFor="create-node-name" className="text-zinc-300 font-medium block mb-1">
                  Düğüm Adı
                </label>
                <input
                  id="create-node-name"
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="İstasyon Tanımı..."
                  required
                />
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 font-mono text-[11px] text-zinc-400 space-y-1">
                <div>Enlem : {pendingClickCoords.lat.toFixed(5)}°N</div>
                <div>Boylam: {pendingClickCoords.lng.toFixed(5)}°E</div>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAnemometer}
                  onChange={(e) => setHasAnemometer(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-zinc-200 font-medium">
                  Rüzgâr Ölçer (Anemometre) Bulunuyor
                </span>
              </label>

              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setPendingClickCoords(null)}
                  className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
                >
                  Düğüm Ekle
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. shadcn Dialog: Yeni Gateway Kulesi Ekleme */}
      <Dialog
        open={Boolean(pendingClickCoords && adminMode === "add_gateway")}
        onOpenChange={(open) => !open && setPendingClickCoords(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-sky-400" />
              <span>Yeni Gateway Kulesi Kur</span>
            </DialogTitle>
            <DialogDescription>
              Seçilen tepe veya sahil noktasına LoRaWAN kapsama kulesi inşa edilir.
            </DialogDescription>
          </DialogHeader>

          {pendingClickCoords && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreateGateway({
                  name: gatewayName.trim() || "GW Yeni Kule",
                  lat: Number(pendingClickCoords.lat.toFixed(6)),
                  lng: Number(pendingClickCoords.lng.toFixed(6)),
                  radiusMeters: Number(radiusMeters),
                });
                setPendingClickCoords(null);
                setAdminMode("none");
              }}
              className="space-y-4 text-xs pt-1"
            >
              <div>
                <label htmlFor="create-gw-name" className="text-zinc-300 font-medium block mb-1">
                  Kule Adı
                </label>
                <input
                  id="create-gw-name"
                  type="text"
                  value={gatewayName}
                  onChange={(e) => setGatewayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-sky-500"
                  placeholder="Kule Tanımı..."
                  required
                />
              </div>

              <div>
                <label htmlFor="create-gw-radius" className="text-zinc-300 font-medium block mb-1">
                  Kapsama Menzili (Metre):{" "}
                  <span className="text-sky-400 font-mono font-bold">{radiusMeters} m</span>
                </label>
                <input
                  id="create-gw-radius"
                  type="range"
                  min={300}
                  max={6000}
                  step={100}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                  <span>300m</span>
                  <span>1200m</span>
                  <span>6000m</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 font-mono text-[11px] text-zinc-400 space-y-1">
                <div>Enlem : {pendingClickCoords.lat.toFixed(5)}°N</div>
                <div>Boylam: {pendingClickCoords.lng.toFixed(5)}°E</div>
              </div>

              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setPendingClickCoords(null)}
                  className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold"
                >
                  Kuleyi Kur
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. shadcn Dialog: Silme Onayı (Özel Wokwi #50 Uyarısıyla!) */}
      <Dialog
        open={Boolean(pendingDeleteTarget)}
        onOpenChange={(open) => !open && setPendingDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md border-rose-900/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {pendingDeleteTarget?.type === "node" ? "Düğümü Sil" : "Gateway Kulesini Sil"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {pendingDeleteTarget && (
                <>
                  <strong className="text-zinc-100 font-mono">
                    {pendingDeleteTarget.name} (#{pendingDeleteTarget.id})
                  </strong>{" "}
                  kaydını silmek üzeresiniz.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Özel Wokwi Canlı Donanım Uyarısı */}
          {isWokwiDelete && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs flex items-start gap-3">
              <Cpu className="h-5 w-5 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <span className="font-semibold block text-amber-200">
                  DİKKAT: Canlı Wokwi ESP32 Donanımı!
                </span>
                <p className="text-[11px] leading-relaxed text-amber-300/90">
                  Bu düğüm canlı Wokwi ESP32 donanımına tahsis edilmiştir. Silerseniz Ağ Geçidi
                  (Gateway) Wokwi'den gelen mühürlü paketleri anında{" "}
                  <strong>Yetkisiz / Silinmiş Düğüm</strong> diyerek reddedecektir.
                </p>
              </div>
            </div>
          )}

          {!isWokwiDelete && pendingDeleteTarget && (
            <p className="text-xs text-zinc-300 leading-relaxed">
              {pendingDeleteTarget.type === "node"
                ? "Bu düğüm silindiğinde üreteceği paketler gateway tarafından yetkisiz kabul edilerek atılacaktır."
                : "Bu kule silindiğinde yalnızca bu kulenin kapsama menzilinde kalan düğümler 'KAPSAMA DIŞI' durumuna düşecektir."}
            </p>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setPendingDeleteTarget(null)}
              className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingDeleteTarget) {
                  if (pendingDeleteTarget.type === "node") {
                    onDeleteNode(pendingDeleteTarget.id);
                  } else {
                    onDeleteGateway(pendingDeleteTarget.id);
                  }
                  setPendingDeleteTarget(null);
                }
              }}
              className="px-4 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-zinc-100 font-semibold shadow-md"
            >
              Evet, Sil
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. shadcn Dialog: Varsayılana Sıfırlama Onayı */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span>Topolojiyi Varsayılana Sıfırla</span>
            </DialogTitle>
            <DialogDescription>
              Tüm eklenen veya silinen düğüm ve gateway değişiklikleri temizlenecektir.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Sistem orijinal{" "}
            <strong className="text-zinc-100 font-medium">
              Marmaris Balan Dağı 50 düğüm ve 3 gateway
            </strong>{" "}
            durumuna geri döndürülecektir. Onaylıyor musunuz?
          </p>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => {
                onResetDefaults();
                setIsResetModalOpen(false);
                setAdminMode("none");
              }}
              className="px-4 py-1.5 rounded-lg text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              Sıfırla
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
