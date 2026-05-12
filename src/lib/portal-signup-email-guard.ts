/** Shared rules for investor self-serve signup email domains (staff separation). */

export function getEmailDomain(email: string): string {
  const idx = email.lastIndexOf("@");
  return idx >= 0
    ? email
        .slice(idx + 1)
        .toLowerCase()
        .trim()
    : "";
}

export function getReservedStaffDomains(): string[] {
  const raw = (import.meta.env.VITE_STAFF_RESERVED_EMAIL_DOMAINS as string | undefined) ?? "";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isStrictAccountSeparationEnabled(): boolean {
  const raw =
    (import.meta.env.VITE_ENFORCE_STRICT_ACCOUNT_SEPARATION as string | undefined) ?? "false";
  return raw.trim().toLowerCase() === "true";
}
