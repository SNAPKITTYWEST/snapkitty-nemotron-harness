use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::RngCore;
use rand::rngs::OsRng;

/// Verify an Ed25519 signature.
pub fn ed25519_verify(signature: &[u8; 64], message: &[u8; 32], public_key: &[u8; 32]) -> bool {
    let pk = match VerifyingKey::from_bytes(public_key) {
        Ok(pk) => pk,
        Err(_) => return false,
    };
    let sig = Signature::from_bytes(signature);
    pk.verify(message, &sig).is_ok()
}

/// Sign a message with an Ed25519 secret key.
pub fn ed25519_sign(message: &[u8; 32], secret_key: &[u8; 32]) -> Option<[u8; 64]> {
    let sk = SigningKey::from_bytes(secret_key);
    let sig: Signature = sk.sign(message);
    Some(sig.to_bytes())
}

/// Compute the Blake3 hash of arbitrary data.
pub fn blake3_hash(data: &[u8]) -> [u8; 32] {
    let hash = blake3::hash(data);
    *hash.as_bytes()
}

/// Generate a cryptographically secure 32-byte nonce.
pub fn secure_nonce() -> [u8; 32] {
    let mut nonce = [0u8; 32];
    OsRng.fill_bytes(&mut nonce);
    nonce
}

/// Create a Bifrost chain seal.
pub fn bifrost_seal(prev_hash: &[u8; 32], record_hash: &[u8; 32], index: u64) -> [u8; 64] {
    let mut hasher = blake3::Hasher::new();
    hasher.update(prev_hash);
    hasher.update(record_hash);
    hasher.update(&index.to_le_bytes());
    let hash = hasher.finalize();
    let mut seal = [0u8; 64];
    seal[..32].copy_from_slice(hash.as_bytes());
    let rev: Vec<u8> = hash.as_bytes().iter().rev().copied().collect();
    seal[32..].copy_from_slice(&rev);
    seal
}
