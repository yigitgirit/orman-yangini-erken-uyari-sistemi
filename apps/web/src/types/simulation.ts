export type RiskLevel = "normal" | "smoldering" | "fire";

export interface SensorStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  elevation: number; // Rakim (metre)
  isHardware?: boolean; // Wokwi donanim dugumu rozeti (Dugum 31)
}

export interface TelemetryReading {
  stationId: number;
  temperature: number; // °C
  humidity: number; // %
  co: number; // ppm
  aqi: number;
  windSpeed: number; // m/s
  windDirection: number; // Derece (0-360)
  battery: number; // %
  tempRate: number; // °C/dk (türev)
  coRate: number; // ppm/dk (türev)
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  updatedAt: string;
}

export interface EnvironmentalImpact {
  riskAreaHectares: number; // Tehdit altindaki alan
  preventedCo2Tons: number; // Kurtarilan karbon (Hektar * 180)
  savedTreesEstimate: number; // Yaklasik kurtarilan agac
}

export interface SimulationState {
  stations: SensorStation[];
  telemetries: Map<number, TelemetryReading>;
  history: Map<number, TelemetryReading[]>;
  activeFireNodeId: number | null; // Su an yanan/alarm veren dugum
  simulatedWindDirection: number; // Operator slider ile degistirebilir
  simulatedWindSpeed: number; // m/s
  impact: EnvironmentalImpact;
  selectedStationId: number | null;
  cameraFocusId: number | null;
}
