import type {
  ImpactSummary,
  NodeRisk,
  SensorNode,
  TelemetryMessage,
  WindField,
} from "@pyros/shared";
import { useEffect, useRef, useState } from "react";
import { FOREST_STATIONS, MockSimulationEngine } from "../services/mockEngine";
import { type ConnectionStatus, LiveWebSocketClient } from "../services/websocketClient";

export interface PyrosDataState {
  nodes: readonly SensorNode[];
  telemetries: Map<number, TelemetryMessage>;
  risks: Map<number, NodeRisk>;
  telemetryHistory: Map<number, TelemetryMessage[]>;
  windField: WindField | null;
  impact: ImpactSummary;
  connectionStatus: ConnectionStatus;
  isMockMode: boolean;
  wsUrl: string;
}

export function usePyrosData(): PyrosDataState {
  const isMockMode = import.meta.env.VITE_USE_MOCK === "true";

  const [nodes, setNodes] = useState<readonly SensorNode[]>([]);
  const [telemetries, setTelemetries] = useState<Map<number, TelemetryMessage>>(new Map());
  const [risks, setRisks] = useState<Map<number, NodeRisk>>(new Map());
  const [telemetryHistory, setTelemetryHistory] = useState<Map<number, TelemetryMessage[]>>(
    new Map(),
  );
  const [windField, setWindField] = useState<WindField | null>(null);
  const [impact, setImpact] = useState<ImpactSummary>({
    detectedFires: 0,
    savedHectares: 0,
    preventedCo2Tons: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    isMockMode ? "connected" : "connecting",
  );

  const mockEngineRef = useRef<MockSimulationEngine | null>(null);

  // 1. Geliştirici Açıkça Mock Modu İstediyse (VITE_USE_MOCK=true)
  useEffect(() => {
    if (!isMockMode) return;

    const engine = new MockSimulationEngine();
    mockEngineRef.current = engine;

    // Mock istasyonları SensorNode biçimine uyarla
    const mockNodes: SensorNode[] = FOREST_STATIONS.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      source: s.isHardware ? "wokwi" : "sim",
      hasAnemometer: true,
    }));
    setNodes(mockNodes);

    const stepMock = () => {
      const step = engine.step();
      const nextTelemetries = new Map<number, TelemetryMessage>();
      const nextRisks = new Map<number, NodeRisk>();

      for (const r of step.readings) {
        const msg: TelemetryMessage = {
          nodeId: r.stationId,
          mode: 0,
          flags: 0,
          temperature: r.temperature,
          humidity: r.humidity,
          co: r.co,
          co2: 410 + r.co * 4,
          vocIndex: 100,
          pm25: 12,
          windSpeed: r.windSpeed,
          windDirection: r.windDirection,
          battery: r.battery,
          receivedAt: new Date().toISOString(),
        };
        nextTelemetries.set(r.stationId, msg);

        nextRisks.set(r.stationId, {
          nodeId: r.stationId,
          score: r.riskScore,
          level: r.riskLevel === "fire" ? "red" : r.riskLevel === "smoldering" ? "yellow" : "green",
          stage:
            r.riskLevel === "fire"
              ? "flaming"
              : r.riskLevel === "smoldering"
                ? "smoldering"
                : "none",
          signals: {
            earlyGas: false,
            carbonMonoxide: r.co > 30,
            smoke: false,
            combustion: r.temperature > 40,
          },
          signalCount: r.riskLevel === "fire" ? 3 : r.riskLevel === "smoldering" ? 1 : 0,
          confirmed: r.riskLevel === "fire",
          confirmedBy: [],
          mce: r.riskLevel === "fire" ? 0.96 : 0.82,
          vpd: 2.1,
          delta: { temperature: r.tempRate, co: r.coRate, co2: 10, vocIndex: 0, pm25: null },
          rate: { temperature: r.tempRate, co: r.coRate, co2: 10, vocIndex: 0, pm25: null },
          accel: { temperature: 0, co2: 0 },
          updatedAt: r.updatedAt,
        });
      }

      setTelemetries(nextTelemetries);
      setRisks(nextRisks);
      setImpact({
        detectedFires: engine.getFireNodeId() ? 1 : 0,
        savedHectares: step.impact.savedTreesEstimate / 100,
        preventedCo2Tons: step.impact.preventedCo2Tons,
      });
    };

    stepMock();
    const timer = setInterval(stepMock, 1500);
    return () => clearInterval(timer);
  }, []);

  // 2. Canlı WSS Modu (Varsayılan & Tercih Edilen)
  useEffect(() => {
    if (isMockMode) return;

    const client = LiveWebSocketClient.getInstance();

    const unsubStatus = client.onStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubNodes = client.onNodes((receivedNodes) => {
      setNodes(receivedNodes);
    });

    const unsubTelemetry = client.onTelemetry((msg) => {
      setTelemetries((prev) => {
        const next = new Map(prev);
        next.set(msg.nodeId, msg);
        return next;
      });

      setTelemetryHistory((prev) => {
        const next = new Map(prev);
        const nodeHistory = next.get(msg.nodeId) ?? [];
        const updated = [...nodeHistory, msg].slice(-25);
        next.set(msg.nodeId, updated);
        return next;
      });
    });

    const unsubRisk = client.onRisk((risk) => {
      setRisks((prev) => {
        const next = new Map(prev);
        next.set(risk.nodeId, risk);
        return next;
      });
    });

    const unsubImpact = client.onImpact((imp) => {
      setImpact(imp);
    });

    const unsubWind = client.onWind((w) => {
      setWindField(w);
    });

    client.connect();

    return () => {
      unsubStatus();
      unsubNodes();
      unsubTelemetry();
      unsubRisk();
      unsubImpact();
      unsubWind();
    };
  }, []);

  const wsUrl = LiveWebSocketClient.getInstance().getUrl();

  return {
    nodes,
    telemetries,
    risks,
    telemetryHistory,
    windField,
    impact,
    connectionStatus,
    isMockMode,
    wsUrl,
  };
}
