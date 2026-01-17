// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared types for DotMatrix-FilePrinter
// Uses proven library for formally verified safety operations

// Contaminant info
type contaminant = {
  position: int,
  value: int,
  description: string,
}

// Preview result from backend
type previewResult = {
  hex_preview: string,
  would_contaminate: bool,
  contaminants: array<contaminant>,
  byte_count: int,
}

// Verify result from backend
type verifyResult = {
  clean: bool,
  contaminants: array<contaminant>,
  hexdump: string,
  size: int,
}

// Constraints (mirror of Nickel/Rust)
// Uses SafeMath from proven library for formally verified bounds checking
module Constraints = {
  let maxByte = 127
  let forbiddenNbsp = 160
  let forbiddenUtf8 = 194

  // Forbidden byte values that can cause contamination
  let forbiddenBytes = [forbiddenNbsp, forbiddenUtf8]

  // Use SafeMath.inRangeExcluding for formally verified byte validation
  let isValidByte = (byte: int): bool => {
    Proven_SafeMath.inRangeExcluding(byte, 0, maxByte, forbiddenBytes)
  }

  let describeInvalidByte = (byte: int): string => {
    if byte == forbiddenNbsp {
      "NBSP (Non-Breaking Space)"
    } else if byte == forbiddenUtf8 {
      "UTF-8 continuation marker"
    } else if byte > maxByte {
      `Non-ASCII (> 127)`
    } else if byte < 0 {
      "Negative value"
    } else {
      "Unknown"
    }
  }
}
