import { spawnSync } from "node:child_process";
import { prisma } from "../lib/db";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error('Refusing to reseed: DATABASE_URL must start with "file:".');
  }

  await prisma.$transaction(async (tx) => {
    await tx.claim.deleteMany();
    await tx.listing.deleteMany();
    await tx.organization.deleteMany();
  });
  await prisma.$disconnect();

  const seed = spawnSync(
    process.execPath,
    ["--import", "tsx", "prisma/seed.ts"],
    { cwd: process.cwd(), env: process.env, stdio: "inherit" }
  );
  if (seed.error) throw seed.error;
  if (seed.status !== 0) {
    throw new Error(`Seed process exited with status ${seed.status ?? "unknown"}.`);
  }

  const [organizations, listings, claims] = await Promise.all([
    prisma.organization.count(),
    prisma.listing.count(),
    prisma.claim.count()
  ]);
  console.log(`Reseed counts: ${organizations} organizations, ${listings} listings, ${claims} claims.`);
}

main()
  .catch((error: unknown) => {
    console.error("Reseed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
