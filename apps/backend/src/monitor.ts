// Canli terminal izleyici: backend WebSocket'ine baglanir, 50 dugumu tek ekranda gosterir.
// 7x7 izgara (simule dugumler) + Wokwi ESP32 dugumu ayrintili + son olaylar.
//
// Calistirma: pnpm dev:monitor  (backend calisirken)
//   MONITOR_WOKWI_ONLY=1  izgarayi gizler, yalnizca Wokwi dugumunu gosterir (scripts/wokwi-test.cmd)

import {
  FireStage,
  GRID_SIZE,
  type ImpactSummary,
  type NodeRisk,
  NodeSource,
  RiskLevel,
  type SensorNode,
  type TelemetryMessage,
  type WindField,
  WS_PORT,
  type WsMessage,
} from "@pyros/shared";
import { WebSocket } from "ws";

const STALE_MS = 15_000; // Bu sureden uzun veri gelmeyen dugum "sessiz" sayilir
const WOKWI_ONLY = process.env.MONITOR_WOKWI_ONLY === "1";

const nodes = new Map<number, SensorNode>();
const telemetry = new Map<number, { t: TelemetryMessage; at: number }>();
const risks = new Map<number, NodeRisk>();
const events: string[] = [];
let impact: ImpactSummary = { detectedFires: 0, savedHectares: 0, preventedCo2Tons: 0 };
let connected = false;
let wind: WindField | null = null;

/** Akış yönü (okun gösterdiği yön) -> 8 yönlü ok */
const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
const arrow = (directionTo: number) => ARROWS[Math.round(directionTo / 45) % 8];

function windArrow(nodeId: number): string {
  const w = wind?.nodes.find((n) => n.nodeId === nodeId);
  return w ? arrow(w.directionTo) : " ";
}

const ESC = "\x1b[";
const color = {
  reset: `${ESC}0m`,
  dim: `${ESC}2m`,
  bold: `${ESC}1m`,
  green: `${ESC}30;42m`,
  yellow: `${ESC}30;43m`,
  red: `${ESC}97;41m`,
  gray: `${ESC}97;100m`,
} as const;

const STAGE_LABEL: Record<FireStage, string> = {
  [FireStage.None]: "-",
  [FireStage.Risk]: "R",
  [FireStage.Pyrolysis]: "P",
  [FireStage.Smoldering]: "I",
  [FireStage.Flaming]: "A",
};

const STAGE_NAME: Record<FireStage, string> = {
  [FireStage.None]: "normal",
  [FireStage.Risk]: "risk (kuru/sicak)",
  [FireStage.Pyrolysis]: "piroliz",
  [FireStage.Smoldering]: "icin icin yanma",
  [FireStage.Flaming]: "alevli yanma",
};

const time = () => new Date().toLocaleTimeString("tr-TR");

function cell(node: SensorNode, now: number): string {
  const tm = telemetry.get(node.id);
  const r = risks.get(node.id);
  if (!tm || now - tm.at > STALE_MS) return `${color.gray} ${node.name} sessiz  ${color.reset}`;
  const bg =
    r?.level === RiskLevel.Red
      ? color.red
      : r?.level === RiskLevel.Yellow
        ? color.yellow
        : color.green;
  const stage = r ? STAGE_LABEL[r.stage] : "?";
  const battery = String(Math.round(tm.t.battery)).padStart(3);
  const mode = tm.t.mode === 1 ? "!" : " ";
  return `${bg} ${node.name} ${stage}${mode}${battery}% ${windArrow(node.id)}${color.reset}`;
}

function render(): void {
  const now = Date.now();
  const all = [...nodes.values()];
  const grid = all.filter((n) => n.source === NodeSource.Sim);
  const wokwi = all.find((n) => n.source === NodeSource.Wokwi);
  const lines: string[] = [];

  lines.push(
    `${color.bold}PyrosEco canli izleme${color.reset}  ${time()}  WS: ${connected ? "bagli" : "BAGLI DEGIL"} (ws://localhost:${WS_PORT})`,
  );
  lines.push("");

  if (!WOKWI_ONLY) {
    for (let row = 0; row < GRID_SIZE; row++) {
      const cells = grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE).map((n) => cell(n, now));
      lines.push(`  ${cells.join(" ")}`);
    }
  }
  lines.push(
    `${color.dim}  Evre: - normal  R risk  P piroliz  I icin icin  A alevli | ! = alarm modu (sik olcum) | % = pil | ok = ruzgarin estigi yon${color.reset}`,
  );
  lines.push("");

  // Ozet
  const live = (WOKWI_ONLY ? all.filter((n) => n.source === NodeSource.Wokwi) : all).filter((n) => {
    const tm = telemetry.get(n.id);
    return tm && now - tm.at <= STALE_MS;
  });
  const byLevel = { green: 0, yellow: 0, red: 0 };
  for (const n of live) {
    const r = risks.get(n.id);
    if (r) byLevel[r.level]++;
  }
  const batteries = live.map((n) => telemetry.get(n.id)?.t.battery ?? 100);
  const minBattery = batteries.length ? Math.min(...batteries) : 0;
  const alertMode = live.filter((n) => telemetry.get(n.id)?.t.mode === 1).length;
  lines.push(
    `  Canli: ${live.length}/${WOKWI_ONLY ? 1 : all.length}  |  yesil ${byLevel.green}  sari ${byLevel.yellow}  kirmizi ${byLevel.red}  |  ` +
      `alarm modunda ${alertMode}  |  en dusuk pil %${minBattery.toFixed(0)}`,
  );
  lines.push(
    `  Etki: ${impact.detectedFires} yangin erken tespit, ${impact.savedHectares} ha kurtarildi, ` +
      `${impact.preventedCo2Tons} t CO2 onlendi`,
  );
  if (wind && now - Date.parse(wind.updatedAt) <= STALE_MS) {
    const r = wind.regional;
    lines.push(
      `  Ruzgar: ${r.speed} m/s, ${r.directionFrom}° yonunden ${arrow(r.directionTo)} ` +
        `(${wind.stationCount} istasyon olcumu, diger dugumler tahmin)`,
    );
  } else {
    lines.push(`  ${color.dim}Ruzgar: canli istasyon olcumu yok${color.reset}`);
  }
  lines.push("");

  // Wokwi dugumu ayrintili
  if (wokwi) {
    const tm = telemetry.get(wokwi.id);
    const r = risks.get(wokwi.id);
    lines.push(
      `  ${color.bold}${wokwi.name} (dugum ${wokwi.id})${color.reset}  ${cell(wokwi, now)}`,
    );
    if (tm) {
      const t = tm.t;
      const ago = ((now - tm.at) / 1000).toFixed(0);
      lines.push(
        `    T=${t.temperature}C  RH=%${t.humidity}  CO=${t.co}ppm  CO2=${t.co2}ppm  VOC=${t.vocIndex}  ` +
          `PM2.5=${t.pm25 ?? "-"}  ruzgar=${t.windSpeed ?? "-"}m/s ${t.windDirection ?? "-"}°  ` +
          `pil=%${t.battery}  bayrak=0x${t.flags.toString(16)}  (${ago} sn once)`,
      );
    }
    if (r) {
      const s = r.signals;
      lines.push(
        `    ${STAGE_NAME[r.stage]}, skor ${r.score}  |  sinyal: VOC ${s.earlyGas ? "+" : "-"} CO ${s.carbonMonoxide ? "+" : "-"} ` +
          `duman ${s.smoke ? "+" : "-"} yanma ${s.combustion ? "+" : "-"}  |  MCE ${r.mce ?? "-"}  |  ` +
          `dCO ${r.delta.co} dVOC ${r.delta.vocIndex} dCO2 ${r.delta.co2}`,
      );
    } else if (tm) {
      lines.push(`    ${color.dim}taban seviye olusuyor (ilk 10 olcum)...${color.reset}`);
    } else {
      lines.push(`    ${color.dim}henuz veri yok - Wokwi simulasyonu calisiyor mu?${color.reset}`);
    }
    lines.push("");
  }

  lines.push(`  ${color.bold}Son olaylar${color.reset}`);
  for (const e of events.slice(-8)) lines.push(`    ${e}`);

  process.stdout.write(`${ESC}H${ESC}2J${lines.join("\n")}\n`);
}

function onRisk(r: NodeRisk): void {
  const prev = risks.get(r.nodeId);
  risks.set(r.nodeId, r);
  if (prev && prev.stage === r.stage && prev.level === r.level) return;
  if (!prev && r.level === RiskLevel.Green) return;
  const name = nodes.get(r.nodeId)?.name ?? r.nodeId;
  const conf = r.confirmed ? ` (dogrulandi: ${r.confirmedBy.length} komsu)` : "";
  events.push(`${time()}  ${name}: ${r.level} / ${STAGE_NAME[r.stage]}, skor ${r.score}${conf}`);
  if (events.length > 50) events.shift();
}

function connect(): void {
  const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
  ws.on("open", () => {
    connected = true;
  });
  ws.on("message", (buf) => {
    const m = JSON.parse(buf.toString()) as WsMessage;
    if (m.type === "nodes") for (const n of m.data) nodes.set(n.id, n);
    else if (m.type === "telemetry") telemetry.set(m.data.nodeId, { t: m.data, at: Date.now() });
    else if (m.type === "risk") onRisk(m.data);
    else if (m.type === "impact") impact = m.data;
    else if (m.type === "wind") wind = m.data;
  });
  ws.on("close", () => {
    connected = false;
    setTimeout(connect, 2000); // Backend yeniden baslarsa tekrar baglan
  });
  ws.on("error", () => {});
}

connect();
setInterval(render, 1000);
