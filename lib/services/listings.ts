import { prisma } from "../db";
import { CLAIMED, EXPIRED, FOOD_TYPES, OPEN, PICKED_UP, ROLES } from "../constants";
import { parseIstLocal } from "../time";
import {
  isValidEntityId,
  MAX_LOCAL_DATETIME_LENGTH,
  MAX_QUANTITY_INPUT_LENGTH
} from "../input-limits";

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
  if (title.length > 80) {
    throw new ListingServiceError("titleTooLong");
  }
  if (locationText.length > 120) {
    throw new ListingServiceError("locationTooLong");
  }
  if (!(FOOD_TYPES as readonly string[]).includes(foodType)) {
    throw new ListingServiceError("foodType");
  }

  const quantityKg = Number(quantityValue);
  if (
    quantityValue.length > MAX_QUANTITY_INPUT_LENGTH ||
    !Number.isFinite(quantityKg) || quantityKg < 0.1 || quantityKg > 500
  ) {
    throw new ListingServiceError("quantityRange");
  }

  if (
    pickupStartValue.length > MAX_LOCAL_DATETIME_LENGTH ||
    pickupEndValue.length > MAX_LOCAL_DATETIME_LENGTH
  ) {
    throw new ListingServiceError("date");
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
  if (pickupEnd.getTime() - Date.now() > 14 * 24 * 60 * 60 * 1000) {
    throw new ListingServiceError("deadlineTooFar");
  }

  if (!isValidEntityId(actingOrganizationId)) {
    throw new ListingServiceError("donor");
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
  if (!isValidEntityId(listingId) || !isValidEntityId(actingOrganizationId)) {
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
  if (!isValidEntityId(listingId) || !isValidEntityId(actingOrganizationId)) {
    return "Not owner";
  }

  return prisma.$transaction(async (tx) => {
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
