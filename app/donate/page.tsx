import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { FOOD_TYPES, ROLES } from "../../lib/constants";
import {
  createListing as createListingService,
  ListingServiceError
} from "../../lib/services/listings";

type DonatePageProps = {
  searchParams: Promise<{
    error?: string;
    posted?: string;
  }>;
};

async function createListing(formData: FormData) {
  "use server";

  const donorId = String(formData.get("donorId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const foodType = String(formData.get("foodType") ?? "");
  const quantityValue = String(formData.get("quantityKg") ?? "").trim();
  const pickupStartValue = String(formData.get("pickupStart") ?? "");
  const pickupEndValue = String(formData.get("pickupEnd") ?? "");
  const locationText = String(formData.get("locationText") ?? "").trim();

  try {
    await createListingService({
      donorId,
      title,
      foodType,
      quantityKg: quantityValue,
      pickupStart: pickupStartValue,
      pickupEnd: pickupEndValue,
      locationText
    });
  } catch (error) {
    if (error instanceof ListingServiceError) {
      redirect(`/donate?error=${encodeURIComponent(error.code)}`);
    }
    throw error;
  }

  redirect("/donate?posted=1");
}

const errorMessages: Record<string, string> = {
  missing: "Complete every field before posting.",
  foodType: "Choose a food type from the list.",
  quantity: "Quantity must be greater than 0 kg.",
  date: "Enter valid pickup start and end times.",
  order: "Pickup end must be after pickup start.",
  future: "Pickup end must be in the future.",
  donor: "Choose an existing donor organization.",
};

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const [{ error, posted }, donors] = await Promise.all([
    searchParams,
    prisma.organization.findMany({
      where: { role: ROLES.DONOR },
      orderBy: { name: "asc" },
      select: { id: true, name: true, area: true }
    })
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Post a food listing</h1>

      {posted === "1" && (
        <p className="mb-6 rounded border border-green-700 p-3" role="status">
          Listing posted
        </p>
      )}
      {error && errorMessages[error] && (
        <p className="mb-6 rounded border border-red-700 p-3" role="alert">
          {errorMessages[error]}
        </p>
      )}

      <form action={createListing} className="grid gap-5">
        <label className="grid gap-2">
          Donor organization
          <select name="donorId" required defaultValue="" className="rounded border p-2">
            <option value="" disabled>Select a donor</option>
            {donors.map((donor) => (
              <option key={donor.id} value={donor.id}>
                {donor.name} ({donor.area})
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          Food item
          <input name="title" required className="rounded border p-2" />
        </label>

        <label className="grid gap-2">
          Food type
          <select name="foodType" required defaultValue="" className="rounded border p-2">
            <option value="" disabled>Select a food type</option>
            {FOOD_TYPES.map((foodType) => (
              <option key={foodType} value={foodType}>{foodType}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          Quantity (kg)
          <input
            name="quantityKg"
            type="number"
            min="0.01"
            step="any"
            required
            className="rounded border p-2"
          />
        </label>

        <label className="grid gap-2">
          Pickup starts
          <input name="pickupStart" type="datetime-local" required className="rounded border p-2" />
        </label>

        <label className="grid gap-2">
          Pickup ends
          <input name="pickupEnd" type="datetime-local" required className="rounded border p-2" />
        </label>

        <label className="grid gap-2">
          Pickup location
          <input name="locationText" required className="rounded border p-2" />
        </label>

        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Post listing
        </button>
      </form>
    </main>
  );
}
