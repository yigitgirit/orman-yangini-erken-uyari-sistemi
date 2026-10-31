// Ege Bölgesi (Muğla / Marmaris - Balan Dağı & Bördübet Yangın Havzası) sensör ağı.
// SENARYO.md Belgesindeki Stratejik Dağılım Kriterlerine Göre Hibrit Yerleşim:
// 1. İnsan Temas Hatları (%85 Yangın Riski): Orman servis yolları, piknik ve kamp alanları bariyeri
// 2. Hâkim Rüzgâr Koridorları: Poyraz ve Meltem fırtınası hava kanyonları
// 3. Dağ Sırtları & Enerji İletim Hatları: Trafo ve sırt boyunca yangın erken teşhis hatları
// 4. Balan Dağı Zirve Seyir Noktası: Wokwi ESP32 donanım düğümü (#50)

import type { SensorNode } from "./types.ts";

export const NodeSource = {
  Sim: "sim", // apps/sensor-sim
  Wokwi: "wokwi", // ESP32 firmware (Wokwi simülatörü)
} as const;

export const REGION_INFO = {
  name: "Muğla Marmaris - Balan Dağı Yangın Havzası",
  centerLat: 36.852,
  centerLng: 28.204,
  defaultZoom: 13.6,
} as const;

export const GRID_SIZE = 7;
export const GRID_SPACING_M = 140;

const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/**
 * SENARYO.md kriterlerine göre topografik ve meteorolojik olarak konumlandırılmış 50 sensör düğümü.
 */
export const NODES: readonly SensorNode[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. HAT: Kuzey Yangın Emniyet Şeridi & Orman Yolu Bariyeri (Düğümler 1 - 10)
  // Kriter: İnsan temas hattı, orman servis yolu, dış tarım/yerleşim tamponu
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    name: "A1 (Kuzeybatı Tarım Sınırı)",
    lat: 36.8592,
    lng: 28.1965,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 2,
    name: "A2 (Orman Yolu Virajı 1)",
    lat: 36.8586,
    lng: 28.1988,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 3,
    name: "A3 (Kuzey Yangın Emniyet Seddi)",
    lat: 36.858,
    lng: 28.2012,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 4,
    name: "A4 (Orman Yolu Çeşme Mevkii)",
    lat: 36.8576,
    lng: 28.2036,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 5,
    name: "A5 (Kuzey Geçiş Boğazı)",
    lat: 36.8573,
    lng: 28.2062,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 6,
    name: "A6 (Kızılçam Fidanlık Sınırı)",
    lat: 36.857,
    lng: 28.2088,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 7,
    name: "A7 (Kuzeydoğu Sırt Girişi)",
    lat: 36.8566,
    lng: 28.2115,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 8,
    name: "B1 (Batı Giriş Kontrol Noktası)",
    lat: 36.8562,
    lng: 28.195,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 9,
    name: "B2 (Orman İçi Yol Ayrımı)",
    lat: 36.8554,
    lng: 28.1972,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 10,
    name: "B3 (Kuzeybatı Yamaç Eteği)",
    lat: 36.8547,
    lng: 28.1994,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. HAT: Hâkim Rüzgâr Koridoru & Balan Dağı Yangın Havzası (Düğümler 11 - 20)
  // Kriter: 335° Meltem rüzgârı koridoru, yamaç yukarı baca etkisi (Senaryo 1: 11 -> 18 -> 25)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 11,
    name: "B4 (Balan Dağı Rüzgâr Boğazı)",
    lat: 36.854,
    lng: 28.2018,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 12,
    name: "B5 (Balan Kuzey Yamaç Çamlığı)",
    lat: 36.8552,
    lng: 28.2045,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 13,
    name: "B6 (Zirve Altı Rüzgâr Seddi)",
    lat: 36.8558,
    lng: 28.2072,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 14,
    name: "B7 (Kuzeydoğu Rüzgâr Bacası)",
    lat: 36.856,
    lng: 28.21,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 15,
    name: "C1 (Batı Sarp Yamaç Eteği)",
    lat: 36.8538,
    lng: 28.1938,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 16,
    name: "C2 (Batı Yangın Koruma Şeridi)",
    lat: 36.8534,
    lng: 28.1964,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 17,
    name: "C3 (Kanyon İniş Patikası)",
    lat: 36.853,
    lng: 28.199,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 18,
    name: "C4 (Balan Boğazı Rüzgâr Yolu)",
    lat: 36.8527,
    lng: 28.2028,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 19,
    name: "C5 (Balan Orta Yamaç Gözlem)",
    lat: 36.8535,
    lng: 28.2054,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 20,
    name: "C6 (Doğu Sırtı İntikal Yolu)",
    lat: 36.8542,
    lng: 28.2082,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. HAT: Yüksek Gerilim Hattı & Balan Dağı Sırt Hattı (Düğümler 21 - 30)
  // Kriter: Trafo, enerji nakil hattı ve sırt hattı (Senaryo 3: 25 Trafo flashover)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 21,
    name: "C7 (Doğu Sınır Kayalıkları)",
    lat: 36.8548,
    lng: 28.211,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 22,
    name: "D1 (Batı Kanyon Girişi)",
    lat: 36.8514,
    lng: 28.1935,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 23,
    name: "D2 (Batı Dere Yatağı Yamacı)",
    lat: 36.8516,
    lng: 28.1966,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 24,
    name: "D3 (Trafo Altı Güvenlik Seddi)",
    lat: 36.8518,
    lng: 28.2,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 25,
    name: "D4 (Merkez Trafo & Enerji Nakil)",
    lat: 36.8514,
    lng: 28.2038,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 26,
    name: "D5 (Balan Zirve Batı Eteği)",
    lat: 36.8526,
    lng: 28.2058,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 27,
    name: "D6 (Sırt Hattı Gözlem İstasyonu)",
    lat: 36.853,
    lng: 28.2095,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 28,
    name: "D7 (Doğu Yamaç Yangın Seddi)",
    lat: 36.8536,
    lng: 28.2125,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 29,
    name: "E1 (Kanyon Tabanı Geçidi)",
    lat: 36.8492,
    lng: 28.193,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 30,
    name: "E2 (Güneybatı Orman İçi Yolu)",
    lat: 36.8496,
    lng: 28.1962,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. HAT: Zirve Yaklaşımı & Doğu Kanyonu (Düğümler 31 - 40)
  // Kriter: Zirve gözetleme noktasına rüzgâr duman taşıma (Senaryo 5: 35 -> 50)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 31,
    name: "E3 (Güneydoğu Kanyon Boğazı)",
    lat: 36.8501,
    lng: 28.2048,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 32,
    name: "E4 (Merkez Kanyon Tabanı)",
    lat: 36.8502,
    lng: 28.2005,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 33,
    name: "E5 (Güneydoğu Sırt Patikası)",
    lat: 36.8506,
    lng: 28.2082,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 34,
    name: "E6 (Zirve Güney Geçidi)",
    lat: 36.8512,
    lng: 28.2115,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 35,
    name: "E7 (Zirve Batı Yamacı - Wokwi Komşusu)",
    lat: 36.852,
    lng: 28.2068,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 36,
    name: "F1 (Bördübet Koyu İniş Koridoru)",
    lat: 36.847,
    lng: 28.1925,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 37,
    name: "F2 (Güneybatı Yangın Havuzu Çevresi)",
    lat: 36.8476,
    lng: 28.196,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 38,
    name: "F3 (Vadi Giriş Seddi)",
    lat: 36.8482,
    lng: 28.1995,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 39,
    name: "F4 (Güneydoğu Kanyon Sık Çamlığı)",
    lat: 36.8488,
    lng: 28.203,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 40,
    name: "F5 (Hisarönü Geçiş Yamacı)",
    lat: 36.8494,
    lng: 28.207,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. HAT: Vadi Tabanı & Piknik/Kamp Alanı (Düğümler 41 - 49)
  // Kriter: İnsan temas ve piknik ateşi ihmali (Senaryo 2: 43 Sinsi Tütme)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 41,
    name: "F6 (Doğu Sırtı Yangın Kırıcı)",
    lat: 36.85,
    lng: 28.2105,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 42,
    name: "F7 (Güneydoğu Sınır Kulesi Yanı)",
    lat: 36.8504,
    lng: 28.2135,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 43,
    name: "G3 (Vadi Tabanı Piknik & Kamp Alanı)",
    lat: 36.8454,
    lng: 28.1985,
    source: NodeSource.Sim,
    hasAnemometer: true,
  },
  {
    id: 44,
    name: "G2 (Mesire Alanı Otopark Çevresi)",
    lat: 36.8458,
    lng: 28.195,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 45,
    name: "G4 (Dere Yatağı Çınar & Sığla Boyu)",
    lat: 36.8456,
    lng: 28.2018,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 46,
    name: "G5 (Güney Kanyon Boğazı)",
    lat: 36.8464,
    lng: 28.2052,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 47,
    name: "G6 (Hisarönü Yolu Emniyet Kuşağı)",
    lat: 36.8472,
    lng: 28.209,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 48,
    name: "G7 (Güneydoğu Vadisi Çıkışı)",
    lat: 36.8478,
    lng: 28.2125,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },
  {
    id: 49,
    name: "G1 (Bördübet Koyu Kıyı Ormanı)",
    lat: 36.8442,
    lng: 28.192,
    source: NodeSource.Sim,
    hasAnemometer: false,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. DÜĞÜM 50: Balan Dağı Zirve Gözetleme (Wokwi ESP32)
  // Kriter: Zirve gözetleme kulesi, meteoroloji referans istasyonu
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 50,
    name: "Balan Zirve Gözetleme (Wokwi)",
    lat: 36.852,
    lng: 28.2095,
    source: NodeSource.Wokwi,
    hasAnemometer: true,
  },
];

export const getNode = (id: number): SensorNode | undefined => NODES.find((n) => n.id === id);

/** İki koordinat arası mesafe (m) - kısa mesafede düzlem yaklaşımı */
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
