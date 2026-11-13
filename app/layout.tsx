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
      <body>
        <header className="border-b px-6 py-4">
          <div className="mx-auto max-w-6xl">
            <ActingAsSelector
              organizations={organizations}
              selectedId={actingOrganization?.id ?? ""}
              selectedName={actingOrganization?.name ?? "No donor available"}
              selectedRole={actingOrganization?.role ?? ""}
            />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
