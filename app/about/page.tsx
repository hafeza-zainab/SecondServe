import { AI_DISCLOSURE, LIMITS, METRICS, PROBLEM, SETTING } from "../../lib/project-info";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-[50vh] max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-4 text-3xl font-semibold">About SecondServe</h1>
      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Setting</h2>
        <p>{SETTING}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Problem</h2>
        <p className="leading-7 text-slate-700">{PROBLEM}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Dashboard metrics</h2>
        <ul className="list-disc space-y-1 pl-6">
          {METRICS.map((metric) => <li key={metric}>{metric}</li>)}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Limits</h2>
        <p className="mb-3 text-slate-700">The free host may take about a minute to respond on first load.</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-700">
          {LIMITS.map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">AI disclosure</h2>
        <p className="leading-7 text-slate-700">{AI_DISCLOSURE}</p>
      </section>
    </main>
  );
}
