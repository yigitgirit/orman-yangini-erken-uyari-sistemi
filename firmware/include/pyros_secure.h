// PyrosFrame v3: AES-128-CCM ile sifreli + muhurlu cerceve (packages/shared/src/secure.ts ile bayt bayt ayni)
//
// | Bayt  | Alan                           | Koruma                          |
// |-------|--------------------------------|---------------------------------|
// | 0     | surum (3 << 5)                 | acik, muhurlu (AAD)             |
// | 1     | nodeId                         | acik, muhurlu                   |
// | 2-5   | sayac, uint32 BE               | acik, muhurlu (tekrar korumasi) |
// | 6-20  | v2 cercevesinin 0-14. baytlari | sifreli                         |
// | 21-28 | etiket (8 bayt)                | CCM MIC                         |
//
// Nonce (13 bayt) = nodeId | sayac | 8 x 0x00
#pragma once

#include <mbedtls/ccm.h>
#include <string.h>

#include "pyros_frame.h"

#if __has_include("node_key.h")
#include "node_key.h"
#else
#error "include/node_key.h yok: proje kokunde 'pnpm keys' calistirin"
#endif

namespace pyros {

constexpr uint8_t SECURE_VERSION = 3;
constexpr size_t HEADER_SIZE = 6;
constexpr size_t BODY_SIZE = FRAME_SIZE - 1;
constexpr size_t TAG_SIZE = 8;
constexpr size_t SECURE_FRAME_SIZE = HEADER_SIZE + BODY_SIZE + TAG_SIZE;
constexpr size_t NONCE_SIZE = 13;

// v2 cercevesini (16 bayt) sayacla muhurler; basarisizsa false
inline bool seal(const uint8_t plain[FRAME_SIZE], uint32_t counter, uint8_t out[SECURE_FRAME_SIZE]) {
  out[0] = (uint8_t)(SECURE_VERSION << 5);
  out[1] = plain[1];
  out[2] = (uint8_t)(counter >> 24);
  out[3] = (uint8_t)(counter >> 16);
  out[4] = (uint8_t)(counter >> 8);
  out[5] = (uint8_t)counter;

  uint8_t nonce[NONCE_SIZE] = {0};
  memcpy(nonce, out + 1, HEADER_SIZE - 1);

  mbedtls_ccm_context ctx;
  mbedtls_ccm_init(&ctx);
  int rc = mbedtls_ccm_setkey(&ctx, MBEDTLS_CIPHER_ID_AES, NODE_KEY, 128);
  if (rc == 0) {
    rc = mbedtls_ccm_encrypt_and_tag(&ctx, BODY_SIZE, nonce, NONCE_SIZE, out, HEADER_SIZE, plain,
                                     out + HEADER_SIZE, out + HEADER_SIZE + BODY_SIZE, TAG_SIZE);
  }
  mbedtls_ccm_free(&ctx);
  return rc == 0;
}

}  // namespace pyros
