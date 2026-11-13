# SecondServe

[Live demo](https://secondserve-i4r1.onrender.com)

SecondServe is a campus food-sharing demo for coordinating surplus food from canteens and hostel messes with nearby community organizations.

## The problem

Surplus food from campus kitchens can be difficult to coordinate with nearby community organizations before its pickup window closes. Donors and NGOs need a clear way to share available food, coordinate a claim, and confirm pickup. The project setting is campus canteens and hostel messes.

## Routes

- **Home (`/`)** — project introduction, live sample totals, and a static walkthrough of the donor-to-NGO-to-pickup flow.
- **Donate (`/donate`)** — post a listing as the selected donor, with food type, quantity, pickup window, and location; includes validation and a synthetic claim-likelihood preview.
- **Listings (`/listings`)** — view open and expired sample listings and synthetic-model estimates; a selected NGO can claim an open listing.
- **Dashboard (`/dashboard`)** — picked-up, awaiting-pickup, and claimed-but-not-collected kg; kg with a final outcome; rescue rate; estimated meal equivalents; claim rate; median claim time; seven-day pickup totals; participating organizations; and latest claims. The listing owner can confirm pickup here.
- **My activity (`/my`)** — the selected donor’s listings and pickup controls, or the selected NGO’s claims.
- **Model (`/model`)** — predictor features, generated-data description, held-out accuracy beside a majority-class baseline, and limitations.
- **About (`/about`)** — project setting, problem, metric definitions, limits, and AI disclosure.
- **Health (`/api/health`)** — a database-read health response with no database details in the response body.

## How it works

The app uses Next.js App Router, TypeScript, Tailwind CSS, Prisma 7, and SQLite. Prisma accesses SQLite through `@prisma/adapter-libsql`. The predictor is a plain TypeScript logistic regression with weights stored in `lib/model.json`.

Data model:

1. **Organization** — id, name, role (`DONOR` or `NGO`), area, and creation time.
2. **Listing** — id, donor organization, title, food type, quantity in kilograms, pickup start/end, location, string status, and creation time.
3. **Claim** — id, one listing, NGO organization, claim time, and optional pickup time.

Listing statuses are `OPEN`, `CLAIMED`, `PICKED_UP`, `EXPIRED`, and `UNCOLLECTED`; organization roles are stored as strings.
An overdue `OPEN` listing becomes `EXPIRED`; a `CLAIMED` listing more than two hours past its pickup end becomes `UNCOLLECTED`, keeps its claim, and cannot be marked picked up.

The model uses 2,400 generated rows with food type, quantity, hours until pickup end, pickup start time, and a synthetic claim label. Training and data generation use fixed seeds. The recorded held-out accuracy is 64.17%; the majority-class baseline is 55.21%. These are results on synthetic data and make no real-world accuracy claim.

## Impact metric definitions

- **kg picked up** — total quantity of listings with status `PICKED_UP`.
- **kg with a final outcome** — total quantity of listings with status `PICKED_UP`, `EXPIRED`, or `UNCOLLECTED`.
- **Rescue rate** — picked-up kg divided by kg with a final outcome. It is shown as unavailable when the denominator is zero; `UNCOLLECTED` contributes to the denominator but not the numerator.
- **Meals equivalent** — picked-up kg divided by `MEAL_KG` (0.4 kg per assumed meal); estimate, assumption not measured.
- **Claim rate** — `CLAIMED`, `PICKED_UP`, and `UNCOLLECTED` listing count divided by counts in `CLAIMED`, `PICKED_UP`, `EXPIRED`, and `UNCOLLECTED` states.
- **Median time to claim** — median duration from listing creation to claim.
- **Seven-day pickup totals** — picked-up kg grouped by Asia/Kolkata calendar day.

## Run locally

Requirements: Node.js 24 and npm.

```sh
npm ci
npx prisma db push
npm run seed
npm run dev
```

In this restricted sandbox, use `npm run db:init` instead of `npx prisma db push`.

`DATABASE_URL` defaults to `file:./dev.db`; `.env.example` contains that value. The seed creates 5 sample organizations and 19 sample listings (10 `PICKED_UP`, 3 `CLAIMED`, 3 `OPEN`, 2 `EXPIRED`, and 1 `UNCOLLECTED`) with 14 claims; it skips seeding when organizations already exist. Demo data resets when the hosted server restarts or redeploys.

## Scripts and tests

- `npm run seed` — idempotently add the sample data if organizations are absent.
- `npm run reseed` — clear and recreate the local sample data; requires a `file:` database URL.
- `npm run db:init` — initialize the local SQLite schema from `prisma/schema.sql` (used where the Prisma schema engine cannot run).
- `npm test` — run 17 pure Node tests; run with `TZ=UTC` and `TZ=Asia/Kolkata` to check both host time zones.
- `npm run test:db` — create a separate `test.db` with `db:init`, then run 19 database service tests; a guard refuses a configured database filename without `test`.
- `npx tsc --noEmit` — TypeScript check.
- `npm run build` — production build.
- `npm run smoke` — start the production build on a free local port, check all seven pages and `/api/health`, then stop the server.
- `npm run gen-data` — generate the disclosed synthetic predictor dataset.
- `npm run train` — train the TypeScript logistic regression and write model weights/metadata.

## Limits

- The hosted demo uses sample data that resets when the server restarts or redeploys.
- The free host may take about a minute to respond on first load.
- Listing title is limited to 80 characters, location to 120, quantity to 0.1–500 kg, and pickup end to 14 days ahead; pickup times are interpreted in Asia/Kolkata.
- A claimed listing becomes `UNCOLLECTED` after its pickup end has passed by more than two hours; its claim remains recorded and pickup cannot then be confirmed.
- The claim predictor is trained only on synthetic data and makes no real-world accuracy claim.
- The acting-as selector is a demo identity control, not real authentication.
- The sample workflow does not establish real-world food safety, availability, or impact results.

## AI disclosure

Built solo. Codex was used for code generation in small reviewed steps; Claude was used for code review and drafting documentation. I reviewed and tested the result.

## What's next

- Add real authentication and organization onboarding.
- Move hosted persistence to a managed database.
- Evaluate any future predictor against suitable real-world data before using it for decisions.

## Demo video

[TODO: demo video link]
