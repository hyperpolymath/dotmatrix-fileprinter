// SPDX-License-Identifier: PMPL-1.0
// SPDX-FileCopyrightText: 2025 Hyperpolymath

/**
 * SafeString - String operations that cannot crash.
 *
 * Provides safe escaping for SQL, HTML, and JavaScript.
 */

/** Escape a string for safe SQL interpolation */
let escapeSql = (value: string): string => {
  Js.String2.replaceByRe(value, %re("/'/g"), "''")
}

/** Escape a string for safe HTML insertion */
let escapeHtml = (value: string): string => {
  value
  ->Js.String2.replaceByRe(%re("/&/g"), "&amp;")
  ->Js.String2.replaceByRe(%re("/</g"), "&lt;")
  ->Js.String2.replaceByRe(%re("/>/g"), "&gt;")
  ->Js.String2.replaceByRe(%re("/\"/g"), "&quot;")
  ->Js.String2.replaceByRe(%re("/'/g"), "&#x27;")
}

/** Escape a string for safe JavaScript string literal insertion */
let escapeJs = (value: string): string => {
  value
  ->Js.String2.replaceByRe(%re("/\\\\/g"), "\\\\")
  ->Js.String2.replaceByRe(%re("/\"/g"), "\\\"")
  ->Js.String2.replaceByRe(%re("/'/g"), "\\'")
  ->Js.String2.replaceByRe(%re("/\n/g"), "\\n")
  ->Js.String2.replaceByRe(%re("/\r/g"), "\\r")
  ->Js.String2.replaceByRe(%re("/\t/g"), "\\t")
}

/** Convert a string to an array of ASCII code points (0-255 only)
 *
 * Returns Error if any character is outside ASCII range (> 255).
 * For pure ASCII (0-127), this is always safe.
 */
let toCodePoints = (str: string): result<array<int>, string> => {
  let length = Js.String2.length(str)
  if length == 0 {
    Ok([])
  } else {
    let codes = Belt.Array.make(length, 0)
    let valid = ref(true)
    let errorIdx = ref(0)

    for i in 0 to length - 1 {
      if valid.contents {
        let code = Js.String2.charCodeAt(str, i)->Belt.Float.toInt
        if code > 255 {
          valid := false
          errorIdx := i
        } else {
          Belt.Array.setUnsafe(codes, i, code)
        }
      }
    }

    if valid.contents {
      Ok(codes)
    } else {
      Error(`Character at position ${Belt.Int.toString(errorIdx.contents)} is outside ASCII range`)
    }
  }
}

/** Convert an array of code points to a string
 *
 * All code points must be in range 0-65535 (valid UTF-16 code units).
 */
let fromCodePoints = (codes: array<int>): result<string, string> => {
  let length = Belt.Array.length(codes)
  if length == 0 {
    Ok("")
  } else {
    let valid = ref(true)
    let errorIdx = ref(0)
    let result = ref("")

    for i in 0 to length - 1 {
      if valid.contents {
        let code = Belt.Array.getUnsafe(codes, i)
        if code < 0 || code > 65535 {
          valid := false
          errorIdx := i
        } else {
          result := result.contents ++ Js.String2.fromCharCode(code)
        }
      }
    }

    if valid.contents {
      Ok(result.contents)
    } else {
      Error(`Invalid code point at position ${Belt.Int.toString(errorIdx.contents)}`)
    }
  }
}

/** Check if a string contains only ASCII characters (0-127) */
let isAscii = (str: string): bool => {
  let length = Js.String2.length(str)
  let valid = ref(true)

  for i in 0 to length - 1 {
    if valid.contents {
      let code = Js.String2.charCodeAt(str, i)->Belt.Float.toInt
      if code > 127 {
        valid := false
      }
    }
  }

  valid.contents
}

/** Check if a string contains only printable ASCII (32-126) */
let isPrintableAscii = (str: string): bool => {
  let length = Js.String2.length(str)
  let valid = ref(true)

  for i in 0 to length - 1 {
    if valid.contents {
      let code = Js.String2.charCodeAt(str, i)->Belt.Float.toInt
      if code < 32 || code > 126 {
        valid := false
      }
    }
  }

  valid.contents
}
