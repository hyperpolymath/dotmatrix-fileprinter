// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests for Proven_SafePath module

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import the compiled ReScript module
import * as SafePath from "../src/proven/Proven_SafePath.res.js";

// ============ hasTraversal tests ============

Deno.test("SafePath.hasTraversal - detects parent directory traversal", () => {
  assertEquals(SafePath.hasTraversal(".."), true);
  assertEquals(SafePath.hasTraversal("../foo"), true);
  assertEquals(SafePath.hasTraversal("foo/../bar"), true);
  assertEquals(SafePath.hasTraversal("foo/.."), true);
  assertEquals(SafePath.hasTraversal("/etc/../passwd"), true);
});

Deno.test("SafePath.hasTraversal - detects home directory expansion", () => {
  assertEquals(SafePath.hasTraversal("~"), true);
  assertEquals(SafePath.hasTraversal("~/foo"), true);
  assertEquals(SafePath.hasTraversal("foo/~"), true);
});

Deno.test("SafePath.hasTraversal - safe paths return false", () => {
  assertEquals(SafePath.hasTraversal("foo/bar"), false);
  assertEquals(SafePath.hasTraversal("foo.txt"), false);
  assertEquals(SafePath.hasTraversal("path/to/file.bin"), false);
  assertEquals(SafePath.hasTraversal(""), false);
  assertEquals(SafePath.hasTraversal("some-file"), false);
});

Deno.test("SafePath.hasTraversal - dots in filenames are ok", () => {
  assertEquals(SafePath.hasTraversal(".gitignore"), false);
  assertEquals(SafePath.hasTraversal("file.tar.gz"), false);
  assertEquals(SafePath.hasTraversal(".hidden"), false);
});

// ============ isSafe tests ============

Deno.test("SafePath.isSafe - safe paths", () => {
  assertEquals(SafePath.isSafe("foo/bar"), true);
  assertEquals(SafePath.isSafe("dist/substrate.bin"), true);
  assertEquals(SafePath.isSafe("output.txt"), true);
  assertEquals(SafePath.isSafe(".hidden"), true);
  assertEquals(SafePath.isSafe("path/to/file.bin"), true);
});

Deno.test("SafePath.isSafe - unsafe paths with traversal", () => {
  assertEquals(SafePath.isSafe("../secret"), false);
  assertEquals(SafePath.isSafe("foo/../../../etc/passwd"), false);
  assertEquals(SafePath.isSafe("~/.ssh/id_rsa"), false);
  assertEquals(SafePath.isSafe("~/"), false);
});

Deno.test("SafePath.isSafe - empty path is safe", () => {
  assertEquals(SafePath.isSafe(""), true);
});

// ============ sanitizeFilename tests ============

Deno.test("SafePath.sanitizeFilename - removes traversal sequences", () => {
  const result = SafePath.sanitizeFilename("../foo");
  assertEquals(result.includes(".."), false);
});

Deno.test("SafePath.sanitizeFilename - replaces path separators", () => {
  const result = SafePath.sanitizeFilename("foo/bar");
  assertEquals(result.includes("/"), false);

  const result2 = SafePath.sanitizeFilename("foo\\bar");
  assertEquals(result2.includes("\\"), false);
});

Deno.test("SafePath.sanitizeFilename - removes control characters", () => {
  const result = SafePath.sanitizeFilename("foo\x00bar");
  assertEquals(result.includes("\x00"), false);
});

Deno.test("SafePath.sanitizeFilename - replaces dangerous characters", () => {
  const result = SafePath.sanitizeFilename('file<>:"|?*.txt');
  assertEquals(result.includes("<"), false);
  assertEquals(result.includes(">"), false);
  assertEquals(result.includes(":"), false);
  assertEquals(result.includes('"'), false);
  assertEquals(result.includes("|"), false);
  assertEquals(result.includes("?"), false);
  assertEquals(result.includes("*"), false);
});

Deno.test("SafePath.sanitizeFilename - safe names unchanged", () => {
  assertEquals(SafePath.sanitizeFilename("file.txt"), "file.txt");
  assertEquals(SafePath.sanitizeFilename("document"), "document");
  assertEquals(SafePath.sanitizeFilename("file-name_123"), "file-name_123");
});

// ============ safeJoin tests ============

Deno.test("SafePath.safeJoin - joins safe paths", () => {
  const result = SafePath.safeJoin("base", ["foo", "bar"]);
  assertEquals(result, "base/foo/bar");
});

Deno.test("SafePath.safeJoin - single part", () => {
  const result = SafePath.safeJoin("base", ["file.txt"]);
  assertEquals(result, "base/file.txt");
});

Deno.test("SafePath.safeJoin - empty parts", () => {
  const result = SafePath.safeJoin("base", []);
  assertEquals(result, "base");
});

Deno.test("SafePath.safeJoin - base with trailing slash", () => {
  const result = SafePath.safeJoin("base/", ["foo"]);
  assertEquals(result, "base/foo");
});

Deno.test("SafePath.safeJoin - rejects traversal in parts", () => {
  const result = SafePath.safeJoin("base", ["../secret"]);
  assertEquals(result, undefined);
});

Deno.test("SafePath.safeJoin - rejects home expansion in parts", () => {
  const result = SafePath.safeJoin("base", ["~/secret"]);
  assertEquals(result, undefined);
});

Deno.test("SafePath.safeJoin - sanitizes filenames in parts", () => {
  const result = SafePath.safeJoin("base", ["foo/bar"]);
  // The filename should be sanitized (slashes replaced)
  if (result !== undefined) {
    assertEquals(result.includes("//"), false);
  }
});

// ============ Security scenarios ============

Deno.test("SafePath security - common attack patterns blocked", () => {
  // Path traversal attacks
  assertEquals(SafePath.isSafe("../../../../etc/passwd"), false);

  // Home directory attacks
  assertEquals(SafePath.isSafe("~/.ssh/authorized_keys"), false);
  assertEquals(SafePath.isSafe("~/../../etc/passwd"), false);
});

Deno.test("SafePath security - safe relative paths allowed", () => {
  assertEquals(SafePath.isSafe("dist/output.bin"), true);
  assertEquals(SafePath.isSafe("subfolder/nested/file.txt"), true);
});

Deno.test("SafePath security - safeJoin blocks attacks", () => {
  // Even if base is unsafe, parts with traversal are blocked
  assertEquals(SafePath.safeJoin("/safe", ["../etc/passwd"]), undefined);
  assertEquals(SafePath.safeJoin("/safe", ["foo", "../bar"]), undefined);
  assertEquals(SafePath.safeJoin("/safe", ["~/.ssh"]), undefined);
});
