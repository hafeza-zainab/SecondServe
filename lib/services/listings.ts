import { prisma } from "../db";
import { CLAIMED, EXPIRED, FOOD_TYPES, OPEN, PICKED_UP, ROLES } from "../constants";
import { parseIstLocal } from "../time";

export class ListingServiceError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ListingServiceError";
  }
}

export type CreateListingInput = {
  title: string;
  foodType: string;
  quantityKg: string;
  pickupStart: string;
  pickupEnd: string;
  locationText: string;
};

export async function createListing(
  input: CreateListingInput,
  actingOrganizationId: string
) {
  const title = input.title.trim();
  const foodType = input.foodType;
  const quantityValue = input.quantityKg.trim();
  const pickupStartValue = input.pickupStart;
  const pickupEndValue = input.pickupEnd;
  const locationText = input.locationText.trim();

  if (
    !title || !foodType || !quantityValue || !pickupStartValue ||
    !pickupEndValue || !locationText
  ) {
    throw new ListingServiceError("missing");
  }
  if (!(FOOD_TYPES as readonly string[]).includes(foodType)) {
    throw new ListingServiceError("foodType");
  }

  const quantityKg = Number(quantityValue);
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
    throw new ListingServiceError("quantity");
  }

  let pickupStart: Date;
  let pickupEnd: Date;
  try {
    pickupStart = parseIstLocal(pickupStartValue);
    pickupEnd = parseIstLocal(pickupEndValue);
  } catch {
    throw new ListingServiceError("date");
  }
  if (pickupEnd <= pickupStart) {
    throw new ListingServiceError("order");
  }
  if (pickupEnd <= new Date()) {
    throw new ListingServiceError("future");
  }

  const donor = await prisma.organization.findUnique({
    where: { id: actingOrganizationId },
    select: { role: true }
  });
  if (!donor || donor.role !== ROLES.DONOR) {
    throw new ListingServiceError("donor");
  }

  return prisma.listing.create({
    data: {
      donorId: actingOrganizationId,
      title,
      foodType,
      quantityKg,
      pickupStart,
      pickupEnd,
      locationText,
      status: OPEN
    }
  });
}

export async function claimListing(
  listingId: string,
  actingOrganizationId: string | null
): Promise<"Claimed" | "Already claimed or expired" | "Invalid NGO"> {
  if (!listingId || !actingOrganizationId) {
    return "Invalid NGO";
  }

  const ngo = await prisma.organization.findUnique({
    where: { id: actingOrganizationId },
    select: { role: true }
  });
  if (!ngo || ngo.role !== ROLES.NGO) {
    return "Invalid NGO";
  }

  try {
    const claimed = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.listing.updateMany({
        where: { id: listingId, status: OPEN, pickupEnd: { gt: now } },
        data: { status: CLAIMED }
      });
      if (updated.count === 0) {
        return false;
      }
      await tx.claim.create({ data: { listingId, ngoId: actingOrganizationId } });
      return true;
    });
    return claimed ? "Claimed" : "Already claimed or expired";
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      "code" in error && error.code === "P2002"
    ) {
      return "Already claimed or expired";
    }
    throw error;
  }
}

export async function markPickedUp(
  listingId: string,
  actingOrganizationId: string | null
): Promise<"Picked up" | "Already picked up or not claimed" | "Not owner"> {
  return prisma.$transaction(async (tx) => {
    if (!actingOrganizationId) {
      return "Not owner";
    }

    const [listing, actingOrganization] = await Promise.all([
      tx.listing.findUnique({
        where: { id: listingId },
        select: { donorId: true }
      }),
      tx.organization.findUnique({
        where: { id: actingOrganizationId },
        select: { role: true }
      })
    ]);
    if (
      !listing ||
      listing.donorId !== actingOrganizationId ||
      actingOrganization?.role !== ROLES.DONOR
    ) {
      return "Not owner";
    }

    const now = new Date();
    const updated = await tx.listing.updateMany({
      where: { id: listingId, status: CLAIMED },
      data: { status: PICKED_UP }
    });
    if (updated.count === 0) {
      return "Already picked up or not claimed";
    }

    await tx.claim.update({
      where: { listingId },
      data: { pickedUpAt: now }
    });
    return "Picked up";
  });
}

export async function expireOverdueListings(now = new Date()): Promise<number> {
  const result = await prisma.listing.updateMany({
    where: { status: OPEN, pickupEnd: { lt: now } },
    data: { status: EXPIRED }
  });
  return result.count;
}
