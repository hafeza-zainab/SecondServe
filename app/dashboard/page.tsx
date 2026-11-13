import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, PICKED_UP, ROLES } from "../../lib/constants";
import { formatIst } from "../../lib/time";
import { calculateImpactMetrics } from "../../lib/metrics";
import { SubmitButton } from "../../components/submit-button";
import {
  getActingOrganization,
  getActingOrganizationId
} from "../../lib/acting-as";
import { expireOverdueListings, markPickedUp as markPickedUpService } from "../../lib/services/listings";

export const dynamic = "force-dynamic";

const redirectedStatuses = [CLAIMED, PICKED_UP];

async function markPickedUp(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) {
    redirect("/dashboard?message=already-picked-up");
  }

  const updated = await markPickedUpService(
    listingId,
    await getActingOrganizationId()
  );

  redirect(
    updated === "Picked up"
      ? "/dashboard?message=picked-up"
      : updated === "Not owner"
        ? "/dashboard?message=not-owner"
        : "/dashboard?message=already-picked-up"
  );
}

type DashboardPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await expireOverdueListings();
  const [
    { message },
    actingOrganization,
    impactListings,
    metricClaims,
    claimCount,
    donorCount,
    ngoCount,
    latestClaims
  ] = await Promise.all([
      searchParams,
      getActingOrganization(),
      prisma.listing.findMany({
        select: { status: true, quantityKg: true, createdAt: true }
      }),
      prisma.claim.findMany({
        select: {
          claimedAt: true,
          pickedUpAt: true,
          listing: { select: { status: true, quantityKg: true, createdAt: true } }
        }
      }),
      prisma.claim.count(),
      prisma.organization.count({
        where: {
          role: ROLES.DONOR,
          listings: { some: { status: { in: redirectedStatuses } } }
        }
      }),
      prisma.organization.count({
        where: {
          role: ROLES.NGO,
          claims: {
            some: { listing: { status: { in: redirectedStatuses } } }
          }
        }
      }),
      prisma.claim.findMany({
        orderBy: { claimedAt: "desc" },
        take: 5,
        include: {
          listing: {
            select: { title: true, quantityKg: true, status: true, donorId: true }
          },
          ngo: { select: { name: true } }
        }
      })
  ]);

  const metrics = calculateImpactMetrics(impactListings, metricClaims);
  const maxDailyKg = Math.max(...metrics.pickedUpByDay.map((day) => day.quantityKg), 0);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Impact dashboard</h1>

      {message === "picked-up" && (
        <p className="mb-6 rounded border border-green-700 p-3" role="status" aria-live="polite">
          Picked up
        </p>
      )}
      {message === "already-picked-up" && (
        <p className="mb-6 rounded border border-red-700 p-3" role="alert" aria-live="assertive">
          Already picked up or not claimed
        </p>
      )}
      {message === "not-owner" && (
        <p className="mb-6 rounded border border-red-700 p-3" role="alert" aria-live="assertive">
          Only the donor organization that owns this listing can confirm pickup.
        </p>
      )}

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded border p-5">
          <h2 className="text-sm">kg picked up</h2>
          <p className="mt-2 text-3xl font-semibold">
            {metrics.pickedUpKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">kg claimed, awaiting pickup</h2>
          <p className="mt-2 text-3xl font-semibold">
            {metrics.claimedKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">Claim rate</h2>
          <p className="mt-2 text-3xl font-semibold">
            {metrics.claimRate === null ? "—" : `${Math.round(metrics.claimRate * 100)}%`}
          </p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">Median time to claim</h2>
          <p className="mt-2 text-3xl font-semibold">
            {metrics.medianClaimHours === null
              ? "—"
              : `${metrics.medianClaimHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hours`}
          </p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">Claims</h2>
          <p className="mt-2 text-3xl font-semibold">{claimCount}</p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">Participating donors</h2>
          <p className="mt-2 text-3xl font-semibold">{donorCount}</p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">Participating NGOs</h2>
          <p className="mt-2 text-3xl font-semibold">{ngoCount}</p>
        </article>
      </section>

      <section className="mb-10 rounded border p-5">
        <h2 className="mb-4 text-xl font-semibold">kg picked up per day · last 7 days</h2>
        {!metrics.hasClaims ? (
          <p>No impact data yet. Claims and pickups will appear here.</p>
        ) : (
          <div className="grid gap-3">
            {metrics.pickedUpByDay.map((day) => (
              <div key={day.date} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3">
                <span>{day.label}</span>
                <div className="h-4 rounded bg-slate-100">
                  <div
                    className="h-4 rounded bg-green-700"
                    style={{ width: `${maxDailyKg ? (day.quantityKg / maxDailyKg) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-right">{day.quantityKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="mb-10 text-sm text-slate-600">Figures from sample data.</p>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Latest claims</h2>
        {claimCount === 0 ? (
          <p>No claims yet. Once an NGO claims a listing, it will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Listing</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">NGO</th>
                  <th className="p-3">Claimed at</th>
                  <th className="p-3">Pickup</th>
                </tr>
              </thead>
              <tbody>
                {latestClaims.map((claim) => (
                  <tr key={claim.id} className="border-b">
                    <td className="p-3">{claim.listing.title}</td>
                    <td className="p-3">{claim.listing.quantityKg} kg</td>
                    <td className="p-3">{claim.ngo.name}</td>
                    <td className="p-3">{formatIst(claim.claimedAt)}</td>
                    <td className="p-3">
                      {claim.listing.status === PICKED_UP ? (
                        <span>Picked up</span>
                      ) : claim.listing.status === CLAIMED ? (
                        actingOrganization?.role === ROLES.DONOR &&
                        actingOrganization.id === claim.listing.donorId ? (
                          <form action={markPickedUp}>
                            <input type="hidden" name="listingId" value={claim.listingId} />
                            <SubmitButton pendingText="Saving…" className="rounded bg-black px-3 py-2 text-white">
                              Mark picked up
                            </SubmitButton>
                          </form>
                        ) : (
                          <span>Awaiting pickup</span>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
