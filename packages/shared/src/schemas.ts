import { z } from "zod";

/** Düğüm kaynağı (Simülatör veya Wokwi ESP32) */
export const NodeSourceSchema = z.enum(["sim", "wokwi"]);

/** Tek bir sensör düğümü meta verisi */
export const SensorNodeSchema = z.object({
  id: z.number().int().min(1).max(255),
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  source: NodeSourceSchema,
  hasAnemometer: z.boolean(),
});

/** Yangın risk seviyeleri */
export const RiskLevelSchema = z.enum(["green", "yellow", "red"]);

/** Yangın evresi (rengin "neden"i) */
export const FireStageSchema = z.enum(["none", "risk", "pyrolysis", "smoldering", "flaming"]);

/** Düğüm çalışma modu (0: Normal, 1: Alert) */
export const NodeModeSchema = z.union([z.literal(0), z.literal(1)]);

/** Çözülmüş PyrosFrame ikili paket içeriği */
export const PyrosFrameSchema = z.object({
  nodeId: z.number().int().min(1).max(255),
  mode: NodeModeSchema,
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  co: z.number().nonnegative(),
  co2: z.number().nonnegative(),
  vocIndex: z.number().nonnegative(),
  pm25: z.number().nonnegative().nullable(),
  windSpeed: z.number().nonnegative().nullable(),
  windDirection: z.number().min(0).max(360).nullable(),
  battery: z.number().min(0).max(100),
  flags: z.number().int(),
});

/** Gateway -> MQTT telemetri yükü (PyrosFrame + ISO-8601 zaman damgası) */
export const TelemetryMessageSchema = PyrosFrameSchema.extend({
  receivedAt: z.string(),
});

/** Bağımsız sensör füzyon sinyal aileleri */
export const SignalFamiliesSchema = z.object({
  earlyGas: z.boolean(),
  carbonMonoxide: z.boolean(),
  smoke: z.boolean(),
  combustion: z.boolean(),
});

/** Backend analiz ve risk çıktısı */
export const NodeRiskSchema = z.object({
  nodeId: z.number().int().min(1).max(255),
  score: z.number().min(0).max(100),
  level: RiskLevelSchema,
  stage: FireStageSchema,
  signals: SignalFamiliesSchema,
  signalCount: z.number().int().min(0).max(4),
  confirmed: z.boolean(),
  confirmedBy: z.array(z.number().int()),
  mce: z.number().nullable(),
  vpd: z.number(),
  delta: z.object({
    temperature: z.number(),
    co: z.number(),
    co2: z.number(),
    vocIndex: z.number(),
    pm25: z.number().nullable(),
  }),
  rate: z.object({
    temperature: z.number(),
    co: z.number(),
    co2: z.number(),
    vocIndex: z.number(),
    pm25: z.number().nullable(),
  }),
  accel: z.object({
    temperature: z.number(),
    co2: z.number(),
  }),
  updatedAt: z.string(),
});

/** Erken tespit çevresel etki özeti */
export const ImpactSummarySchema = z.object({
  detectedFires: z.number().int().nonnegative(),
  savedHectares: z.number().nonnegative(),
  preventedCo2Tons: z.number().nonnegative(),
});

/** 2B/3B Rüzgâr vektörü bileşenleri */
export const WindVectorSchema = z.object({
  speed: z.number().nonnegative(),
  directionFrom: z.number().min(0).max(360),
  directionTo: z.number().min(0).max(360),
  u: z.number(),
  v: z.number(),
});

/** Tek bir düğümdeki rüzgâr tahmini / ölçümü */
export const NodeWindSchema = WindVectorSchema.extend({
  nodeId: z.number().int(),
  measured: z.boolean(),
});

/** Bölgesel rüzgâr alanı yayını */
export const WindFieldSchema = z.object({
  updatedAt: z.string(),
  stationCount: z.number().int().nonnegative(),
  regional: WindVectorSchema,
  nodes: z.array(NodeWindSchema),
});

/** Backend -> Web WebSocket yayın mesajları */
export const WsMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("nodes"), data: z.array(SensorNodeSchema).readonly() }),
  z.object({ type: z.literal("telemetry"), data: TelemetryMessageSchema }),
  z.object({ type: z.literal("risk"), data: NodeRiskSchema }),
  z.object({ type: z.literal("impact"), data: ImpactSummarySchema }),
  z.object({ type: z.literal("wind"), data: WindFieldSchema }),
]);

/** Web -> Backend istemci komutları */
export const WsCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("trigger_fire"), nodeId: z.number().int() }),
  z.object({ type: z.literal("extinguish_fire") }),
]);
