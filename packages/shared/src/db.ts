// Pyros Topoloji ve Telemetri SQLite Veritabanı Modülü
// Node 24 yerleşik `node:sqlite` (DatabaseSync) motorunu kullanır.
// Dosya: data/pyros.db

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { GATEWAYS } from "./gateways.ts";
import { NODES } from "./nodes.ts";
import type { GatewayInfo, SensorNode, TelemetryMessage } from "./types.ts";

// Veritabanı dosyası konumu: repoRoot/data/pyros.db
const DB_PATH = process.env.PYROS_DB_PATH ?? resolve(import.meta.dirname, "../../../data/pyros.db");

// Dizin yoksa oluştur
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Veritabanı bağlantısı
export const db = new DatabaseSync(DB_PATH);

// WAL modu ve hızlı senkronizasyon (multi-process read/write desteği)
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

// Tabloları ilklendir
db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'sim',
    has_anemometer INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS gateways (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    elevation REAL NOT NULL DEFAULT 0,
    radius_meters REAL NOT NULL DEFAULT 1500,
    frequency TEXT NOT NULL DEFAULT 'EU868 (8 Kanal)',
    rssi_avg_dbm REAL DEFAULT -85,
    snr_avg_db REAL DEFAULT 9.5,
    packet_success_rate REAL DEFAULT 99.8,
    uptime TEXT DEFAULT '99.9%',
    backhaul TEXT DEFAULT '4G LTE / SIM'
  );

  CREATE TABLE IF NOT EXISTS telemetries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    temperature REAL,
    humidity REAL,
    co REAL,
    co2 REAL,
    pm25 REAL,
    battery REAL,
    received_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_telemetries_node ON telemetries(node_id, received_at);
`);

// Yeni telemetri sütunları için geriye dönük uyumlu dinamik migrasyon
try {
  db.exec("ALTER TABLE telemetries ADD COLUMN voc_index REAL;");
} catch {}
try {
  db.exec("ALTER TABLE telemetries ADD COLUMN wind_speed REAL;");
} catch {}
try {
  db.exec("ALTER TABLE telemetries ADD COLUMN wind_direction REAL;");
} catch {}
try {
  db.exec("ALTER TABLE telemetries ADD COLUMN flags INTEGER DEFAULT 0;");
} catch {}
try {
  db.exec("ALTER TABLE telemetries ADD COLUMN mode INTEGER DEFAULT 0;");
} catch {}

/**
 * İki GPS koordinatı arasındaki mesafeyi metre cinsinden hesaplar (Equirectangular yaklaşımı)
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = (lat2 - lat1) * 111320;
  const avgLatRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const dLng = (lng2 - lng1) * 111320 * Math.cos(avgLatRad);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Belirli bir koordinatın aktif gateway kulelerinin kapsama alanında olup olmadığını kontrol eder.
 */
export function isNodeInCoverage(
  nodeLat: number,
  nodeLng: number,
  gateways: readonly GatewayInfo[],
): { covered: boolean; nearestGateway: GatewayInfo | null; minDistanceM: number } {
  if (gateways.length === 0) {
    return { covered: false, nearestGateway: null, minDistanceM: Number.POSITIVE_INFINITY };
  }

  let minDistanceM = Number.POSITIVE_INFINITY;
  let nearestGateway: GatewayInfo | null = null;
  let covered = false;

  for (const gw of gateways) {
    const dist = calculateDistanceMeters(nodeLat, nodeLng, gw.lat, gw.lng);
    if (dist < minDistanceM) {
      minDistanceM = dist;
      nearestGateway = gw;
    }
    if (dist <= gw.radiusMeters) {
      covered = true;
    }
  }

  return { covered, nearestGateway, minDistanceM };
}

/**
 * Varsayılan 50 düğüm ve 3 gateway'i veritabanına yükler
 */
export function seedDefaults(force = false): void {
  const nodeCountRow = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as {
    count: number;
  };

  if (nodeCountRow.count === 0 || force) {
    db.exec("DELETE FROM nodes;");
    const insertNode = db.prepare(`
      INSERT INTO nodes (id, name, lat, lng, source, has_anemometer)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN TRANSACTION;");
    for (const node of NODES) {
      insertNode.run(
        node.id,
        node.name,
        node.lat,
        node.lng,
        node.source,
        node.hasAnemometer ? 1 : 0,
      );
    }
    db.exec("COMMIT;");
  }

  const gwCountRow = db.prepare("SELECT COUNT(*) as count FROM gateways").get() as {
    count: number;
  };

  if (gwCountRow.count === 0 || force) {
    db.exec("DELETE FROM gateways;");
    const insertGw = db.prepare(`
      INSERT INTO gateways (id, name, lat, lng, elevation, radius_meters, frequency, rssi_avg_dbm, snr_avg_db, packet_success_rate, uptime, backhaul)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN TRANSACTION;");
    for (const gw of GATEWAYS) {
      insertGw.run(
        gw.id,
        gw.name,
        gw.lat,
        gw.lng,
        gw.elevation,
        gw.radiusMeters,
        gw.frequency,
        gw.rssiAvgDbm,
        gw.snrAvgDb,
        gw.packetSuccessRate,
        gw.uptime,
        gw.backhaul,
      );
    }
    db.exec("COMMIT;");
  }

  // data/seed.sql dosyasını her zaman güncel referans olarak üret
  writeSeedSqlFile();
}

/**
 * Veritabanı şemasını ve güncel Marmaris Balan Dağı başlangıç verilerini
 * harici bir SQL scripti formatında (data/seed.sql) üretir.
 */
export function generateSeedSql(): string {
  const lines: string[] = [
    "-- PyrosEco Marmaris Balan Dağı Yangın Havzası Referans Topolojisi",
    "-- Otomatik Üretilmiş SQLite Seed Scripti",
    "",
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
    "",
    "-- Tablo Şemaları",
    "DROP TABLE IF EXISTS telemetries;",
    "DROP TABLE IF EXISTS gateways;",
    "DROP TABLE IF EXISTS nodes;",
    "",
    `CREATE TABLE nodes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'sim',
  has_anemometer INTEGER NOT NULL DEFAULT 0
);`,
    "",
    `CREATE TABLE gateways (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  elevation REAL NOT NULL DEFAULT 0,
  radius_meters REAL NOT NULL DEFAULT 1500,
  frequency TEXT NOT NULL DEFAULT 'EU868 (8 Kanal)',
  rssi_avg_dbm REAL DEFAULT -85,
  snr_avg_db REAL DEFAULT 9.5,
  packet_success_rate REAL DEFAULT 99.8,
  uptime TEXT DEFAULT '99.9%',
  backhaul TEXT DEFAULT '4G LTE / SIM'
);`,
    "",
    `CREATE TABLE telemetries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id INTEGER NOT NULL,
  temperature REAL,
  humidity REAL,
  co REAL,
  co2 REAL,
  pm25 REAL,
  battery REAL,
  received_at TEXT NOT NULL
);`,
    "",
    "CREATE INDEX idx_telemetries_node ON telemetries(node_id, received_at);",
    "",
    "-- 50 Sensör Düğümü (#1-#49 Balan Dağı Simülasyonu + #50 Wokwi ESP32)",
  ];

  for (const n of NODES) {
    lines.push(
      `INSERT INTO nodes (id, name, lat, lng, source, has_anemometer) VALUES (${n.id}, '${n.name.replace(/'/g, "''")}', ${n.lat}, ${n.lng}, '${n.source}', ${n.hasAnemometer ? 1 : 0});`,
    );
  }

  lines.push("", "-- 3 LoRaWAN Ağ Geçidi Kulesi (Balan Dağı, Bördübet, Değirmenyanı)");
  for (const gw of GATEWAYS) {
    lines.push(
      `INSERT INTO gateways (id, name, lat, lng, elevation, radius_meters, frequency, rssi_avg_dbm, snr_avg_db, packet_success_rate, uptime, backhaul) VALUES (${gw.id}, '${gw.name.replace(/'/g, "''")}', ${gw.lat}, ${gw.lng}, ${gw.elevation}, ${gw.radiusMeters}, '${gw.frequency}', ${gw.rssiAvgDbm}, ${gw.snrAvgDb}, ${gw.packetSuccessRate}, '${gw.uptime}', '${gw.backhaul}');`,
    );
  }

  lines.push("", "COMMIT;", "");
  return lines.join("\n");
}

export function writeSeedSqlFile(): void {
  try {
    const sqlPath = resolve(dbDir, "seed.sql");
    const sql = generateSeedSql();
    writeFileSync(sqlPath, sql, "utf8");
  } catch (err) {
    console.warn("[sqlite] seed.sql dosyası yazılamadı:", (err as Error).message);
  }
}

// İlk açılışta tablo boşsa seed et
seedDefaults(false);

/**
 * Kayıtlı tüm sensör düğümlerini çeker
 */
export function getAllNodes(): SensorNode[] {
  const rows = db.prepare("SELECT * FROM nodes ORDER BY id ASC").all() as Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
    source: "sim" | "wokwi";
    has_anemometer: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    source: r.source,
    hasAnemometer: Boolean(r.has_anemometer),
  }));
}

/**
 * Yeni bir sensör düğümü ekler (ID atanmamışsa sıradaki en büyük ID'yi otomatik verir)
 */
export function createNode(params: {
  name: string;
  lat: number;
  lng: number;
  hasAnemometer: boolean;
  source?: "sim" | "wokwi";
}): SensorNode {
  const maxIdRow = db.prepare("SELECT MAX(id) as maxId FROM nodes").get() as {
    maxId: number | null;
  };
  const nextId = (maxIdRow.maxId ?? 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO nodes (id, name, lat, lng, source, has_anemometer)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    nextId,
    params.name,
    params.lat,
    params.lng,
    params.source ?? "sim",
    params.hasAnemometer ? 1 : 0,
  );

  return {
    id: nextId,
    name: params.name,
    lat: params.lat,
    lng: params.lng,
    source: params.source ?? "sim",
    hasAnemometer: params.hasAnemometer,
  };
}

/**
 * Düğüm siler
 */
export function deleteNode(nodeId: number): boolean {
  const stmt = db.prepare("DELETE FROM nodes WHERE id = ?");
  stmt.run(nodeId);
  return true;
}

/**
 * Tüm gateway kulelerini çeker ve güncel kapsama listelerini (connectedNodes) hesaplar
 */
export function getAllGateways(): GatewayInfo[] {
  const gwRows = db.prepare("SELECT * FROM gateways ORDER BY id ASC").all() as Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
    elevation: number;
    radius_meters: number;
    frequency: string;
    rssi_avg_dbm: number;
    snr_avg_db: number;
    packet_success_rate: number;
    uptime: string;
    backhaul: string;
  }>;

  const nodes = getAllNodes();

  return gwRows.map((gw) => {
    // Kapsama altındaki düğümlerin ID listesini hesapla
    const connectedNodes = nodes
      .filter((n) => calculateDistanceMeters(n.lat, n.lng, gw.lat, gw.lng) <= gw.radius_meters)
      .map((n) => n.id);

    return {
      id: gw.id,
      name: gw.name,
      lat: gw.lat,
      lng: gw.lng,
      elevation: gw.elevation,
      radiusMeters: gw.radius_meters,
      frequency: gw.frequency,
      connectedNodes,
      rssiAvgDbm: gw.rssi_avg_dbm,
      snrAvgDb: gw.snr_avg_db,
      packetSuccessRate: gw.packet_success_rate,
      uptime: gw.uptime,
      backhaul: gw.backhaul,
    };
  });
}

/**
 * Yeni bir Gateway kulesi ekler
 */
export function createGateway(params: {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  elevation?: number;
}): GatewayInfo {
  const maxIdRow = db.prepare("SELECT MAX(id) as maxId FROM gateways").get() as {
    maxId: number | null;
  };
  const nextId = (maxIdRow.maxId ?? 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO gateways (id, name, lat, lng, elevation, radius_meters, frequency, rssi_avg_dbm, snr_avg_db, packet_success_rate, uptime, backhaul)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    nextId,
    params.name,
    params.lat,
    params.lng,
    params.elevation ?? 500,
    params.radiusMeters,
    "EU868 (8 Kanal)",
    -86,
    10.1,
    99.9,
    "1g 00s 00dk",
    "4G LTE / SIM",
  );

  const allGateways = getAllGateways();
  const created = allGateways.find((g) => g.id === nextId);
  if (!created) {
    throw new Error(`Gateway #${nextId} oluşturulamadı.`);
  }
  return created;
}

/**
 * Gateway siler
 */
export function deleteGateway(gatewayId: number): boolean {
  const stmt = db.prepare("DELETE FROM gateways WHERE id = ?");
  stmt.run(gatewayId);
  return true;
}

/**
 * Varsayılana sıfırla (50 düğüm, 3 gateway)
 */
export function resetTopologyDefaults(): {
  nodes: SensorNode[];
  gateways: GatewayInfo[];
} {
  seedDefaults(true);
  return {
    nodes: getAllNodes(),
    gateways: getAllGateways(),
  };
}

/**
 * Telemetriyi SQLite disk geçmişine kaydet
 */
export function recordTelemetry(msg: TelemetryMessage): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO telemetries (node_id, temperature, humidity, co, co2, pm25, battery, received_at, voc_index, wind_speed, wind_direction, flags, mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.nodeId,
      msg.temperature,
      msg.humidity,
      msg.co,
      msg.co2,
      msg.pm25,
      msg.battery,
      msg.receivedAt,
      msg.vocIndex ?? null,
      msg.windSpeed ?? null,
      msg.windDirection ?? null,
      msg.flags ?? 0,
      msg.mode ?? 0,
    );
  } catch (err) {
    console.error("[sqlite] Telemetri kaydı hatası:", err);
  }
}

export interface TelemetryQueryFilter {
  nodeId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface HistoricalTelemetryRow {
  id: number;
  nodeId: number;
  nodeName: string;
  temperature: number | null;
  humidity: number | null;
  co: number | null;
  co2: number | null;
  vocIndex: number | null;
  pm25: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  battery: number | null;
  flags: number;
  mode: number;
  receivedAt: string;
}

export interface TelemetryQueryResult {
  rows: HistoricalTelemetryRow[];
  totalCount: number;
}

/**
 * SQLite veritabanındaki telemetri kayıtlarını filtreleyip sayfalı olarak sorgular.
 */
export function queryTelemetries(filter: TelemetryQueryFilter = {}): TelemetryQueryResult {
  const conditions: string[] = [];
  const params: (string | number | bigint | null)[] = [];

  if (typeof filter.nodeId === "number" && !Number.isNaN(filter.nodeId)) {
    conditions.push("node_id = ?");
    params.push(filter.nodeId);
  }

  if (filter.startDate) {
    conditions.push("received_at >= ?");
    params.push(filter.startDate);
  }

  if (filter.endDate) {
    conditions.push("received_at <= ?");
    params.push(filter.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Toplam kayıt sayısını çek
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM telemetries ${whereClause}`)
    .get(...params) as {
    count: number;
  };
  const totalCount = countRow?.count ?? 0;

  // Sıralama ve sayfalama
  const allowedSortCols: Record<string, string> = {
    received_at: "received_at",
    receivedAt: "received_at",
    temperature: "temperature",
    humidity: "humidity",
    co: "co",
    co2: "co2",
    vocIndex: "voc_index",
    pm25: "pm25",
    battery: "battery",
    nodeId: "node_id",
    node_id: "node_id",
  };
  const sortCol = allowedSortCols[filter.sortBy ?? "received_at"] ?? "id";
  const sortDir = filter.sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const offset = Math.max(filter.offset ?? 0, 0);

  const querySql = `
    SELECT id, node_id, temperature, humidity, co, co2, pm25, battery, received_at,
           voc_index, wind_speed, wind_direction, flags, mode
    FROM telemetries
    ${whereClause}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const rawRows = db.prepare(querySql).all(...params, limit, offset) as Array<{
    id: number;
    node_id: number;
    temperature: number | null;
    humidity: number | null;
    co: number | null;
    co2: number | null;
    pm25: number | null;
    battery: number | null;
    received_at: string;
    voc_index: number | null;
    wind_speed: number | null;
    wind_direction: number | null;
    flags: number | null;
    mode: number | null;
  }>;

  // Düğüm isimlerini haritalamak için
  const nodeMap = new Map(getAllNodes().map((n) => [n.id, n.name]));

  const rows: HistoricalTelemetryRow[] = rawRows.map((r) => ({
    id: r.id,
    nodeId: r.node_id,
    nodeName: nodeMap.get(r.node_id) ?? `Düğüm #${r.node_id}`,
    temperature: r.temperature,
    humidity: r.humidity,
    co: r.co,
    co2: r.co2,
    vocIndex: r.voc_index,
    pm25: r.pm25,
    windSpeed: r.wind_speed,
    windDirection: r.wind_direction,
    battery: r.battery,
    flags: r.flags ?? 0,
    mode: r.mode ?? 0,
    receivedAt: r.received_at,
  }));

  return { rows, totalCount };
}
