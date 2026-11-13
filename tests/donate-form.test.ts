import assert from "node:assert/strict";
import { test } from "node:test";
import { donateValidationDestination } from "../lib/donate-form";

test("donate validation redirect preserves entered form values", () => {
  const destination = donateValidationDestination("order", {
    title: "Vegetable curry",
    foodType: "Cooked meals",
    quantityKg: "12.5",
    pickupStart: "2026-11-14T10:00",
    pickupEnd: "2026-11-14T09:00",
    locationText: "Hostel kitchen"
  });
  const params = new URL(destination, "http://localhost").searchParams;

  assert.equal(params.get("error"), "order");
  assert.equal(params.get("title"), "Vegetable curry");
  assert.equal(params.get("foodType"), "Cooked meals");
  assert.equal(params.get("quantityKg"), "12.5");
  assert.equal(params.get("pickupStart"), "2026-11-14T10:00");
  assert.equal(params.get("pickupEnd"), "2026-11-14T09:00");
  assert.equal(params.get("locationText"), "Hostel kitchen");
});

test("donate validation redirect bounds preserved invalid values", () => {
  const destination = donateValidationDestination("titleTooLong", {
    title: "x".repeat(10_000),
    locationText: "y".repeat(10_000)
  });
  const params = new URL(destination, "http://localhost").searchParams;

  assert.equal(params.get("title")?.length, 81);
  assert.equal(params.get("locationText")?.length, 121);
});
