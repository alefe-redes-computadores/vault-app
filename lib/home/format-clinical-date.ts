/** M110: data clínica somente para exibição. Nunca converte ou grava timestamps. */
export function formatVaultClinicalDateBR(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(raw);
  if (!match) return raw;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return raw;
  return `${match[3]}/${match[2]}/${match[1]}`;
}
