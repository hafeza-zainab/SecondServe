export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[50vh] max-w-3xl content-center gap-4 px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase text-green-800">SecondServe</p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-slate-700">That page isn’t available. Head back to the home page or browse the current listings.</p>
      <div className="flex flex-wrap gap-4">
        <a href="/" className="underline">Home</a>
        <a href="/listings" className="underline">Listings</a>
      </div>
    </main>
  );
}
