import { prisma } from "../lib/db";
import { OPEN, PICKED_UP } from "../lib/constants";
import { ResetDemoButton } from "../components/reset-demo-button";
import { setActingOrganization } from "./actions/acting-as";
import { ROLES } from "../lib/constants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const [pickedUp, openListings, sampleDonor, sampleNgo] = await Promise.all([
    prisma.listing.aggregate({
      where: { status: PICKED_UP },
      _sum: { quantityKg: true }
    }),
    prisma.listing.count({
      where: { status: OPEN, pickupEnd: { gt: now } }
    }),
    prisma.organization.findFirst({
      where: { role: ROLES.DONOR, name: { endsWith: "(sample)" } },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    }),
    prisma.organization.findFirst({
      where: { role: ROLES.NGO, name: { endsWith: "(sample)" } },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    })
  ]);
  const pickedUpKg = pickedUp._sum.quantityKg ?? 0;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 sm:px-6 sm:py-16">
      <section className="grid gap-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Campus food-sharing demo</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">SecondServe</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          Help campus canteens and hostel messes share surplus meals with nearby community organizations before the food goes to waste.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/donate" className="button-primary">Post a listing</a>
          <a href="/listings" className="button-secondary">Browse listings</a>
        </div>
        <div className="flex flex-wrap gap-3">
          {sampleDonor && (
            <form action={setActingOrganization}>
              <input type="hidden" name="organizationId" value={sampleDonor.id} />
              <input type="hidden" name="returnTo" value="/donate" />
              <button type="submit" className="button-primary">Play a donor</button>
            </form>
          )}
          {sampleNgo && (
            <form action={setActingOrganization}>
              <input type="hidden" name="organizationId" value={sampleNgo.id} />
              <input type="hidden" name="returnTo" value="/listings" />
              <button type="submit" className="button-secondary">Play an NGO</button>
            </form>
          )}
        </div>
      </section>

      {openListings === 0 && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded border border-amber-700 bg-amber-50 p-5" role="status">
          <p>No open listings are available. Reset the demo to restore its sample listings.</p>
          <ResetDemoButton compact />
        </section>
      )}

      <section aria-label="Live impact numbers" className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border bg-slate-50 p-5">
          <h2 className="text-sm text-slate-600">kg picked up</h2>
          <p className="mt-2 text-3xl font-semibold">{pickedUpKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</p>
        </article>
        <article className="rounded-lg border bg-slate-50 p-5">
          <h2 className="text-sm text-slate-600">Open listings</h2>
          <p className="mt-2 text-3xl font-semibold">{openListings}</p>
        </article>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-semibold">Three simple steps</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-lg border p-5"><span className="font-semibold">1. Post</span><p className="mt-2 text-slate-700">A donor shares the food, amount, and pickup window.</p></li>
          <li className="rounded-lg border p-5"><span className="font-semibold">2. Claim</span><p className="mt-2 text-slate-700">An NGO claims an available listing.</p></li>
          <li className="rounded-lg border p-5"><span className="font-semibold">3. Confirm pickup</span><p className="mt-2 text-slate-700">The listing’s donor marks it picked up.</p></li>
        </ol>
      </section>

      <section className="rounded-lg border bg-slate-50 p-5">
        <h2 className="mb-3 text-xl font-semibold">Try the demo</h2>
        <ol className="list-decimal space-y-2 pl-6 text-slate-700">
          <li>Switch to a donor.</li>
          <li>Post a listing.</li>
          <li>Switch to an NGO.</li>
          <li>Claim the listing.</li>
          <li>Switch back to the donor.</li>
          <li>Mark the listing picked up.</li>
          <li>Open the dashboard.</li>
        </ol>
      </section>
    </main>
  );
}
