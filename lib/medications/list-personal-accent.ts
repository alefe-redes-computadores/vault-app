/** M64: visual-only medication identity. Never overrides regulatory classification. */
import type { Medicamento } from "@/lib/types";

type Identity = Pick<Medicamento, "cor_principal" | "cores">;

/** Accept only CSS hex colors, never a CSS expression or untrusted URL. */
function colorHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized.slice(1).split("").map(part => part + part).join("")}`.toUpperCase();
  }
  return null;
}

/** User-selected identity wins; capsule/tablet appearance is the fallback. */
export function medicationPersonalAccent(medication: Identity): string | null {
  return colorHex(medication.cor_principal) ?? colorHex(medication.cores?.[0]);
}

export function medicationPersonalAccentStyle(medication: Identity): {
  borderColor: string;
  backgroundColor: string;
} | undefined {
  const accent = medicationPersonalAccent(medication);
  return accent ? { borderColor: `${accent}55`, backgroundColor: `${accent}12` } : undefined;
}
