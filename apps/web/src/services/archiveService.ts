import { LiveWebSocketClient } from "./websocketClient";

export interface HistoricalTelemetryRow {
  id: number;
  nodeId: number;
  nodeName: string;
  temperature: number | null;
  humidity: number | null;
  co: number | null;
  co2: number | null;
  vocIndex: number | null;
  pm25: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  battery: number | null;
  flags: number;
  mode: number;
  receivedAt: string;
}

export interface ArchiveQueryFilter {
  nodeId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ArchiveQueryResult {
  rows: HistoricalTelemetryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * SQLite veritabanı arşivinden sayfalanmış ve filtrelenmiş telemetri kayıtlarını çeker.
 * Önce hızlı HTTP API (/api/archive) üzerinden dener; bağlantı kesilirse WebSocket üzerinden sorgular.
 */
export async function fetchHistoricalArchive(
  filter: ArchiveQueryFilter = {},
): Promise<ArchiveQueryResult> {
  const params = new URLSearchParams();
  if (typeof filter.nodeId === "number" && !Number.isNaN(filter.nodeId)) {
    params.set("nodeId", filter.nodeId.toString());
  }
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (typeof filter.limit === "number") params.set("limit", filter.limit.toString());
  if (typeof filter.offset === "number") params.set("offset", filter.offset.toString());
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  try {
    const res = await fetch(`/api/archive?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      return (await res.json()) as ArchiveQueryResult;
    }
  } catch (httpErr) {
    console.warn("[archiveService] HTTP /api/archive başarısız, WSS deneniyor:", httpErr);
  }

  // WSS Fallback
  return new Promise<ArchiveQueryResult>((resolve, reject) => {
    const client = LiveWebSocketClient.getInstance();
    const queryId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error("Arşiv sorgu zaman aşımına uğradı."));
    }, 8000);

    const unsub = client.onArchiveResult((data) => {
      if (data.queryId === queryId || !data.queryId) {
        clearTimeout(timeout);
        unsub();
        resolve({
          rows: data.rows as HistoricalTelemetryRow[],
          totalCount: data.totalCount,
          page: data.page,
          pageSize: data.pageSize,
        });
      }
    });

    const sent = client.sendCommand({
      type: "query_archive",
      queryId,
      filter,
    });

    if (!sent) {
      clearTimeout(timeout);
      unsub();
      reject(new Error("WebSocket bağlantısı aktif değil."));
    }
  });
}
