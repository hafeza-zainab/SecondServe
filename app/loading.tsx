export default function Loading() {
  return (
    <main className="mx-auto min-h-[50vh] max-w-6xl animate-pulse px-4 py-12 sm:px-6" aria-label="Loading page">
      <div className="mb-4 h-8 w-2/3 rounded bg-slate-200" />
      <div className="mb-8 h-4 w-full max-w-xl rounded bg-slate-100" />
      <p className="text-sm text-slate-600">Loading SecondServe…</p>
    </main>
  );
}
