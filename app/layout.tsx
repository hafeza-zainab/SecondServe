import type { Metadata } from "next";
import { ActingAsSelector } from "../components/acting-as-selector";
import { ResetDemoButton } from "../components/reset-demo-button";
import { MainNav } from "../components/main-nav";
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
      <body className="flex min-h-screen flex-col bg-canvas font-sans text-app-ink">
        <header className="border-b border-line bg-panel px-4 py-4 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-3">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <a href="/" className="flex items-center gap-3 text-xl font-bold tracking-tight text-gray-950">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-green-800 text-sm font-extrabold text-white">S</span>
                SecondServe
              </a>
              <MainNav />
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
        <footer className="border-t border-line bg-panel px-4 py-6 text-center text-sm text-muted sm:px-6">
          <p>Sample data; resets when the server restarts</p>
          <a className="mt-1 inline-block underline" href="/about">About this project</a>
          <div className="mt-3 flex justify-center">
            <ResetDemoButton compact />
          </div>
        </footer>
      </body>
    </html>
  );
}
