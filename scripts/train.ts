import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Row = {
  foodType: string;
  quantityKg: number;
  hoursUntilPickupEnd: number;
  pickupStartHour: number;
  claimed: number;
};

const DATASET = resolve(process.cwd(), "data/synthetic-claims.csv");
const MODEL_PATH = resolve(process.cwd(), "lib/model.json");
const FEATURE_NAMES = [
  "food_bakery",
  "food_cooked_meals",
  "food_produce",
  "quantity_kg",
  "quantity_midrange",
  "hours_until_pickup_end",
  "hours_log",
  "cooked_short_deadline",
  "pickup_start_sin",
  "pickup_start_cos"
];

function features(row: Row): number[] {
  const isCooked = row.foodType === "Cooked meals" ? 1 : 0;
  const angle = (row.pickupStartHour / 24) * 2 * Math.PI;
  return [
    row.foodType === "Bakery" ? 1 : 0,
    isCooked,
    row.foodType === "Produce" ? 1 : 0,
    row.quantityKg,
    -Math.abs(row.quantityKg - 20),
    row.hoursUntilPickupEnd,
    Math.log1p(row.hoursUntilPickupEnd),
    isCooked * Math.max(0, (12 - row.hoursUntilPickupEnd) / 12),
    Math.sin(angle),
    Math.cos(angle)
  ];
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sigmoid(value: number) {
  if (value < -35) return 0;
  if (value > 35) return 1;
  return 1 / (1 + Math.exp(-value));
}

const csv = readFileSync(DATASET, "utf8");
const lines = csv.trim().split(/\r?\n/).slice(2);
const rows: Row[] = lines.map((line) => {
  const [foodType, quantityKg, hoursUntilPickupEnd, pickupStartHour, claimed] =
    line.split(",");
  return {
    foodType,
    quantityKg: Number(quantityKg),
    hoursUntilPickupEnd: Number(hoursUntilPickupEnd),
    pickupStartHour: Number(pickupStartHour),
    claimed: Number(claimed)
  };
});

if (rows.length < 10) {
  throw new Error("Synthetic dataset is missing or too small. Run npm run gen-data first.");
}

const random = seededRandom(93017);
const shuffled = [...rows];
for (let index = shuffled.length - 1; index > 0; index -= 1) {
  const swapIndex = Math.floor(random() * (index + 1));
  [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
}

const holdoutSize = Math.ceil(shuffled.length * 0.2);
const holdout = shuffled.slice(0, holdoutSize);
const training = shuffled.slice(holdoutSize);
const rawTrainingFeatures = training.map(features);
const means = FEATURE_NAMES.map(
  (_, featureIndex) =>
    rawTrainingFeatures.reduce((sum, row) => sum + row[featureIndex], 0) /
    rawTrainingFeatures.length
);
const scales = FEATURE_NAMES.map((_, featureIndex) => {
  const variance = rawTrainingFeatures.reduce((sum, row) => {
    const delta = row[featureIndex] - means[featureIndex];
    return sum + delta * delta;
  }, 0) / rawTrainingFeatures.length;
  const standardDeviation = Math.sqrt(variance);
  return standardDeviation > 0 ? standardDeviation : 1;
});
const scaleFeatures = (row: Row) =>
  features(row).map((value, index) => (value - means[index]) / scales[index]);

const weights = FEATURE_NAMES.map(() => 0);
let bias = 0;
const learningRate = 0.12;
const epochs = 1000;

for (let epoch = 0; epoch < epochs; epoch += 1) {
  const gradients = FEATURE_NAMES.map(() => 0);
  let biasGradient = 0;

  for (const row of training) {
    const scaled = scaleFeatures(row);
    const prediction = sigmoid(
      bias + weights.reduce((sum, weight, index) => sum + weight * scaled[index], 0)
    );
    const error = prediction - row.claimed;
    biasGradient += error;
    for (let index = 0; index < weights.length; index += 1) {
      gradients[index] += error * scaled[index];
    }
  }

  bias -= (learningRate * biasGradient) / training.length;
  for (let index = 0; index < weights.length; index += 1) {
    weights[index] -= (learningRate * gradients[index]) / training.length;
  }
}

let correct = 0;
for (const row of holdout) {
  const scaled = scaleFeatures(row);
  const prediction = sigmoid(
    bias + weights.reduce((sum, weight, index) => sum + weight * scaled[index], 0)
  );
  if ((prediction >= 0.5 ? 1 : 0) === row.claimed) correct += 1;
}
const accuracy = correct / holdout.length;

const model = {
  featureNames: FEATURE_NAMES,
  means,
  scales,
  weights,
  bias,
  heldOutAccuracy: accuracy,
  heldOutRows: holdout.length
};

writeFileSync(MODEL_PATH, `${JSON.stringify(model, null, 2)}\n`, "utf8");
console.log(
  `Held-out accuracy: ${(accuracy * 100).toFixed(2)}% (${correct}/${holdout.length})`
);
console.log(`Saved model to ${MODEL_PATH}`);
