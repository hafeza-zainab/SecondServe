import { readFileSync } from "node:fs";
import { join } from "node:path";

type ClaimModel = {
  means: number[];
  scales: number[];
  weights: number[];
  bias: number;
};

export type ClaimPredictionInput = {
  foodType: string;
  quantityKg: number;
  pickupStart: Date | string;
  pickupEnd: Date | string;
};

const model = JSON.parse(
  readFileSync(join(process.cwd(), "lib/model.json"), "utf8")
) as ClaimModel;

function sigmoid(value: number) {
  if (value < -35) return 0;
  if (value > 35) return 1;
  return 1 / (1 + Math.exp(-value));
}

export function predictClaimProbability(
  listing: ClaimPredictionInput,
  now = new Date()
): number {
  const pickupStart = new Date(listing.pickupStart);
  const pickupEnd = new Date(listing.pickupEnd);
  const pickupStartHour =
    pickupStart.getHours() +
    pickupStart.getMinutes() / 60 +
    pickupStart.getSeconds() / 3600;
  const hoursUntilPickupEnd = Math.max(
    0,
    (pickupEnd.getTime() - now.getTime()) / (60 * 60 * 1000)
  );
  const isCooked = listing.foodType === "Cooked meals" ? 1 : 0;
  const angle = (pickupStartHour / 24) * 2 * Math.PI;
  const rawFeatures = [
    listing.foodType === "Bakery" ? 1 : 0,
    isCooked,
    listing.foodType === "Produce" ? 1 : 0,
    listing.quantityKg,
    -Math.abs(listing.quantityKg - 20),
    hoursUntilPickupEnd,
    Math.log1p(hoursUntilPickupEnd),
    isCooked * Math.max(0, (12 - hoursUntilPickupEnd) / 12),
    Math.sin(angle),
    Math.cos(angle)
  ];
  const scaled = rawFeatures.map(
    (value, index) => (value - model.means[index]) / model.scales[index]
  );
  const logit =
    model.bias +
    model.weights.reduce((sum, weight, index) => sum + weight * scaled[index], 0);

  return sigmoid(logit);
}
