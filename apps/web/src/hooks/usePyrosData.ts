import type {
  FireSpreadPrediction,
  GatewayInfo,
  ImpactSummary,
  NodeRisk,
  SensorNode,
  TelemetryMessage,
  WindField,
} from "@pyros/shared";
import { useEffect, useRef, useState } from "react";
import {
  FOREST_STATIONS,
  GATEWAYS as MOCK_GATEWAYS,
  MockSimulationEngine,
} from "../services/mockEngine";
import { type ConnectionStatus, LiveWebSocketClient } from "../services/websocketClient";

export interface PyrosDataState {
  nodes: readonly SensorNode[];
  gateways: readonly GatewayInfo[];
  telemetries: Map<number, TelemetryMessage>;
  risks: Map<number, NodeRisk>;
  telemetryHistory: Map<number, TelemetryMessage[]>;
  windField: WindField | null;
  fireSpread: FireSpreadPrediction | null;
  impact: ImpactSummary;
  connectionStatus: ConnectionStatus;
  isMockMode: boolean;
  wsUrl: string;
  adminToken: string | null;
  isAdmin: boolean;
  adminAuthError: string | null;
  adminNotice: { text: string; type: "success" | "error" } | null;
  loginAdmin: (username: string, password: string) => void;
  logoutAdmin: () => void;
  createNode: (params: { name: string; lat: number; lng: number; hasAnemometer: boolean }) => void;
  deleteNode: (nodeId: number) => void;
  createGateway: (params: { name: string; lat: number; lng: number; radiusMeters: number }) => void;
  deleteGateway: (gatewayId: number) => void;
  resetTopology: () => void;
}

export function usePyrosData(): PyrosDataState {
  const isMockMode = import.meta.env.VITE_USE_MOCK === "true";

  const [nodes, setNodes] = useState<readonly SensorNode[]>([]);
  const [gateways, setGateways] = useState<readonly GatewayInfo[]>(isMockMode ? MOCK_GATEWAYS : []);
  const [telemetries, setTelemetries] = useState<Map<number, TelemetryMessage>>(new Map());
  const [risks, setRisks] = useState<Map<number, NodeRisk>>(new Map());
  const [telemetryHistory, setTelemetryHistory] = useState<Map<number, TelemetryMessage[]>>(
    new Map(),
  );
  const [windField, setWindField] = useState<WindField | null>(null);
  const [fireSpread, setFireSpread] = useState<FireSpreadPrediction | null>(null);
  const [impact, setImpact] = useState<ImpactSummary>({
    detectedFires: 0,
    savedHectares: 0,
    preventedCo2Tons: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    isMockMode ? "connected" : "connecting",
  );

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("pyros_admin_token");
    } catch {
      return null;
    }
  });
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

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

    const unsubGateways = client.onGateways((receivedGateways) => {
      setGateways(receivedGateways);
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

    const unsubSpread = client.onFireSpread((spread) => {
      setFireSpread(spread);
    });

    const unsubAdminAuth = client.onAdminAuth((data) => {
      if (data.success && data.token) {
        setAdminToken(data.token);
        try {
          sessionStorage.setItem("pyros_admin_token", data.token);
        } catch {
          // ignore
        }
        setAdminAuthError(null);
        setAdminNotice({ text: "Yönetici girişi başarılı.", type: "success" });
        setTimeout(() => setAdminNotice(null), 3000);
      } else {
        setAdminAuthError(data.error ?? "Giriş başarısız.");
      }
    });

    const unsubAdminAction = client.onAdminAction((data) => {
      setAdminNotice({ text: data.message, type: data.success ? "success" : "error" });
      setTimeout(() => setAdminNotice(null), 3500);
    });

    client.connect();

    return () => {
      unsubStatus();
      unsubNodes();
      unsubGateways();
      unsubTelemetry();
      unsubRisk();
      unsubImpact();
      unsubWind();
      unsubSpread();
      unsubAdminAuth();
      unsubAdminAction();
    };
  }, []);

  const loginAdmin = (username: string, password: string) => {
    setAdminAuthError(null);
    LiveWebSocketClient.getInstance().sendCommand({
      type: "admin_login",
      username,
      password,
    });
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    try {
      sessionStorage.removeItem("pyros_admin_token");
    } catch {
      // ignore
    }
    setAdminNotice({ text: "Yönetici oturumu kapatıldı.", type: "success" });
    setTimeout(() => setAdminNotice(null), 3000);
  };

  const createNode = (params: {
    name: string;
    lat: number;
    lng: number;
    hasAnemometer: boolean;
  }) => {
    if (!adminToken) return;
    LiveWebSocketClient.getInstance().sendCommand({
      type: "admin_create_node",
      token: adminToken,
      ...params,
    });
  };

  const deleteNode = (nodeId: number) => {
    if (!adminToken) return;
    LiveWebSocketClient.getInstance().sendCommand({
      type: "admin_delete_node",
      token: adminToken,
      nodeId,
    });
  };

  const createGateway = (params: {
    name: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  }) => {
    if (!adminToken) return;
    LiveWebSocketClient.getInstance().sendCommand({
      type: "admin_create_gateway",
      token: adminToken,
      ...params,
    });
  };

  const deleteGateway = (gatewayId: number) => {
    if (!adminToken) return;
    LiveWebSocketClient.getInstance().sendCommand({
      type: "admin_delete_gateway",
      token: adminToken,
      gatewayId,
    });
  };

  const resetTopology = () => {
    if (!adminToken) return;
    LiveWebSocketClient.getInstance().sendCommand({
      type: "admin_reset_defaults",
      token: adminToken,
    });
  };

  const wsUrl = LiveWebSocketClient.getInstance().getUrl();

  return {
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
    adminToken,
    isAdmin: Boolean(adminToken),
    adminAuthError,
    adminNotice,
    loginAdmin,
    logoutAdmin,
    createNode,
    deleteNode,
    createGateway,
    deleteGateway,
    resetTopology,
  };
}
