import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, PICKED_UP, ROLES } from "../../lib/constants";

export const dynamic = "force-dynamic";

const redirectedStatuses = [CLAIMED, PICKED_UP];

async function markPickedUp(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) {
    redirect("/dashboard?message=already-picked-up");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const listingUpdate = await tx.listing.updateMany({
      where: { id: listingId, status: CLAIMED },
      data: { status: PICKED_UP }
    });

    if (listingUpdate.count === 0) {
      return false;
    }

    await tx.claim.update({
      where: { listingId },
      data: { pickedUpAt: now }
    });
    return true;
  });

  redirect(
    updated ? "/dashboard?message=picked-up" : "/dashboard?message=already-picked-up"
  );
}

type DashboardPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [
    { message },
    pickedUp,
    awaitingPickup,
    claimCount,
    donorCount,
    ngoCount,
    latestClaims
  ] = await Promise.all([
      searchParams,
      prisma.listing.aggregate({
        where: { status: PICKED_UP },
        _sum: { quantityKg: true }
      }),
      prisma.listing.aggregate({
        where: { status: CLAIMED },
        _sum: { quantityKg: true }
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
          listing: { select: { title: true, quantityKg: true, status: true } },
          ngo: { select: { name: true } }
        }
      })
  ]);

  const pickedUpKg = pickedUp._sum.quantityKg ?? 0;
  const claimedKg = awaitingPickup._sum.quantityKg ?? 0;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Impact dashboard</h1>

      {message === "picked-up" && (
        <p className="mb-6 rounded border border-green-700 p-3" role="status">
          Picked up
        </p>
      )}
      {message === "already-picked-up" && (
        <p className="mb-6 rounded border border-red-700 p-3" role="alert">
          Already picked up or not claimed
        </p>
      )}

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded border p-5">
          <h2 className="text-sm">kg picked up</h2>
          <p className="mt-2 text-3xl font-semibold">
            {pickedUpKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </p>
        </article>
        <article className="rounded border p-5">
          <h2 className="text-sm">kg claimed, awaiting pickup</h2>
          <p className="mt-2 text-3xl font-semibold">
            {claimedKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
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

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Latest claims</h2>
        {claimCount === 0 ? (
          <p>No claims yet. Once an NGO claims a listing, it will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
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
                    <td className="p-3">{claim.claimedAt.toLocaleString()}</td>
                    <td className="p-3">
                      {claim.listing.status === PICKED_UP ? (
                        <span>Picked up</span>
                      ) : claim.listing.status === CLAIMED ? (
                        <form action={markPickedUp}>
                          <input type="hidden" name="listingId" value={claim.listingId} />
                          <button
                            type="submit"
                            className="rounded bg-black px-3 py-2 text-white"
                          >
                            Mark picked up
                          </button>
                        </form>
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
