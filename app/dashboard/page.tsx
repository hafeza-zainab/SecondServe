import { prisma } from "../../lib/db";
import { CLAIMED, PICKED_UP, ROLES } from "../../lib/constants";

export const dynamic = "force-dynamic";

const redirectedStatuses = [CLAIMED, PICKED_UP];

export default async function DashboardPage() {
  const [redirected, claimCount, donorCount, ngoCount, latestClaims] =
    await Promise.all([
      prisma.listing.aggregate({
        where: { status: { in: redirectedStatuses } },
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
          listing: { select: { title: true, quantityKg: true } },
          ngo: { select: { name: true } }
        }
      })
    ]);

  const totalKg = redirected._sum.quantityKg ?? 0;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Impact dashboard</h1>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded border p-5">
          <h2 className="text-sm">Total kg redirected</h2>
          <p className="mt-2 text-3xl font-semibold">
            {totalKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
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
                </tr>
              </thead>
              <tbody>
                {latestClaims.map((claim) => (
                  <tr key={claim.id} className="border-b">
                    <td className="p-3">{claim.listing.title}</td>
                    <td className="p-3">{claim.listing.quantityKg} kg</td>
                    <td className="p-3">{claim.ngo.name}</td>
                    <td className="p-3">{claim.claimedAt.toLocaleString()}</td>
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
