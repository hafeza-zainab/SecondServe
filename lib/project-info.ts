import { CLAIMED, EXPIRED, PICKED_UP, UNCOLLECTED } from "./constants";

export const SETTING = "campus canteens and hostel messes";

export const MEAL_KG = 0.4;

export const PROBLEM =
  "Surplus food from campus kitchens can be difficult to coordinate with nearby community organizations before its pickup window closes. Donors and NGOs need a clear way to share available food, coordinate a claim, and confirm pickup.";

export const METRICS = [
  "kg picked up",
  `kg with a final outcome: quantity from ${PICKED_UP}, ${EXPIRED}, and ${UNCOLLECTED} listings.`,
  `Rescue rate: picked-up kg divided by kg with a final outcome; the denominator includes ${PICKED_UP}, ${EXPIRED}, and ${UNCOLLECTED}.`,
  `Meals equivalent: picked-up kg divided by ${MEAL_KG} kg per meal; estimate, assumption not measured.`,
  "kg claimed, awaiting pickup",
  "kg claimed but not collected",
  `Claim rate: ${CLAIMED}, ${PICKED_UP}, and ${UNCOLLECTED} listings divided by ${CLAIMED}, ${PICKED_UP}, ${EXPIRED}, and ${UNCOLLECTED} listings.`,
  "Median time to claim",
  "Claims",
  "Participating donors",
  "Participating NGOs",
  "kg picked up per day · last 7 days"
] as const;

export const LIMITS = [
  "On the hosted demo, sample data resets when the server restarts or redeploys.",
  "The free host may take about a minute to respond on first load.",
  "The claim-likelihood model uses synthetic data and makes no real-world accuracy claim.",
  `A claim more than two hours past its pickup end is marked ${UNCOLLECTED}; the claim stays recorded and pickup cannot be confirmed.`,
  "The acting-as selector is a demo identity control; the app has no real authentication."
] as const;

export const AI_DISCLOSURE =
  "Built solo. Codex was used for code generation in small reviewed steps; Claude was used for code review and drafting documentation. I reviewed and tested the result.";
