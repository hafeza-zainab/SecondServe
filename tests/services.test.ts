import "./helpers/require-test-db";
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { prisma } from "../lib/db";
import { resetDemoData } from "../lib/demo";
import { CLAIMED, EXPIRED, OPEN, PICKED_UP, ROLES, UNCOLLECTED } from "../lib/constants";
import {
  claimListing,
  createListing as createListingService,
  expireOverdueListings,
  ListingServiceError,
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

function istLocalValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

function createInput(overrides: Partial<Parameters<typeof createListingService>[0]> = {}) {
  const start = new Date(Date.now() + 30 * 60 * 1000);
  const end = new Date(Date.now() + 60 * 60 * 1000);
  return {
    title: "Limit test food (sample)",
    foodType: "Produce",
    quantityKg: "10",
    pickupStart: istLocalValue(start),
    pickupEnd: istLocalValue(end),
    locationText: "Limit test location (sample)",
    ...overrides
  };
}

async function rejectsWithCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ListingServiceError);
    assert.equal(error.code, code);
    return true;
  });
}

beforeEach(clearDatabase);
after(async () => {
  await clearDatabase();
  await prisma.$disconnect();
});

test("createListing accepts an 80-character title and rejects 81 characters", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const accepted = await createListingService(
    createInput({ title: "t".repeat(80) }),
    donor.id
  );
  assert.equal(accepted.title.length, 80);
  await rejectsWithCode(
    createListingService(createInput({ title: "t".repeat(81) }), donor.id),
    "titleTooLong"
  );
});

test("createListing accepts a 120-character location and rejects 121 characters", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const accepted = await createListingService(
    createInput({ locationText: "l".repeat(120) }),
    donor.id
  );
  assert.equal(accepted.locationText.length, 120);
  await rejectsWithCode(
    createListingService(createInput({ locationText: "l".repeat(121) }), donor.id),
    "locationTooLong"
  );
});

test("createListing accepts 0.1 and 500 kg and rejects values outside the range", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  assert.equal(
    (await createListingService(createInput({ quantityKg: "0.1" }), donor.id)).quantityKg,
    0.1
  );
  assert.equal(
    (await createListingService(createInput({ quantityKg: "500" }), donor.id)).quantityKg,
    500
  );
  await rejectsWithCode(
    createListingService(createInput({ quantityKg: "0.099" }), donor.id),
    "quantityRange"
  );
  await rejectsWithCode(
    createListingService(createInput({ quantityKg: "500.01" }), donor.id),
    "quantityRange"
  );
});

test("createListing accepts a pickup end inside 14 days and rejects one beyond", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const inside = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000);
  const accepted = await createListingService(
    createInput({ pickupEnd: istLocalValue(inside) }),
    donor.id
  );
  assert.ok(accepted.pickupEnd.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000);

  const outside = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
  await rejectsWithCode(
    createListingService(createInput({ pickupEnd: istLocalValue(outside) }), donor.id),
    "deadlineTooFar"
  );
});

test("createListing rejects invalid food, quantity, and datetime input", async () => {
  const donor = await createOrganization(ROLES.DONOR);

  await rejectsWithCode(
    createListingService(createInput({ foodType: "Unlisted food" }), donor.id),
    "foodType"
  );
  await rejectsWithCode(
    createListingService(createInput({ quantityKg: "not-a-number" }), donor.id),
    "quantityRange"
  );
  await rejectsWithCode(
    createListingService(createInput({ quantityKg: "1".repeat(100) }), donor.id),
    "quantityRange"
  );
  await rejectsWithCode(
    createListingService(createInput({ pickupStart: "not-a-date" }), donor.id),
    "date"
  );
  await rejectsWithCode(
    createListingService(createInput({ pickupEnd: "2".repeat(24) }), donor.id),
    "date"
  );

  assert.equal(await prisma.listing.count(), 0);
});

test("createListing rejects reversed and already elapsed pickup windows", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const reversedStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const reversedEnd = new Date(Date.now() + 60 * 60 * 1000);
  await rejectsWithCode(
    createListingService(createInput({
      pickupStart: istLocalValue(reversedStart),
      pickupEnd: istLocalValue(reversedEnd)
    }), donor.id),
    "order"
  );

  const elapsedStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const elapsedEnd = new Date(Date.now() - 60 * 60 * 1000);
  await rejectsWithCode(
    createListingService(createInput({
      pickupStart: istLocalValue(elapsedStart),
      pickupEnd: istLocalValue(elapsedEnd)
    }), donor.id),
    "future"
  );
  assert.equal(await prisma.listing.count(), 0);
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

test("a claim rejects oversized listing and acting organization IDs", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, OPEN);

  assert.equal(await claimListing("l".repeat(65), ngo.id), "Invalid NGO");
  assert.equal(await claimListing(listing.id, "o".repeat(65)), "Invalid NGO");
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

test("markPickedUp rejects an UNCOLLECTED listing and preserves its claim", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, UNCOLLECTED);
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(
    await markPickedUp(listing.id, donor.id),
    "Already picked up or not claimed"
  );
  const saved = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { claim: true }
  });
  assert.equal(saved.status, UNCOLLECTED);
  assert.ok(saved.claim);
  assert.equal(saved.claim.pickedUpAt, null);
});

test("a pickup attempt expires a claim more than two hours overdue before pickup", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(
    donor.id,
    CLAIMED,
    new Date(Date.now() - 2 * 60 * 60 * 1000 - 1)
  );
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(
    await markPickedUp(listing.id, donor.id),
    "Already picked up or not claimed"
  );
  const saved = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { claim: true }
  });
  assert.equal(saved.status, UNCOLLECTED);
  assert.ok(saved.claim);
  assert.equal(saved.claim.pickedUpAt, null);
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

test("an NGO cannot mark a donor listing picked up", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, CLAIMED);
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(await markPickedUp(listing.id, ngo.id), "Not owner");
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

test("pickup rejects oversized listing and acting organization IDs", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const listing = await createListing(donor.id, CLAIMED);
  await prisma.claim.create({ data: { listingId: listing.id, ngoId: ngo.id } });

  assert.equal(await markPickedUp("l".repeat(65), donor.id), "Not owner");
  assert.equal(await markPickedUp(listing.id, "o".repeat(65)), "Not owner");
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

test("expiry marks claimed listings UNCOLLECTED only more than two hours after pickupEnd", async () => {
  const donor = await createOrganization(ROLES.DONOR);
  const ngo = await createOrganization(ROLES.NGO);
  const now = new Date("2026-11-13T12:00:00.000Z");
  const exactBoundary = await createListing(
    donor.id,
    CLAIMED,
    new Date(now.getTime() - 2 * 60 * 60 * 1000)
  );
  const beyondBoundary = await createListing(
    donor.id,
    CLAIMED,
    new Date(now.getTime() - 2 * 60 * 60 * 1000 - 1)
  );
  await prisma.claim.create({ data: { listingId: exactBoundary.id, ngoId: ngo.id } });
  await prisma.claim.create({ data: { listingId: beyondBoundary.id, ngoId: ngo.id } });

  assert.equal(await expireOverdueListings(now), 1);
  const saved = await prisma.listing.findMany({
    where: { id: { in: [exactBoundary.id, beyondBoundary.id] } },
    include: { claim: true }
  });
  const byId = new Map(saved.map((listing) => [listing.id, listing]));
  assert.equal(byId.get(exactBoundary.id)?.status, CLAIMED);
  assert.equal(byId.get(beyondBoundary.id)?.status, UNCOLLECTED);
  assert.ok(byId.get(exactBoundary.id)?.claim);
  assert.ok(byId.get(beyondBoundary.id)?.claim);
});

test("resetDemoData removes judge rows and restores the seeded dataset", async () => {
  const judgeDonor = await prisma.organization.create({
    data: { name: "Judge-created donor (sample)", role: ROLES.DONOR, area: "Test area" }
  });
  const judgeNgo = await prisma.organization.create({
    data: { name: "Judge-created NGO (sample)", role: ROLES.NGO, area: "Test area" }
  });
  const judgeListing = await createListing(judgeDonor.id, CLAIMED);
  await prisma.claim.create({ data: { listingId: judgeListing.id, ngoId: judgeNgo.id } });

  await resetDemoData();

  assert.equal(await prisma.organization.count(), 5);
  assert.equal(await prisma.listing.count(), 19);
  assert.equal(await prisma.claim.count(), 14);
  assert.equal(
    await prisma.organization.count({ where: { name: { startsWith: "Judge-created" } } }),
    0
  );
  assert.equal(
    await prisma.listing.count({ where: { title: { startsWith: "Service test listing" } } }),
    0
  );

  const openListings = await prisma.listing.findMany({
    where: { status: OPEN },
    select: { pickupEnd: true }
  });
  assert.equal(openListings.length, 3);
  for (const listing of openListings) {
    const hoursAhead = (listing.pickupEnd.getTime() - Date.now()) / (60 * 60 * 1000);
    assert.ok(hoursAhead >= 4 && hoursAhead <= 30, `deadline was ${hoursAhead} hours ahead`);
  }
});
