import model from "../../lib/model.json";

const features = [
  "Food type: Bakery, Cooked meals, or Produce indicators",
  "Quantity in kilograms and a preference for mid-size amounts",
  "Hours until pickup deadline, its logarithm, and a cooked-meal short-deadline interaction",
  "Pickup start time represented as daily sine and cosine values"
];

export default function ModelPage() {
  const accuracy = model.metadata?.heldOutAccuracy ?? model.heldOutAccuracy;
  const baseline = model.metadata?.majorityClassBaselineAccuracy;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Claim-likelihood model</h1>
      <p className="mb-6">
        The predictor estimates the chance that an open food listing will be claimed. It is a logistic regression trained only on generated sample data.
      </p>

      <section className="mb-8 rounded border p-5">
        <h2 className="mb-3 text-xl font-semibold">Features</h2>
        <ul className="list-disc space-y-2 pl-6">
          {features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
      </section>

      <section className="mb-8 rounded border p-5">
        <h2 className="mb-3 text-xl font-semibold">Generated dataset</h2>
        <p>
          2,400 rows are generated from seeded food-type, quantity, deadline, and pickup-time patterns with random noise, then split into training and held-out test data.
        </p>
        <p className="mt-3">Held-out accuracy: {((accuracy ?? 0) * 100).toFixed(1)}%</p>
        <p>Majority-class baseline: {((baseline ?? 0) * 100).toFixed(1)}%</p>
      </section>

      <p className="rounded border border-amber-700 bg-amber-50 p-4 font-medium">
        synthetic data; no real-world accuracy claim
      </p>
    </main>
  );
}
