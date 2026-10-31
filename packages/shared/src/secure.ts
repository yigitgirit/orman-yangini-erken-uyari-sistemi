// PyrosFrame v3: AES-128-CCM ile şifreli ve mühürlü çerçeve (29 bayt)
// Yalnızca anahtarı olan sensör gateway'in kabul edeceği paketi üretebilir.
// node:crypto kullandığı için ana index'ten değil "@pyros/shared/secure" yolundan alınır (web paketine girmez).
//
// | Bayt  | Alan                          | Koruma                                           |
// |-------|-------------------------------|--------------------------------------------------|
// | 0     | sürüm (3 << 5)                | açık, mühürlü (AAD)                              |
// | 1     | nodeId                        | açık, mühürlü - gateway anahtarı buna göre seçer |
// | 2-5   | sayaç, uint32 BE              | açık, mühürlü - her pakette artar (tekrar koruması) |
// | 6-20  | v2 çerçevesinin 0-14. baytları | şifreli (CRC'nin işini etiket görür)            |
// | 21-28 | etiket (8 bayt)               | CCM MIC: tek bit değişse doğrulama başarısız     |
//
// Nonce (13 bayt) = nodeId | sayaç | 8 x 0x00. Her düğümün kendi anahtarı ve hiç geri gitmeyen
// sayacı olduğu için aynı anahtarla aynı nonce asla iki kez kullanılmaz.

import { createCipheriv, createDecipheriv, createHmac } from "node:crypto";
import { crc8, FRAME_SIZE, type PyrosFrame, packFrame, unpackFrame } from "./protocol.ts";

export const SECURE_VERSION = 3;
export const HEADER_SIZE = 6;
export const BODY_SIZE = FRAME_SIZE - 1;
export const TAG_SIZE = 8;
export const SECURE_FRAME_SIZE = HEADER_SIZE + BODY_SIZE + TAG_SIZE;
const NONCE_SIZE = 13;

/**
 * Sayaç başlangıcı: 2025-01-01'den beri geçen saniye x 2. Düğümler saniyede en fazla
 * 1 paket gönderdiği için yeniden başlayan düğümün yeni başlangıcı her zaman eski sayacını geçer.
 */
export const COUNTER_EPOCH_S = 1_735_689_600;
export const counterBase = (nowMs = Date.now()) =>
  Math.max(0, Math.floor(nowMs / 1000) - COUNTER_EPOCH_S) * 2;

/** Gateway'in reddetme sebepleri */
export const RejectReason = {
  Size: "boyut",
  Version: "surum",
  UnknownNode: "bilinmeyen dugum",
  Seal: "muhur",
  Replay: "tekrar",
} as const;
export type RejectReason = (typeof RejectReason)[keyof typeof RejectReason];

export class FrameRejected extends Error {
  readonly reason: RejectReason;
  constructor(reason: RejectReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

/** .env'deki PYROS_MASTER_KEY (64 hex = 32 bayt) */
export function loadMasterKey(hex = process.env.PYROS_MASTER_KEY): Buffer {
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex.trim())) {
    throw new Error("PYROS_MASTER_KEY yok ya da hatali: proje kokunde 'pnpm keys' calistirin");
  }
  return Buffer.from(hex.trim(), "hex");
}

/** Düğüm anahtarı = HMAC-SHA256(ana anahtar, düğüm no) ilk 16 bayt. Bir düğümün anahtarı diğerlerini açmaz. */
export function deriveNodeKey(masterKey: Buffer, nodeId: number): Buffer {
  return createHmac("sha256", masterKey)
    .update(`pyros-node-key:${nodeId}`)
    .digest()
    .subarray(0, 16);
}

function nonceFor(header: Buffer): Buffer {
  const nonce = Buffer.alloc(NONCE_SIZE);
  header.copy(nonce, 0, 1, HEADER_SIZE); // nodeId + sayaç
  return nonce;
}

/** PyrosFrame -> 29 baytlık şifreli + mühürlü paket */
export function sealFrame(frame: PyrosFrame, counter: number, key: Buffer): Buffer {
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt8(SECURE_VERSION << 5, 0);
  header.writeUInt8(frame.nodeId, 1);
  header.writeUInt32BE(counter >>> 0, 2);

  const cipher = createCipheriv("aes-128-ccm", key, nonceFor(header), { authTagLength: TAG_SIZE });
  cipher.setAAD(header, { plaintextLength: BODY_SIZE });
  const body = Buffer.concat([
    cipher.update(packFrame(frame).subarray(0, BODY_SIZE)),
    cipher.final(),
  ]);
  return Buffer.concat([header, body, cipher.getAuthTag()]);
}

/** Paketin başlığı (doğrulanmadan önce yalnızca anahtar seçmek için okunur) */
export function peekHeader(buf: Buffer): { nodeId: number; counter: number } {
  const version = buf.length > 0 ? buf.readUInt8(0) >> 5 : -1;
  if (version !== SECURE_VERSION) {
    throw new FrameRejected(RejectReason.Version, `sifresiz/eski surum ${version} kabul edilmez`);
  }
  if (buf.length !== SECURE_FRAME_SIZE) {
    throw new FrameRejected(
      RejectReason.Size,
      `beklenen ${SECURE_FRAME_SIZE} bayt, gelen ${buf.length}`,
    );
  }
  return { nodeId: buf.readUInt8(1), counter: buf.readUInt32BE(2) };
}

/** 29 bayt -> PyrosFrame. Mühür tutmazsa (yanlış anahtar ya da değiştirilmiş paket) FrameRejected. */
export function openFrame(buf: Buffer, key: Buffer): { frame: PyrosFrame; counter: number } {
  const { nodeId, counter } = peekHeader(buf);
  const header = buf.subarray(0, HEADER_SIZE);
  const body = buf.subarray(HEADER_SIZE, HEADER_SIZE + BODY_SIZE);
  const tag = buf.subarray(HEADER_SIZE + BODY_SIZE);

  const decipher = createDecipheriv("aes-128-ccm", key, nonceFor(header), {
    authTagLength: TAG_SIZE,
  });
  decipher.setAuthTag(tag);
  decipher.setAAD(header, { plaintextLength: BODY_SIZE });
  const plain = decipher.update(body);
  try {
    decipher.final();
  } catch {
    throw new FrameRejected(RejectReason.Seal, "muhur tutmuyor (sahte ya da degistirilmis paket)");
  }

  const inner = Buffer.concat([plain, Buffer.from([crc8(plain)])]);
  const frame = unpackFrame(inner);
  if (frame.nodeId !== nodeId) {
    throw new FrameRejected(RejectReason.Seal, "ic ve dis dugum numarasi farkli");
  }
  return { frame, counter };
}
