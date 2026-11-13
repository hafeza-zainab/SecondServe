import { prisma } from "./db";
import { seedDemoData } from "../prisma/seed";

export async function resetDemoData() {
  await prisma.$transaction(async (tx) => {
    await tx.claim.deleteMany();
    await tx.listing.deleteMany();
    await tx.organization.deleteMany();
  });

  await seedDemoData();
}
