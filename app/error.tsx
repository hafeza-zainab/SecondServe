"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="mx-auto grid min-h-[50vh] max-w-3xl content-center gap-4 px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase text-green-800">SecondServe</p>
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-slate-700">This page couldn’t load. Try again, or return to the home page.</p>
      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={reset} className="rounded bg-slate-950 px-4 py-2 text-white">Try again</button>
        <a href="/" className="self-center underline">Home</a>
      </div>
    </main>
  );
}
