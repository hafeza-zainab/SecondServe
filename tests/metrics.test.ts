import assert from "node:assert/strict";
import { test } from "node:test";
import { CLAIMED, EXPIRED, PICKED_UP } from "../lib/constants";
import { calculateImpactMetrics } from "../lib/metrics";

const now = new Date("2026-11-13T12:00:00.000Z");

test("impact metrics handle empty data without dividing by zero", () => {
  const metrics = calculateImpactMetrics([], [], now);

  assert.equal(metrics.pickedUpKg, 0);
  assert.equal(metrics.claimedKg, 0);
  assert.equal(metrics.claimRate, null);
  assert.equal(metrics.medianClaimHours, null);
  assert.equal(metrics.hasClaims, false);
  assert.deepEqual(metrics.pickedUpByDay.map(({ quantityKg }) => quantityKg), [0, 0, 0, 0, 0, 0, 0]);
});

test("impact metrics calculate one claim and count CLAIMED, PICKED_UP, and EXPIRED listings", () => {
  const listing = {
    status: PICKED_UP,
    quantityKg: 8,
    createdAt: new Date("2026-11-13T08:00:00.000Z")
  };
  const metrics = calculateImpactMetrics(
    [
      listing,
      { status: CLAIMED, quantityKg: 4, createdAt: new Date("2026-11-13T07:00:00.000Z") },
      { status: EXPIRED, quantityKg: 2, createdAt: new Date("2026-11-13T06:00:00.000Z") }
    ],
    [{ claimedAt: new Date("2026-11-13T09:00:00.000Z"), pickedUpAt: now, listing }],
    now
  );

  assert.equal(metrics.pickedUpKg, 8);
  assert.equal(metrics.claimedKg, 4);
  assert.equal(metrics.claimRate, 2 / 3);
  assert.equal(metrics.medianClaimHours, 1);
  assert.equal(metrics.pickedUpByDay.at(-1)?.quantityKg, 8);
});

test("impact metrics use the median for an even number of claim durations", () => {
  const listingAt = new Date("2026-11-13T06:00:00.000Z");
  const listing = { status: CLAIMED, quantityKg: 3, createdAt: listingAt };
  const metrics = calculateImpactMetrics([], [
    { claimedAt: new Date(listingAt.getTime() + 60 * 60 * 1000), pickedUpAt: null, listing },
    { claimedAt: new Date(listingAt.getTime() + 3 * 60 * 60 * 1000), pickedUpAt: null, listing }
  ], now);

  assert.equal(metrics.medianClaimHours, 2);
});

test("impact metrics bucket pickup kilograms into seven Asia/Kolkata days", () => {
  const listing = { status: PICKED_UP, quantityKg: 2, createdAt: now };
  const oldListing = { ...listing, quantityKg: 5 };
  const outsideListing = { ...listing, quantityKg: 100 };
  const metrics = calculateImpactMetrics([], [
    { claimedAt: now, pickedUpAt: new Date("2026-11-07T17:30:00.000Z"), listing: oldListing },
    { claimedAt: now, pickedUpAt: new Date("2026-11-13T06:30:00.000Z"), listing },
    { claimedAt: now, pickedUpAt: new Date("2026-11-06T18:29:59.000Z"), listing: outsideListing }
  ], now);

  assert.deepEqual(metrics.pickedUpByDay.map(({ date, quantityKg }) => [date, quantityKg]), [
    ["2026-11-07", 5],
    ["2026-11-08", 0],
    ["2026-11-09", 0],
    ["2026-11-10", 0],
    ["2026-11-11", 0],
    ["2026-11-12", 0],
    ["2026-11-13", 2]
  ]);
});
