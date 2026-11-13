import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, EXPIRED, OPEN, PICKED_UP, ROLES } from "../../lib/constants";
import { formatIst } from "../../lib/time";
import { SubmitButton } from "../../components/submit-button";
import { StatusBadge } from "../../components/status-badge";
import { getActingOrganization, getActingOrganizationId } from "../../lib/acting-as";
import {
  expireOverdueListings,
  markPickedUp as markPickedUpService
} from "../../lib/services/listings";

export const dynamic = "force-dynamic";

async function markPickedUp(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) redirect("/my?message=not-owner");

  const result = await markPickedUpService(listingId, await getActingOrganizationId());
  redirect(result === "Picked up"
    ? "/my?message=picked-up"
    : result === "Not owner"
      ? "/my?message=not-owner"
      : "/my?message=already-picked-up");
}

type MyPageProps = { searchParams: Promise<{ message?: string }> };

const messages: Record<string, string> = {
  "picked-up": "Pickup confirmed.",
  "already-picked-up": "Already picked up or not claimed.",
  "not-owner": "Only the donor organization that owns this listing can confirm pickup."
};

export default async function MyPage({ searchParams }: MyPageProps) {
  await expireOverdueListings();
  const [{ message }, actingOrganization] = await Promise.all([
    searchParams,
    getActingOrganization()
  ]);
  if (!actingOrganization) {
    return (
      <main className="mx-auto min-h-[50vh] max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="mb-6 text-3xl font-semibold">My activity</h1>
        <p>No organization is available. Add sample organizations to get started.</p>
      </main>
    );
  }

  const resultMessage = message ? messages[message] : undefined;
  const isDonor = actingOrganization.role === ROLES.DONOR;

  if (isDonor) {
    const listings = await prisma.listing.findMany({
      where: { donorId: actingOrganization.id },
      orderBy: { createdAt: "desc" },
      include: { claim: { select: { pickedUpAt: true, ngo: { select: { name: true } } } } }
    });

    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">My listings</h1>
        <p className="mb-8 text-slate-700">Listings posted by {actingOrganization.name}.</p>
        {resultMessage && <p className="mb-6 rounded border p-3" role="status" aria-live="polite">{resultMessage}</p>}
        {listings.length === 0 ? (
          <p>No listings yet. <a className="underline" href="/donate">Post a listing</a>.</p>
        ) : (
          <ul className="grid gap-4">
            {listings.map((listing) => (
              <li key={listing.id} className="surface-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{listing.title}</h2>
                    <p>{listing.foodType} · {listing.quantityKg} kg · {listing.locationText}</p>
                    <p>Pickup window: {formatIst(listing.pickupStart)}–{formatIst(listing.pickupEnd)}</p>
                    <p className="mt-3 flex items-center gap-2 text-sm"><span>Status:</span><StatusBadge status={listing.status} /></p>
                    {listing.claim && <p>Claimed by {listing.claim.ngo.name}</p>}
                  </div>
                  {listing.status === CLAIMED ? (
                    <form action={markPickedUp}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <SubmitButton pendingText="Saving…">Mark picked up</SubmitButton>
                    </form>
                  ) : listing.status === PICKED_UP ? (
                    <span>Picked up</span>
                  ) : listing.status === EXPIRED ? (
                    <span>Expired</span>
                  ) : listing.status === OPEN ? (
                    <span>Awaiting a claim</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  if (actingOrganization.role === ROLES.NGO) {
    const claims = await prisma.claim.findMany({
      where: { ngoId: actingOrganization.id },
      orderBy: { claimedAt: "desc" },
      include: { listing: { include: { donor: { select: { name: true } } } } }
    });

    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">My claims</h1>
        <p className="mb-8 text-slate-700">Claims made by {actingOrganization.name}.</p>
        {claims.length === 0 ? (
          <p>No claims yet. <a className="underline" href="/listings">Browse listings</a>.</p>
        ) : (
          <ul className="grid gap-4">
            {claims.map((claim) => (
              <li key={claim.id} className="surface-card p-5 sm:p-6">
                <h2 className="text-xl font-bold tracking-tight">{claim.listing.title}</h2>
                <p>{claim.listing.quantityKg} kg · {claim.listing.foodType}</p>
                <p>Donated by {claim.listing.donor.name}</p>
                <p>Claimed at {formatIst(claim.claimedAt)}</p>
                <p className="mt-3 flex items-center gap-2 text-sm"><span>Status:</span><StatusBadge status={claim.listing.status} /></p>
                {claim.pickedUpAt && <p>Picked up at {formatIst(claim.pickedUpAt)}</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  redirect("/");
}
