const INTERNAL_ORIGIN = "https://secondserve.invalid";
const ALLOWED_IDENTITY_ROUTES = new Set([
  "/",
  "/donate",
  "/listings",
  "/dashboard",
  "/model",
  "/about"
]);

export function sanitizeIdentityReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  try {
    const destination = new URL(value, INTERNAL_ORIGIN);
    if (
      destination.origin !== INTERNAL_ORIGIN ||
      !ALLOWED_IDENTITY_ROUTES.has(destination.pathname)
    ) {
      return "/";
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export function identityErrorDestination(returnTo: string): string {
  const destination = new URL(
    sanitizeIdentityReturnTo(returnTo),
    INTERNAL_ORIGIN
  );
  destination.searchParams.set("identity", "invalid");
  return `${destination.pathname}${destination.search}${destination.hash}`;
}
