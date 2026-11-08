/**
 * VAULT M99 P1 — Política local, por pessoa, de intensidade de lembretes.
 * Não representa um registro clínico, não marca doses e não muda prescrição.
 */
import { VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";

export type VaultDoseAlertMode = "suave" | "reforcado" | "persistente";
export const VAULT_DOSE_ALERT_MODE_EVENT = "vault:m99-dose-alert-mode";
const STORAGE_KEY = "vault_m99_dose_alert_mode_v1";
const MODES = new Set<VaultDoseAlertMode>(["suave", "reforcado", "persistente"]);

function safePersonId(id: string): string | null {
  const value = typeof id === "string" ? id.trim() : "";
  return value.length >= 1 && value.length <= 160 ? value : null;
}

function readSettings(): Record<string, VaultDoseAlertMode> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([id, mode]) => Boolean(safePersonId(id)) && MODES.has(mode as VaultDoseAlertMode));
    return Object.fromEntries(entries) as Record<string, VaultDoseAlertMode>;
  } catch {
    return {};
  }
}

export function getVaultDoseAlertMode(personId: string): VaultDoseAlertMode {
  const id = safePersonId(personId);
  if (!id) return "suave";
  return Object.prototype.hasOwnProperty.call(readSettings(), id) ? readSettings()[id] : "suave";
}

export function setVaultDoseAlertMode(personId: string, mode: VaultDoseAlertMode): boolean {
  const id = safePersonId(personId);
  if (!id || !MODES.has(mode) || typeof window === "undefined") return false;
  try {
    const next = { ...readSettings(), [id]: mode };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(VAULT_DOSE_ALERT_MODE_EVENT));
    // Reconciliação canônica, sem agendar nada aqui.
    window.dispatchEvent(new CustomEvent(VAULT_NOTIFICATION_PREFERENCES_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Os offsets são minutos APÓS o slot, todos positivos. Máximo 4 alertas por slot.
 * Suave preserva exatamente o primeiro lembrete legado; os outros modos são opt-in.
 */
export function doseAlertOffsetsForMode(mode: VaultDoseAlertMode, configured: number[]): number[] {
  const positive = Array.from(new Set((configured || [])
    .filter((value) => Number.isFinite(value) && Number.isInteger(value) && value > 0 && value <= 1440)))
    .sort((a, b) => a - b);
  const first = positive[0] ?? 30;
  if (mode === "suave") return [first];
  const extras = mode === "reforcado" ? [first + 60] : [first + 30, first + 90, first + 180];
  return Array.from(new Set([first, ...extras].filter(value => value <= 1440))).sort((a, b) => a - b);
}
