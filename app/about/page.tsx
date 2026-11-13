import { AI_DISCLOSURE, LIMITS, METRICS, PROBLEM, SETTING } from "../../lib/project-info";
import { ResetDemoButton } from "../../components/reset-demo-button";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-[50vh] max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-green-800">Project notes</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">About SecondServe</h1>
        <p className="text-lg leading-8 text-muted">A sample workflow for coordinating surplus food, claims, and pickup confirmation.</p>
      </header>
      <div className="grid gap-5">
      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-2 text-xl font-bold tracking-tight">Setting</h2>
        <p className="leading-7 text-muted">{SETTING}</p>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-2 text-xl font-bold tracking-tight">Problem</h2>
        <p className="leading-7 text-slate-700">{PROBLEM}</p>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Dashboard metrics</h2>
        <ul className="list-disc space-y-2 pl-6 leading-7 text-muted">
          {METRICS.map((metric) => <li key={metric}>{metric}</li>)}
        </ul>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Limits</h2>
        <ul className="list-disc space-y-2 pl-6 text-slate-700">
          {LIMITS.map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-2 text-xl font-bold tracking-tight">AI disclosure</h2>
        <p className="leading-7 text-slate-700">{AI_DISCLOSURE}</p>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <h2 className="mb-2 text-xl font-bold tracking-tight">Demo controls</h2>
        <p className="mb-3 leading-7 text-slate-700">Use the acting-as selector to try the sample donor and NGO flows. It is a demo identity control, not real authentication.</p>
        <p className="mb-4 leading-7 text-slate-700">Reset sample data to remove changes made during your walkthrough. The button asks for confirmation and has a 30-second per-process cooldown. On the hosted demo, data resets when the server restarts or redeploys, and the first load can take about a minute.</p>
        <ResetDemoButton />
      </section>
      </div>
    </main>
  );
}
