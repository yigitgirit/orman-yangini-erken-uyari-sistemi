// Analiz motoru: düğüm başına taban seviye + regresyonla türev + MCE + sinyal füzyonu
//
// Karar iki soruyu birlikte cevaplar:
//   "Ne kadar farklı?"  -> tabandan sapma (z-skoru)   : yavaş, uzaktaki için için yanmayı yakalar
//   "Ne kadar hızlı?"   -> regresyon eğimi + ivme     : ani alevli yanmayı ve evre geçişini yakalar

import {
  BASELINE,
  distanceM,
  FireStage,
  getNode,
  NEIGHBOR_RADIUS_M,
  type NodeRisk,
  RiskLevel,
  type SignalFamilies,
  SLIDING_WINDOW_MS,
  SLOPE_WINDOW_MS,
  type TelemetryMessage,
  THRESHOLDS,
} from "@pyros/shared";

type Field = "temperature" | "humidity" | "co" | "co2" | "vocIndex" | "pm25";
const FIELDS: readonly Field[] = ["temperature", "humidity", "co", "co2", "vocIndex", "pm25"];

/** PM2.5 yalnızca alarm modunda ölçüldüğü için tabanı henüz yoksa kullanılacak tipik değer */
const DEFAULT_PM25_BASELINE = 12;

interface Stat {
  mean: number;
  variance: number;
  n: number;
}

interface NodeState {
  window: TelemetryMessage[];
  baseline: Record<Field, Stat>;
  lastRisk?: NodeRisk;
}

const states = new Map<number, NodeState>();

const newStat = (): Stat => ({ mean: 0, variance: 0, n: 0 });
/** Yuvarla; taban henüz oluşmadıysa (NaN) 0 döner */
const round = (v: number, digits = 2) =>
  Number.isFinite(v) ? Math.round(v * 10 ** digits) / 10 ** digits : 0;

const fieldValue = (t: TelemetryMessage, f: Field): number | null => t[f];

function getState(nodeId: number): NodeState {
  let s = states.get(nodeId);
  if (!s) {
    s = {
      window: [],
      baseline: Object.fromEntries(FIELDS.map((f) => [f, newStat()])) as Record<Field, Stat>,
    };
    states.set(nodeId, s);
  }
  return s;
}

/** Isınma süresince düz ortalama, sonra EWMA (ortalama + varyans) */
function updateStat(s: Stat, x: number): void {
  s.n++;
  const d = x - s.mean;
  if (s.n <= BASELINE.warmupSamples) {
    s.mean += d / s.n;
    s.variance = ((s.n - 1) * s.variance + d * (x - s.mean)) / s.n;
  } else {
    s.mean += BASELINE.alpha * d;
    s.variance = (1 - BASELINE.alpha) * (s.variance + BASELINE.alpha * d * d);
  }
}

function baselineMean(state: NodeState, f: Field): number {
  const s = state.baseline[f];
  if (s.n === 0) return f === "pm25" ? DEFAULT_PM25_BASELINE : Number.NaN;
  return s.mean;
}

function zScore(state: NodeState, f: Field, x: number): number {
  const s = state.baseline[f];
  const std = Math.max(Math.sqrt(s.variance), BASELINE.minStd[f]);
  return (x - baselineMean(state, f)) / std;
}

/** En küçük kareler eğimi (birim/dk). İki uç noktaya değil, penceredeki tüm noktalara bakar. */
function slope(points: { t: number; y: number }[]): number {
  if (points.length < 3) return 0;
  const n = points.length;
  const mt = points.reduce((a, p) => a + p.t, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.t - mt) * (p.y - my);
    den += (p.t - mt) ** 2;
  }
  return den < 1e-6 ? 0 : num / den;
}

function series(window: TelemetryMessage[], f: Field, sinceMs: number) {
  const out: { t: number; y: number }[] = [];
  for (const m of window) {
    const ts = Date.parse(m.receivedAt);
    const y = fieldValue(m, f);
    if (ts >= sinceMs && y !== null) out.push({ t: ts / 60_000, y });
  }
  return out;
}

/** İvme (birim/dk²): pencerenin ikinci yarısındaki eğim - ilk yarısındaki eğim */
function accel(points: { t: number; y: number }[]): number {
  if (points.length < 6) return 0;
  const mid = (points[0].t + points[points.length - 1].t) / 2;
  const first = points.filter((p) => p.t <= mid);
  const second = points.filter((p) => p.t > mid);
  const halfSpan = mid - points[0].t;
  return halfSpan > 0 ? (slope(second) - slope(first)) / halfSpan : 0;
}

/** Buhar basıncı açığı (kPa), Tetens denklemi */
function vpdKpa(tempC: number, rh: number): number {
  const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return Math.max(0, es * (1 - rh / 100));
}

/** Yakındaki, son 2 dakikada uyarı vermiş komşular */
function triggeredNeighbors(nodeId: number, now: number): number[] {
  const self = getNode(nodeId);
  if (!self) return [];
  const out: number[] = [];
  for (const [id, s] of states) {
    const r = s.lastRisk;
    if (id === nodeId || !r || r.level === RiskLevel.Green) continue;
    if (now - Date.parse(r.updatedAt) > 2 * 60_000) continue;
    const other = getNode(id);
    if (other && distanceM(self, other) <= NEIGHBOR_RADIUS_M) out.push(id);
  }
  return out;
}

const STAGE_SCORE: Record<FireStage, number> = {
  [FireStage.None]: 0,
  [FireStage.Risk]: 10,
  [FireStage.Pyrolysis]: 35,
  [FireStage.Smoldering]: 55,
  [FireStage.Flaming]: 80,
};

export function analyze(t: TelemetryMessage): NodeRisk {
  const state = getState(t.nodeId);
  const now = Date.parse(t.receivedAt);

  state.window = state.window.filter((x) => now - Date.parse(x.receivedAt) <= SLIDING_WINDOW_MS);
  state.window.push(t);

  // --- Sapma (taban seviyeye göre) ---
  const dTemp = t.temperature - baselineMean(state, "temperature");
  const dCo = t.co - baselineMean(state, "co");
  const dCo2 = t.co2 - baselineMean(state, "co2");
  const dVoc = t.vocIndex - baselineMean(state, "vocIndex");
  const dPm = t.pm25 === null ? null : t.pm25 - baselineMean(state, "pm25");
  const warmedUp = state.baseline.co.n >= BASELINE.warmupSamples;

  // --- Türev ve ivme (son 2 dk, regresyon) ---
  const since = now - SLOPE_WINDOW_MS;
  const tempSeries = series(state.window, "temperature", since);
  const co2Series = series(state.window, "co2", since);
  const pmSeries = series(state.window, "pm25", since);
  const rate = {
    temperature: round(slope(tempSeries)),
    co: round(slope(series(state.window, "co", since))),
    co2: round(slope(co2Series)),
    vocIndex: round(slope(series(state.window, "vocIndex", since))),
    pm25: pmSeries.length >= 3 ? round(slope(pmSeries)) : null,
  };
  const acc = { temperature: round(accel(tempSeries)), co2: round(accel(co2Series)) };

  // --- Sinyal aileleri (füzyon) ---
  const z = THRESHOLDS.zScore;
  const signals: SignalFamilies = warmedUp
    ? {
        earlyGas: zScore(state, "vocIndex", t.vocIndex) > z,
        carbonMonoxide: dCo >= THRESHOLDS.coDeltaPpm && zScore(state, "co", t.co) > z,
        smoke:
          t.pm25 !== null &&
          dPm !== null &&
          dPm >= THRESHOLDS.pm25DeltaUgm3 &&
          zScore(state, "pm25", t.pm25) > z,
        combustion:
          (dCo2 >= THRESHOLDS.co2DeltaFlamingPpm && rate.co2 >= THRESHOLDS.co2RateFlamingPpmMin) ||
          (dTemp >= 3 && rate.temperature >= THRESHOLDS.tempRateFlamingCMin),
      }
    : { earlyGas: false, carbonMonoxide: false, smoke: false, combustion: false };
  const signalCount = Object.values(signals).filter(Boolean).length;

  // --- MCE: CO/CO2 oranından yanma verimi ---
  const mce = dCo >= THRESHOLDS.coDeltaPpm && dCo2 > 0 ? round(dCo2 / (dCo2 + dCo), 3) : null;
  const vpd = round(vpdKpa(t.temperature, t.humidity));

  // --- Evre kararı ---
  let stage: FireStage = FireStage.None;
  if (
    t.temperature > THRESHOLDS.activeFireTempC ||
    (signals.combustion && (mce === null || mce >= THRESHOLDS.mceFlamingMin))
  ) {
    stage = FireStage.Flaming;
  } else if (signals.carbonMonoxide || signals.smoke) {
    stage = FireStage.Smoldering;
  } else if (signals.earlyGas) {
    stage = FireStage.Pyrolysis;
  } else if (
    vpd > THRESHOLDS.riskVpdKpa ||
    (t.temperature > THRESHOLDS.riskTempC && t.humidity < THRESHOLDS.riskHumidity)
  ) {
    stage = FireStage.Risk;
  }

  let level: RiskLevel = RiskLevel.Green;
  if (stage === FireStage.Flaming || t.co > THRESHOLDS.activeFireCoPpm) level = RiskLevel.Red;
  else if (stage === FireStage.Pyrolysis || stage === FireStage.Smoldering)
    level = RiskLevel.Yellow;

  // --- Komşu doğrulaması ---
  const confirmedBy = level === RiskLevel.Green ? [] : triggeredNeighbors(t.nodeId, now);
  const confirmed = signalCount >= 2 && confirmedBy.length > 0;

  let score = STAGE_SCORE[stage];
  if (stage === FireStage.Risk) score += Math.min(20, vpd * 5);
  if (signalCount > 1) score += 5 * (signalCount - 1);
  if (confirmed) score += 10;

  const risk: NodeRisk = {
    nodeId: t.nodeId,
    score: Math.round(Math.min(100, score)),
    level,
    stage,
    signals,
    signalCount,
    confirmed,
    confirmedBy,
    mce,
    vpd,
    delta: {
      temperature: round(dTemp),
      co: round(dCo),
      co2: round(dCo2),
      vocIndex: round(dVoc),
      pm25: dPm === null ? null : round(dPm),
    },
    rate,
    accel: acc,
    updatedAt: t.receivedAt,
  };

  // --- Taban güncellemesi: yalnızca düğüm "temiz" iken (yavaş yangın tabanı kendine çekemesin) ---
  const clean = stage === FireStage.None || stage === FireStage.Risk;
  if (clean && signalCount === 0) {
    for (const f of FIELDS) {
      const v = fieldValue(t, f);
      if (v !== null) updateStat(state.baseline[f], v);
    }
  }

  state.lastRisk = risk;
  return risk;
}
