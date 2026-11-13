"use client";

import { useActionState, type FormEvent } from "react";
import { resetDemoDataAction, type DemoResetState } from "../app/actions/demo";
import { SubmitButton } from "./submit-button";

const initialState: DemoResetState = { kind: "idle", message: "" };

type ResetDemoButtonProps = {
  compact?: boolean;
};

export function ResetDemoButton({ compact = false }: ResetDemoButtonProps) {
  const [state, formAction] = useActionState(resetDemoDataAction, initialState);

  function confirmReset(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Reset all demo data to the sample starting state? This removes listings and claims created during this session.")) {
      event.preventDefault();
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <form action={formAction} onSubmit={confirmReset}>
        <SubmitButton
          pendingText="Resetting…"
          className={compact
            ? "button-secondary min-h-0 px-3 py-2 text-sm"
            : "button-primary"}
        >
          Reset demo data
        </SubmitButton>
      </form>
      {state.message && (
        <p className="text-sm" role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </div>
  );
}
