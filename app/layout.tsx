import type { Metadata } from "next";
import { ActingAsSelector } from "../components/acting-as-selector";
import { getActingOrganization, getActingOrganizations } from "../lib/acting-as";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondServe",
  description: "SecondServe"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [organizations, actingOrganization] = await Promise.all([
    getActingOrganizations(),
    getActingOrganization()
  ]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-slate-950">
        <header className="border-b bg-slate-50 px-4 py-4 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <a href="/" className="text-xl font-bold tracking-tight">SecondServe</a>
              <nav aria-label="Main navigation" className="flex w-full flex-col gap-2 text-sm sm:w-auto sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
                <a className="underline-offset-4 hover:underline" href="/">Home</a>
                <a className="underline-offset-4 hover:underline" href="/donate">Donate</a>
                <a className="underline-offset-4 hover:underline" href="/listings">Listings</a>
                <a className="underline-offset-4 hover:underline" href="/dashboard">Dashboard</a>
                <a className="underline-offset-4 hover:underline" href="/my">My activity</a>
                <a className="underline-offset-4 hover:underline" href="/model">Model</a>
                <a className="underline-offset-4 hover:underline" href="/about">About</a>
              </nav>
            </div>
            <ActingAsSelector
              organizations={organizations}
              selectedId={actingOrganization?.id ?? ""}
              selectedName={actingOrganization?.name ?? "No donor available"}
              selectedRole={actingOrganization?.role ?? ""}
            />
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t px-4 py-5 text-center text-sm text-slate-600 sm:px-6">
          <p>Sample data; resets when the server restarts</p>
          <a className="mt-1 inline-block underline" href="/about">About this project</a>
        </footer>
      </body>
    </html>
  );
}
