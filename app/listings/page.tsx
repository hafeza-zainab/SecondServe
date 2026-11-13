import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, EXPIRED, OPEN, ROLES } from "../../lib/constants";
import { predictClaimProbability } from "../../lib/predict";
import { formatIst } from "../../lib/time";
import { SubmitButton } from "../../components/submit-button";
import { ResetDemoButton } from "../../components/reset-demo-button";
import { StatusBadge } from "../../components/status-badge";
import {
  getActingOrganization,
  getActingOrganizationId
} from "../../lib/acting-as";
import {
  claimListing as claimListingService,
  expireOverdueListings
} from "../../lib/services/listings";

type ListingsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

async function claimListing(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "").trim();
  const actingOrganizationId = await getActingOrganizationId();
  if (!listingId) {
    redirect("/listings?message=invalid-ngo");
  }

  const result = await claimListingService(listingId, actingOrganizationId);
  if (result === "Invalid NGO") {
    redirect("/listings?message=invalid-ngo");
  }
  redirect(
    result === "Claimed"
      ? "/listings?message=claimed"
      : "/listings?message=already-claimed"
  );
}

const messages: Record<string, { text: string; role: "status" | "alert" }> = {
  claimed: { text: "Listing claimed.", role: "status" },
  "already-claimed": {
    text: "Already claimed or expired. This listing cannot be claimed.",
    role: "alert"
  },
  "choose-ngo": { text: "Choose an NGO to claim this listing.", role: "alert" },
  "invalid-ngo": {
    text: "Choose an existing organization with the NGO role.",
    role: "alert"
  }
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  await expireOverdueListings();
  const now = new Date();
  const [{ message }, [foundListings, actingOrganization]] = await Promise.all([
    searchParams,
    Promise.all([
      prisma.listing.findMany({
        where: { status: { in: [OPEN, EXPIRED] } },
        include: {
          donor: { select: { name: true, area: true } }
        },
        orderBy: { pickupEnd: "asc" }
      }),
      getActingOrganization()
    ])
  ]);
  const listings = [...foundListings].sort((left, right) => {
    const leftExpired = left.status === EXPIRED || left.pickupEnd <= now;
    const rightExpired = right.status === EXPIRED || right.pickupEnd <= now;
    if (leftExpired !== rightExpired) {
      return leftExpired ? 1 : -1;
    }
    return left.pickupEnd.getTime() - right.pickupEnd.getTime();
  });
  const resultMessage = message ? messages[message] : undefined;
  const openListingCount = listings.filter((listing) =>
    listing.status === OPEN && listing.pickupEnd > now
  ).length;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Available listings</h1>

      {openListingCount === 0 && (
        <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded border border-amber-700 bg-amber-50 p-5" role="status">
          <p>No open listings are available. Reset the demo to restore its sample listings.</p>
          <ResetDemoButton compact />
        </section>
      )}

      {resultMessage && (
        <p className="mb-6 rounded border p-3" role={resultMessage.role} aria-live={resultMessage.role === "alert" ? "assertive" : "polite"}>
          {resultMessage.text}
        </p>
      )}

      {listings.length === 0 ? (
        <p>No listings are currently available.</p>
      ) : (
        <ul className="grid gap-5">
          {listings.map((listing) => {
            const expired = listing.status === EXPIRED || listing.pickupEnd <= now;
            const claimProbability = expired
              ? null
              : predictClaimProbability(listing, now);

            return (
              <li key={listing.id} className="surface-card p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold tracking-tight">{listing.title}</h2>
                      <StatusBadge status={expired ? EXPIRED : OPEN} />
                    </div>
                    <p className="text-4xl font-bold tracking-tight text-green-900">{listing.quantityKg}<span className="ml-2 text-base font-semibold text-muted">kg</span></p>
                    <div className="mt-4 grid gap-1 text-sm text-muted">
                      <p>{listing.foodType} · Donated by {listing.donor.name} · {listing.donor.area}</p>
                      <p>Pickup location: {listing.locationText}</p>
                    </div>
                    <p className="mt-4 border-l-4 border-green-700 pl-3 text-sm font-semibold text-gray-900">
                      Pickup deadline · {formatIst(listing.pickupEnd)} IST
                    </p>
                    {claimProbability !== null && (
                      <div className="mt-4 max-w-md">
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold">Likely to be claimed</p>
                          <p className="text-sm font-bold text-green-900">{Math.round(claimProbability * 100)}%</p>
                        </div>
                        <div
                          className="h-2.5 overflow-hidden rounded-full bg-gray-200"
                          role="progressbar"
                          aria-label="Estimated claim likelihood"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(claimProbability * 100)}
                        >
                          <div className="h-full rounded-full bg-green-800" style={{ width: `${Math.round(claimProbability * 100)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted">Estimated by a model trained on synthetic data</p>
                      </div>
                    )}
                  </div>
                  {expired ? (
                    <p className="font-medium" role="status" aria-live="polite">Expired</p>
                  ) : actingOrganization?.role === ROLES.NGO ? (
                    <form action={claimListing} className="grid min-w-56 gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <SubmitButton pendingText="Claiming…">Claim</SubmitButton>
                    </form>
                  ) : (
                    <p>Switch to an NGO to claim this listing.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
