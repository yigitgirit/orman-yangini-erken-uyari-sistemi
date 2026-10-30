// Rüzgâr alanı: istasyon ölçümlerinden her düğüm için rüzgâr vektörü
//
// Rüzgâr yalnızca istasyonlarda (anemometreli düğümler) ölçülür. Diğer düğümler için
// ters mesafe ağırlıklı ara değer (IDW) kullanılır. Açıların ortalaması alınamayacağı için
// (350° ile 10°'nin ortalaması 180° değildir) ortalama u/v bileşenleri üzerinden yapılır.

import {
  distanceM,
  getNode,
  NODES,
  type NodeWind,
  type TelemetryMessage,
  type WindField,
  type WindVector,
  windFromComponents,
  windFromSpeedDir,
} from "@pyros/shared";

const STATION_TTL_MS = 60_000; // Bu süreden eski istasyon ölçümü kullanılmaz
const IDW_POWER = 2;

const stations = new Map<number, { wind: WindVector; at: number }>();

/** Telemetride rüzgâr varsa istasyon ölçümü olarak kaydet */
export function recordWind(t: TelemetryMessage): void {
  if (t.windSpeed === null || t.windDirection === null) return;
  stations.set(t.nodeId, {
    wind: windFromSpeedDir(t.windSpeed, t.windDirection),
    at: Date.parse(t.receivedAt),
  });
}

/** Güncel rüzgâr alanı; hiç canlı istasyon yoksa null */
export function windField(now = Date.now()): WindField | null {
  const live = [...stations.entries()]
    .filter(([, s]) => now - s.at <= STATION_TTL_MS)
    .map(([id, s]) => ({ node: getNode(id), wind: s.wind }))
    .filter((s): s is { node: NonNullable<typeof s.node>; wind: WindVector } => !!s.node);
  if (live.length === 0) return null;

  const regional = windFromComponents(
    live.reduce((a, s) => a + s.wind.u, 0) / live.length,
    live.reduce((a, s) => a + s.wind.v, 0) / live.length,
  );

  const nodes: NodeWind[] = NODES.map((node) => {
    const own = live.find((s) => s.node.id === node.id);
    if (own) return { nodeId: node.id, ...own.wind, measured: true };
    let wSum = 0;
    let u = 0;
    let v = 0;
    for (const s of live) {
      const w = 1 / Math.max(distanceM(node, s.node), 1) ** IDW_POWER;
      wSum += w;
      u += w * s.wind.u;
      v += w * s.wind.v;
    }
    return { nodeId: node.id, ...windFromComponents(u / wSum, v / wSum), measured: false };
  });

  return { updatedAt: new Date(now).toISOString(), stationCount: live.length, regional, nodes };
}
