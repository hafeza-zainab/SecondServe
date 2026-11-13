import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const routes = [
  ["/", "SecondServe"],
  ["/donate", "Post a food listing"],
  ["/listings", "Available listings"],
  ["/dashboard", "Impact dashboard"],
  ["/model", "Claim-likelihood model"],
  ["/about", "About SecondServe"]
] as const;

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local TCP port."));
        return;
      }
      const { port } = address;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

function delay(milliseconds: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function stopServer(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(resolveStop, 3000);
    timeout.unref();
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
    child.kill();
  });
}

async function main() {
  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  const nextCli = resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const server = spawn(process.execPath, [nextCli, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  let startupError: Error | undefined;
  server.once("error", (error) => { startupError = error; });

  try {
    const deadline = Date.now() + 60_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      if (server.exitCode !== null) {
        throw new Error(`next start exited early with code ${server.exitCode}.`);
      }
      try {
        const response = await fetch(origin);
        if (response.status >= 200 && response.status < 500) {
          ready = true;
          break;
        }
      } catch {
        // The server is still starting; retry until the bounded deadline.
      }
      await delay(250);
    }
    if (!ready) throw new Error("next start did not answer within 60 seconds.");

    for (const [path, expectedText] of routes) {
      const response = await fetch(new URL(path, origin));
      const body = await response.text();
      console.log(`${path}: HTTP ${response.status}`);
      if (response.status !== 200) {
        throw new Error(`${path} returned HTTP ${response.status}; expected HTTP 200.`);
      }
      if (!body.includes(expectedText)) {
        throw new Error(`${path} did not contain expected text: ${expectedText}`);
      }
    }
  } finally {
    await stopServer(server);
  }
}

main().catch((error: unknown) => {
  console.error("Smoke check failed:", error);
  process.exitCode = 1;
});
