import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const env = { ...process.env, DATABASE_URL: "file:./test.db" };
rmSync(resolve(root, "test.db"), { force: true });

function run(label: string, args: string[]) {
  console.log(`\n> node ${args.join(" ")}  (${label})`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env,
    stdio: "inherit"
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("apply schema to isolated test.db", [
  "--import",
  "tsx",
  "scripts/apply-schema.ts"
]);
run("run database service tests", [
  "--import",
  "tsx",
  "--test",
  "tests/services.test.ts"
]);
