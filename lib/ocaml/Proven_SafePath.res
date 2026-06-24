// SPDX-License-Identifier: MPL-2.0
// SPDX-FileCopyrightText: 2025 Hyperpolymath

/**
 * SafePath - Filesystem path operations that cannot crash.
 */

/** Check if a path contains directory traversal sequences */
let hasTraversal = (path: string): bool => {
  String.includes(path, "..") ||
  String.includes(path, "~") ||
  String.startsWith(path, "/") && String.includes(path, "..")
}

/** Check if a path contains a null byte
 *
 * SECURITY: Null bytes can truncate paths in C-based filesystem APIs,
 * allowing an attacker to bypass extension checks (e.g. "safe.txt\0.sh").
 */
let hasNullByte = (path: string): bool => {
  String.includes(path, "\x00")
}

/** Check if a path is safe
 *
 * A path is safe if it:
 * - contains no parent directory traversal (..)
 * - contains no home directory expansion (~)
 * - contains no null bytes
 */
let isSafe = (path: string): bool => {
  !hasTraversal(path) && !hasNullByte(path)
}

/** Sanitize a filename by removing dangerous characters */
let sanitizeFilename = (filename: string): string => {
  filename
  ->String.replaceRegExp(%re("/\\.\\./g"), "_")
  ->String.replaceRegExp(%re("/[\\/\\\\]/g"), "_")
  ->String.replaceRegExp(%re("/[\\x00-\\x1f]/g"), "")
  ->String.replaceRegExp(%re("/[<>:\"\\|\\?\\*]/g"), "_")
}

/** Safely join path components, rejecting traversal attempts */
let safeJoin = (base: string, parts: array<string>): option<string> => {
  let hasUnsafe = parts->Array.some(part => hasTraversal(part))
  if hasUnsafe {
    None
  } else {
    let result = ref(base)
    parts->Array.forEach(part => {
      let sanitized = sanitizeFilename(part)
      let base = result.contents
      if String.endsWith(base, "/") {
        result := base ++ sanitized
      } else {
        result := base ++ "/" ++ sanitized
      }
    })
    Some(result.contents)
  }
}
