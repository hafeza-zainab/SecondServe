export const SETTING = "campus canteens and hostel messes";

export const PROBLEM =
  "Surplus food from campus kitchens can be difficult to coordinate with nearby community organizations before its pickup window closes. Donors and NGOs need a clear way to share available food, coordinate a claim, and confirm pickup.";

export const METRICS = [
  "kg picked up",
  "kg claimed, awaiting pickup",
  "Claim rate",
  "Median time to claim",
  "Claims",
  "Participating donors",
  "Participating NGOs",
  "kg picked up per day · last 7 days"
] as const;

export const LIMITS = [
  "On the hosted demo, data resets when the server restarts or redeploys, and the first load can take about a minute.",
  "The claim-likelihood model uses synthetic data and makes no real-world accuracy claim.",
  "The acting-as selector is a demo identity control; the app has no real authentication."
] as const;

export const AI_DISCLOSURE =
  "Built solo. Codex was used for code generation in small reviewed steps; Claude was used for code review and drafting documentation. I reviewed and tested the result.";
