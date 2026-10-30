// Ege Bölgesi (Muğla / Marmaris - Balan Dağı & Bördübet Orman Sahası) 8 sensör istasyonu.
// Ağustos 2021 büyük Ege orman yangını sahası (Kızılçam ve Sığla ormanları) koordinatları.

export interface SensorNode {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export const REGION_INFO = {
  name: "Marmaris Balan Dağı Orman Bölgesi",
  centerLat: 36.861,
  centerLng: 28.198,
  defaultZoom: 13,
} as const;

export const NODES: readonly SensorNode[] = [
  { id: 1, name: "Balan Dağı Zirve Gözetleme", lat: 36.872, lng: 28.212 },
  { id: 2, name: "Balan Doğu Yangın Kulesi", lat: 36.8765, lng: 28.225 },
  { id: 3, name: "Asparan Orman İçi Deposu", lat: 36.858, lng: 28.195 },
  { id: 4, name: "Karadere Vadi Tabanı", lat: 36.852, lng: 28.188 },
  { id: 5, name: "Bördübet Geçidi Sık Çamlığı", lat: 36.864, lng: 28.158 },
  { id: 6, name: "Mezargediği Sarp Geçidi", lat: 36.842, lng: 28.212 },
  { id: 7, name: "Yeşilbelde Meşe & Çamlık", lat: 36.886, lng: 28.215 },
  { id: 8, name: "Balan Batı Zirvesi (Wokwi ESP32)", lat: 36.868, lng: 28.196 },
] as const;
