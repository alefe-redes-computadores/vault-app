/** M138: entrada hexadecimal local para a identidade visual, sem efeito clínico. */
export function normalizeMedicationIdentityHex(input: string): string | null {
  const raw = String(input || "").trim().replace(/^#/, "").toUpperCase();
  if (/^[0-9A-F]{3}$/.test(raw)) return `#${raw.split("").map(ch => ch + ch).join("")}`;
  if (/^[0-9A-F]{6}$/.test(raw)) return `#${raw}`;
  return null;
}
