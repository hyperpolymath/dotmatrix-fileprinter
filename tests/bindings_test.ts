// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests for Bindings utility functions
// Note: This only tests utility functions, not Tauri IPC commands

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import the compiled ReScript module
import * as Bindings from "../src/Bindings.res.js";

// Helper to check Result type
function isOk<T>(result: { TAG: string; _0: T }): result is { TAG: "Ok"; _0: T } {
  return result.TAG === "Ok";
}

// ============ stringToBytes tests ============

Deno.test("Bindings.stringToBytes - converts ASCII string to bytes", () => {
  const result = Bindings.stringToBytes("Hello");
  assertEquals(result, [72, 101, 108, 108, 111]);
});

Deno.test("Bindings.stringToBytes - empty string returns empty array", () => {
  assertEquals(Bindings.stringToBytes(""), []);
});

Deno.test("Bindings.stringToBytes - special characters", () => {
  assertEquals(Bindings.stringToBytes(" "), [32]); // space
  assertEquals(Bindings.stringToBytes("\n"), [10]); // newline
  assertEquals(Bindings.stringToBytes("\t"), [9]); // tab
});

Deno.test("Bindings.stringToBytes - non-ASCII returns empty", () => {
  // Non-ASCII characters should return empty array
  const result = Bindings.stringToBytes("日本語");
  assertEquals(result, []);
});

// ============ bytesToString tests ============

Deno.test("Bindings.bytesToString - converts bytes to string", () => {
  assertEquals(Bindings.bytesToString([72, 101, 108, 108, 111]), "Hello");
});

Deno.test("Bindings.bytesToString - empty array returns empty string", () => {
  assertEquals(Bindings.bytesToString([]), "");
});

Deno.test("Bindings.bytesToString - handles full byte range", () => {
  assertEquals(Bindings.bytesToString([0, 127, 255]), "\x00\x7F\xFF");
});

// ============ isValidByte tests ============

Deno.test("Bindings.isValidByte - valid ASCII bytes (0-127)", () => {
  assertEquals(Bindings.isValidByte(0), true);
  assertEquals(Bindings.isValidByte(65), true); // 'A'
  assertEquals(Bindings.isValidByte(127), true);
});

Deno.test("Bindings.isValidByte - forbidden bytes", () => {
  assertEquals(Bindings.isValidByte(160), false); // NBSP
  assertEquals(Bindings.isValidByte(194), false); // UTF-8 marker
});

Deno.test("Bindings.isValidByte - out of range", () => {
  assertEquals(Bindings.isValidByte(-1), false);
  assertEquals(Bindings.isValidByte(128), false);
  assertEquals(Bindings.isValidByte(255), false);
});

// ============ isValidPath tests ============

Deno.test("Bindings.isValidPath - safe paths", () => {
  assertEquals(Bindings.isValidPath("dist/substrate.bin"), true);
  assertEquals(Bindings.isValidPath("output.txt"), true);
  assertEquals(Bindings.isValidPath("foo/bar/baz"), true);
});

Deno.test("Bindings.isValidPath - unsafe paths with traversal", () => {
  assertEquals(Bindings.isValidPath("../secret"), false);
  assertEquals(Bindings.isValidPath("foo/../bar"), false);
  assertEquals(Bindings.isValidPath("~/config"), false);
});

// ============ parseByteString tests ============

Deno.test("Bindings.parseByteString - parses comma-separated bytes", () => {
  const result = Bindings.parseByteString("72, 101, 108, 108, 111");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("Bindings.parseByteString - handles extra whitespace", () => {
  const result = Bindings.parseByteString("  72 ,  101 , 108  ");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108]);
  }
});

Deno.test("Bindings.parseByteString - single byte", () => {
  const result = Bindings.parseByteString("42");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [42]);
  }
});

Deno.test("Bindings.parseByteString - invalid input returns error", () => {
  const result = Bindings.parseByteString("not a number");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

Deno.test("Bindings.parseByteString - invalid byte value returns error", () => {
  const result = Bindings.parseByteString("72, 160, 108"); // 160 is forbidden
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

Deno.test("Bindings.parseByteString - out of range returns error", () => {
  const result = Bindings.parseByteString("72, 300, 108"); // 300 > 127
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

// ============ bytesToHex tests ============

Deno.test("Bindings.bytesToHex - formats with spaces", () => {
  assertEquals(Bindings.bytesToHex([72, 101, 108, 108, 111]), "48 65 6c 6c 6f");
});

Deno.test("Bindings.bytesToHex - empty array returns empty string", () => {
  assertEquals(Bindings.bytesToHex([]), "");
});

Deno.test("Bindings.bytesToHex - single byte", () => {
  assertEquals(Bindings.bytesToHex([255]), "ff");
  assertEquals(Bindings.bytesToHex([0]), "00");
});

// ============ bytesToHexCompact tests ============

Deno.test("Bindings.bytesToHexCompact - no spaces", () => {
  assertEquals(Bindings.bytesToHexCompact([72, 101, 108, 108, 111]), "48656c6c6f");
});

Deno.test("Bindings.bytesToHexCompact - empty array", () => {
  assertEquals(Bindings.bytesToHexCompact([]), "");
});

// ============ hexToBytes tests ============

Deno.test("Bindings.hexToBytes - decodes hex string", () => {
  const result = Bindings.hexToBytes("48656c6c6f");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("Bindings.hexToBytes - handles uppercase", () => {
  const result = Bindings.hexToBytes("48656C6C6F");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("Bindings.hexToBytes - empty string returns empty array", () => {
  const result = Bindings.hexToBytes("");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, []);
  }
});

Deno.test("Bindings.hexToBytes - odd length returns error", () => {
  const result = Bindings.hexToBytes("abc");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

Deno.test("Bindings.hexToBytes - invalid chars returns error", () => {
  const result = Bindings.hexToBytes("ghij");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

// ============ Round-trip tests ============

Deno.test("Bindings round-trip - string to bytes to string", () => {
  const original = "Hello World!";
  const bytes = Bindings.stringToBytes(original);
  const result = Bindings.bytesToString(bytes);
  assertEquals(result, original);
});

Deno.test("Bindings round-trip - bytes to hex to bytes", () => {
  const original = [72, 101, 108, 108, 111];
  const hex = Bindings.bytesToHexCompact(original);
  const result = Bindings.hexToBytes(hex);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, original);
  }
});

Deno.test("Bindings round-trip - parseByteString to bytesToHex", () => {
  const input = "72, 101, 108, 108, 111";
  const parseResult = Bindings.parseByteString(input);
  assertExists(parseResult);
  if (isOk(parseResult)) {
    const hex = Bindings.bytesToHex(parseResult._0);
    assertEquals(hex, "48 65 6c 6c 6f");
  }
});

// ============ Integration tests ============

Deno.test("Bindings integration - byte constraints match constants", () => {
  // Test that the constraints from Types are properly applied
  // Valid range is 0-127, excluding 160 and 194

  // All values 0-127 should be valid (except 160, 194 which are > 127 anyway)
  for (let i = 0; i <= 127; i++) {
    assertEquals(Bindings.isValidByte(i), true, `Byte ${i} should be valid`);
  }

  // Values 128-255 should be invalid
  for (let i = 128; i <= 255; i++) {
    assertEquals(Bindings.isValidByte(i), false, `Byte ${i} should be invalid`);
  }
});

Deno.test("Bindings integration - hex round-trip preserves all bytes", () => {
  // Test that encoding then decoding preserves the original bytes
  const testCases = [
    [0],
    [127],
    [0, 64, 127],
    [72, 101, 108, 108, 111], // "Hello"
  ];

  for (const original of testCases) {
    const hex = Bindings.bytesToHexCompact(original);
    const result = Bindings.hexToBytes(hex);
    assertExists(result);
    if (isOk(result)) {
      assertEquals(result._0, original, `Round-trip failed for ${original}`);
    }
  }
});
