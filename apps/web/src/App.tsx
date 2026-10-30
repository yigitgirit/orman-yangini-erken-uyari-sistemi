import type React from "react";
import { useEffect, useRef, useState } from "react";
import { OperatorConsole } from "./components/HUD/OperatorConsole";
import { TelemetryInspector } from "./components/HUD/TelemetryInspector";
import { TopStatusBar } from "./components/HUD/TopStatusBar";
import { Map3D } from "./components/Map/Map3D";
import { MANAVGAT_STATIONS, MockSimulationEngine } from "./services/mockEngine";
import type { EnvironmentalImpact, TelemetryReading } from "./types/simulation";

export const App: React.FC = () => {
  const engineRef = useRef<MockSimulationEngine>(new MockSimulationEngine());

  const [telemetries, setTelemetries] = useState<Map<number, TelemetryReading>>(new Map());
  const [impact, setImpact] = useState<EnvironmentalImpact>({
    riskAreaHectares: 0,
    preventedCo2Tons: 0,
    savedTreesEstimate: 0,
  });
  const [activeFireNodeId, setActiveFireNodeId] = useState<number | null>(null);
  const [windDirection, setWindDirection] = useState<number>(195);
  const [windSpeed, setWindSpeed] = useState<number>(6.2);
  const [showWindLayer, setShowWindLayer] = useState<boolean>(false);
  const [cameraFocusId, setCameraFocusId] = useState<number | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // 1 saniyelik simülasyon döngüsü
  useEffect(() => {
    const engine = engineRef.current;

    // İlk adım
    const initial = engine.step();
    const map = new Map<number, TelemetryReading>();
    for (const r of initial.readings) {
      map.set(r.stationId, r);
    }
    setTelemetries(map);
    setImpact(initial.impact);

    const timer = setInterval(() => {
      const step = engine.step();
      const nextMap = new Map<number, TelemetryReading>();
      for (const r of step.readings) {
        nextMap.set(r.stationId, r);
      }
      setTelemetries(nextMap);
      setImpact(step.impact);
      setActiveFireNodeId(engine.getFireNodeId());
      setWindDirection(engine.getWindDirection());
      setWindSpeed(engine.getWindSpeed());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Yangın senaryosunu aç/kapat
  const handleToggleFire = (nodeId: number) => {
    const engine = engineRef.current;
    if (activeFireNodeId === nodeId) {
      engine.setFireScenario(null);
      setActiveFireNodeId(null);
    } else {
      engine.setFireScenario(nodeId);
      setActiveFireNodeId(nodeId);
      setCameraFocusId(nodeId); // Yangın çıkan düğüme sinematik odaklan
      setSelectedStationId(nodeId);
      setIsInspectorOpen(true);
    }
  };

  // Rüzgâr yönünü slider ile güncelle
  const handleWindDirectionChange = (deg: number) => {
    engineRef.current.setWindDirection(deg);
    setWindDirection(deg);
  };

  // Haritada istasyon seçme
  const handleSelectStation = (id: number) => {
    setSelectedStationId(id);
    setIsInspectorOpen(true);
  };

  // Kamerayı kuşbakışı genel görünüme sıfırla
  const handleResetCamera = () => {
    setCameraFocusId(null);
  };

  const selectedStation = MANAVGAT_STATIONS.find((s) => s.id === selectedStationId) ?? null;
  const selectedReading = selectedStationId ? (telemetries.get(selectedStationId) ?? null) : null;
  const selectedHistory = selectedStationId ? engineRef.current.getHistory(selectedStationId) : [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      {/* 1. 3D Arazi ve Uydu Haritası Katmanı */}
      <Map3D
        stations={MANAVGAT_STATIONS}
        telemetries={telemetries}
        activeFireNodeId={activeFireNodeId}
        windDirection={windDirection}
        windSpeed={windSpeed}
        showWindLayer={showWindLayer}
        cameraFocusId={cameraFocusId}
        selectedStationId={selectedStationId}
        onSelectStation={handleSelectStation}
      />

      {/* 2. Üst Kompakt Durum Şeridi (Header - Sabit Üstte) */}
      <TopStatusBar
        totalStations={MANAVGAT_STATIONS.length}
        activeFireNodeId={activeFireNodeId}
        windDirection={windDirection}
        windSpeed={windSpeed}
        impact={impact}
      />

      {/* 3. Sol Alt Operatör / Jüri Konsolu */}
      <OperatorConsole
        activeFireNodeId={activeFireNodeId}
        windDirection={windDirection}
        windSpeed={windSpeed}
        showWindLayer={showWindLayer}
        onToggleFire={handleToggleFire}
        onWindDirectionChange={handleWindDirectionChange}
        onToggleWindLayer={() => setShowWindLayer((prev) => !prev)}
        onResetCamera={handleResetCamera}
      />

      {/* 4. Sağ Taraf Slide-Over İstasyon Detay Çekmecesi (Drawer) */}
      <TelemetryInspector
        station={selectedStation}
        reading={selectedReading}
        history={selectedHistory}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  );
};
export default App;
