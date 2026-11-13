"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-4xl content-center px-4 py-12 sm:px-6">
      <section className="surface-card grid gap-4 border-red-200 p-6 sm:max-w-2xl sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-red-800">SecondServe · temporary error</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Something went wrong</h1>
        <p className="leading-7 text-muted">This page couldn’t load. Try again, or return to the home page.</p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={reset} className="button-primary">Try again</button>
          <a href="/" className="button-secondary">Home</a>
        </div>
      </section>
    </main>
  );
}
