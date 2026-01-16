// SPDX-License-Identifier: AGPL-3.0-or-later
//! DotMatrix-FilePrinter Tauri Backend
//!
//! Bridge between the ReScript UI and the Forth kernel.
//! Handles byte validation, file operations, and Forth execution.

use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::process::Command;
use thiserror::Error;

/// Constraints from Nickel contract (config/meta.ncl)
mod constraints {
    pub const MAX_BYTE: u8 = 127;
    pub const FORBIDDEN_NBSP: u8 = 160;
    pub const FORBIDDEN_UTF8: u8 = 194;
}

/// Errors that can occur during strike operations
#[derive(Error, Debug, Serialize)]
pub enum StrikeError {
    #[error("Byte {value} at position {position} exceeds ASCII limit (127)")]
    ByteOutOfRange { position: usize, value: u8 },

    #[error("Forbidden byte {value} (0x{value:02X}) at position {position}: {description}")]
    ForbiddenByte {
        position: usize,
        value: u8,
        description: String,
    },

    #[error("File operation failed: {0}")]
    FileError(String),

    #[error("Forth kernel execution failed: {0}")]
    ForthError(String),

    #[error("Gforth not found. Please install gforth.")]
    GforthNotFound,
}

impl From<std::io::Error> for StrikeError {
    fn from(e: std::io::Error) -> Self {
        StrikeError::FileError(e.to_string())
    }
}

/// Result of contamination check
#[derive(Serialize)]
pub struct Contaminant {
    position: usize,
    value: u8,
    description: String,
}

/// Payload for strike command
#[derive(Deserialize)]
pub struct StrikePayload {
    bytes: Vec<u8>,
    path: String,
}

/// Result of preview operation
#[derive(Serialize)]
pub struct PreviewResult {
    hex_preview: String,
    would_contaminate: bool,
    contaminants: Vec<Contaminant>,
    byte_count: usize,
}

/// Result of verification
#[derive(Serialize)]
pub struct VerifyResult {
    clean: bool,
    contaminants: Vec<Contaminant>,
    hexdump: String,
    size: usize,
}

/// Validate a single byte against constraints
fn validate_byte(byte: u8, position: usize) -> Result<(), StrikeError> {
    if byte > constraints::MAX_BYTE {
        return Err(StrikeError::ByteOutOfRange {
            position,
            value: byte,
        });
    }
    if byte == constraints::FORBIDDEN_NBSP {
        return Err(StrikeError::ForbiddenByte {
            position,
            value: byte,
            description: "NBSP (Non-Breaking Space)".into(),
        });
    }
    if byte == constraints::FORBIDDEN_UTF8 {
        return Err(StrikeError::ForbiddenByte {
            position,
            value: byte,
            description: "UTF-8 continuation marker".into(),
        });
    }
    Ok(())
}

/// Find all contaminants in a byte sequence (non-failing)
fn find_contaminants(bytes: &[u8]) -> Vec<Contaminant> {
    bytes
        .iter()
        .enumerate()
        .filter_map(|(i, &b)| {
            if b > constraints::MAX_BYTE {
                Some(Contaminant {
                    position: i,
                    value: b,
                    description: format!("Non-ASCII (0x{:02X} > 127)", b),
                })
            } else if b == constraints::FORBIDDEN_NBSP {
                Some(Contaminant {
                    position: i,
                    value: b,
                    description: "NBSP (Non-Breaking Space)".into(),
                })
            } else if b == constraints::FORBIDDEN_UTF8 {
                Some(Contaminant {
                    position: i,
                    value: b,
                    description: "UTF-8 continuation marker".into(),
                })
            } else {
                None
            }
        })
        .collect()
}

/// Generate hexdump-style output
fn bytes_to_hexdump(bytes: &[u8]) -> String {
    bytes
        .chunks(16)
        .enumerate()
        .map(|(i, chunk)| {
            let hex: String = chunk
                .iter()
                .enumerate()
                .map(|(j, b)| {
                    if j == 8 {
                        format!(" {:02x}", b)
                    } else {
                        format!("{:02x}", b)
                    }
                })
                .collect::<Vec<_>>()
                .join(" ");

            let ascii: String = chunk
                .iter()
                .map(|&b| {
                    if b >= 32 && b < 127 {
                        b as char
                    } else {
                        '.'
                    }
                })
                .collect();

            format!("{:08x}  {:48}  |{}|", i * 16, hex, ascii)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Check if gforth is available
#[tauri::command]
fn check_gforth() -> bool {
    Command::new("gforth")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Preview a strike without writing (dry-run)
#[tauri::command]
fn preview_forth_strike(bytes: Vec<u8>) -> PreviewResult {
    let contaminants = find_contaminants(&bytes);
    PreviewResult {
        hex_preview: bytes_to_hexdump(&bytes),
        would_contaminate: !contaminants.is_empty(),
        contaminants,
        byte_count: bytes.len(),
    }
}

/// Execute a strike via the Forth kernel
#[tauri::command]
fn execute_forth_strike(bytes: Vec<u8>, path: String) -> Result<(), String> {
    // Validate all bytes first
    for (i, &b) in bytes.iter().enumerate() {
        validate_byte(b, i).map_err(|e| e.to_string())?;
    }

    // Check gforth availability
    if !check_gforth() {
        return Err(StrikeError::GforthNotFound.to_string());
    }

    // Ensure kernel directory exists
    let kernel_dir = Path::new("kernel");
    if !kernel_dir.exists() {
        return Err(StrikeError::FileError("kernel/ directory not found".into()).to_string());
    }

    // Write data to temporary Forth source
    let data_path = kernel_dir.join("data.fth");
    let mut f = File::create(&data_path).map_err(|e| StrikeError::from(e).to_string())?;

    writeln!(f, "\\ Auto-generated strike data").map_err(|e| e.to_string())?;
    write!(f, "CREATE STRIKE-DATA ").map_err(|e| e.to_string())?;
    for b in &bytes {
        write!(f, "{} , ", b).map_err(|e| e.to_string())?;
    }
    writeln!(f).map_err(|e| e.to_string())?;

    // Ensure dist directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| StrikeError::from(e).to_string())?;
    }

    // Invoke Gforth Kernel
    let status = Command::new("gforth")
        .args([
            "kernel/striker.fth",
            "kernel/data.fth",
            "-e",
            &format!(
                "s\" {}\" strike-init STRIKE-DATA {} strike-sequence strike-close bye",
                path,
                bytes.len()
            ),
        ])
        .status()
        .map_err(|e| StrikeError::ForthError(e.to_string()).to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err(StrikeError::ForthError("Forth kernel returned non-zero exit code".into()).to_string())
    }
}

/// Read and verify a substrate file
#[tauri::command]
fn verify_substrate(path: String) -> Result<VerifyResult, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;
    let contaminants = find_contaminants(&bytes);

    Ok(VerifyResult {
        clean: contaminants.is_empty(),
        contaminants,
        hexdump: bytes_to_hexdump(&bytes),
        size: bytes.len(),
    })
}

/// Read substrate as hex (for display)
#[tauri::command]
fn read_substrate_hex(path: String) -> Result<VerifyResult, String> {
    verify_substrate(path)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            check_gforth,
            preview_forth_strike,
            execute_forth_strike,
            verify_substrate,
            read_substrate_hex,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
