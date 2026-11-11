/**
 * VAULT M116 — explicit, locally stored quick-dial contact, separate from the
 * encrypted safety plan. This is NOT an emergency dispatch or a clinical rule.
 * The user must consent to a readable name/telephone copy on this device.
 */
export type QuickSupportM116 = {
  contactId: string;
  label: string;
  phone: string;
  confirmedAt: string;
};
const validScope = (value: string) => Boolean(value && value.trim() && value.length <= 256);
export const quickSupportKeyM116 = (user: string, person: string) =>
  `vault:safety:quick-support:m116:v1:${encodeURIComponent(user)}:${encodeURIComponent(person)}`;
export function normalizedQuickPhoneM116(value: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/[\s().-]/g, "");
  return /^\+?[0-9]{8,15}$/.test(trimmed) ? trimmed : null;
}
function parse(value: unknown): QuickSupportM116 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.contactId !== "string" || !/^[\w:-]{1,128}$/.test(row.contactId) ||
      typeof row.label !== "string" || row.label.trim().length < 1 || row.label.length > 70 ||
      typeof row.phone !== "string" || !normalizedQuickPhoneM116(row.phone) ||
      typeof row.confirmedAt !== "string" || !Number.isFinite(Date.parse(row.confirmedAt))) return null;
  return {contactId: row.contactId, label: row.label.trim(), phone: row.phone, confirmedAt: row.confirmedAt};
}
export function readQuickSupportM116(user?: string | null, person?: string | null): QuickSupportM116 | null {
  if (typeof window === "undefined" || !user || !person || !validScope(user) || !validScope(person)) return null;
  try {
    const raw = window.localStorage.getItem(quickSupportKeyM116(user, person));
    return raw && raw.length < 650 ? parse(JSON.parse(raw)) : null;
  } catch { return null; }
}
export function saveQuickSupportM116(user: string, person: string,
  input: {contactId: string; label: string; phone: string}, consent: boolean): QuickSupportM116 {
  if (typeof window === "undefined" || !validScope(user) || !validScope(person) || consent !== true)
    throw Error("Selecione uma pessoa e autorize explicitamente a cópia local do contato.");
  const phone = normalizedQuickPhoneM116(input.phone);
  const row = parse({contactId: input.contactId, label: input.label.trim(), phone,
    confirmedAt: new Date().toISOString()});
  if (!row) throw Error("Selecione um contato com nome e telefone válidos.");
  window.localStorage.setItem(quickSupportKeyM116(user,person),JSON.stringify(row));
  return row;
}
export function clearQuickSupportM116(user: string, person: string): void {
  if (typeof window === "undefined" || !validScope(user) || !validScope(person)) throw Error("Conta ou pessoa ausente.");
  window.localStorage.removeItem(quickSupportKeyM116(user, person));
}
