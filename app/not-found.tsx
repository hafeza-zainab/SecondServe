export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-4xl content-center px-4 py-12 sm:px-6">
      <section className="surface-card grid gap-4 p-6 sm:max-w-2xl sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-green-800">SecondServe · 404</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="leading-7 text-muted">That page isn’t available. Head back to the home page or browse the current listings.</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a href="/" className="button-primary">Home</a>
          <a href="/listings" className="button-secondary">Browse listings</a>
        </div>
      </section>
    </main>
  );
}
