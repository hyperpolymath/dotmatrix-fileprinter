// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests for Proven_SafeHex module

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import the compiled ReScript module
import * as SafeHex from "../src/proven/Proven_SafeHex.res.js";

// Helper to check Result type - uses unknown to handle varying payload types
function isOk<T>(result: { TAG: string; _0: unknown }): result is { TAG: "Ok"; _0: T } {
  return result.TAG === "Ok";
}

function isError<E>(result: { TAG: string; _0: unknown }): result is { TAG: "Error"; _0: E } {
  return result.TAG === "Error";
}

// ============ encode tests ============

Deno.test("SafeHex.encode - basic encoding", () => {
  const result = SafeHex.encode([72, 101, 108, 108, 111]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "48656c6c6f"); // "Hello" in hex
  }
});

Deno.test("SafeHex.encode - empty array returns empty string", () => {
  const result = SafeHex.encode([]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "");
  }
});

Deno.test("SafeHex.encode - handles edge cases", () => {
  const result = SafeHex.encode([0, 255]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "00ff");
  }
});

Deno.test("SafeHex.encode - single byte", () => {
  const result = SafeHex.encode([42]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "2a");
  }
});

// ============ encodeUppercase tests ============

Deno.test("SafeHex.encodeUppercase - uppercase encoding", () => {
  const result = SafeHex.encodeUppercase([72, 101, 108, 108, 111]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "48656C6C6F");
  }
});

// ============ encodeSpaced tests ============

Deno.test("SafeHex.encodeSpaced - spaced encoding", () => {
  const result = SafeHex.encodeSpaced([72, 101, 108, 108, 111]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "48 65 6c 6c 6f");
  }
});

Deno.test("SafeHex.encodeSpaced - single byte no trailing space", () => {
  const result = SafeHex.encodeSpaced([42]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "2a");
  }
});

Deno.test("SafeHex.encodeSpaced - empty array", () => {
  const result = SafeHex.encodeSpaced([]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "");
  }
});

// ============ encodeSpacedUppercase tests ============

Deno.test("SafeHex.encodeSpacedUppercase - uppercase spaced encoding", () => {
  const result = SafeHex.encodeSpacedUppercase([72, 101, 108, 108, 111]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "48 65 6C 6C 6F");
  }
});

// ============ decode tests ============

Deno.test("SafeHex.decode - basic decoding", () => {
  const result = SafeHex.decode("48656c6c6f");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("SafeHex.decode - uppercase input", () => {
  const result = SafeHex.decode("48656C6C6F");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("SafeHex.decode - mixed case input", () => {
  const result = SafeHex.decode("48656C6c6F");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("SafeHex.decode - empty string returns empty array", () => {
  const result = SafeHex.decode("");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, []);
  }
});

Deno.test("SafeHex.decode - whitespace is trimmed", () => {
  const result = SafeHex.decode("  48656c6c6f  ");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("SafeHex.decode - odd length returns error", () => {
  const result = SafeHex.decode("48656c6c6");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

Deno.test("SafeHex.decode - invalid characters return error", () => {
  const result = SafeHex.decode("48656c6c6g");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

// ============ encodeString tests ============

Deno.test("SafeHex.encodeString - encodes string to hex", () => {
  assertEquals(SafeHex.encodeString("Hello"), "48656c6c6f");
  assertEquals(SafeHex.encodeString(""), "");
  assertEquals(SafeHex.encodeString("A"), "41");
});

// ============ decodeToString tests ============

Deno.test("SafeHex.decodeToString - decodes hex to string", () => {
  const result = SafeHex.decodeToString("48656c6c6f");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "Hello");
  }
});

Deno.test("SafeHex.decodeToString - empty hex returns empty string", () => {
  const result = SafeHex.decodeToString("");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "");
  }
});

// ============ isValidHex tests ============

Deno.test("SafeHex.isValidHex - valid hex strings", () => {
  assertEquals(SafeHex.isValidHex("48656c6c6f"), true);
  assertEquals(SafeHex.isValidHex("ABCDEF"), true);
  assertEquals(SafeHex.isValidHex("abcdef"), true);
  assertEquals(SafeHex.isValidHex("0123456789"), true);
  assertEquals(SafeHex.isValidHex("00"), true);
});

Deno.test("SafeHex.isValidHex - invalid hex strings", () => {
  assertEquals(SafeHex.isValidHex(""), false); // empty
  assertEquals(SafeHex.isValidHex("abc"), false); // odd length
  assertEquals(SafeHex.isValidHex("ghij"), false); // invalid chars
  assertEquals(SafeHex.isValidHex("12 34"), false); // spaces
});

// ============ constantTimeEqual tests ============

Deno.test("SafeHex.constantTimeEqual - equal strings", () => {
  assertEquals(SafeHex.constantTimeEqual("48656c6c6f", "48656c6c6f"), true);
  assertEquals(SafeHex.constantTimeEqual("ABCDEF", "abcdef"), true); // case insensitive
  assertEquals(SafeHex.constantTimeEqual("", ""), true);
});

Deno.test("SafeHex.constantTimeEqual - unequal strings", () => {
  assertEquals(SafeHex.constantTimeEqual("48656c6c6f", "48656c6c70"), false);
  assertEquals(SafeHex.constantTimeEqual("abc", "abcd"), false);
  assertEquals(SafeHex.constantTimeEqual("abc", "def"), false);
});

Deno.test("SafeHex.constantTimeEqual - whitespace handling", () => {
  assertEquals(SafeHex.constantTimeEqual("  abc  ", "abc"), true);
});

// ============ constantTimeEqualBytes tests ============

Deno.test("SafeHex.constantTimeEqualBytes - equal byte arrays", () => {
  assertEquals(SafeHex.constantTimeEqualBytes([1, 2, 3], [1, 2, 3]), true);
  assertEquals(SafeHex.constantTimeEqualBytes([], []), true);
  assertEquals(SafeHex.constantTimeEqualBytes([0], [0]), true);
});

Deno.test("SafeHex.constantTimeEqualBytes - unequal byte arrays", () => {
  assertEquals(SafeHex.constantTimeEqualBytes([1, 2, 3], [1, 2, 4]), false);
  assertEquals(SafeHex.constantTimeEqualBytes([1, 2], [1, 2, 3]), false);
  assertEquals(SafeHex.constantTimeEqualBytes([1], [2]), false);
});

// ============ toLowercase / toUppercase tests ============

Deno.test("SafeHex.toLowercase - converts to lowercase", () => {
  const result = SafeHex.toLowercase("ABCDEF");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "abcdef");
  }
});

Deno.test("SafeHex.toUppercase - converts to uppercase", () => {
  const result = SafeHex.toUppercase("abcdef");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "ABCDEF");
  }
});

// ============ byteLength tests ============

Deno.test("SafeHex.byteLength - calculates byte length", () => {
  const result = SafeHex.byteLength("48656c6c6f");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, 5); // 10 hex chars = 5 bytes
  }
});

Deno.test("SafeHex.byteLength - empty returns 0", () => {
  const result = SafeHex.byteLength("");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, 0);
  }
});

Deno.test("SafeHex.byteLength - odd length returns error", () => {
  const result = SafeHex.byteLength("abc");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

// ============ padToByteLength tests ============

Deno.test("SafeHex.padToByteLength - pads with leading zeros", () => {
  const result = SafeHex.padToByteLength("ff", 4);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "000000ff");
  }
});

Deno.test("SafeHex.padToByteLength - no padding needed", () => {
  const result = SafeHex.padToByteLength("aabbccdd", 4);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "aabbccdd");
  }
});

Deno.test("SafeHex.padToByteLength - target smaller than input returns error", () => {
  const result = SafeHex.padToByteLength("aabbccdd", 2);
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

// ============ xorHex tests ============

Deno.test("SafeHex.xorHex - XOR two hex strings", () => {
  const result = SafeHex.xorHex("ff00", "00ff");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "ffff");
  }
});

Deno.test("SafeHex.xorHex - XOR with self is zero", () => {
  const result = SafeHex.xorHex("abcd", "abcd");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "0000");
  }
});

Deno.test("SafeHex.xorHex - different lengths return error", () => {
  const result = SafeHex.xorHex("aabb", "aabbcc");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

// ============ round-trip tests ============

Deno.test("SafeHex round-trip - encode then decode", () => {
  const original = [0, 127, 255, 42, 100];
  const encodeResult = SafeHex.encode(original);
  assertExists(encodeResult);
  if (isOk(encodeResult)) {
    const decodeResult = SafeHex.decode(encodeResult._0);
    assertExists(decodeResult);
    if (isOk(decodeResult)) {
      assertEquals(decodeResult._0, original);
    }
  }
});

Deno.test("SafeHex round-trip - encodeString then decodeToString", () => {
  const original = "Hello World!";
  const encoded = SafeHex.encodeString(original);
  const decoded = SafeHex.decodeToString(encoded);
  assertExists(decoded);
  if (isOk(decoded)) {
    assertEquals(decoded._0, original);
  }
});
