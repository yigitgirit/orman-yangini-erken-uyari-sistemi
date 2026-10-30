import type {
  EnvironmentalImpact,
  RiskLevel,
  SensorStation,
  TelemetryReading,
} from "../types/simulation";

/**
 * Antalya Manavgat / Köprülü Kanyon Orman Sahası
 * 31 Sensör İstasyonu (30 Sanal Saha Sensörü + 1 Wokwi Donanım Düğümü)
 */
export const MANAVGAT_STATIONS: readonly SensorStation[] = [
  // 1. Bölge: Kuzey Dağ Sırtı ve Yangın Gözetleme Hattı (Yüksek Rakım)
  { id: 1, name: "Kızılçam Zirve Sırtı", lat: 36.9385, lng: 31.241, elevation: 920 },
  { id: 2, name: "Kartal Tepesi Yangın Kulesi", lat: 36.932, lng: 31.258, elevation: 1100 },
  { id: 3, name: "Bozburun Geçidi Kuzey", lat: 36.928, lng: 31.229, elevation: 840 },
  { id: 4, name: "Kuzey Rüzgâr Koridoru", lat: 36.935, lng: 31.249, elevation: 980 },
  { id: 5, name: "Çamlıtepe Gözlem Noktası", lat: 36.924, lng: 31.265, elevation: 1040 },
  { id: 6, name: "Kayaardı Yangın Emniyet Şeridi", lat: 36.921, lng: 31.238, elevation: 790 },

  // 2. Bölge: Köprülü Kanyon Vadi Tabanı ve Nehir Yatağı
  { id: 7, name: "Kanyon Boğaz Girişi", lat: 36.915, lng: 31.232, elevation: 320 },
  { id: 8, name: "Köprüçay Su Bendi", lat: 36.909, lng: 31.235, elevation: 280 },
  { id: 9, name: "Ziyaretçi Parkuru Vadisi", lat: 36.904, lng: 31.242, elevation: 310 },
  { id: 10, name: "Kanyon Doğu Yamacı", lat: 36.912, lng: 31.248, elevation: 540 },
  { id: 11, name: "Tarihi Taş Köprü Mevkii", lat: 36.899, lng: 31.238, elevation: 260 },
  { id: 12, name: "Sel Deresi Kesişimi", lat: 36.903, lng: 31.229, elevation: 350 },

  // 3. Bölge: Taşağıl / Değirmenözü Yoğun Çam Ormanı (Yüksek Risk Alanı)
  { id: 13, name: "Taşağıl Batı Sınırı", lat: 36.892, lng: 31.221, elevation: 420 },
  { id: 14, name: "Değirmenözü Sık Çamlık", lat: 36.897, lng: 31.254, elevation: 490 },
  { id: 15, name: "Makilik Tepe Sırtı", lat: 36.905, lng: 31.265, elevation: 620 },
  { id: 16, name: "Taşağıl Köy Tampon Bölgesi", lat: 36.885, lng: 31.228, elevation: 310 },
  { id: 17, name: "Eski Orman Deposu", lat: 36.889, lng: 31.244, elevation: 360 },
  { id: 18, name: "Güneydoğu Yamaç Koruması", lat: 36.894, lng: 31.269, elevation: 580 },

  // 4. Bölge: Batı Sırtları ve Akdeniz Rüzgâr Koridoru
  { id: 19, name: "Rüzgâr Geçidi Tepe A", lat: 36.918, lng: 31.215, elevation: 710 },
  { id: 20, name: "Rüzgâr Geçidi Tepe B", lat: 36.911, lng: 31.218, elevation: 680 },
  { id: 21, name: "Sarp Kayalık Batı Burnu", lat: 36.925, lng: 31.219, elevation: 750 },
  { id: 22, name: "Batı Orman İçi Müdahale Yolu", lat: 36.902, lng: 31.214, elevation: 520 },
  { id: 23, name: "Güneybatı Sınır Karakolu", lat: 36.888, lng: 31.209, elevation: 390 },

  // 5. Bölge: Doğu Sırtı ve Yaban Hayatı Koruma Havzası
  { id: 24, name: "Yaban Havzası Doğu Yamacı", lat: 36.929, lng: 31.275, elevation: 860 },
  { id: 25, name: "Çakıllı Tepe Sırtı", lat: 36.921, lng: 31.282, elevation: 790 },
  { id: 26, name: "Doğu Yangın Havuzu Mevkii", lat: 36.914, lng: 31.272, elevation: 610 },
  { id: 27, name: "Meşe Koruluğu Etekleri", lat: 36.907, lng: 31.278, elevation: 530 },
  { id: 28, name: "Güneydoğu Kanyon Çıkışı", lat: 36.899, lng: 31.285, elevation: 440 },

  // 6. Bölge: İkincil Ara İstasyonlar & Wokwi Donanım Rozeti
  { id: 29, name: "Kanyon Orta Plato", lat: 36.918, lng: 31.244, elevation: 670 },
  { id: 30, name: "Merkez Koordinasyon İrtibat", lat: 36.908, lng: 31.258, elevation: 510 },
  {
    id: 31,
    name: "Kanuni Gözlem Tepesi (Wokwi ESP32)",
    lat: 36.926,
    lng: 31.246,
    elevation: 880,
    isHardware: true,
  },
] as const;

/** 2 Adet Stratejik LoRaWAN Ağ Geçidi Kulesi (Yüksek Zirvelerde) */
export const GATEWAYS = [
  { id: 1, name: "GW-01 Kartal Tepesi Röle Kulesi", lat: 36.932, lng: 31.258, radiusMeters: 4500 },
  { id: 2, name: "GW-02 Rüzgâr Geçidi Ana İstasyon", lat: 36.915, lng: 31.218, radiusMeters: 4200 },
] as const;

export const REGION_CENTER = {
  lat: 36.912,
  lng: 31.245,
  zoom: 12.8,
  pitch: 58,
  bearing: -15,
};

/**
 * Gerçekçi zaman serisi ve gürültü üreteci
 */
export class MockSimulationEngine {
  private fireNodeId: number | null = null;
  private windDirection = 195; // Güney-Güneybatı (Akdeniz rüzgârı)
  private windSpeed = 6.2; // m/s
  private tickCount = 0;
  private history = new Map<number, TelemetryReading[]>();

  constructor() {
    // Başlangıç geçmişi doldur
    for (const st of MANAVGAT_STATIONS) {
      this.history.set(st.id, []);
    }
  }

  public setFireScenario(nodeId: number | null): void {
    this.fireNodeId = nodeId;
    if (!nodeId) this.tickCount = 0;
  }

  public getFireNodeId(): number | null {
    return this.fireNodeId;
  }

  public setWindDirection(deg: number): void {
    this.windDirection = (deg + 360) % 360;
  }

  public getWindDirection(): number {
    return this.windDirection;
  }

  public setWindSpeed(ms: number): void {
    this.windSpeed = Math.max(0.5, Math.min(25, ms));
  }

  public getWindSpeed(): number {
    return this.windSpeed;
  }

  /**
   * Her saniye tüm 31 istasyon için güncel okuma üretir
   */
  public step(): {
    readings: TelemetryReading[];
    impact: EnvironmentalImpact;
  } {
    if (this.fireNodeId) this.tickCount++;

    const readings: TelemetryReading[] = [];
    const jitter = (range: number) => (Math.random() - 0.5) * range;

    for (const st of MANAVGAT_STATIONS) {
      const isFire = st.id === this.fireNodeId;

      let temp = 24.5 + jitter(1.0);
      let humidity = 42 + jitter(2.5);
      let co = 8 + jitter(2.0);
      let aqi = 35 + jitter(3.0);
      let riskScore = 0;
      let riskLevel: RiskLevel = "normal";

      if (isFire) {
        // Yangın / Tütme dinamiği: Tick arttıkça gaz türevi fırlar
        const progress = Math.min(100, this.tickCount * 4);
        temp = 24.5 + progress * 0.6 + jitter(1.5);
        humidity = Math.max(8, 42 - progress * 0.35 + jitter(1.0));
        co = 8 + progress * 2.2 + jitter(3.0); // CO hızla yükselir
        aqi = 35 + progress * 2.0;

        // Türev hesabı
        const coRate = 12 + jitter(2); // +12 ppm/dk
        const tempRate = 2.4 + jitter(0.4); // +2.4 °C/dk

        if (temp > 65 || co > 120) {
          riskLevel = "fire";
          riskScore = 95;
        } else if (co > 45 || progress > 15) {
          riskLevel = "smoldering";
          riskScore = Math.min(88, Math.round(coRate * 2.5 + tempRate * 10));
        }

        const reading: TelemetryReading = {
          stationId: st.id,
          temperature: Math.round(temp * 10) / 10,
          humidity: Math.round(humidity),
          co: Math.round(co),
          aqi: Math.round(aqi),
          windSpeed: Math.round((this.windSpeed + jitter(0.5)) * 10) / 10,
          windDirection: Math.round(this.windDirection),
          battery: 92,
          tempRate: Math.round(tempRate * 10) / 10,
          coRate: Math.round(coRate * 10) / 10,
          riskScore,
          riskLevel,
          updatedAt: new Date().toLocaleTimeString(),
        };

        this.pushHistory(st.id, reading);
        readings.push(reading);
      } else {
        // Normal istasyon telemetrisi
        const reading: TelemetryReading = {
          stationId: st.id,
          temperature: Math.round(temp * 10) / 10,
          humidity: Math.round(humidity),
          co: Math.round(co),
          aqi: Math.round(aqi),
          windSpeed: Math.round((this.windSpeed + jitter(0.5)) * 10) / 10,
          windDirection: Math.round(this.windDirection),
          battery: 88 + (st.id % 10),
          tempRate: Math.round(jitter(0.1) * 10) / 10,
          coRate: Math.round(jitter(0.2) * 10) / 10,
          riskScore: 0,
          riskLevel: "normal",
          updatedAt: new Date().toLocaleTimeString(),
        };

        this.pushHistory(st.id, reading);
        readings.push(reading);
      }
    }

    // Çevresel etki (Huygens etki alanı ve kurtarılan CO2)
    const riskArea = this.fireNodeId ? Math.min(18.5, 1.2 + this.tickCount * 0.25) : 0;
    const preventedCo2 = Math.round(riskArea * 180);
    const savedTrees = Math.round(riskArea * 640);

    return {
      readings,
      impact: {
        riskAreaHectares: Math.round(riskArea * 10) / 10,
        preventedCo2Tons: preventedCo2,
        savedTreesEstimate: savedTrees,
      },
    };
  }

  public getHistory(stationId: number): TelemetryReading[] {
    return this.history.get(stationId) ?? [];
  }

  private pushHistory(id: number, reading: TelemetryReading): void {
    const list = this.history.get(id) ?? [];
    list.push(reading);
    if (list.length > 25) list.shift(); // Son 25 saniye
    this.history.set(id, list);
  }
}
