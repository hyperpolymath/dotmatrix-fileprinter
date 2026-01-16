// SPDX-License-Identifier: AGPL-3.0-or-later
// DotMatrix-FilePrinter - App module
// Exports functions for the UI layer
// Uses proven library for formally verified safety operations

// Re-export bindings for JavaScript consumption
let checkGforth = Bindings.checkGforth
let previewStrike = Bindings.previewStrike
let executeStrike = Bindings.executeStrike
let verifySubstrate = Bindings.verifySubstrate

// Utilities (powered by proven library)
let stringToBytes = Bindings.stringToBytes
let bytesToString = Bindings.bytesToString
let parseByteString = Bindings.parseByteString
let isValidByte = Bindings.isValidByte
let isValidPath = Bindings.isValidPath
let bytesToHex = Bindings.bytesToHex
let bytesToHexCompact = Bindings.bytesToHexCompact
let hexToBytes = Bindings.hexToBytes

// For hex input mode
let decodeHex = Bindings.hexToBytes

// Constraint values for UI
let maxByte = Types.Constraints.maxByte
let forbiddenNbsp = Types.Constraints.forbiddenNbsp
let forbiddenUtf8 = Types.Constraints.forbiddenUtf8
let forbiddenBytes = Types.Constraints.forbiddenBytes
