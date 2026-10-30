// Akdeniz Bölgesi (Antalya / Manavgat - Köprülü Kanyon Orman Sahası) 8 sensör istasyonu.
// Akdeniz kızılçam ve maki bitki örtüsü yangın riski simülasyonu için örnek koordinatlar.

export interface SensorNode {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export const REGION_INFO = {
  name: "Antalya Manavgat Orman Bölgesi",
  centerLat: 36.91,
  centerLng: 31.245,
  defaultZoom: 13,
} as const;

export const NODES: readonly SensorNode[] = [
  { id: 1, name: "Kızılçam Sırtı", lat: 36.9325, lng: 31.241 },
  { id: 2, name: "Yangın Gözetleme Kulesi", lat: 36.924, lng: 31.258 },
  { id: 3, name: "Kanyon Boğazı", lat: 36.9115, lng: 31.233 },
  { id: 4, name: "Makilik Yamaç", lat: 36.905, lng: 31.265 },
  { id: 5, name: "Taşağıl Çamlığı", lat: 36.892, lng: 31.221 },
  { id: 6, name: "Ziyaretçi Vadisi", lat: 36.885, lng: 31.249 },
  { id: 7, name: "Rüzgâr Geçidi Tepesi", lat: 36.918, lng: 31.215 },
  { id: 8, name: "Su Bendi Mevkii", lat: 36.899, lng: 31.278 },
] as const;
