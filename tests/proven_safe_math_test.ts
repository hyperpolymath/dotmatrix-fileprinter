// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests for Proven_SafeMath module

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import the compiled ReScript module
import * as SafeMath from "../src/proven/Proven_SafeMath.res.js";

Deno.test("SafeMath.div - basic division", () => {
  const result = SafeMath.div(10, 2);
  assertExists(result);
  assertEquals(result, 5);
});

Deno.test("SafeMath.div - division by zero returns undefined", () => {
  const result = SafeMath.div(10, 0);
  assertEquals(result, undefined);
});

Deno.test("SafeMath.div - negative numbers", () => {
  assertEquals(SafeMath.div(-10, 2), -5);
  assertEquals(SafeMath.div(10, -2), -5);
  assertEquals(SafeMath.div(-10, -2), 5);
});

Deno.test("SafeMath.divOr - returns default on division by zero", () => {
  assertEquals(SafeMath.divOr(-1, 10, 0), -1);
  assertEquals(SafeMath.divOr(0, 10, 2), 5);
});

Deno.test("SafeMath.safeMod - basic modulo", () => {
  assertEquals(SafeMath.safeMod(10, 3), 1);
  assertEquals(SafeMath.safeMod(9, 3), 0);
});

Deno.test("SafeMath.safeMod - modulo by zero returns undefined", () => {
  assertEquals(SafeMath.safeMod(10, 0), undefined);
});

Deno.test("SafeMath.addChecked - basic addition", () => {
  assertEquals(SafeMath.addChecked(5, 3), 8);
  assertEquals(SafeMath.addChecked(-5, 3), -2);
  assertEquals(SafeMath.addChecked(0, 0), 0);
});

Deno.test("SafeMath.subChecked - basic subtraction", () => {
  assertEquals(SafeMath.subChecked(10, 3), 7);
  assertEquals(SafeMath.subChecked(3, 10), -7);
  assertEquals(SafeMath.subChecked(0, 0), 0);
});

Deno.test("SafeMath.mulChecked - basic multiplication", () => {
  assertEquals(SafeMath.mulChecked(5, 3), 15);
  assertEquals(SafeMath.mulChecked(-5, 3), -15);
  assertEquals(SafeMath.mulChecked(0, 100), 0);
});

Deno.test("SafeMath.absSafe - absolute value", () => {
  assertEquals(SafeMath.absSafe(5), 5);
  assertEquals(SafeMath.absSafe(-5), 5);
  assertEquals(SafeMath.absSafe(0), 0);
});

Deno.test("SafeMath.clamp - clamps values to range", () => {
  assertEquals(SafeMath.clamp(0, 10, 5), 5); // in range
  assertEquals(SafeMath.clamp(0, 10, -5), 0); // below range
  assertEquals(SafeMath.clamp(0, 10, 15), 10); // above range
  assertEquals(SafeMath.clamp(0, 10, 0), 0); // at lower bound
  assertEquals(SafeMath.clamp(0, 10, 10), 10); // at upper bound
});

Deno.test("SafeMath.powChecked - exponentiation", () => {
  assertEquals(SafeMath.powChecked(2, 0), 1);
  assertEquals(SafeMath.powChecked(2, 1), 2);
  assertEquals(SafeMath.powChecked(2, 3), 8);
  assertEquals(SafeMath.powChecked(2, 10), 1024);
  assertEquals(SafeMath.powChecked(3, 4), 81);
});

Deno.test("SafeMath.powChecked - negative exponent returns undefined", () => {
  assertEquals(SafeMath.powChecked(2, -1), undefined);
});

Deno.test("SafeMath.percentOf - percentage calculation", () => {
  assertEquals(SafeMath.percentOf(50, 200), 100);
  assertEquals(SafeMath.percentOf(25, 100), 25);
  assertEquals(SafeMath.percentOf(100, 50), 50);
});

Deno.test("SafeMath.asPercent - calculate percentage", () => {
  assertEquals(SafeMath.asPercent(50, 100), 50);
  assertEquals(SafeMath.asPercent(25, 100), 25);
  assertEquals(SafeMath.asPercent(1, 4), 25);
});

Deno.test("SafeMath.asPercent - division by zero returns undefined", () => {
  assertEquals(SafeMath.asPercent(50, 0), undefined);
});

Deno.test("SafeMath.inRange - range checking", () => {
  assertEquals(SafeMath.inRange(5, 0, 10), true);
  assertEquals(SafeMath.inRange(0, 0, 10), true); // at lower bound
  assertEquals(SafeMath.inRange(10, 0, 10), true); // at upper bound
  assertEquals(SafeMath.inRange(-1, 0, 10), false); // below
  assertEquals(SafeMath.inRange(11, 0, 10), false); // above
});

Deno.test("SafeMath.inRangeExcluding - range with exclusions", () => {
  // In range, not excluded
  assertEquals(SafeMath.inRangeExcluding(5, 0, 10, [3, 7]), true);
  // In range, but excluded
  assertEquals(SafeMath.inRangeExcluding(3, 0, 10, [3, 7]), false);
  assertEquals(SafeMath.inRangeExcluding(7, 0, 10, [3, 7]), false);
  // Out of range
  assertEquals(SafeMath.inRangeExcluding(11, 0, 10, [3, 7]), false);
  // Empty exclusion list
  assertEquals(SafeMath.inRangeExcluding(5, 0, 10, []), true);
});

Deno.test("SafeMath.fromString - string to int parsing", () => {
  assertEquals(SafeMath.fromString("42"), 42);
  assertEquals(SafeMath.fromString("-42"), -42);
  assertEquals(SafeMath.fromString("0"), 0);
  assertEquals(SafeMath.fromString("  123  "), 123); // with whitespace
});

Deno.test("SafeMath.fromString - invalid input returns undefined", () => {
  assertEquals(SafeMath.fromString(""), undefined);
  assertEquals(SafeMath.fromString("abc"), undefined);
  assertEquals(SafeMath.fromString("12.34"), undefined);
  assertEquals(SafeMath.fromString("12abc"), undefined);
});

Deno.test("SafeMath.fromStringInRange - parsing with range validation", () => {
  assertEquals(SafeMath.fromStringInRange("5", 0, 10), 5);
  assertEquals(SafeMath.fromStringInRange("0", 0, 10), 0);
  assertEquals(SafeMath.fromStringInRange("10", 0, 10), 10);
});

Deno.test("SafeMath.fromStringInRange - out of range returns undefined", () => {
  assertEquals(SafeMath.fromStringInRange("-1", 0, 10), undefined);
  assertEquals(SafeMath.fromStringInRange("11", 0, 10), undefined);
});

Deno.test("SafeMath.fromStringInRange - invalid input returns undefined", () => {
  assertEquals(SafeMath.fromStringInRange("abc", 0, 10), undefined);
});
