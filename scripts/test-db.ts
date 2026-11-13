import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const prismaCli = resolve(root, "node_modules/prisma/build/index.js");
const env = { ...process.env, DATABASE_URL: "file:./test.db" };

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

run("prepare isolated test.db", [prismaCli, "db", "push"]);
run("run database service tests", [
  "--import",
  "tsx",
  "--test",
  "tests/services.test.ts"
]);
