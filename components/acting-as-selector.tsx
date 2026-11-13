"use client";

import { usePathname } from "next/navigation";
import { setActingOrganization } from "../app/actions/acting-as";

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
    <div className="flex flex-wrap items-center gap-3">
      <p aria-live="polite">
        Acting as: {selectedName} ({selectedRole})
      </p>
      <form action={setActingOrganization} className="flex items-center gap-2">
        <input type="hidden" name="returnTo" value={pathname} />
        <label className="sr-only" htmlFor="acting-organization">
          Choose an organization to act as
        </label>
        <select
          id="acting-organization"
          name="organizationId"
          defaultValue={selectedId}
          required
          className="rounded border p-2"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.role})
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border px-3 py-2">
          Switch
        </button>
      </form>
    </div>
  );
}
