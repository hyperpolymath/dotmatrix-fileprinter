// SPDX-License-Identifier: AGPL-3.0-or-later
// Tauri FFI Bindings for DotMatrix-FilePrinter
// Uses proven library for formally verified safety operations

// Core Tauri API
@module("@tauri-apps/api/core")
external invoke: (string, 'a) => promise<'b> = "invoke"

// Re-export types
type contaminant = Types.contaminant
type previewResult = Types.previewResult
type verifyResult = Types.verifyResult

// Commands - these call the Rust backend

// Check if gforth is available
let checkGforth = (): promise<bool> => {
  invoke("check_gforth", ())
}

// Preview strike (dry-run)
let previewStrike = (bytes: array<int>): promise<previewResult> => {
  invoke("preview_forth_strike", {"bytes": bytes})
}

// Helper to create a rejected promise with an error message
let rejectWithMessage: string => promise<'a> = %raw(`
  function(msg) { return Promise.reject(new Error(msg)); }
`)

// Execute strike via Forth kernel (with path validation using SafePath)
let executeStrike = (bytes: array<int>, path: string): promise<unit> => {
  // Validate path doesn't contain traversal attacks
  if !Proven_SafePath.isSafe(path) {
    rejectWithMessage("Invalid path: contains traversal sequences")
  } else {
    invoke("execute_forth_strike", {"bytes": bytes, "path": path})
  }
}

// Verify substrate file (with path validation using SafePath)
let verifySubstrate = (path: string): promise<verifyResult> => {
  if !Proven_SafePath.isSafe(path) {
    rejectWithMessage("Invalid path: contains traversal sequences")
  } else {
    invoke("verify_substrate", {"path": path})
  }
}

// Utilities using proven library

// Convert string to byte array using SafeString.toCodePoints
let stringToBytes = (str: string): array<int> => {
  switch Proven_SafeString.toCodePoints(str) {
  | Ok(bytes) => bytes
  | Error(_) => []  // Return empty on non-ASCII input
  }
}

// Convert byte array to string using SafeString.fromCodePoints
let bytesToString = (bytes: array<int>): string => {
  switch Proven_SafeString.fromCodePoints(bytes) {
  | Ok(str) => str
  | Error(_) => ""  // Return empty on invalid code points
  }
}

// Validate a single byte (uses SafeMath via Types.Constraints)
let isValidByte = (byte: int): bool => {
  Types.Constraints.isValidByte(byte)
}

// Validate path safety using SafePath
let isValidPath = (path: string): bool => {
  Proven_SafePath.isSafe(path)
}

// Parse comma-separated bytes using SafeMath.fromString
let parseByteString = (str: string): result<array<int>, string> => {
  let parts = str
    ->String.trim
    ->String.split(",")
    ->Array.map(String.trim)
    ->Array.filter(s => s->String.length > 0)

  // Use SafeMath.fromString for safe integer parsing
  let bytes = parts->Array.map(s => Proven_SafeMath.fromString(s))

  if bytes->Array.some(Option.isNone) {
    Error("Invalid byte value")
  } else {
    let values = bytes->Array.filterMap(x => x)
    let invalid = values->Array.findIndex(b => !isValidByte(b))
    if invalid >= 0 {
      Error(`Byte at position ${Int.toString(invalid)} is invalid`)
    } else {
      Ok(values)
    }
  }
}

// Format bytes as spaced hex using SafeHex.encodeSpaced
let bytesToHex = (bytes: array<int>): string => {
  switch Proven_SafeHex.encodeSpaced(bytes) {
  | Ok(hex) => hex
  | Error(_) => ""  // Return empty on invalid bytes
  }
}

// Format bytes as compact hex (no spaces) using SafeHex.encode
let bytesToHexCompact = (bytes: array<int>): string => {
  switch Proven_SafeHex.encode(bytes) {
  | Ok(hex) => hex
  | Error(_) => ""
  }
}

// Decode hex string to bytes using SafeHex.decode
let hexToBytes = (hexStr: string): result<array<int>, string> => {
  switch Proven_SafeHex.decode(hexStr) {
  | Ok(bytes) => Ok(bytes)
  | Error(Proven_SafeHex.InvalidLength) => Error("Invalid hex length (must be even)")
  | Error(Proven_SafeHex.InvalidCharacter) => Error("Invalid hex character")
  | Error(Proven_SafeHex.EmptyInput) => Ok([])
  }
}
