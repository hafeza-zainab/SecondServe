import assert from "node:assert/strict";
import { test } from "node:test";
import { formatIst, parseIstLocal } from "../lib/time";

test("datetime-local values store the same instant in UTC and IST processes", () => {
  assert.equal(
    parseIstLocal("2026-11-13T12:45").toISOString(),
    "2026-11-13T07:15:00.000Z"
  );
});

test("formats dates in en-IN using Asia/Kolkata", () => {
  assert.equal(
    formatIst(new Date("2026-11-13T00:00:00.000Z")),
    "13 Nov 2026, 5:30 am"
  );
});

test("parses and formats midnight at the IST day boundary", () => {
  const midnight = parseIstLocal("2026-11-13T00:00");
  assert.equal(midnight.toISOString(), "2026-11-12T18:30:00.000Z");
  assert.equal(formatIst(midnight), "13 Nov 2026, 12:00 am");
});
