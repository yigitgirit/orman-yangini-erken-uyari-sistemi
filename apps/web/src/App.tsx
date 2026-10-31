import type React from "react";
import { useMemo, useState } from "react";
import { GatewayInspector } from "./components/HUD/GatewayInspector";
import { OfflineBanner } from "./components/HUD/OfflineBanner";
import { OperatorConsole } from "./components/HUD/OperatorConsole";
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
    impact,
    connectionStatus,
    isMockMode,
    wsUrl,
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
  } = useInspectorSelection(nodes);

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
  const [showWindLayer, setShowWindLayer] = useState<boolean>(false);
  const [manualWindDirection, setManualWindDirection] = useState<number>(335);

  const windDirection = windField?.regional.directionTo ?? manualWindDirection;
  const windSpeed = windField?.regional.speed ?? 7.4;

  const currentStation = nodes.find((n) => n.id === selectedStationId) ?? null;
  const currentTelemetry = selectedStationId ? (telemetries.get(selectedStationId) ?? null) : null;
  const currentRisk = selectedStationId ? (risks.get(selectedStationId) ?? null) : null;
  const currentHistory = selectedStationId ? (telemetryHistory.get(selectedStationId) ?? []) : [];

  const currentGateway = gateways.find((g) => g.id === selectedGatewayId) ?? null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none">
      {/* Üst Operasyon Durum Çubuğu */}
      <TopStatusBar
        totalStations={nodes.length}
        activeFireNodeId={activeFireNodeId}
        windDirection={Math.round(windDirection)}
        windSpeed={windSpeed}
        impact={impact}
        connectionStatus={connectionStatus}
        isMockMode={isMockMode}
      />

      {/* Sunucu Çevrimdışı / Bağlantı Bekleniyor Uyarısı ("Kapalıyız" Durumu) */}
      <OfflineBanner status={connectionStatus} isMockMode={isMockMode} wsUrl={wsUrl} />

      {/* 3B Topografik Arazi ve İstasyon Haritası */}
      <Map3D
        stations={nodes}
        telemetries={telemetries}
        risks={risks}
        gateways={gateways}
        activeFireNodeId={activeFireNodeId}
        windDirection={windDirection}
        windSpeed={windSpeed}
        showWindLayer={showWindLayer}
        cameraFocus={cameraFocus}
        selectedStationId={selectedStationId}
        selectedGatewayId={selectedGatewayId}
        onSelectStation={selectStation}
        onSelectGateway={selectGateway}
      />

      {/* Sol Alt Operatör Konsolu */}
      <OperatorConsole
        activeFireNodeId={activeFireNodeId}
        windDirection={Math.round(windDirection)}
        windSpeed={windSpeed}
        showWindLayer={showWindLayer}
        onWindDirectionChange={setManualWindDirection}
        onToggleWindLayer={() => setShowWindLayer((prev) => !prev)}
        onResetCamera={() => selectStation(25)}
      />

      {/* İstasyon Telemetri Detay Çekmecesi */}
      <TelemetryInspector
        station={currentStation}
        telemetry={currentTelemetry}
        risk={currentRisk}
        history={currentHistory}
        isOpen={isInspectorOpen}
        onClose={closeStation}
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
