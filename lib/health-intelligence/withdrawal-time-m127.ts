/** Horário opcional, porém nunca persistir um texto inválido como horário. */
export function parseWithdrawalTimeM127(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return value;
}
export function maskWithdrawalTimeM127(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0,4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0,2)}:${digits.slice(2)}`;
}
