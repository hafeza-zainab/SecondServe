# Testing log

| Date | What I tested | Result | What I changed |
| ---- | ------------- | ------ | -------------- |
| Nov 13 | Scaffold: npm run build, dev server | Pass; Turbopack failed with a CSS worker error | Switched scripts to --webpack |
| Nov 13 | Seed: `npx prisma db push`, `npm run seed` twice, direct organization count | Pass; db push succeeded, first seed created 5 sample organizations and 7 listings, second seed skipped, and direct count returned 5 | Added idempotent sample data seed script |
| Nov 13 | Render: `start:render` and deployed home page | Pass; `start:render` ran db push, seed, then `next start`; live page showed `Organizations in database: 5`. Local `curl.exe -s localhost:3000` could not connect; HTTP check was verified on the live deploy | Recorded live deploy verification |
| 2026-11-13 | Step 0 setup: ancestor check, branch creation, `npm run build`, `npx tsc --noEmit` | Pass; `1dd7fdf` is an ancestor of `codex/step-10`; build and TypeScript check passed; no `test` script exists yet | Created local branch `codex/buildout` |
| 2026-11-13 | Step 1 time zone: `npm test` under `TZ=UTC` and `TZ=Asia/Kolkata`, `npx tsc --noEmit`, `npm run build` | Pass; 3 time tests passed in each timezone, TypeScript check passed, production build passed | Added fixed IST parsing/formatting and datetime tests |
| 2026-11-13 | Step 2 services/expiry: build, `npx tsc --noEmit`, `npm test`, `npm run test:db` | Build, TypeScript, and 3 pure tests passed; isolated database setup failed at `prisma db push` with an empty `Schema engine error:`; database tests and HTTP checks did not run | Moved listing operations into services and added the isolated DB test runner |
| 2026-11-13 | Step 2b: `npm run test:db`, `npm run build`, `npx tsc --noEmit`, `npm test` | Pass; applied 4 schema statements to fresh `test.db`; passed claim-once, expired-claim rejection, pickup-once, and overdue-OPEN-only expiry tests; build, TypeScript, and 3 pure tests passed | Added Prisma-client SQL schema initialization and removed schema-engine use from test:db |
