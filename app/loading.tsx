export default function Loading() {
  return (
    <main className="mx-auto min-h-[50vh] max-w-6xl px-4 py-12 sm:px-6" aria-label="Loading page" aria-busy="true">
      <div className="surface-card grid gap-4 p-6 sm:max-w-2xl sm:p-8">
        <div className="h-8 w-2/3 rounded-lg bg-gray-200 motion-safe:animate-pulse" />
        <div className="h-4 w-full rounded-lg bg-gray-100 motion-safe:animate-pulse" />
        <p className="text-sm font-medium text-muted">Loading SecondServe…</p>
      </div>
    </main>
  );
}
