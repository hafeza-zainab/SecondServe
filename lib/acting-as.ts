import { cookies } from "next/headers";
import { prisma } from "./db";
import { ROLES } from "./constants";
import { isValidEntityId } from "./input-limits";

export const ACTING_ORGANIZATION_COOKIE = "secondserve-acting-org";

export async function getActingOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ACTING_ORGANIZATION_COOKIE)?.value;
  return isValidEntityId(selectedId) ? selectedId : null;
}

export async function getActingOrganizations() {
  return prisma.organization.findMany({
    where: { role: { in: [ROLES.DONOR, ROLES.NGO] } },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true }
  });
}

export async function getActingOrganization() {
  const selectedId = await getActingOrganizationId();

  if (selectedId) {
    const selected = await prisma.organization.findUnique({
      where: { id: selectedId },
      select: { id: true, name: true, role: true }
    });
    if (selected && (selected.role === ROLES.DONOR || selected.role === ROLES.NGO)) {
      return selected;
    }
  }

  const donors = await prisma.organization.findMany({
    where: { role: ROLES.DONOR },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true }
  });
  return donors.find((donor) => donor.name.endsWith("(sample)")) ?? donors[0] ?? null;
}
