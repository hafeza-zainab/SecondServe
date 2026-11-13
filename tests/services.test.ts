import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { prisma } from "../lib/db";
import { CLAIMED, EXPIRED, OPEN, PICKED_UP, ROLES } from "../lib/constants";
import {
  claimListing,
  expireOverdueListings,
  markPickedUp
} from "../lib/services/listings";

async function clearDatabase() {
  await prisma.claim.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.organization.deleteMany();
}

async function createOrganization(role: string) {
  return prisma.organization.create({
    data: { name: `Service test ${role} (sample)`, role, area: "Test area" }
  });
}

async function createListing(
  donorId: string,
  status: string,
  pickupEnd = new Date(Date.now() + 60 * 60 * 1000)
) {
  return prisma.listing.create({
    data: {
      donorId,
      title: `Service test listing ${status} (sample)`,
      foodType: "Produce",
      quantityKg: 10,
      pickupStart: new Date(Date.now() + 15 * 60 * 1000),
      pickupEnd,
      locationText: "Service test location",
      status
    }
  });
}

beforeEach(clearDatabase);
after(async () => {
  await clearDatabase();
  await prisma.$disconnect();
});

test("a listing can be claimed once and the duplicate creates no second claim", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, OPEN);

  assert.equal(await claimListing(listing.id, ngo.id), "Claimed");
  assert.equal(
    await claimListing(listing.id, ngo.id),
    "Already claimed or expired"
  );
  assert.equal(await prisma.claim.count({ where: { listingId: listing.id } }), 1);
  const saved = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
  assert.equal(saved.status, CLAIMED);
});

test("a claim on an expired listing is rejected", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(
    donor.id,
    EXPIRED,
    new Date(Date.now() - 60 * 60 * 1000)
  );

  assert.equal(
    await claimListing(listing.id, ngo.id),
    "Already claimed or expired"
  );
  assert.equal(await prisma.claim.count({ where: { listingId: listing.id } }), 0);
});

test("a DONOR acting identity cannot claim a listing", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const listing = await createListing(donor.id, OPEN);

  assert.equal(await claimListing(listing.id, donor.id), "Invalid NGO");
  assert.equal(await prisma.claim.count({ where: { listingId: listing.id } }), 0);
  const saved = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
  assert.equal(saved.status, OPEN);
});

test("a claim rejects missing or unknown acting organization IDs", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const listing = await createListing(donor.id, OPEN);

  assert.equal(await claimListing(listing.id, null), "Invalid NGO");
  assert.equal(await claimListing(listing.id, "unknown-organization-id"), "Invalid NGO");
  assert.equal(await prisma.claim.count({ where: { listingId: listing.id } }), 0);
});

test("markPickedUp sets status and pickedUpAt once and rejects a repeat", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, CLAIMED);
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(await markPickedUp(listing.id, donor.id), "Picked up");
  const firstRead = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { claim: true }
  });
  assert.equal(firstRead.status, PICKED_UP);
  assert.ok(firstRead.claim?.pickedUpAt instanceof Date);

  assert.equal(
    await markPickedUp(listing.id, donor.id),
    "Already picked up or not claimed"
  );
  const secondRead = await prisma.claim.findUniqueOrThrow({
    where: { listingId: listing.id }
  });
  assert.equal(secondRead.pickedUpAt?.getTime(), firstRead.claim.pickedUpAt.getTime());
});

test("a non-owning DONOR cannot mark another organization's claim picked up", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const otherDonor = await prisma.organization.create({
    data: { name: "Other service donor (sample)", role: ROLES.DONOR, area: "Test area" }
  });
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, CLAIMED);
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(await markPickedUp(listing.id, otherDonor.id), "Not owner");
  const unchanged = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { claim: true }
  });
  assert.equal(unchanged.status, CLAIMED);
  assert.equal(unchanged.claim?.pickedUpAt, null);
});

test("pickup rejects missing or unknown acting organization IDs", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, CLAIMED);
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(await markPickedUp(listing.id, null), "Not owner");
  assert.equal(await markPickedUp(listing.id, "unknown-organization-id"), "Not owner");
  const unchanged = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { claim: true }
  });
  assert.equal(unchanged.status, CLAIMED);
  assert.equal(unchanged.claim?.pickedUpAt, null);
});

test("expiry flips only overdue OPEN listings", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const now = new Date("2026-11-13T12:00:00.000Z");
  const overdueOpen = await createListing(
    donor.id,
    OPEN,
    new Date(now.getTime() - 1000)
  );
  const futureOpen = await createListing(
    donor.id,
    OPEN,
    new Date(now.getTime() + 60 * 60 * 1000)
  );
  const overdueClaimed = await createListing(
    donor.id,
    CLAIMED,
    new Date(now.getTime() - 1000)
  );
  const alreadyExpired = await createListing(
    donor.id,
    EXPIRED,
    new Date(now.getTime() - 1000)
  );

  assert.equal(await expireOverdueListings(now), 1);
  const rows = await prisma.listing.findMany({
    where: { id: { in: [overdueOpen.id, futureOpen.id, overdueClaimed.id, alreadyExpired.id] } },
    select: { id: true, status: true }
  });
  const statusById = new Map(rows.map((row) => [row.id, row.status]));
  assert.equal(statusById.get(overdueOpen.id), EXPIRED);
  assert.equal(statusById.get(futureOpen.id), OPEN);
  assert.equal(statusById.get(overdueClaimed.id), CLAIMED);
  assert.equal(statusById.get(alreadyExpired.id), EXPIRED);
});
