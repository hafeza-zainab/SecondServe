import { CLAIMED, EXPIRED, PICKED_UP, UNCOLLECTED } from "./constants";
import { MEAL_KG } from "./project-info";

export type ImpactListing = {
  status: string;
  quantityKg: number;
  createdAt: Date;
};

export type ImpactClaim = {
  claimedAt: Date;
  pickedUpAt: Date | null;
  listing: ImpactListing;
};

export type DailyPickup = {
  date: string;
  label: string;
  quantityKg: number;
};

function istDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function istDayKey(date: Date) {
  const parts = istDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calculateImpactMetrics(
  listings: ImpactListing[],
  claims: ImpactClaim[],
  now = new Date()
) {
  const pickedUpKg = listings
    .filter((listing) => listing.status === PICKED_UP)
    .reduce((total, listing) => total + listing.quantityKg, 0);
  const finalListings = listings.filter((listing) =>
    listing.status === PICKED_UP || listing.status === EXPIRED || listing.status === UNCOLLECTED
  );
  const kgWithFinalOutcome = finalListings.reduce((total, listing) => total + listing.quantityKg, 0);
  const rescueRate = kgWithFinalOutcome > 0 ? pickedUpKg / kgWithFinalOutcome : null;
  const claimedKg = listings
    .filter((listing) => listing.status === CLAIMED)
    .reduce((total, listing) => total + listing.quantityKg, 0);
  const uncollectedKg = listings
    .filter((listing) => listing.status === UNCOLLECTED)
    .reduce((total, listing) => total + listing.quantityKg, 0);
  const resolvedStatuses: string[] = [CLAIMED, PICKED_UP, EXPIRED, UNCOLLECTED];
  const resolvedListings = listings.filter((listing) =>
    resolvedStatuses.includes(listing.status)
  );
  const redirectedCount = resolvedListings.filter((listing) =>
    listing.status === CLAIMED || listing.status === PICKED_UP || listing.status === UNCOLLECTED
  ).length;
  const claimRate = resolvedListings.length
    ? redirectedCount / resolvedListings.length
    : null;

  const claimDurations = claims
    .map((claim) => claim.claimedAt.getTime() - claim.listing.createdAt.getTime())
    .sort((left, right) => left - right);
  let medianClaimHours: number | null = null;
  if (claimDurations.length) {
    const middle = Math.floor(claimDurations.length / 2);
    const medianMilliseconds = claimDurations.length % 2
      ? claimDurations[middle]
      : (claimDurations[middle - 1] + claimDurations[middle]) / 2;
    medianClaimHours = medianMilliseconds / (60 * 60 * 1000);
  }

  const dailyTotals = new Map<string, number>();
  for (const claim of claims) {
    if (claim.listing.status !== PICKED_UP || !claim.pickedUpAt) continue;
    const key = istDayKey(claim.pickedUpAt);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + claim.listing.quantityKg);
  }

  const dayFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short"
  });
  const pickedUpByDay: DailyPickup[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
    const key = istDayKey(date);
    return {
      date: key,
      label: dayFormatter.format(date),
      quantityKg: dailyTotals.get(key) ?? 0
    };
  });

  return {
    pickedUpKg,
    kgWithFinalOutcome,
    rescueRate,
    mealsEquivalent: pickedUpKg / MEAL_KG,
    claimedKg,
    uncollectedKg,
    claimRate,
    medianClaimHours,
    pickedUpByDay,
    hasClaims: claims.length > 0
  };
}
