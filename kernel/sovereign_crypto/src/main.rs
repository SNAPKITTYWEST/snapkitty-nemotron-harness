mod crypto;
mod ffi;

use std::sync::Mutex;
use std::ffi::CString;
use std::io::{self, BufRead, Write};

/// Global Bifrost WORM chain state (in-memory; will be persisted).
pub static BIFROST_CHAIN: Mutex<Vec<BifrostEntry>> = Mutex::new(Vec::new());

#[derive(Debug, Clone)]
pub struct BifrostEntry {
    pub index: u64,
    pub record: Vec<u8>,
    pub record_hash: [u8; 32],
    pub prev_hash: [u8; 32],
    pub seal: [u8; 64],
}

pub const BIFROST_ROOT_HASH: [u8; 32] = [
    0x9a, 0x7f, 0x3c, 0x2e, 0x1d, 0x0b, 0x8f, 0x6a,
    0x4c, 0x3e, 0x2d, 0x1b, 0x0a, 0x9f, 0x8e, 0x7d,
    0x6c, 0x5b, 0x4a, 0x3f, 0x2e, 0x1d, 0x0c, 0x9b,
    0x8a, 0x7f, 0x6e, 0x5d, 0x4c, 0x3b, 0x2a, 0x1f,
];

fn main() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        let trimmed = line.trim().to_string();
        if trimmed.is_empty() { continue; }
        let response = dispatch(&trimmed);
        println!("{}", response);
        io::stdout().flush().ok();
    }
}

fn dispatch(cmd: &str) -> String {
    // ed25519_verify_ffi(+Signature, +Message, +PublicKey)
    if cmd.starts_with("ed25519_verify_ffi(") && cmd.ends_with(")") {
        let inner = &cmd["ed25519_verify_ffi(".len()..cmd.len() - 1];
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() >= 3 {
            if let (Ok(sig), Ok(msg), Ok(pk)) = (
                hex_to_array64(parts[0].trim().trim_matches('\'')),
                hex_to_array32(parts[1].trim().trim_matches('\'')),
                hex_to_array32(parts[2].trim().trim_matches('\'')),
            ) {
                return format!("{}", crypto::ed25519_verify(&sig, &msg, &pk));
            }
        }
        return "false".to_string();
    }

    // ed25519_sign_ffi(+Message, +SecretKey, -Signature)
    if cmd.starts_with("ed25519_sign_ffi(") && cmd.ends_with(")") {
        let inner = &cmd["ed25519_sign_ffi(".len()..cmd.len() - 1];
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() >= 2 {
            if let (Ok(msg), Ok(sk)) = (
                hex_to_array32(parts[0].trim().trim_matches('\'')),
                hex_to_array32(parts[1].trim().trim_matches('\'')),
            ) {
                if let Some(sig) = crypto::ed25519_sign(&msg, &sk) {
                    return hex::encode(sig);
                }
            }
        }
        return "false".to_string();
    }

    // blake3_hash_ffi(+Data, -Hash)
    if cmd.starts_with("blake3_hash_ffi(") {
        let inner = &cmd["blake3_hash_ffi(".len()..cmd.len() - 1];
        let data_str = inner.split(',').next().unwrap_or("").trim().trim_matches('\'');
        let hash = crypto::blake3_hash(data_str.as_bytes());
        return hex::encode(hash);
    }

    // secure_nonce_ffi(-Nonce)
    if cmd.starts_with("secure_nonce_ffi(") {
        let nonce = crypto::secure_nonce();
        return hex::encode(nonce);
    }

    // bifrost_append_ffi(+Record, +RecordHash, -Seal)
    if cmd.starts_with("bifrost_append_ffi(") {
        let inner = &cmd["bifrost_append_ffi(".len()..cmd.len() - 1];
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() >= 3 {
            let rec_str = parts[0].trim().trim_matches('\'');
            if let Ok(rh) = hex_to_array32(parts[1].trim().trim_matches('\'')) {
                let idx = BIFROST_CHAIN.lock().unwrap().len() as u64;
                let seal = crypto::bifrost_seal(&BIFROST_ROOT_HASH, &rh, idx);
                let entry = BifrostEntry {
                    index: idx,
                    record: rec_str.as_bytes().to_vec(),
                    record_hash: rh,
                    prev_hash: BIFROST_ROOT_HASH,
                    seal,
                };
                BIFROST_CHAIN.lock().unwrap().push(entry);
                return hex::encode(seal);
            }
        }
        return "false".to_string();
    }

    // bifrost_verify_chain_ffi(-Status)
    if cmd.contains("bifrost_verify_chain_ffi") {
        return if ffi::bifrost_verify_chain() {
            "valid".to_string()
        } else {
            "tampered".to_string()
        };
    }

    // resolve_did_ffi(+DID, -PubKey)
    if cmd.starts_with("resolve_did_ffi(") {
        let inner = &cmd["resolve_did_ffi(".len()..cmd.len() - 1];
        let did_str = inner.split(',').next().unwrap_or("").trim().trim_matches('\'');
        let c_did = CString::new(did_str).unwrap_or_default();
        let mut pk_out = [0u8; 32];
        let ok = ffi::resolve_did(c_did.as_ptr(), pk_out.as_mut_ptr());
        if ok { return hex::encode(pk_out); }
        return "false".to_string();
    }

    format!("error: unknown command '{}'", cmd)
}

fn hex_to_array32(hex: &str) -> Result<[u8; 32], hex::FromHexError> {
    let mut arr = [0u8; 32];
    hex::decode_to_slice(hex, &mut arr)?;
    Ok(arr)
}

fn hex_to_array64(hex: &str) -> Result<[u8; 64], hex::FromHexError> {
    let mut arr = [0u8; 64];
    hex::decode_to_slice(hex, &mut arr)?;
    Ok(arr)
}
