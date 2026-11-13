import { redirect } from "next/navigation";
import { FOOD_TYPES, ROLES } from "../../lib/constants";
import { getActingOrganization } from "../../lib/acting-as";
import { ClaimLikelihoodPreview } from "../../components/claim-likelihood-preview";
import { FillExampleButton } from "../../components/fill-example-button";
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-green-800">Share surplus</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Post a food listing</h1>
        <p className="mt-3 text-muted">Add the food and pickup details so a nearby NGO can claim it.</p>
      </div>

      {posted === "1" && (
        <p className="mb-6 rounded-xl border border-green-300 bg-app-accent-soft p-4 font-semibold text-green-950" role="status" aria-live="polite">
          Listing posted
        </p>
      )}
      {error && errorMessages[error] && (
        <p className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 font-medium text-red-900" role="alert" aria-live="assertive">
          {errorMessages[error]}
        </p>
      )}

      <form id="donate-listing-form" action={createListing} className="grid gap-5 md:grid-cols-[1.15fr_0.85fr] md:gap-8">
        <div className="md:col-span-2">
          <FillExampleButton />
        </div>
        {actingOrganization?.role === ROLES.DONOR ? (
          <p className="md:col-span-2 text-sm text-muted">Posting as <span className="font-semibold text-gray-900">{actingOrganization.name}</span></p>
        ) : (
          <p className="md:col-span-2" role="alert" aria-live="assertive">Select a donor organization in the acting-as control to post.</p>
        )}

        <div className="grid content-start gap-5">
        <label className="grid gap-2">
          Food item
          <input name="title" required defaultValue={form.title} className="rounded-lg border border-line bg-panel px-3 py-2.5" />
        </label>

        <label className="grid gap-2">
          Food type
          <select name="foodType" required defaultValue={form.foodType ?? ""} className="rounded-lg border border-line bg-panel px-3 py-2.5">
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
            className="rounded-lg border border-line bg-panel px-3 py-2.5"
          />
        </label>

        <label className="grid gap-2">
          Pickup starts
          <>
            <input name="pickupStart" type="datetime-local" required defaultValue={form.pickupStart} aria-describedby="times-ist-hint" className="rounded-lg border border-line bg-panel px-3 py-2.5" />
            <span id="times-ist-hint" className="text-sm text-slate-600">Times are in IST.</span>
          </>
        </label>

        <label className="grid gap-2">
          Pickup ends
          <>
            <input name="pickupEnd" type="datetime-local" required defaultValue={form.pickupEnd} aria-describedby="times-ist-hint" className="rounded-lg border border-line bg-panel px-3 py-2.5" />
            <span className="text-sm text-slate-600">Times are in IST.</span>
          </>
        </label>

        <label className="grid gap-2">
          Pickup location
          <input name="locationText" required defaultValue={form.locationText} className="rounded-lg border border-line bg-panel px-3 py-2.5" />
        </label>
        </div>

        <aside className="surface-card h-fit bg-green-50/60 p-5 sm:p-6">
          <p className="mb-1 text-sm font-bold uppercase tracking-wide text-green-900">Live estimate</p>
          <h2 className="mb-4 text-xl font-bold">Claim likelihood</h2>
          <ClaimLikelihoodPreview />
          <p className="mt-4 text-sm leading-6 text-muted">The estimate updates as you change the food type, quantity, and pickup window. It is based on synthetic data.</p>
        </aside>

        {actingOrganization?.role === ROLES.DONOR && (
          <div className="md:col-span-2">
            <SubmitButton pendingText="Posting…">Post listing</SubmitButton>
          </div>
        )}
      </form>
    </main>
  );
}
