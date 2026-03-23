// SPDX-License-Identifier: PMPL-1.0-or-later
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
//
//! DotMatrix-FilePrinter Gossamer Backend
//!
//! Bridge between the ReScript UI and the Forth kernel.
//! Handles byte validation, file operations, and Forth execution.
//! Migrated from Tauri to Gossamer webview shell.

#![forbid(unsafe_code)]

use gossamer_rs::App;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::process::Command;
use thiserror::Error;

// =============================================================================
// Constraints from Nickel contract (config/meta.ncl)
// =============================================================================

/// Byte-level constraints enforced by the Nickel symbolic layer.
/// These prevent encoding drift and NBSP contamination at the physical level.
mod constraints {
    /// Maximum allowed byte value (ASCII limit).
    pub const MAX_BYTE: u8 = 127;
    /// Non-Breaking Space — forbidden contaminant.
    pub const FORBIDDEN_NBSP: u8 = 160;
    /// UTF-8 continuation marker — forbidden contaminant.
    pub const FORBIDDEN_UTF8: u8 = 194;
}

// =============================================================================
// Error types
// =============================================================================

/// Errors that can occur during strike operations.
/// Each variant maps to a specific failure mode in the
/// Forth kernel pipeline.
#[derive(Error, Debug, Serialize)]
pub enum StrikeError {
    /// A byte exceeded the ASCII limit (127).
    #[error("Byte {value} at position {position} exceeds ASCII limit (127)")]
    ByteOutOfRange {
        /// Position in the byte sequence.
        position: usize,
        /// The offending byte value.
        value: u8,
    },

    /// A forbidden byte was detected (NBSP or UTF-8 continuation).
    #[error("Forbidden byte {value} (0x{value:02X}) at position {position}: {description}")]
    ForbiddenByte {
        /// Position in the byte sequence.
        position: usize,
        /// The offending byte value.
        value: u8,
        /// Human-readable description of why this byte is forbidden.
        description: String,
    },

    /// A filesystem operation failed.
    #[error("File operation failed: {0}")]
    FileError(String),

    /// The Forth kernel returned an error.
    #[error("Forth kernel execution failed: {0}")]
    ForthError(String),

    /// Gforth is not installed on the system.
    #[error("Gforth not found. Please install gforth.")]
    GforthNotFound,
}

impl From<std::io::Error> for StrikeError {
    fn from(e: std::io::Error) -> Self {
        StrikeError::FileError(e.to_string())
    }
}

// =============================================================================
// Data types — serialised across the IPC boundary
// =============================================================================

/// A single contaminant found during byte validation.
/// Represents a byte that violates the ASCII purity constraints.
#[derive(Serialize)]
pub struct Contaminant {
    /// Position in the byte sequence.
    position: usize,
    /// The contaminant byte value.
    value: u8,
    /// Human-readable description of the contamination.
    description: String,
}

/// Payload for a strike command from the frontend.
#[derive(Deserialize)]
pub struct StrikePayload {
    /// The byte sequence to strike onto the substrate.
    bytes: Vec<u8>,
    /// The filesystem path for the output file.
    path: String,
}

/// Result of a preview (dry-run) operation.
/// Shows what would happen without writing to the substrate.
#[derive(Serialize)]
pub struct PreviewResult {
    /// Hexdump-style preview of the byte sequence.
    hex_preview: String,
    /// Whether any contaminants were found.
    would_contaminate: bool,
    /// List of contaminants found.
    contaminants: Vec<Contaminant>,
    /// Total number of bytes in the sequence.
    byte_count: usize,
}

/// Result of verifying an existing substrate file.
#[derive(Serialize)]
pub struct VerifyResult {
    /// Whether the substrate is clean (no contaminants).
    clean: bool,
    /// List of contaminants found.
    contaminants: Vec<Contaminant>,
    /// Hexdump of the file contents.
    hexdump: String,
    /// File size in bytes.
    size: usize,
}

// =============================================================================
// Core validation logic
// =============================================================================

/// Validate a single byte against the Nickel contract constraints.
/// Returns an error if the byte exceeds ASCII range or matches
/// a forbidden pattern (NBSP, UTF-8 continuation).
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

/// Scan a byte sequence for all contaminants (non-failing).
/// Returns every byte that violates constraints, without stopping
/// at the first violation.
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

/// Generate a hexdump-style output string from a byte slice.
/// Format matches `hexdump -C` with 16-byte rows, hex columns,
/// and an ASCII sidebar.
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

// =============================================================================
// Command handlers — Gossamer IPC
// =============================================================================

/// Check whether gforth is installed and available on PATH.
/// Returns JSON: `{ "available": true|false }`
fn handle_check_gforth(_payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let available = Command::new("gforth")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    Ok(serde_json::json!({ "available": available }))
}

/// Preview a strike without writing to the substrate (dry-run).
/// Accepts JSON: `{ "bytes": [104, 101, 108, 108, 111] }`
/// Returns a PreviewResult with hexdump and contaminant analysis.
fn handle_preview_forth_strike(
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let bytes: Vec<u8> = payload
        .get("bytes")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let contaminants = find_contaminants(&bytes);
    let result = PreviewResult {
        hex_preview: bytes_to_hexdump(&bytes),
        would_contaminate: !contaminants.is_empty(),
        contaminants,
        byte_count: bytes.len(),
    };

    serde_json::to_value(&result).map_err(|e| e.to_string())
}

/// Execute a strike via the Forth kernel.
/// Accepts JSON: `{ "bytes": [104, 101, 108, 108, 111], "path": "dist/substrate.bin" }`
/// Validates all bytes, writes a Forth data file, and invokes gforth.
fn handle_execute_forth_strike(
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let bytes: Vec<u8> = payload
        .get("bytes")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let path: String = payload
        .get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("dist/substrate.bin")
        .to_string();

    // Validate all bytes first
    for (i, &b) in bytes.iter().enumerate() {
        validate_byte(b, i).map_err(|e| e.to_string())?;
    }

    // Check gforth availability
    let gforth_available = Command::new("gforth")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !gforth_available {
        return Err(StrikeError::GforthNotFound.to_string());
    }

    // Ensure kernel directory exists
    let kernel_dir = Path::new("kernel");
    if !kernel_dir.exists() {
        return Err(
            StrikeError::FileError("kernel/ directory not found".into()).to_string(),
        );
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

    // Ensure output directory exists
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
        Ok(serde_json::json!({ "success": true }))
    } else {
        Err(StrikeError::ForthError(
            "Forth kernel returned non-zero exit code".into(),
        )
        .to_string())
    }
}

/// Read and verify an existing substrate file for contamination.
/// Accepts JSON: `{ "path": "dist/substrate.bin" }`
/// Returns a VerifyResult with contamination analysis and hexdump.
fn handle_verify_substrate(
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let path: String = payload
        .get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if path.is_empty() {
        return Err("Missing 'path' parameter".to_string());
    }

    let bytes =
        fs::read(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;
    let contaminants = find_contaminants(&bytes);

    let result = VerifyResult {
        clean: contaminants.is_empty(),
        contaminants,
        hexdump: bytes_to_hexdump(&bytes),
        size: bytes.len(),
    };

    serde_json::to_value(&result).map_err(|e| e.to_string())
}

/// Read a substrate file as hex for display.
/// Alias for verify_substrate — same input/output contract.
fn handle_read_substrate_hex(
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    handle_verify_substrate(payload)
}

// =============================================================================
// Application entry point
// =============================================================================

fn main() -> Result<(), gossamer_rs::Error> {
    let mut app = App::new("DotMatrix-FilePrinter", 1200, 800)?;

    // Register all IPC command handlers.
    // These mirror the original Tauri commands 1:1 — the ReScript
    // frontend invokes them via RuntimeBridge unchanged.
    app.command("check_gforth", handle_check_gforth);
    app.command("preview_forth_strike", handle_preview_forth_strike);
    app.command("execute_forth_strike", handle_execute_forth_strike);
    app.command("verify_substrate", handle_verify_substrate);
    app.command("read_substrate_hex", handle_read_substrate_hex);

    // Navigate to the frontend dist — Gossamer serves from gossamer.conf.json
    // build.frontendDist, or falls back to the dev URL during development.
    app.navigate("/")?;

    // Block on the event loop until the window is closed.
    app.run();

    Ok(())
}
