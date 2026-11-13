"use client";

import { usePathname } from "next/navigation";
import { setActingOrganization } from "../app/actions/acting-as";
import { SubmitButton } from "./submit-button";

type OrganizationOption = {
  id: string;
  name: string;
  role: string;
};

type ActingAsSelectorProps = {
  organizations: OrganizationOption[];
  selectedId: string;
  selectedName: string;
  selectedRole: string;
};

export function ActingAsSelector({
  organizations,
  selectedId,
  selectedName,
  selectedRole
}: ActingAsSelectorProps) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <p className="min-w-0 break-words text-xs text-muted" aria-live="polite">
        Acting as: <span className="font-semibold text-ink">{selectedName} ({selectedRole})</span>
      </p>
      <form action={setActingOrganization} className="flex w-full min-w-0 flex-row items-center gap-2 sm:w-auto">
        <input type="hidden" name="returnTo" value={pathname} />
        <label className="sr-only" htmlFor="acting-organization">
          Choose an organization to act as
        </label>
        <select
          id="acting-organization"
          name="organizationId"
          defaultValue={selectedId}
          required
          className="min-w-0 max-w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.role})
            </option>
          ))}
        </select>
        <SubmitButton pendingText="Switching…" className="button-secondary min-h-0 px-3 py-2 text-sm">Switch</SubmitButton>
      </form>
    </div>
  );
}
