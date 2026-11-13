import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const FOOD_TYPES = ["Bakery", "Cooked meals", "Produce"] as const;
const OUTPUT = resolve(process.cwd(), "data/synthetic-claims.csv");

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

const random = seededRandom(20261113);
const rows = [
  "foodType,quantityKg,hoursUntilPickupEnd,pickupStartHour,claimed"
];

for (let index = 0; index < 2400; index += 1) {
  const foodType = FOOD_TYPES[Math.floor(random() * FOOD_TYPES.length)];
  const quantityKg = Math.round((2 + random() * 38) * 10) / 10;
  const hoursUntilPickupEnd = Math.round((0.5 + random() * 71.5) * 10) / 10;
  const pickupStartHour = Math.round(random() * 239) / 10;
  const cooked = foodType === "Cooked meals";
  const typeEffect = foodType === "Bakery" ? 0.3 : cooked ? 0.05 : -0.2;
  const midSizeEffect = -0.075 * Math.abs(quantityKg - 20);
  const quantityEffect = 0.025 * quantityKg;
  const deadlineEffect = 0.22 * Math.log1p(hoursUntilPickupEnd);
  const cookedUrgency = cooked
    ? Math.max(0, (12 - hoursUntilPickupEnd) / 12)
    : 0;
  const hourAngle = ((pickupStartHour - 13) / 24) * 2 * Math.PI;
  const pickupTimeEffect = 0.38 * Math.cos(hourAngle);
  const noise = (random() - 0.5) * 0.7;
  const probability = sigmoid(
    -0.3 +
      typeEffect +
      midSizeEffect +
      quantityEffect +
      deadlineEffect -
      1.1 * cookedUrgency +
      pickupTimeEffect +
      noise
  );
  const claimed = random() < probability ? 1 : 0;

  rows.push(
    `${foodType},${quantityKg},${hoursUntilPickupEnd},${pickupStartHour},${claimed}`
  );
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(
  OUTPUT,
  `SYNTHETIC DATA: generated, not real\n${rows.join("\n")}\n`,
  "utf8"
);
console.log(`Generated ${rows.length - 1} synthetic rows at ${OUTPUT}`);
