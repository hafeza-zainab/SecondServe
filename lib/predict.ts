import modelJson from "./model.json";

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

const model = modelJson as ClaimModel;

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
  const pickupStartParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(pickupStart);
  const pickupStartValues = Object.fromEntries(
    pickupStartParts.map(({ type, value }) => [type, value])
  );
  const pickupStartHour =
    Number(pickupStartValues.hour) +
    Number(pickupStartValues.minute) / 60 +
    Number(pickupStartValues.second) / 3600;
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
