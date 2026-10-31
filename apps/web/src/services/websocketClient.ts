import {
  type FireSpreadPrediction,
  type GatewayInfo,
  type ImpactSummary,
  type NodeRisk,
  type SensorNode,
  type TelemetryMessage,
  type WindField,
  type WsCommand,
  WsCommandSchema,
  WsMessageSchema,
} from "@pyros/shared";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

type StatusListener = (status: ConnectionStatus) => void;
type NodesListener = (nodes: readonly SensorNode[]) => void;
type GatewaysListener = (gateways: readonly GatewayInfo[]) => void;
type TelemetryListener = (telemetry: TelemetryMessage) => void;
type RiskListener = (risk: NodeRisk) => void;
type ImpactListener = (impact: ImpactSummary) => void;
type WindListener = (wind: WindField) => void;
type FireSpreadListener = (spread: FireSpreadPrediction | null) => void;
type AdminAuthListener = (data: { success: boolean; token?: string; error?: string }) => void;
type AdminActionListener = (data: { success: boolean; action: string; message: string }) => void;
export interface ArchiveResultData {
  queryId?: string;
  rows: unknown[];
  totalCount: number;
  page: number;
  pageSize: number;
}
type ArchiveListener = (data: ArchiveResultData) => void;

export class LiveWebSocketClient {
  private static instance: LiveWebSocketClient | null = null;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  private statusListeners = new Set<StatusListener>();
  private nodesListeners = new Set<NodesListener>();
  private gatewaysListeners = new Set<GatewaysListener>();
  private telemetryListeners = new Set<TelemetryListener>();
  private riskListeners = new Set<RiskListener>();
  private impactListeners = new Set<ImpactListener>();
  private windListeners = new Set<WindListener>();
  private fireSpreadListeners = new Set<FireSpreadListener>();
  private adminAuthListeners = new Set<AdminAuthListener>();
  private adminActionListeners = new Set<AdminActionListener>();
  private archiveListeners = new Set<ArchiveListener>();

  private url: string;

  private constructor() {
    // Varsayılan: sayfanın kendi sunucusu üzerinden /ws (vite.config.ts backend'e wss ile aktarır).
    // Tarayıcı backend'in kendinden imzalı sertifikasını görmez; sertifika onayı gerekmez.
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = import.meta.env.VITE_WS_URL ?? `${proto}//${window.location.host}/ws`;
  }

  public static getInstance(): LiveWebSocketClient {
    if (!LiveWebSocketClient.instance) {
      LiveWebSocketClient.instance = new LiveWebSocketClient();
    }
    return LiveWebSocketClient.instance;
  }

  public connect(): void {
    if (this.ws || this.isDestroyed) return;

    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const validation = WsMessageSchema.safeParse(raw);
          if (!validation.success) {
            console.warn("[ws-client] Geçersiz sunucu çerçevesi:", validation.error.issues);
            return;
          }
          const msg = validation.data;
          switch (msg.type) {
            case "nodes":
              for (const l of this.nodesListeners) l(msg.data);
              break;
            case "gateways":
              for (const l of this.gatewaysListeners) l(msg.data);
              break;
            case "telemetry":
              for (const l of this.telemetryListeners) l(msg.data);
              break;
            case "risk":
              for (const l of this.riskListeners) l(msg.data);
              break;
            case "impact":
              for (const l of this.impactListeners) l(msg.data);
              break;
            case "wind":
              for (const l of this.windListeners) l(msg.data);
              break;
            case "fire_spread":
              for (const l of this.fireSpreadListeners) l(msg.data);
              break;
            case "admin_auth_result":
              for (const l of this.adminAuthListeners) l(msg.data);
              break;
            case "admin_action_result":
              for (const l of this.adminActionListeners) l(msg.data);
              break;
            case "archive_result":
              for (const l of this.archiveListeners) l(msg.data);
              break;
          }
        } catch (err) {
          console.warn("[ws-client] JSON ayrıştırma hatası:", (err as Error).message);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.setStatus("disconnected");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("[ws-client] WebSocket bağlantı uyarısı:", err);
      };
    } catch (_err) {
      this.ws = null;
      this.setStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectAttempts++;
    // Üstel geri çekilme (1.5s, 3s, 6s ... max 20s)
    const delay = Math.min(20_000, 1500 * 2 ** Math.min(4, this.reconnectAttempts - 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public sendCommand(cmd: WsCommand): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const validation = WsCommandSchema.safeParse(cmd);
    if (!validation.success) {
      console.error("[ws-client] Geçersiz komut:", validation.error.issues);
      return false;
    }
    this.ws.send(JSON.stringify(validation.data));
    return true;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const l of this.statusListeners) l(status);
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getUrl(): string {
    return this.url;
  }

  // --- Olay Dinleyicileri ---
  public onStatus(l: StatusListener): () => void {
    this.statusListeners.add(l);
    l(this.status);
    return () => this.statusListeners.delete(l);
  }

  public onNodes(l: NodesListener): () => void {
    this.nodesListeners.add(l);
    return () => this.nodesListeners.delete(l);
  }

  public onGateways(l: GatewaysListener): () => void {
    this.gatewaysListeners.add(l);
    return () => this.gatewaysListeners.delete(l);
  }

  public onTelemetry(l: TelemetryListener): () => void {
    this.telemetryListeners.add(l);
    return () => this.telemetryListeners.delete(l);
  }

  public onRisk(l: RiskListener): () => void {
    this.riskListeners.add(l);
    return () => this.riskListeners.delete(l);
  }

  public onImpact(l: ImpactListener): () => void {
    this.impactListeners.add(l);
    return () => this.impactListeners.delete(l);
  }

  public onWind(l: WindListener): () => void {
    this.windListeners.add(l);
    return () => this.windListeners.delete(l);
  }

  public onFireSpread(l: FireSpreadListener): () => void {
    this.fireSpreadListeners.add(l);
    return () => this.fireSpreadListeners.delete(l);
  }

  public onAdminAuth(l: AdminAuthListener): () => void {
    this.adminAuthListeners.add(l);
    return () => this.adminAuthListeners.delete(l);
  }

  public onAdminAction(l: AdminActionListener): () => void {
    this.adminActionListeners.add(l);
    return () => this.adminActionListeners.delete(l);
  }

  public onArchiveResult(l: ArchiveListener): () => void {
    this.archiveListeners.add(l);
    return () => this.archiveListeners.delete(l);
  }

  public disconnect(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }
}
