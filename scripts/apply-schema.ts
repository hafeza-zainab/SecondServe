import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/db";

async function applySchema() {
  const schemaPath = resolve(process.cwd(), "prisma/schema.sql");
  const source = readFileSync(schemaPath, "utf8");
  const withoutComments = source
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log(`Applied ${statements.length} schema statements from ${schemaPath}.`);
}

applySchema()
  .catch((error: unknown) => {
    console.error("Schema initialization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
