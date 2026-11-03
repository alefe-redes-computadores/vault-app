/**
 * M49: allow only app-local navigation prepared from persisted reminders.
 * This does not certify clinical evidence or write data.
 */
export function isSafeLocalActionHref(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !value || value.length > 2048) return false;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const destination = new URL(value, "https://vault.local");
    if (destination.origin !== "https://vault.local") return false;
    const decodedPath = decodeURIComponent(destination.pathname);
    if (decodedPath.startsWith("//") || decodedPath.includes("\\")) return false;
    return true;
  } catch {
    return false;
  }
}
