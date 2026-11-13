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

## Dashboard metric definitions

- `kg picked up`: sum of `quantityKg` for `PICKED_UP` listings.
- `kg posted`: sum of `quantityKg` for final-state listings (`PICKED_UP` and `EXPIRED`).
- `Rescue rate`: picked-up kg divided by kg posted; shown as unavailable when kg posted is zero.
- `Meals equivalent`: picked-up kg divided by `MEAL_KG` (0.4 kg); labelled “estimate, assumption not measured”.
- Claim rate: `CLAIMED` plus `PICKED_UP` listing count divided by counts in `CLAIMED`, `PICKED_UP`, and `EXPIRED` states.
- Median time to claim: median duration from `Listing.createdAt` to `Claim.claimedAt`.
- Seven-day pickup totals: `PICKED_UP` kg bucketed by Asia/Kolkata calendar day using `Claim.pickedUpAt`.

## Verification counts

- Pure Node test suite: 17 tests (`npm test`).
- Isolated Prisma service test suite: 17 tests (`npm run test:db`); it initializes `test.db` through `npm run db:init`.
- The pure suite was run with both `TZ=UTC` and `TZ=Asia/Kolkata`.

## Synthetic predictor

- Dataset: 2,400 generated rows, including a 480-row held-out set.
- Held-out accuracy: 64.17%.
- Majority-class baseline accuracy: 55.21%.
- Both data and training generation use fixed seeds. These are synthetic-data measurements, not a real-world accuracy claim.
