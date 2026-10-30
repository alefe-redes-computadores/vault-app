export function mascaraData(value: string) {
  return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{4})\d+?$/, "$1");
}

export function isoParaBr(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("T")[0].split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

export function brParaIso(br: string) {
  const parts = br.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  const [day, month, year] = parts.map(Number);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) || day < 1 || month < 1 || month > 12) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function handleCurrencyMask(value: string) {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "";
  return (parseInt(clean, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCurrency(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function handleTimeMask(value: string) {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (!clean) return "";
  return clean.length > 2 ? `${clean.slice(0, 2)}:${clean.slice(2)}` : clean;
}

export function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function parsePositiveOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizeHorarios(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

export function arraysEqual(first: string[], second: string[]) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

export function isVaultStorageUrl(url?: string) {
  return Boolean(url?.includes("/storage/v1/object/public/vault-attachments/"));
}

export function getPositiveNumberOrNull(value: string): number | null {
  const parsed = parsePositiveOptionalNumber(value);
  return parsed ?? null;
}
