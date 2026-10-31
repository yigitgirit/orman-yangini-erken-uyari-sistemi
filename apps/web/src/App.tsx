import type React from "react";
import { useMemo, useState } from "react";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { HistoricalArchiveView } from "./components/Archive/HistoricalArchiveView";
import { GatewayInspector } from "./components/HUD/GatewayInspector";
import { LayerControls } from "./components/HUD/LayerControls";
import { OfflineBanner } from "./components/HUD/OfflineBanner";
import { TelemetryInspector } from "./components/HUD/TelemetryInspector";
import { TopStatusBar } from "./components/HUD/TopStatusBar";
import { Map3D } from "./components/Map/Map3D";
import { useInspectorSelection } from "./hooks/useInspectorSelection";
import { usePyrosData } from "./hooks/usePyrosData";

export const App: React.FC = () => {
  // 1. Canlı Telemetri ve Veri Katmanı Hook'u (Backend'den Canlı Akış)
  const {
    nodes,
    gateways,
    telemetries,
    risks,
    telemetryHistory,
    windField,
    fireSpread,
    impact,
    connectionStatus,
    isMockMode,
    wsUrl,
    isAdmin,
    adminNotice,
    adminAuthError,
    loginAdmin,
    logoutAdmin,
    createNode,
    deleteNode,
    createGateway,
    deleteGateway,
    resetTopology,
  } = usePyrosData();

  // 2. İstasyon/Gateway Drawer Seçimi ve Kamera Yönetimi Hook'u
  const {
    selectedStationId,
    isInspectorOpen,
    selectedGatewayId,
    isGatewayInspectorOpen,
    cameraFocus,
    selectStation,
    closeStation,
    selectGateway,
    closeGateway,
  } = useInspectorSelection(nodes, gateways);

  // 3. Sahadaki Sensörlerden/Backend'den Gelen Aktif Yangın / Anomali Düğümü
  const activeFireNodeId = useMemo(() => {
    let highestRiskNodeId: number | null = null;
    let highestScore = 0;
    for (const [nodeId, risk] of risks.entries()) {
      if (risk.level === "red" || risk.stage === "flaming" || risk.stage === "smoldering") {
        if (risk.score > highestScore) {
          highestScore = risk.score;
          highestRiskNodeId = nodeId;
        }
      }
    }
    return highestRiskNodeId;
  }, [risks]);

  // 4. Arayüz Katmanı Durumları
  const [activeView, setActiveView] = useState<"map" | "archive">("map");
  const [showWindParticles, setShowWindParticles] = useState<boolean>(true);
  const [showGatewayCoverage, setShowGatewayCoverage] = useState<boolean>(true);
  const [showStationVectors, setShowStationVectors] = useState<boolean>(false);
  const manualWindDirection = 335;

  // 5. Admin Panel Durumları
  const [adminMode, setAdminMode] = useState<"none" | "add_node" | "add_gateway" | "delete">(
    "none",
  );
  const [pendingClickCoords, setPendingClickCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<{
    type: "node" | "gateway";
    id: number;
    name: string;
  } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const windDirection = windField?.regional.directionTo ?? manualWindDirection;
  const windSpeed = windField?.regional.speed ?? 7.4;

  const currentStation = nodes.find((n) => n.id === selectedStationId) ?? null;
  const currentTelemetry = selectedStationId ? (telemetries.get(selectedStationId) ?? null) : null;
  const currentRisk = selectedStationId ? (risks.get(selectedStationId) ?? null) : null;
  const currentHistory = selectedStationId ? (telemetryHistory.get(selectedStationId) ?? []) : [];

  const currentGateway = gateways.find((g) => g.id === selectedGatewayId) ?? null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none">
      {/* Üst Operasyon Durum ve Kontrol Çubuğu */}
      <TopStatusBar
        totalStations={nodes.length}
        totalGateways={gateways.length}
        activeFireNodeId={activeFireNodeId}
        onResetCamera={() => selectStation(25)}
        onFocusFire={() => activeFireNodeId && selectStation(activeFireNodeId)}
        impact={impact}
        connectionStatus={connectionStatus}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        activeView={activeView}
        onToggleView={setActiveView}
      />

      {/* Harita Katman Kontrol Paneli (Sol Alt Köşe - Sadece Harita Görünümünde) */}
      {activeView === "map" && (
        <LayerControls
          showWindParticles={showWindParticles}
          onToggleWindParticles={() => setShowWindParticles((prev) => !prev)}
          showGatewayCoverage={showGatewayCoverage}
          onToggleGatewayCoverage={() => setShowGatewayCoverage((prev) => !prev)}
          showStationVectors={showStationVectors}
          onToggleStationVectors={() => setShowStationVectors((prev) => !prev)}
          windDirection={Math.round(windDirection)}
          windSpeed={windSpeed}
        />
      )}

      {/* Ayrı Sayfa: TanStack Table Tarihsel Veritabanı Arşiv Görünümü */}
      {activeView === "archive" && (
        <HistoricalArchiveView
          onBackToMap={() => setActiveView("map")}
          onSelectStationOnMap={(stationId) => {
            selectStation(stationId);
            setActiveView("map");
          }}
          availableStations={nodes}
        />
      )}

      {/* Sunucu Çevrimdışı / Bağlantı Bekleniyor Uyarısı ("Kapalıyız" Durumu) */}
      <OfflineBanner status={connectionStatus} isMockMode={isMockMode} wsUrl={wsUrl} />

      {/* Admin Panel ve Yönetici Araçları */}
      <AdminPanel
        isAdmin={isAdmin}
        adminNotice={adminNotice}
        adminAuthError={adminAuthError}
        onLogin={loginAdmin}
        onLogout={logoutAdmin}
        onResetDefaults={resetTopology}
        onCreateNode={createNode}
        onCreateGateway={createGateway}
        onDeleteNode={deleteNode}
        onDeleteGateway={deleteGateway}
        adminMode={adminMode}
        setAdminMode={setAdminMode}
        pendingClickCoords={pendingClickCoords}
        setPendingClickCoords={setPendingClickCoords}
        pendingDeleteTarget={pendingDeleteTarget}
        setPendingDeleteTarget={setPendingDeleteTarget}
        isLoginModalOpen={isLoginModalOpen}
        setIsLoginModalOpen={setIsLoginModalOpen}
      />

      {/* 3B Topografik Arazi ve İstasyon Haritası */}
      <Map3D
        stations={nodes}
        telemetries={telemetries}
        risks={risks}
        gateways={gateways}
        fireSpread={fireSpread}
        activeFireNodeId={activeFireNodeId}
        windDirection={windDirection}
        windSpeed={windSpeed}
        showWindParticles={showWindParticles}
        showGatewayCoverage={showGatewayCoverage}
        showStationVectors={showStationVectors}
        cameraFocus={cameraFocus}
        selectedStationId={selectedStationId}
        selectedGatewayId={selectedGatewayId}
        adminMode={adminMode}
        onSelectStation={selectStation}
        onSelectGateway={selectGateway}
        onMapClick={(coords) => {
          if (adminMode === "add_node" || adminMode === "add_gateway") {
            setPendingClickCoords(coords);
          }
        }}
        onDeleteRequest={(target) => {
          if (adminMode === "delete") {
            setPendingDeleteTarget(target);
          }
        }}
      />

      {/* İstasyon Telemetri Detay Çekmecesi */}
      <TelemetryInspector
        station={currentStation}
        telemetry={currentTelemetry}
        risk={currentRisk}
        history={currentHistory}
        isOpen={isInspectorOpen}
        onClose={closeStation}
        onSelectStation={selectStation}
      />

      {/* Ağ Geçidi (Gateway) Detay Çekmecesi */}
      <GatewayInspector
        gateway={currentGateway}
        isOpen={isGatewayInspectorOpen}
        onClose={closeGateway}
        onSelectStation={selectStation}
      />
    </div>
  );
};
