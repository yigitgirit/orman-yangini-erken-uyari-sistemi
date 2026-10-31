// Uygulamalar arası JSON veri şemaları ve Zod tarafından türetilen tipler.
import type { z } from "zod";
import type {
  FireStageSchema,
  GatewayInfoSchema,
  ImpactSummarySchema,
  NodeRiskSchema,
  NodeWindSchema,
  RiskLevelSchema,
  SensorNodeSchema,
  SignalFamiliesSchema,
  TelemetryMessageSchema,
  WindFieldSchema,
  WindVectorSchema,
  WsCommandSchema,
  WsMessageSchema,
} from "./schemas.ts";

export type SensorNode = z.infer<typeof SensorNodeSchema>;
export type GatewayInfo = z.infer<typeof GatewayInfoSchema>;
export type TelemetryMessage = z.infer<typeof TelemetryMessageSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type FireStage = z.infer<typeof FireStageSchema>;
export type SignalFamilies = z.infer<typeof SignalFamiliesSchema>;
export type NodeRisk = z.infer<typeof NodeRiskSchema>;
export type ImpactSummary = z.infer<typeof ImpactSummarySchema>;
export type WindVector = z.infer<typeof WindVectorSchema>;
export type NodeWind = z.infer<typeof NodeWindSchema>;
export type WindField = z.infer<typeof WindFieldSchema>;
export type WsMessage = z.infer<typeof WsMessageSchema>;
export type WsCommand = z.infer<typeof WsCommandSchema>;

/** Risk seviyeleri sabit objesi */
export const RiskLevel = {
  Green: "green",
  Yellow: "yellow",
  Red: "red",
} as const;

/** Yangın evreleri sabit objesi */
export const FireStage = {
  None: "none",
  Risk: "risk",
  Pyrolysis: "pyrolysis",
  Smoldering: "smoldering",
  Flaming: "flaming",
} as const;
