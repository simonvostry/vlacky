// A single exact address is intentional. Missing configuration denies access.
export function isAllowedEmail(email: unknown, allowedEmail = process.env.AUTH_ALLOWED_EMAIL): boolean {
  return typeof email === "string" && !!allowedEmail?.trim()
    && email.trim().toLowerCase() === allowedEmail.trim().toLowerCase();
}

export function isAllowedGoogleAccount(
  provider: unknown, email: unknown, emailVerified: unknown,
  allowedEmail = process.env.AUTH_ALLOWED_EMAIL,
): boolean {
  return provider === "google" && emailVerified === true && isAllowedEmail(email, allowedEmail);
}

export function isGoogleLoginConfigured(): boolean {
  return !!(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID
    && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_ALLOWED_EMAIL?.trim());
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/soupravy";
  try {
    const origin = "https://vlacky.invalid";
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname.startsWith("/api/") || url.pathname === "/prihlaseni") return "/soupravy";
    return url.pathname + url.search;
  } catch {
    return "/soupravy";
  }
}
