// Sensör anahtarlarını hazırlar: .env'de PYROS_MASTER_KEY yoksa rastgele üretip ekler,
// ESP32 düğümünün (50) kendi anahtarını firmware/include/node_key.h dosyasına yazar.
// Gateway ve simülatör düğüm anahtarlarını aynı ana anahtardan türetir. İki dosya da git'e girmez.
//
// Çalıştırma: pnpm keys   (scripts\_kontrol.cmd node_key.h yoksa kendisi çağırır)
// Ana anahtarı değiştirirseniz tekrar çalıştırıp firmware'i yeniden derleyin.

import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deriveNodeKey, loadMasterKey } from "../packages/shared/src/secure.ts";

const ESP32_NODE_ID = 50; // firmware/include/config.h: NODE_ID

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const headerPath = resolve(root, "firmware/include/node_key.h");

const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
let masterHex = envText.match(/^PYROS_MASTER_KEY=(.*)$/m)?.[1]?.trim();
if (!masterHex) {
  masterHex = randomBytes(32).toString("hex");
  const prefix = envText === "" || envText.endsWith("\n") ? "" : "\n";
  appendFileSync(
    envPath,
    `${prefix}\n# Sensor ana anahtari (pnpm keys uretti) - kaybederseniz tum sensorler yeniden yuklenir\nPYROS_MASTER_KEY=${masterHex}\n`,
  );
  console.log("[keys] .env dosyasina yeni PYROS_MASTER_KEY eklendi");
}

const key = deriveNodeKey(loadMasterKey(masterHex), ESP32_NODE_ID);
const bytes = [...key].map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(", ");
writeFileSync(
  headerPath,
  `#pragma once
// pnpm keys tarafindan uretildi - git'e girmez, paylasmayin.
// Bu dugumun AES-128-CCM anahtari (ana anahtardan turetilmis; yalnizca bu dugumu temsil eder).
#include <stdint.h>

#define NODE_KEY_ID ${ESP32_NODE_ID}
static const uint8_t NODE_KEY[16] = {${bytes}};
`,
);
console.log(`[keys] ${headerPath} yazildi (dugum ${ESP32_NODE_ID})`);
