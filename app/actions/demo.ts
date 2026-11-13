"use server";

import { revalidatePath } from "next/cache";
import { resetDemoData } from "../../lib/demo";

export type DemoResetState = {
  kind: "idle" | "success" | "cooldown" | "error";
  message: string;
};

type DemoResetGlobal = typeof globalThis & {
  secondServeDemoResetAt?: number;
};

const demoResetGlobal = globalThis as DemoResetGlobal;
const RESET_COOLDOWN_MS = 30_000;

export async function resetDemoDataAction(
  _previousState: DemoResetState,
  _formData: FormData
): Promise<DemoResetState> {
  const now = Date.now();
  const lastResetAt = demoResetGlobal.secondServeDemoResetAt ?? 0;
  const remainingMs = RESET_COOLDOWN_MS - (now - lastResetAt);
  if (lastResetAt > 0 && remainingMs > 0) {
    return {
      kind: "cooldown",
      message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before resetting again.`
    };
  }

  demoResetGlobal.secondServeDemoResetAt = now;
  try {
    await resetDemoData();
    revalidatePath("/", "layout");
    return { kind: "success", message: "Demo data reset to the sample starting state." };
  } catch {
    console.error("Demo data reset failed.");
    return { kind: "error", message: "Could not reset demo data. Please try again later." };
  }
}
