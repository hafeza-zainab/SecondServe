"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/db";
import { ACTING_ORGANIZATION_COOKIE } from "../../lib/acting-as";
import { ROLES } from "../../lib/constants";
import {
  identityErrorDestination,
  sanitizeIdentityReturnTo
} from "../../lib/identity-return-to";

export async function setActingOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const returnToValue = String(formData.get("returnTo") ?? "/");
  const returnTo = sanitizeIdentityReturnTo(returnToValue);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { role: true }
  });

  if (
    !organization ||
    (organization.role !== ROLES.DONOR && organization.role !== ROLES.NGO)
  ) {
    redirect(identityErrorDestination(returnTo));
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTING_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60
  });
  redirect(returnTo);
}
