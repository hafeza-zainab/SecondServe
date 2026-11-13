import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, PICKED_UP, ROLES, UNCOLLECTED } from "../../lib/constants";
import { formatIst } from "../../lib/time";
import { calculateImpactMetrics } from "../../lib/metrics";
import { MEAL_KG } from "../../lib/project-info";
import { SubmitButton } from "../../components/submit-button";
import { StatusBadge } from "../../components/status-badge";
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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-green-800">Sample impact</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Impact dashboard</h1>
      </div>

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
        <article className="surface-card border-green-200 bg-green-50 p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-green-950">kg picked up</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight text-green-950 sm:text-5xl">
            {metrics.pickedUpKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">kg with a final outcome</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.kgWithFinalOutcome.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
          <p className="mt-1 text-sm text-slate-600">Picked up, expired, or claimed but not collected.</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Rescue rate</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.rescueRate === null ? "—" : `${Math.round(metrics.rescueRate * 100)}%`}
          </p>
          <p className="mt-1 text-sm text-slate-600">Picked-up kg divided by posted kg.</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Meals equivalent</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.mealsEquivalent.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
          <p className="mt-1 text-sm text-slate-600">Estimate, assumption not measured ({MEAL_KG} kg per meal).</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">kg claimed, awaiting pickup</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.claimedKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">kg claimed but not collected</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.uncollectedKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Claim rate</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.claimRate === null ? "—" : `${Math.round(metrics.claimRate * 100)}%`}
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Median time to claim</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {metrics.medianClaimHours === null
              ? "—"
              : `${metrics.medianClaimHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hours`}
          </p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Claims</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{claimCount}</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Participating donors</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{donorCount}</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Participating NGOs</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{ngoCount}</p>
        </article>
      </section>

      <section className="surface-card mb-10 p-5 sm:p-6">
        <h2 className="mb-5 text-xl font-bold tracking-tight sm:text-2xl">kg picked up per day · last 7 days</h2>
        {!metrics.hasClaims ? (
          <div className="rounded-xl border border-dashed border-line bg-gray-50 p-5 text-muted">
            <p className="font-semibold text-ink">No impact data yet</p>
            <p className="mt-1 text-sm">Claims and pickups will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {metrics.pickedUpByDay.map((day) => (
              <div key={day.date} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3">
                <span className="text-sm font-medium text-muted">{day.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-green-800"
                    style={{ width: `${maxDailyKg ? (day.quantityKg / maxDailyKg) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-right text-sm font-bold text-gray-900">{day.quantityKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="mb-10 text-sm text-slate-600">Figures from sample data.</p>

      <section>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Latest claims</h2>
        {claimCount === 0 ? (
          <div className="surface-card grid justify-items-start gap-3 p-6">
            <span className="grid size-11 place-items-center rounded-full bg-blue-50 font-bold text-blue-900" aria-hidden="true">0</span>
            <h3 className="text-lg font-bold">No claims yet</h3>
            <p className="text-sm text-muted">Once an NGO claims a listing, it will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
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
                  <tr key={claim.id} className="border-b border-line transition-colors hover:bg-green-50/60">
                    <td className="p-3">{claim.listing.title}</td>
                    <td className="p-3">{claim.listing.quantityKg} kg</td>
                    <td className="p-3">{claim.ngo.name}</td>
                    <td className="p-3">{formatIst(claim.claimedAt)}</td>
                    <td className="p-3">
                      {claim.listing.status === PICKED_UP ? (
                        <StatusBadge status={PICKED_UP} />
                      ) : claim.listing.status === UNCOLLECTED ? (
                        <StatusBadge status={UNCOLLECTED} />
                      ) : claim.listing.status === CLAIMED ? (
                        actingOrganization?.role === ROLES.DONOR &&
                        actingOrganization.id === claim.listing.donorId ? (
                          <form action={markPickedUp}>
                            <input type="hidden" name="listingId" value={claim.listingId} />
                            <SubmitButton pendingText="Saving…" className="button-primary min-h-0 px-3 py-2 text-sm">
                              Mark picked up
                            </SubmitButton>
                          </form>
                        ) : (
                          <StatusBadge status={CLAIMED} />
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
