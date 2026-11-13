# SecondServe

[Live demo](https://secondserve-i4r1.onrender.com)

SecondServe is a campus food-sharing demo for coordinating surplus food from canteens and hostel messes with nearby community organizations.

## The problem

Surplus food from campus kitchens can be difficult to coordinate with nearby community organizations before its pickup window closes. Donors and NGOs need a clear way to share available food, coordinate a claim, and confirm pickup. The project is set in campus canteens and hostel messes.

## Routes

- **Home (`/`)** — project introduction, the post/claim/pickup flow, and live sample totals for picked-up kilograms and open listings.
- **Donate (`/donate`)** — post a listing as the selected donor, with food type, quantity, pickup window, and location. The form validates inputs and previews an estimated claim chance.
- **Listings (`/listings`)** — view open and expired sample listings, pickup windows, and synthetic-model estimates. The selected NGO can claim an open listing; the donor can confirm pickup from the dashboard.
- **Dashboard (`/dashboard`)** — picked-up and awaiting-pickup kilograms, claim rate, median claim time, seven-day pickup totals, participating organizations, and latest claims.
- **Model (`/model`)** — predictor features, generated-data description, held-out accuracy beside a majority-class baseline, and model limitations.
- **About (`/about`)** — project setting, problem, dashboard metrics, limits, and AI disclosure.

## How it works

The app uses Next.js App Router, TypeScript, Tailwind CSS, Prisma 7, and SQLite. The predictor is a plain TypeScript logistic regression with weights stored in `lib/model.json`.

Data model:

1. **Organization** — id, name, role (`DONOR` or `NGO`), area, and creation time.
2. **Listing** — id, donor organization, title, food type, quantity in kilograms, pickup start/end, location, status, and creation time.
3. **Claim** — id, one listing, NGO organization, claim time, and optional pickup time.
4. Listing statuses (`OPEN`, `CLAIMED`, `PICKED_UP`, `EXPIRED`) are stored as strings.
5. Organization roles are strings; a claim belongs to one listing and one NGO.

The model is trained on 2,400 generated rows using food type, quantity, time until pickup deadline, and pickup start time. Its training data and labels are synthetic and reproducible; its measured accuracy is not evidence of real-world performance.

## Run locally

Requirements: Node.js 24 and npm.

```sh
npm ci
npx prisma db push
npm run seed
npm run dev
```

The standard local database initialization command is `npx prisma db push`.

The restricted sandbox uses `npm run db:init` because its Prisma schema engine does not run reliably:

```sh
npm run db:init
```

`DATABASE_URL` defaults to `file:./dev.db`; `.env.example` contains that value. The seed creates 5 sample organizations, 18 sample listings (10 `PICKED_UP`, 3 `CLAIMED`, 3 `OPEN`, and 2 `EXPIRED`), and 13 claims; it skips if organizations already exist.

## Tests and model scripts

```sh
npm test
npm run test:db
npm run build
npm run smoke
npm run gen-data
npm run train
```

`npm run test:db` creates its own `test.db`; a guard refuses to run the database tests unless the configured file name contains `test`. `npm run smoke` starts the built production app on a free local port, checks all navigation routes, then stops the server.

## Limits

- On the hosted demo, data resets when the server restarts or redeploys, and the first load can take about a minute.
- The claim predictor is trained only on synthetic data. It makes no real-world accuracy claim.
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
