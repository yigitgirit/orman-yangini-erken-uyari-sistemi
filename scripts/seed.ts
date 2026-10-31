// Pyros SQLite Topoloji Tohumlama (Seed) Scripti
// Çalıştırma: pnpm db:seed

import { resetTopologyDefaults, writeSeedSqlFile } from "../packages/shared/src/db.ts";

console.log("🌱 [db:seed] Marmaris Balan Dağı topolojisi SQLite'a yükleniyor...");

const { nodes, gateways } = resetTopologyDefaults();
writeSeedSqlFile();

console.log(`✅ [db:seed] Başarıyla yüklendi:`);
console.log(`   - ${nodes.length} Sensör Düğümü (#1-#49 Balan Dağı, #50 Wokwi ESP32)`);
console.log(
  `   - ${gateways.length} LoRaWAN Ağ Geçidi Kulesi (Balan Dağı, Bördübet, Değirmenyanı)`,
);
console.log(`   - data/seed.sql dosyası güncellendi.`);
