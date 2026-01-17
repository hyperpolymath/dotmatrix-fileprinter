// SPDX-License-Identifier: PMPL-1.0
// SPDX-FileCopyrightText: 2025 Hyperpolymath

/**
 * SafeMath - Arithmetic operations that cannot crash.
 *
 * All operations handle edge cases like division by zero, overflow, and underflow
 * without throwing exceptions. Operations return None on failure.
 */

/** Safe division that returns None on division by zero */
let div = (numerator: int, denominator: int): option<int> => {
  if denominator == 0 {
    None
  } else {
    Some(numerator / denominator)
  }
}

/** Safe division with default value */
let divOr = (default: int, numerator: int, denominator: int): int => {
  switch div(numerator, denominator) {
  | Some(v) => v
  | None => default
  }
}

/** Safe modulo that returns None on division by zero */
let safeMod = (numerator: int, denominator: int): option<int> => {
  if denominator == 0 {
    None
  } else {
    Some(Pervasives.mod(numerator, denominator))
  }
}

/** Addition with overflow detection */
let addChecked = (a: int, b: int): option<int> => {
  let result = a + b
  // Check for overflow
  if (a > 0 && b > 0 && result < 0) || (a < 0 && b < 0 && result > 0) {
    None
  } else {
    Some(result)
  }
}

/** Subtraction with underflow detection */
let subChecked = (a: int, b: int): option<int> => {
  let result = a - b
  // Check for underflow
  if (a > 0 && b < 0 && result < 0) || (a < 0 && b > 0 && result > 0) {
    None
  } else {
    Some(result)
  }
}

/** Multiplication with overflow detection */
let mulChecked = (a: int, b: int): option<int> => {
  if a == 0 || b == 0 {
    Some(0)
  } else {
    let result = a * b
    if result / a != b {
      None
    } else {
      Some(result)
    }
  }
}

/** Safe absolute value that handles MIN_INT correctly */
let absSafe = (n: int): option<int> => {
  if n == min_int {
    None
  } else if n < 0 {
    Some(-n)
  } else {
    Some(n)
  }
}

/** Clamp a value to range [lo, hi] */
let clamp = (lo: int, hi: int, value: int): int => {
  if value < lo {
    lo
  } else if value > hi {
    hi
  } else {
    value
  }
}

/** Integer exponentiation with overflow detection */
let rec powChecked = (base: int, exp: int): option<int> => {
  if exp < 0 {
    None
  } else if exp == 0 {
    Some(1)
  } else if exp == 1 {
    Some(base)
  } else {
    switch powChecked(base, exp / 2) {
    | None => None
    | Some(half) =>
      switch mulChecked(half, half) {
      | None => None
      | Some(squared) =>
        if Pervasives.mod(exp, 2) == 0 {
          Some(squared)
        } else {
          mulChecked(squared, base)
        }
      }
    }
  }
}

/** Calculate percentage safely */
let percentOf = (percent: int, total: int): option<int> => {
  switch mulChecked(percent, total) {
  | None => None
  | Some(product) => div(product, 100)
  }
}

/** Calculate what percentage part is of whole */
let asPercent = (part: int, whole: int): option<int> => {
  switch mulChecked(part, 100) {
  | None => None
  | Some(scaled) => div(scaled, whole)
  }
}

/** Check if a value is within a range [lo, hi] (inclusive) */
let inRange = (value: int, lo: int, hi: int): bool => {
  value >= lo && value <= hi
}

/** Check if a value is within a range, excluding specific values */
let inRangeExcluding = (value: int, lo: int, hi: int, excluded: array<int>): bool => {
  if !inRange(value, lo, hi) {
    false
  } else {
    !Belt.Array.some(excluded, e => e == value)
  }
}

/** Safe integer parsing from string, returns None on invalid input */
let fromString = (str: string): option<int> => {
  let trimmed = Js.String2.trim(str)
  if Js.String2.length(trimmed) == 0 {
    None
  } else {
    // Check for valid integer format
    let isValid = Js.Re.test_(%re("/^-?\\d+$/"), trimmed)
    if !isValid {
      None
    } else {
      let parsed = Belt.Int.fromString(trimmed)
      parsed
    }
  }
}

/** Safe integer parsing with range validation */
let fromStringInRange = (str: string, lo: int, hi: int): option<int> => {
  switch fromString(str) {
  | None => None
  | Some(value) =>
    if inRange(value, lo, hi) {
      Some(value)
    } else {
      None
    }
  }
}
