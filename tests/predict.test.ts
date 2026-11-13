import assert from "node:assert/strict";
import { test } from "node:test";
import model from "../lib/model.json";
import { predictClaimProbability } from "../lib/predict";

test("claim likelihood scores are deterministic and bounded", () => {
  const now = new Date("2026-11-13T07:00:00.000Z");
  const listing = {
    foodType: "Cooked meals",
    quantityKg: 18,
    pickupStart: new Date("2026-11-13T08:30:00.000Z"),
    pickupEnd: new Date("2026-11-13T12:00:00.000Z")
  };
  const first = predictClaimProbability(listing, now);
  const second = predictClaimProbability(listing, now);

  assert.equal(first, second);
  assert.ok(first >= 0 && first <= 1);
});

test("claim likelihood differs for near cooked meals and distant produce", () => {
  const now = new Date("2026-11-13T07:00:00.000Z");
  const nearCookedScore = predictClaimProbability({
    foodType: "Cooked meals",
    quantityKg: 20,
    pickupStart: new Date("2026-11-13T08:00:00.000Z"),
    pickupEnd: new Date("2026-11-13T08:00:00.000Z")
  }, now);
  const distantProduceScore = predictClaimProbability({
    foodType: "Produce",
    quantityKg: 20,
    pickupStart: new Date("2026-11-13T08:00:00.000Z"),
    pickupEnd: new Date("2026-11-15T07:00:00.000Z")
  }, now);

  assert.notEqual(nearCookedScore, distantProduceScore);
});

test("trained model metadata includes accuracy, baseline, feature list, and dataset description", () => {
  assert.ok(model.metadata.heldOutAccuracy > 0.5);
  assert.ok(model.metadata.majorityClassBaselineAccuracy >= 0);
  assert.ok(model.metadata.featureNames.length > 0);
  assert.match(model.metadata.datasetDescription, /2,400 generated sample rows/);
});
