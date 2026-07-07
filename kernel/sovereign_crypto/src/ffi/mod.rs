use std::ffi::CStr;
use std::os::raw::c_char;

use crate::crypto;
use crate::{BifrostEntry, BIFROST_ROOT_HASH};

fn as_array32(p: *const u8) -> Option<&'static [u8; 32]> {
    if p.is_null() { return None; }
    Some(unsafe { &*(p as *const [u8; 32]) })
}

fn as_array64(p: *const u8) -> Option<&'static [u8; 64]> {
    if p.is_null() { return None; }
    Some(unsafe { &*(p as *const [u8; 64]) })
}

/// Ed25519 verify: extern "C" bool ed25519_verify([u8;64], [u8;32], [u8;32])
#[no_mangle]
pub extern "C" fn ed25519_verify(
    signature: *const u8,
    message: *const u8,
    public_key: *const u8,
) -> bool {
    let sig = match as_array64(signature) { Some(s) => s, None => return false };
    let msg = match as_array32(message) { Some(m) => m, None => return false };
    let pk = match as_array32(public_key) { Some(p) => p, None => return false };
    crypto::ed25519_verify(sig, msg, pk)
}

/// Ed25519 sign: extern "C" bool ed25519_sign([u8;32], [u8;32], [u8;64]*)
#[no_mangle]
pub extern "C" fn ed25519_sign(
    message: *const u8,
    secret_key: *const u8,
    signature_out: *mut u8,
) -> bool {
    let msg = match as_array32(message) { Some(m) => m, None => return false };
    let sk = match as_array32(secret_key) { Some(s) => s, None => return false };
    match crypto::ed25519_sign(msg, sk) {
        Some(sig) => {
            unsafe { std::ptr::copy_nonoverlapping(sig.as_ptr(), signature_out, 64) }
            true
        }
        None => false,
    }
}

/// Blake3 hash: extern "C" bool blake3_hash(const uint8_t[], size_t, [u8;32]*)
#[no_mangle]
pub extern "C" fn blake3_hash(
    data: *const u8,
    data_len: usize,
    hash_out: *mut u8,
) -> bool {
    if data.is_null() || hash_out.is_null() { return false; }
    let slice = unsafe { std::slice::from_raw_parts(data, data_len) };
    let hash = crypto::blake3_hash(slice);
    unsafe { std::ptr::copy_nonoverlapping(hash.as_ptr(), hash_out, 32) }
    true
}

/// Secure nonce: extern "C" bool secure_nonce([u8;32]*)
#[no_mangle]
pub extern "C" fn secure_nonce(nonce_out: *mut u8) -> bool {
    if nonce_out.is_null() { return false; }
    let nonce = crypto::secure_nonce();
    unsafe { std::ptr::copy_nonoverlapping(nonce.as_ptr(), nonce_out, 32) }
    true
}

/// Bifrost append: extern "C" bool bifrost_append(const uint8_t[], size_t, [u8;32], [u8;64]*)
#[no_mangle]
pub extern "C" fn bifrost_append(
    record: *const u8,
    record_len: usize,
    record_hash: *const u8,
    seal_out: *mut u8,
) -> bool {
    if record.is_null() || record_hash.is_null() || seal_out.is_null() { return false; }
    let rec = unsafe { std::slice::from_raw_parts(record, record_len) };
    let rh = match as_array32(record_hash) { Some(h) => h, None => return false };
    let mut chain = crate::BIFROST_CHAIN.lock().unwrap();
    let index = chain.len() as u64;
    let prev_hash = if index == 0 {
        &BIFROST_ROOT_HASH
    } else {
        let last_seal = &chain.last().unwrap().seal;
        // Safety: seal[..32] is always 32 bytes
        unsafe { &*(last_seal.as_ptr() as *const [u8; 32]) }
    };
    let seal = crypto::bifrost_seal(prev_hash, rh, index);
    let entry = BifrostEntry {
        index,
        record: rec.to_vec(),
        record_hash: *rh,
        prev_hash: *prev_hash,
        seal,
    };
    chain.push(entry);
    unsafe { std::ptr::copy_nonoverlapping(seal.as_ptr(), seal_out, 64) }
    true
}

/// Bifrost verify chain: extern "C" bool bifrost_verify_chain(void)
#[no_mangle]
pub extern "C" fn bifrost_verify_chain() -> bool {
    let chain = crate::BIFROST_CHAIN.lock().unwrap();
    if chain.is_empty() { return true; }
    let mut prev_hash = BIFROST_ROOT_HASH;
    for entry in chain.iter() {
        let expected_seal = crypto::bifrost_seal(&prev_hash, &entry.record_hash, entry.index);
        if expected_seal != entry.seal { return false; }
        prev_hash = {
            // Safety: expected_seal[..32] is always 32 bytes
            unsafe { *(expected_seal.as_ptr() as *const [u8; 32]) }
        };
    }
    true
}

/// Resolve DID: extern "C" bool resolve_did(const char*, [u8;32]*)
#[no_mangle]
pub extern "C" fn resolve_did(did: *const c_char, public_key_out: *mut u8) -> bool {
    if did.is_null() || public_key_out.is_null() { return false; }
    let c_str = unsafe { CStr::from_ptr(did) };
    let did_str = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return false,
    };
    match did_str {
        "did:snapkitty:ahmad_ali_parr" => {
            let pk: [u8; 32] = [
                0x4b, 0x56, 0x54, 0x98, 0x9a, 0xfc, 0x47, 0x82,
                0xaf, 0x4a, 0xc6, 0xb1, 0x1a, 0x5d, 0x00, 0x58,
                0x9a, 0x7f, 0x3c, 0x2e, 0x1d, 0x0b, 0x8f, 0x6a,
                0x4c, 0x3e, 0x2d, 0x1b, 0x0a, 0x9f, 0x8e, 0x7d,
            ];
            unsafe { std::ptr::copy_nonoverlapping(pk.as_ptr(), public_key_out, 32) }
            true
        }
        _ => false,
    }
}
