# Testing log

| Date | What I tested | Result | What I changed |
| ---- | ------------- | ------ | -------------- |
| Nov 13 | Scaffold: npm run build, dev server | Pass; Turbopack failed with a CSS worker error | Switched scripts to --webpack |
| Nov 13 | Seed: `npx prisma db push`, `npm run seed` twice, direct organization count | Pass; db push succeeded, first seed created 5 sample organizations and 7 listings, second seed skipped, and direct count returned 5 | Added idempotent sample data seed script |
| Nov 13 | Render: `start:render` and deployed home page | Pass; `start:render` ran db push, seed, then `next start`; live page showed `Organizations in database: 5`. Local `curl.exe -s localhost:3000` could not connect; HTTP check was verified on the live deploy | Recorded live deploy verification |
