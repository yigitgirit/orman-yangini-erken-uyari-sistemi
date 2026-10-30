import type {
  EnvironmentalImpact,
  GatewayInfo,
  RiskLevel,
  SensorStation,
  TelemetryReading,
} from "../types/simulation";

/**
 * Muğla Marmaris / Balan Dağı - Bördübet - Asparan Orman Havzası
 * Ağustos 2021 Marmaris Büyük Orman Yangını Sahası (Kızılçam & Sığla Ormanları)
 * 31 Sensör İstasyonu: Tamamı yerleşim yerlerinden uzak, sarp dağ sırtlarında ve derin orman içindedir.
 */
export const FOREST_STATIONS: readonly SensorStation[] = [
  // 1. Bölge: Balan Dağı Zirve & Yüksek Sırt Yangın Gözetleme Hattı (Kuzey Zirveleri)
  { id: 1, name: "Balan Dağı Zirve Gözetleme", lat: 36.872, lng: 28.212, elevation: 995 },
  { id: 2, name: "Balan Doğu Yangın Kulesi", lat: 36.8765, lng: 28.225, elevation: 880 },
  { id: 3, name: "Balan Kuzey Emniyet Şeridi", lat: 36.881, lng: 28.205, elevation: 760 },
  { id: 4, name: "Sarp Kayalık Zirve Sırtı", lat: 36.868, lng: 28.228, elevation: 840 },
  { id: 5, name: "Çamlıtepe Radar Yolu", lat: 36.863, lng: 28.219, elevation: 720 },
  { id: 6, name: "Kuzey Rüzgâr Koridoru", lat: 36.879, lng: 28.218, elevation: 810 },

  // 2. Bölge: Asparan Havzası & Karadere Vadi Koridoru (Merkez Orman Tabanı)
  { id: 7, name: "Asparan Orman İçi Deposu", lat: 36.858, lng: 28.195, elevation: 410 },
  { id: 8, name: "Karadere Vadi Tabanı Çamlığı", lat: 36.852, lng: 28.188, elevation: 340 },
  { id: 9, name: "Karadere Menfez Kesişimi", lat: 36.848, lng: 28.194, elevation: 290 },
  { id: 10, name: "Asparan Doğu Yamaç Koruluğu", lat: 36.861, lng: 28.205, elevation: 520 },
  { id: 11, name: "Eski Değirmen Vadisi", lat: 36.854, lng: 28.202, elevation: 460 },
  { id: 12, name: "Sık Çamlık Vadi İçi", lat: 36.849, lng: 28.182, elevation: 310 },

  // 3. Bölge: Değirmenyanı & Bördübet Geçiş Havzası (Batı Orman Sınırı - 2021 Yangın Başlangıç Alanı)
  { id: 13, name: "Değirmenyanı Orman Tampon Hattı", lat: 36.858, lng: 28.168, elevation: 280 },
  { id: 14, name: "Bördübet Geçidi Sık Çamlığı", lat: 36.864, lng: 28.158, elevation: 360 },
  { id: 15, name: "Küfre Kanyon Sırtı", lat: 36.871, lng: 28.165, elevation: 490 },
  { id: 16, name: "Yediadalar Rüzgâr Koridoru", lat: 36.877, lng: 28.174, elevation: 580 },
  { id: 17, name: "Balıkaşıran Tepe Yamacı", lat: 36.869, lng: 28.182, elevation: 620 },
  { id: 18, name: "Batı Yangın Emniyet Şeridi", lat: 36.853, lng: 28.175, elevation: 320 },

  // 4. Bölge: Armutalan Batı Sırtları & Mezargediği Kanyonu (Güneydoğu Yüksek Risk Kuşağı)
  { id: 19, name: "Mezargediği Sarp Geçidi", lat: 36.842, lng: 28.212, elevation: 670 },
  { id: 20, name: "Armutalan Yangın Önleme Seddi", lat: 36.845, lng: 28.225, elevation: 590 },
  { id: 21, name: "Seyirtepe Orman Gözlem", lat: 36.839, lng: 28.221, elevation: 610 },
  { id: 22, name: "Çamaltı Orman İçi Müdahale Yolu", lat: 36.846, lng: 28.205, elevation: 480 },
  { id: 23, name: "Güney Dağ Emniyet Kuşağı", lat: 36.835, lng: 28.215, elevation: 540 },

  // 5. Bölge: Yeşilbelde & Çetibeli Doğu Yamacı (Kuzeydoğu Kızılçam Koruma Alanı)
  { id: 24, name: "Yeşilbelde Sık Meşelik & Çamlık", lat: 36.886, lng: 28.215, elevation: 630 },
  { id: 25, name: "Çetibeli Orman İçi Tepe", lat: 36.882, lng: 28.228, elevation: 710 },
  { id: 26, name: "Saklıvadi Yangın Havuzu", lat: 36.874, lng: 28.238, elevation: 580 },
  { id: 27, name: "Doğu Yamaç Yangın Kırıcı Şerit", lat: 36.865, lng: 28.235, elevation: 660 },
  { id: 28, name: "Beldibi Tepe Sırtı", lat: 36.855, lng: 28.232, elevation: 530 },

  // 6. Bölge: Merkez Plato & Fiziksel Wokwi Donanım Düğümü (#31)
  { id: 29, name: "Balan Yaylası Orta Plato", lat: 36.865, lng: 28.202, elevation: 680 },
  { id: 30, name: "Karadere Tepe İrtibat Düğümü", lat: 36.856, lng: 28.185, elevation: 430 },
  {
    id: 31,
    name: "Balan Batı Zirvesi (Wokwi ESP32)",
    lat: 36.868,
    lng: 28.196,
    elevation: 850,
    isHardware: true,
  },
] as const;

// Geriye dönük uyumluluk takma adı
export const MANAVGAT_STATIONS = FOREST_STATIONS;

/** 2 Adet Stratejik LoRaWAN Ağ Geçidi Kulesi (Balan Dağı Zirvesi ve Bördübet Geçidi) */
export const GATEWAYS: readonly GatewayInfo[] = [
  {
    id: 1,
    name: "GW-01 Balan Dağı Zirve Röle Kulesi",
    lat: 36.872,
    lng: 28.212,
    elevation: 995,
    radiusMeters: 4800,
    frequency: "EU868 (8 Kanal)",
    connectedNodes: [1, 2, 3, 4, 5, 6, 10, 11, 19, 20, 21, 24, 25, 26, 27, 28, 29, 31],
    rssiAvgDbm: -91,
    snrAvgDb: 8.8,
    packetSuccessRate: 99.8,
    uptime: "21g 18s 45dk",
    backhaul: "4G LTE Cat-M1 / Güneş Paneli + LiFePO4",
  },
  {
    id: 2,
    name: "GW-02 Bördübet Geçidi Ana Röle",
    lat: 36.862,
    lng: 28.165,
    elevation: 560,
    radiusMeters: 4400,
    frequency: "EU868 (8 Kanal)",
    connectedNodes: [7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 22, 23, 30],
    rssiAvgDbm: -87,
    snrAvgDb: 9.4,
    packetSuccessRate: 99.9,
    uptime: "34g 06s 12dk",
    backhaul: "Fiber Optik / Kesintisiz Güç Kaynağı",
  },
] as const;

export const REGION_CENTER = {
  lat: 36.861,
  lng: 28.198,
  zoom: 12.8,
  pitch: 60,
  bearing: -15,
};

/**
 * Ege Bölgesi Ağustos Yangın Dinamikleri - Simülasyon Motoru
 * Ağustos aylarında Ege'de etkili olan sert Kuzey/Kuzeybatı Meltem rüzgârı (335° NNW)
 */
export class MockSimulationEngine {
  private fireNodeId: number | null = null;
  private windDirection = 335; // Kuzeybatı Meltem Rüzgârı (Ağustos Ege klasiği)
  private windSpeed = 7.4; // m/s (Sert meltem fırtınası)
  private tickCount = 0;
  private history = new Map<number, TelemetryReading[]>();

  constructor() {
    // Başlangıç geçmişi doldur
    for (const st of FOREST_STATIONS) {
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

    for (const st of FOREST_STATIONS) {
      const isFire = st.id === this.fireNodeId;

      // Ağustos ayı Ege sıcaklık profili (32-34 °C taban sıcaklık, düşük bağıl nem %22)
      let temp = 33.2 + jitter(1.0);
      let humidity = 24 + jitter(2.0); // Kuru orman havası
      let co = 8 + jitter(2.0);
      let aqi = 32 + jitter(3.0);
      let riskScore = 0;
      let riskLevel: RiskLevel = "normal";

      if (isFire) {
        // Yangın / Tütme dinamiği: Tick arttıkça gaz türevi fırlar
        const progress = Math.min(100, this.tickCount * 4);
        temp = 33.2 + progress * 0.65 + jitter(1.5);
        humidity = Math.max(6, 24 - progress * 0.2 + jitter(1.0));
        co = 8 + progress * 2.4 + jitter(3.0); // CO hızla yükselir
        aqi = 32 + progress * 2.2;

        // Türev hesabı
        const coRate = 14 + jitter(2); // +14 ppm/dk
        const tempRate = 2.8 + jitter(0.4); // +2.8 °C/dk

        if (temp > 68 || co > 125) {
          riskLevel = "fire";
          riskScore = 96;
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
    const riskArea = this.fireNodeId ? Math.min(22.0, 1.4 + this.tickCount * 0.3) : 0;
    const preventedCo2 = Math.round(riskArea * 195);
    const savedTrees = Math.round(riskArea * 680);

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
