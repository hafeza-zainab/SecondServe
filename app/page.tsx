import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const organizationCount = await prisma.organization.count();

  return (
    <main className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold">SecondServe</h1>
        <p>Organizations in database: {organizationCount}</p>
      </div>
    </main>
  );
}
