# Submission facts

Facts below are verifiable in this repository.

## Stack

- Next.js App Router, React, and TypeScript.
- Tailwind CSS.
- Prisma 7.10.1 with SQLite through `@prisma/adapter-libsql`.
- Claim-likelihood model: logistic regression implemented in TypeScript; model weights and metadata are in `lib/model.json`.

## Routes

- Pages: `/`, `/donate`, `/listings`, `/dashboard`, `/my`, `/model`, and `/about`.
- Health endpoint: `/api/health`.

## Sample seed

- 5 organizations, 19 listings, and 14 claims.
- Listing statuses: 10 `PICKED_UP`, 3 `CLAIMED`, 3 `OPEN`, 2 `EXPIRED`, and 1 `UNCOLLECTED`.

## Dashboard metric definitions

- `kg picked up`: sum of `quantityKg` for `PICKED_UP` listings.
- `kg with a final outcome`: sum of `quantityKg` for `PICKED_UP`, `EXPIRED`, and `UNCOLLECTED` listings.
- `Rescue rate`: picked-up kg divided by kg with a final outcome; `UNCOLLECTED` is denominator-only, and a zero denominator is shown as unavailable.
- `kg claimed but not collected`: sum of `quantityKg` for `UNCOLLECTED` listings.
- `Meals equivalent`: picked-up kg divided by `MEAL_KG` (0.4 kg); labelled “estimate, assumption not measured”.
- Claim rate: `CLAIMED`, `PICKED_UP`, and `UNCOLLECTED` listing count divided by counts in `CLAIMED`, `PICKED_UP`, `EXPIRED`, and `UNCOLLECTED` states.
- Expiry: overdue `OPEN` listings become `EXPIRED`; `CLAIMED` listings more than two hours past `pickupEnd` become `UNCOLLECTED`, retaining their claim row and rejecting pickup confirmation.
- Median time to claim: median duration from `Listing.createdAt` to `Claim.claimedAt`.
- Seven-day pickup totals: `PICKED_UP` kg bucketed by Asia/Kolkata calendar day using `Claim.pickedUpAt`.

## Verification counts

- Pure Node test suite: 17 tests (`npm test`).
- Isolated Prisma service test suite: 20 tests (`npm run test:db`); it initializes `test.db` through `npm run db:init`.
- The pure suite was run with both `TZ=UTC` and `TZ=Asia/Kolkata`.

## Synthetic predictor

- Dataset: 2,400 generated rows, including a 480-row held-out set.
- Held-out accuracy: 64.17%.
- Majority-class baseline accuracy: 55.21%.
- Both data and training generation use fixed seeds. These are synthetic-data measurements, not a real-world accuracy claim.
