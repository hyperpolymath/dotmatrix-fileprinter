// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests for Proven_SafeString module

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import the compiled ReScript module
import * as SafeString from "../src/proven/Proven_SafeString.res.js";

// Helper to check Result type
function isOk<T>(result: { TAG: string; _0: T }): result is { TAG: "Ok"; _0: T } {
  return result.TAG === "Ok";
}

Deno.test("SafeString.escapeSql - escapes single quotes", () => {
  assertEquals(SafeString.escapeSql("test"), "test");
  assertEquals(SafeString.escapeSql("it's"), "it''s");
  assertEquals(SafeString.escapeSql("'quoted'"), "''quoted''");
  assertEquals(SafeString.escapeSql(""), "");
});

Deno.test("SafeString.escapeHtml - escapes HTML entities", () => {
  assertEquals(SafeString.escapeHtml("test"), "test");
  assertEquals(SafeString.escapeHtml("<div>"), "&lt;div&gt;");
  assertEquals(SafeString.escapeHtml("a & b"), "a &amp; b");
  assertEquals(SafeString.escapeHtml('"quoted"'), "&quot;quoted&quot;");
  assertEquals(SafeString.escapeHtml("it's"), "it&#x27;s");
  assertEquals(
    SafeString.escapeHtml('<script>alert("xss")</script>'),
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
  );
});

Deno.test("SafeString.escapeJs - escapes JavaScript strings", () => {
  assertEquals(SafeString.escapeJs("test"), "test");
  assertEquals(SafeString.escapeJs('say "hello"'), 'say \\"hello\\"');
  assertEquals(SafeString.escapeJs("it's"), "it\\'s");
  assertEquals(SafeString.escapeJs("line1\nline2"), "line1\\nline2");
  assertEquals(SafeString.escapeJs("tab\there"), "tab\\there");
  assertEquals(SafeString.escapeJs("path\\to\\file"), "path\\\\to\\\\file");
});

Deno.test("SafeString.toCodePoints - converts ASCII string to code points", () => {
  const result = SafeString.toCodePoints("Hello");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [72, 101, 108, 108, 111]);
  }
});

Deno.test("SafeString.toCodePoints - empty string returns empty array", () => {
  const result = SafeString.toCodePoints("");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, []);
  }
});

Deno.test("SafeString.toCodePoints - extended ASCII works", () => {
  const result = SafeString.toCodePoints("\x00\x7F\xFF");
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, [0, 127, 255]);
  }
});

Deno.test("SafeString.toCodePoints - non-ASCII returns error", () => {
  const result = SafeString.toCodePoints("Hello 世界");
  assertExists(result);
  assertEquals(result.TAG, "Error");
});

Deno.test("SafeString.fromCodePoints - converts code points to string", () => {
  const result = SafeString.fromCodePoints([72, 101, 108, 108, 111]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "Hello");
  }
});

Deno.test("SafeString.fromCodePoints - empty array returns empty string", () => {
  const result = SafeString.fromCodePoints([]);
  assertExists(result);
  if (isOk(result)) {
    assertEquals(result._0, "");
  }
});

Deno.test("SafeString.fromCodePoints - invalid code points return error", () => {
  const result = SafeString.fromCodePoints([-1]);
  assertExists(result);
  assertEquals(result.TAG, "Error");

  const result2 = SafeString.fromCodePoints([65536]);
  assertExists(result2);
  assertEquals(result2.TAG, "Error");
});

Deno.test("SafeString.isAscii - detects ASCII strings", () => {
  assertEquals(SafeString.isAscii("Hello"), true);
  assertEquals(SafeString.isAscii("Hello World 123!"), true);
  assertEquals(SafeString.isAscii(""), true);
  assertEquals(SafeString.isAscii("\x00\x7F"), true); // 0-127 range
});

Deno.test("SafeString.isAscii - rejects non-ASCII", () => {
  assertEquals(SafeString.isAscii("café"), false);
  assertEquals(SafeString.isAscii("日本語"), false);
  assertEquals(SafeString.isAscii("hello\x80"), false); // 128 is non-ASCII
});

Deno.test("SafeString.isPrintableAscii - detects printable ASCII", () => {
  assertEquals(SafeString.isPrintableAscii("Hello World!"), true);
  assertEquals(SafeString.isPrintableAscii("abc123"), true);
  assertEquals(SafeString.isPrintableAscii(" "), true); // space is printable
  assertEquals(SafeString.isPrintableAscii("~"), true); // tilde is printable (126)
});

Deno.test("SafeString.isPrintableAscii - rejects non-printable", () => {
  assertEquals(SafeString.isPrintableAscii(""), true); // empty is technically printable
  assertEquals(SafeString.isPrintableAscii("\t"), false); // tab is not printable
  assertEquals(SafeString.isPrintableAscii("\n"), false); // newline is not printable
  assertEquals(SafeString.isPrintableAscii("\x00"), false); // null is not printable
  assertEquals(SafeString.isPrintableAscii("\x1F"), false); // 31 is not printable
  assertEquals(SafeString.isPrintableAscii("\x7F"), false); // DEL is not printable
});

Deno.test("SafeString round-trip - toCodePoints then fromCodePoints", () => {
  const original = "Hello World!";
  const codePointsResult = SafeString.toCodePoints(original);
  assertExists(codePointsResult);
  if (isOk(codePointsResult)) {
    const stringResult = SafeString.fromCodePoints(codePointsResult._0);
    assertExists(stringResult);
    if (isOk(stringResult)) {
      assertEquals(stringResult._0, original);
    }
  }
});
