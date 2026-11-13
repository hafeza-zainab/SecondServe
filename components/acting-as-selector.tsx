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
      <p className="min-w-0 break-words text-sm" aria-live="polite">
        Acting as: <span className="font-medium">{selectedName} ({selectedRole})</span>
      </p>
      <form action={setActingOrganization} className="flex w-full min-w-0 flex-col items-start gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <input type="hidden" name="returnTo" value={pathname} />
        <label className="sr-only" htmlFor="acting-organization">
          Choose an organization to act as
        </label>
        <select
          id="acting-organization"
          name="organizationId"
          defaultValue={selectedId}
          required
          className="max-w-full rounded border bg-white p-2"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.role})
            </option>
          ))}
        </select>
        <SubmitButton pendingText="Switching…" className="rounded border bg-white px-3 py-2">Switch</SubmitButton>
      </form>
    </div>
  );
}
