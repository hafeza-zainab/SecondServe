import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, EXPIRED, OPEN, ROLES } from "../../lib/constants";
import { predictClaimProbability } from "../../lib/predict";
import { formatIst } from "../../lib/time";
import { SubmitButton } from "../../components/submit-button";
import { ResetDemoButton } from "../../components/reset-demo-button";
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
              <li key={listing.id} className="rounded border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{listing.title}</h2>
                    <p>{listing.foodType} · {listing.quantityKg} kg</p>
                    <p>Donated by {listing.donor.name} · {listing.donor.area}</p>
                    <p>Pickup: {listing.locationText}</p>
                    <p>Pickup deadline: {formatIst(listing.pickupEnd)}</p>
                    {claimProbability !== null && (
                      <>
                        <p>Likely to be claimed: {Math.round(claimProbability * 100)}%</p>
                        <p className="text-sm">Estimated by a model trained on synthetic data</p>
                      </>
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
