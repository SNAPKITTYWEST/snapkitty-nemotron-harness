#ifndef SOVEREIGN_CRYPTO_H
#define SOVEREIGN_CRYPTO_H

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

/* ── Ed25519 ─────────────────────────────────────────────────────────────── */
bool ed25519_verify(const uint8_t signature[64], const uint8_t message[32], const uint8_t public_key[32]);
bool ed25519_sign(const uint8_t message[32], const uint8_t secret_key[32], uint8_t signature_out[64]);

/* ── Blake3 ──────────────────────────────────────────────────────────────── */
bool blake3_hash(const uint8_t data[], size_t data_len, uint8_t hash_out[32]);

/* ── Secure nonce ────────────────────────────────────────────────────────── */
bool secure_nonce(uint8_t nonce_out[32]);

/* ── Bifrost WORM chain ──────────────────────────────────────────────────── */
bool bifrost_append(const uint8_t record[], size_t record_len, const uint8_t record_hash[32], uint8_t seal_out[64]);
bool bifrost_verify_chain(void);
bool resolve_did(const char *did, uint8_t public_key_out[32]);

#endif /* SOVEREIGN_CRYPTO_H */
