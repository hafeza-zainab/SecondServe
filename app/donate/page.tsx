import { redirect } from "next/navigation";
import { FOOD_TYPES, ROLES } from "../../lib/constants";
import { getActingOrganization } from "../../lib/acting-as";
import { ClaimLikelihoodPreview } from "../../components/claim-likelihood-preview";
import { SubmitButton } from "../../components/submit-button";
import { donateValidationDestination } from "../../lib/donate-form";
import {
  createListing as createListingService,
  ListingServiceError
} from "../../lib/services/listings";

type DonatePageProps = {
  searchParams: Promise<{
    error?: string;
    posted?: string;
    title?: string;
    foodType?: string;
    quantityKg?: string;
    pickupStart?: string;
    pickupEnd?: string;
    locationText?: string;
  }>;
};

async function createListing(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const foodType = String(formData.get("foodType") ?? "");
  const quantityValue = String(formData.get("quantityKg") ?? "").trim();
  const pickupStartValue = String(formData.get("pickupStart") ?? "");
  const pickupEndValue = String(formData.get("pickupEnd") ?? "");
  const locationText = String(formData.get("locationText") ?? "").trim();
  const actingOrganization = await getActingOrganization();

  try {
    await createListingService({
      title,
      foodType,
      quantityKg: quantityValue,
      pickupStart: pickupStartValue,
      pickupEnd: pickupEndValue,
      locationText
    }, actingOrganization?.id ?? "");
  } catch (error) {
    if (error instanceof ListingServiceError) {
      redirect(donateValidationDestination(error.code, {
        title,
        foodType,
        quantityKg: quantityValue,
        pickupStart: pickupStartValue,
        pickupEnd: pickupEndValue,
        locationText
      }));
    }
    throw error;
  }

  redirect("/donate?posted=1");
}

const errorMessages: Record<string, string> = {
  missing: "Complete every field before posting.",
  foodType: "Choose a food type from the list.",
  quantity: "Quantity must be greater than 0 kg.",
  titleTooLong: "Food item must be 80 characters or fewer.",
  locationTooLong: "Pickup location must be 120 characters or fewer.",
  quantityRange: "Quantity must be between 0.1 and 500 kg.",
  deadlineTooFar: "Pickup end must be within the next 14 days.",
  date: "Enter valid pickup start and end times.",
  order: "Pickup end must be after pickup start.",
  future: "Pickup end must be in the future.",
  donor: "Select a donor organization in the acting-as control.",
};

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const [form, actingOrganization] = await Promise.all([
    searchParams,
    getActingOrganization()
  ]);
  const { error, posted } = form;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-semibold">Post a food listing</h1>

      {posted === "1" && (
        <p className="mb-6 rounded border border-green-700 p-3" role="status" aria-live="polite">
          Listing posted
        </p>
      )}
      {error && errorMessages[error] && (
        <p className="mb-6 rounded border border-red-700 p-3" role="alert" aria-live="assertive">
          {errorMessages[error]}
        </p>
      )}

      <form action={createListing} className="grid gap-5">
        {actingOrganization?.role === ROLES.DONOR ? (
          <p>Posting as {actingOrganization.name}</p>
        ) : (
          <p role="alert" aria-live="assertive">Select a donor organization in the acting-as control to post.</p>
        )}

        <label className="grid gap-2">
          Food item
          <input name="title" required defaultValue={form.title} className="rounded border p-2" />
        </label>

        <label className="grid gap-2">
          Food type
          <select name="foodType" required defaultValue={form.foodType ?? ""} className="rounded border p-2">
            <option value="" disabled>Select a food type</option>
            {form.foodType && !(FOOD_TYPES as readonly string[]).includes(form.foodType) && (
              <option value={form.foodType}>{form.foodType}</option>
            )}
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
            defaultValue={form.quantityKg}
            min="0.01"
            step="any"
            required
            className="rounded border p-2"
          />
        </label>

        <label className="grid gap-2">
          Pickup starts
          <>
            <input name="pickupStart" type="datetime-local" required defaultValue={form.pickupStart} aria-describedby="times-ist-hint" className="rounded border p-2" />
            <span id="times-ist-hint" className="text-sm text-slate-600">Times are in IST.</span>
          </>
        </label>

        <label className="grid gap-2">
          Pickup ends
          <>
            <input name="pickupEnd" type="datetime-local" required defaultValue={form.pickupEnd} aria-describedby="times-ist-hint" className="rounded border p-2" />
            <span className="text-sm text-slate-600">Times are in IST.</span>
          </>
        </label>

        <label className="grid gap-2">
          Pickup location
          <input name="locationText" required defaultValue={form.locationText} className="rounded border p-2" />
        </label>

        <ClaimLikelihoodPreview />

        {actingOrganization?.role === ROLES.DONOR && (
          <SubmitButton pendingText="Posting…">Post listing</SubmitButton>
        )}
      </form>
    </main>
  );
}
