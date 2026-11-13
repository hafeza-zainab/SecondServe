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
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-green-800">How the estimate works</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Claim-likelihood model</h1>
      <p className="text-lg leading-8 text-muted">
        The predictor estimates the chance that an open food listing will be claimed. It is a logistic regression trained only on generated sample data.
      </p>
      </header>

      <div className="grid gap-5">
      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Features</h2>
        <ul className="list-disc space-y-3 pl-6 leading-7 text-muted">
          {features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Generated dataset</h2>
        <p className="max-w-3xl leading-7 text-muted">
          2,400 rows are generated from seeded food-type, quantity, deadline, and pickup-time patterns with random noise, then split into training and held-out test data.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl bg-green-50 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-950">Held-out accuracy</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight text-green-950">{((accuracy ?? 0) * 100).toFixed(1)}%</p>
          </article>
          <article className="rounded-xl bg-gray-50 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Majority-class baseline</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">{((baseline ?? 0) * 100).toFixed(1)}%</p>
          </article>
        </div>
      </section>

      <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 font-semibold text-amber-950">
        synthetic data; no real-world accuracy claim
      </p>
      </div>
    </main>
  );
}
