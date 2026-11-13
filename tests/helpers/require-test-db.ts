import { basename } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const databaseFile = databaseUrl?.startsWith("file:")
  ? databaseUrl.slice("file:".length).split(/[?#]/, 1)[0]
  : "";

if (!databaseFile || !basename(databaseFile).toLowerCase().includes("test")) {
  throw new Error(
    'Refusing to run DB tests: DATABASE_URL must point to a file whose name contains "test".'
  );
}
