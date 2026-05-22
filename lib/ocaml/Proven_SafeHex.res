// SPDX-License-Identifier: MPL-2.0
// SPDX-FileCopyrightText: 2025 Hyperpolymath

/**
 * SafeHex - Hexadecimal encoding/decoding that cannot crash.
 *
 * Provides safe hex operations with constant-time comparison for security-sensitive use.
 */

/** Error types for hex operations */
type hexError =
  | InvalidLength
  | InvalidCharacter
  | EmptyInput

/** Hex character set (lowercase) */
let hexChars = "0123456789abcdef"

/** Hex character set (uppercase) */
let hexCharsUpper = "0123456789ABCDEF"

/** Convert a single hex character to its integer value */
let hexCharToInt = (char: string): option<int> => {
  let code = String.charCodeAt(char, 0)->Float.toInt
  if code >= 48 && code <= 57 {
    // 0-9
    Some(code - 48)
  } else if code >= 65 && code <= 70 {
    // A-F
    Some(code - 55)
  } else if code >= 97 && code <= 102 {
    // a-f
    Some(code - 87)
  } else {
    None
  }
}

/** Convert an integer (0-15) to a hex character (lowercase) */
let intToHexChar = (value: int): option<string> => {
  if value >= 0 && value <= 15 {
    Some(String.charAt(hexChars, value))
  } else {
    None
  }
}

/** Encode a byte array to a hex string (lowercase) */
let encode = (bytes: array<int>): result<string, hexError> => {
  if Array.length(bytes) == 0 {
    Ok("")
  } else {
    let result = ref("")
    let valid = ref(true)

    Array.forEach(bytes, byte => {
      if valid.contents && byte >= 0 && byte <= 255 {
        let high = Int.Bitwise.lsr(byte, 4)
        let low = Int.Bitwise.land(byte, 0x0f)
        result :=
          result.contents ++
          String.charAt(hexChars, high) ++
          String.charAt(hexChars, low)
      } else {
        valid := false
      }
    })

    if valid.contents {
      Ok(result.contents)
    } else {
      Error(InvalidCharacter)
    }
  }
}

/** Encode a byte array to a hex string (uppercase) */
let encodeUppercase = (bytes: array<int>): result<string, hexError> => {
  if Array.length(bytes) == 0 {
    Ok("")
  } else {
    let result = ref("")
    let valid = ref(true)

    Array.forEach(bytes, byte => {
      if valid.contents && byte >= 0 && byte <= 255 {
        let high = Int.Bitwise.lsr(byte, 4)
        let low = Int.Bitwise.land(byte, 0x0f)
        result :=
          result.contents ++
          String.charAt(hexCharsUpper, high) ++
          String.charAt(hexCharsUpper, low)
      } else {
        valid := false
      }
    })

    if valid.contents {
      Ok(result.contents)
    } else {
      Error(InvalidCharacter)
    }
  }
}

/** Encode a string to hex (using UTF-8 code points) */
let encodeString = (input: string): string => {
  let result = ref("")
  for i in 0 to String.length(input) - 1 {
    let code = String.charCodeAt(input, i)->Float.toInt
    // Handle basic ASCII range (0-255)
    if code <= 255 {
      let high = Int.Bitwise.lsr(code, 4)
      let low = Int.Bitwise.land(code, 0x0f)
      result :=
        result.contents ++ String.charAt(hexChars, high) ++ String.charAt(hexChars, low)
    } else {
      // For characters > 255, encode as multi-byte
      // High byte
      let highByte = Int.Bitwise.lsr(code, 8)
      let highHigh = Int.Bitwise.lsr(highByte, 4)
      let highLow = Int.Bitwise.land(highByte, 0x0f)
      result :=
        result.contents ++
        String.charAt(hexChars, highHigh) ++
        String.charAt(hexChars, highLow)
      // Low byte
      let lowByte = Int.Bitwise.land(code, 0xff)
      let lowHigh = Int.Bitwise.lsr(lowByte, 4)
      let lowLow = Int.Bitwise.land(lowByte, 0x0f)
      result :=
        result.contents ++
        String.charAt(hexChars, lowHigh) ++
        String.charAt(hexChars, lowLow)
    }
  }
  result.contents
}

/** Decode a hex string to a byte array */
let decode = (hexStr: string): result<array<int>, hexError> => {
  let normalized = String.toLowerCase(String.trim(hexStr))
  let length = String.length(normalized)

  if length == 0 {
    Ok([])
  } else if mod(length, 2) != 0 {
    Error(InvalidLength)
  } else {
    let numBytes = length / 2
    let bytes = Array.make(~length=numBytes, 0)
    let valid = ref(true)
    let errorType = ref(InvalidCharacter)

    for i in 0 to numBytes - 1 {
      if valid.contents {
        let highChar = String.charAt(normalized, i * 2)
        let lowChar = String.charAt(normalized, i * 2 + 1)
        switch (hexCharToInt(highChar), hexCharToInt(lowChar)) {
        | (Some(high), Some(low)) =>
          Array.setUnsafe(bytes, i, Int.Bitwise.lsl(high, 4) + low)
        | _ =>
          valid := false
          errorType := InvalidCharacter
        }
      }
    }

    if valid.contents {
      Ok(bytes)
    } else {
      Error(errorType.contents)
    }
  }
}

/** Decode a hex string to a string (ASCII range only) */
let decodeToString = (hexStr: string): result<string, hexError> => {
  switch decode(hexStr) {
  | Error(e) => Error(e)
  | Ok(bytes) =>
    let chars = Array.map(bytes, byte => String.fromCharCode(byte))
    Ok(Array.join(chars, ""))
  }
}

/** Check if a string is valid hex */
let isValidHex = (hexStr: string): bool => {
  let trimmed = String.trim(hexStr)
  let length = String.length(trimmed)

  if length == 0 || mod(length, 2) != 0 {
    false
  } else {
    RegExp.test(%re("/^[0-9a-fA-F]+$/"), trimmed)
  }
}

/** Constant-time comparison of two hex strings
 *
 * SECURITY: This function compares strings in constant time to prevent
 * timing attacks. It always examines the full length of both strings
 * regardless of where differences occur.
 */
let constantTimeEqual = (hexA: string, hexB: string): bool => {
  let normalizedA = String.toLowerCase(String.trim(hexA))
  let normalizedB = String.toLowerCase(String.trim(hexB))

  let lengthA = String.length(normalizedA)
  let lengthB = String.length(normalizedB)

  // Length comparison must not short-circuit
  let lengthMatch = lengthA == lengthB

  // Use the longer length to ensure constant time
  let maxLength = if lengthA > lengthB {
    lengthA
  } else {
    lengthB
  }

  // Accumulate differences using XOR
  let diff = ref(0)

  for i in 0 to maxLength - 1 {
    let charA = if i < lengthA {
      String.charCodeAt(normalizedA, i)->Float.toInt
    } else {
      0
    }
    let charB = if i < lengthB {
      String.charCodeAt(normalizedB, i)->Float.toInt
    } else {
      0
    }
    diff := Int.Bitwise.lor(diff.contents, Int.Bitwise.lxor(charA, charB))
  }

  lengthMatch && diff.contents == 0
}

/** Constant-time comparison of two byte arrays
 *
 * SECURITY: This function compares byte arrays in constant time.
 */
let constantTimeEqualBytes = (bytesA: array<int>, bytesB: array<int>): bool => {
  let lengthA = Array.length(bytesA)
  let lengthB = Array.length(bytesB)

  let lengthMatch = lengthA == lengthB

  let maxLength = if lengthA > lengthB {
    lengthA
  } else {
    lengthB
  }

  let diff = ref(0)

  for i in 0 to maxLength - 1 {
    let byteA = if i < lengthA {
      Array.getUnsafe(bytesA, i)
    } else {
      0
    }
    let byteB = if i < lengthB {
      Array.getUnsafe(bytesB, i)
    } else {
      0
    }
    diff := Int.Bitwise.lor(diff.contents, Int.Bitwise.lxor(byteA, byteB))
  }

  lengthMatch && diff.contents == 0
}

/** Convert a hex string to lowercase */
let toLowercase = (hexStr: string): result<string, hexError> => {
  if !isValidHex(hexStr) && String.length(String.trim(hexStr)) > 0 {
    Error(InvalidCharacter)
  } else {
    Ok(String.toLowerCase(String.trim(hexStr)))
  }
}

/** Convert a hex string to uppercase */
let toUppercase = (hexStr: string): result<string, hexError> => {
  if !isValidHex(hexStr) && String.length(String.trim(hexStr)) > 0 {
    Error(InvalidCharacter)
  } else {
    Ok(String.toUpperCase(String.trim(hexStr)))
  }
}

/** Get the byte length of a hex string (hex length / 2) */
let byteLength = (hexStr: string): result<int, hexError> => {
  let trimmed = String.trim(hexStr)
  let length = String.length(trimmed)

  if length == 0 {
    Ok(0)
  } else if mod(length, 2) != 0 {
    Error(InvalidLength)
  } else if !isValidHex(trimmed) {
    Error(InvalidCharacter)
  } else {
    Ok(length / 2)
  }
}

/** Pad a hex string with leading zeros to a specified byte length */
let padToByteLength = (hexStr: string, targetByteLength: int): result<string, hexError> => {
  if targetByteLength < 0 {
    Error(InvalidLength)
  } else {
    switch decode(hexStr) {
    | Error(e) => Error(e)
    | Ok(bytes) =>
      let currentLength = Array.length(bytes)
      if currentLength > targetByteLength {
        Error(InvalidLength)
      } else {
        let padding = Array.make(~length=targetByteLength - currentLength, 0)
        let paddedBytes = Array.concat(padding, bytes)
        encode(paddedBytes)
      }
    }
  }
}

/** XOR two hex strings of equal length */
let xorHex = (hexA: string, hexB: string): result<string, hexError> => {
  switch (decode(hexA), decode(hexB)) {
  | (Error(e), _) | (_, Error(e)) => Error(e)
  | (Ok(bytesA), Ok(bytesB)) =>
    if Array.length(bytesA) != Array.length(bytesB) {
      Error(InvalidLength)
    } else {
      let result = Array.mapWithIndex(bytesA, (byteA, i) => {
        let byteB = Array.getUnsafe(bytesB, i)
        Int.Bitwise.lxor(byteA, byteB)
      })
      encode(result)
    }
  }
}

/** Encode a byte array to a spaced hex string (for display)
 *
 * Example: [72, 101, 108] -> "48 65 6c"
 */
let encodeSpaced = (bytes: array<int>): result<string, hexError> => {
  let length = Array.length(bytes)
  if length == 0 {
    Ok("")
  } else {
    let parts = Array.make(~length, "")
    let valid = ref(true)

    for i in 0 to length - 1 {
      if valid.contents {
        let byte = Array.getUnsafe(bytes, i)
        if byte >= 0 && byte <= 255 {
          let high = Int.Bitwise.lsr(byte, 4)
          let low = Int.Bitwise.land(byte, 0x0f)
          let hex = String.charAt(hexChars, high) ++ String.charAt(hexChars, low)
          Array.setUnsafe(parts, i, hex)
        } else {
          valid := false
        }
      }
    }

    if valid.contents {
      Ok(Array.join(parts, " "))
    } else {
      Error(InvalidCharacter)
    }
  }
}

/** Encode a byte array to a spaced uppercase hex string (for display)
 *
 * Example: [72, 101, 108] -> "48 65 6C"
 */
let encodeSpacedUppercase = (bytes: array<int>): result<string, hexError> => {
  let length = Array.length(bytes)
  if length == 0 {
    Ok("")
  } else {
    let parts = Array.make(~length, "")
    let valid = ref(true)

    for i in 0 to length - 1 {
      if valid.contents {
        let byte = Array.getUnsafe(bytes, i)
        if byte >= 0 && byte <= 255 {
          let high = Int.Bitwise.lsr(byte, 4)
          let low = Int.Bitwise.land(byte, 0x0f)
          let hex = String.charAt(hexCharsUpper, high) ++ String.charAt(hexCharsUpper, low)
          Array.setUnsafe(parts, i, hex)
        } else {
          valid := false
        }
      }
    }

    if valid.contents {
      Ok(Array.join(parts, " "))
    } else {
      Error(InvalidCharacter)
    }
  }
}
