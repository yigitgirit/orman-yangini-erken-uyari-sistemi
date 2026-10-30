// Akdeniz Bölgesi (Antalya / Manavgat - Köprülü Kanyon Orman Sahası) sensör ağı.
// 7x7 ızgara (49 simüle düğüm, ~120 m aralık) + 1 Wokwi ESP32 düğümü.
// Aralık, gaz sensörlerinin yangını dakikalar içinde yakalayabildiği mesafeye göre seçildi.

export const NodeSource = {
  Sim: "sim", // apps/sensor-sim
  Wokwi: "wokwi", // ESP32 firmware (Wokwi simülatörü)
} as const;
export type NodeSource = (typeof NodeSource)[keyof typeof NodeSource];

export interface SensorNode {
  id: number;
  name: string;
  lat: number;
  lng: number;
  source: NodeSource;
  hasAnemometer: boolean; // Rüzgâr sensörü her düğümde değil, istasyon başına
}

export const REGION_INFO = {
  name: "Antalya Manavgat Orman Bölgesi",
  centerLat: 36.91,
  centerLng: 31.245,
  defaultZoom: 16,
} as const;

export const GRID_SIZE = 7;
export const GRID_SPACING_M = 120;

const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/** Izgara satırları A-G, sütunları 1-7 (A1 kuzeybatı köşe) */
function buildGrid(): SensorNode[] {
  const nodes: SensorNode[] = [];
  const half = (GRID_SIZE - 1) / 2;
  const anemometerIdx = [0, 3, 6]; // 3x3 = 9 rüzgâr istasyonu
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const northM = (half - row) * GRID_SPACING_M;
      const eastM = (col - half) * GRID_SPACING_M;
      nodes.push({
        id: row * GRID_SIZE + col + 1,
        name: `${String.fromCharCode(65 + row)}${col + 1}`,
        lat: REGION_INFO.centerLat + northM / M_PER_DEG_LAT,
        lng: REGION_INFO.centerLng + eastM / mPerDegLng(REGION_INFO.centerLat),
        source: NodeSource.Sim,
        hasAnemometer: anemometerIdx.includes(row) && anemometerIdx.includes(col),
      });
    }
  }
  return nodes;
}

/** Wokwi düğümü ızgaranın doğu kenarında, D satırı hizasında; rüzgâr istasyonu (rüzgâr gülü + anemometre) */
const WOKWI_NODE: SensorNode = {
  id: 50,
  name: "ESP32 (Wokwi)",
  lat: REGION_INFO.centerLat,
  lng: REGION_INFO.centerLng + (4 * GRID_SPACING_M) / mPerDegLng(REGION_INFO.centerLat),
  source: NodeSource.Wokwi,
  hasAnemometer: true,
};

export const NODES: readonly SensorNode[] = [...buildGrid(), WOKWI_NODE];

export const getNode = (id: number): SensorNode | undefined => NODES.find((n) => n.id === id);

/** İki koordinat arası mesafe (m) - kısa mesafede düzlem yaklaşımı yeterli */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dy = (b.lat - a.lat) * M_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * mPerDegLng((a.lat + b.lat) / 2);
  return Math.hypot(dx, dy);
}

/** a'dan b'ye yön (derece, kuzey = 0, saat yönünde) */
export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dy = (b.lat - a.lat) * M_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * mPerDegLng((a.lat + b.lat) / 2);
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}
