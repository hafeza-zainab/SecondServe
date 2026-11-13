import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { CLAIMED, EXPIRED, OPEN, ROLES } from "../../lib/constants";

type ListingsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

async function claimListing(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listingId") ?? "").trim();
  const ngoId = String(formData.get("ngoId") ?? "").trim();
  if (!listingId || !ngoId) {
    redirect("/listings?message=choose-ngo");
  }

  const ngo = await prisma.organization.findUnique({
    where: { id: ngoId },
    select: { role: true }
  });
  if (!ngo || ngo.role !== ROLES.NGO) {
    redirect("/listings?message=invalid-ngo");
  }

  try {
    const claimed = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.listing.updateMany({
        where: {
          id: listingId,
          status: OPEN,
          pickupEnd: { gt: now }
        },
        data: { status: CLAIMED }
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.claim.create({
        data: {
          listingId,
          ngoId
        }
      });
      return true;
    });

    redirect(
      claimed ? "/listings?message=claimed" : "/listings?message=already-claimed"
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      redirect("/listings?message=already-claimed");
    }
    throw error;
  }
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
  const [{ message }, [listings, ngos]] = await Promise.all([
    searchParams,
    Promise.all([
      prisma.listing.findMany({
        where: { status: { in: [OPEN, EXPIRED] } },
        include: {
          donor: { select: { name: true, area: true } }
        },
        orderBy: { pickupEnd: "asc" }
      }),
      prisma.organization.findMany({
        where: { role: ROLES.NGO },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      })
    ])
  ]);
  const now = new Date();
  const resultMessage = message ? messages[message] : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Available listings</h1>

      {resultMessage && (
        <p className="mb-6 rounded border p-3" role={resultMessage.role}>
          {resultMessage.text}
        </p>
      )}

      {listings.length === 0 ? (
        <p>No listings are currently available.</p>
      ) : (
        <ul className="grid gap-5">
          {listings.map((listing) => {
            const expired = listing.status === EXPIRED || listing.pickupEnd <= now;

            return (
              <li key={listing.id} className="rounded border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{listing.title}</h2>
                    <p>{listing.foodType} · {listing.quantityKg} kg</p>
                    <p>Donated by {listing.donor.name} · {listing.donor.area}</p>
                    <p>Pickup: {listing.locationText}</p>
                    <p>Pickup deadline: {listing.pickupEnd.toLocaleString()}</p>
                  </div>
                  {expired ? (
                    <p className="font-medium" role="status">Expired</p>
                  ) : (
                    <form action={claimListing} className="grid min-w-56 gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <label className="grid gap-1">
                        Claiming NGO
                        <select
                          name="ngoId"
                          required
                          defaultValue=""
                          className="rounded border p-2"
                          disabled={ngos.length === 0}
                        >
                          <option value="" disabled>Select an NGO</option>
                          {ngos.map((ngo) => (
                            <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        disabled={ngos.length === 0}
                        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                      >
                        Claim
                      </button>
                      {ngos.length === 0 && <p>No NGO organizations are available.</p>}
                    </form>
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
