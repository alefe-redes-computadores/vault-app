/**
 * M99 P2 — Pausa apenas de reforços locais por pessoa neste dispositivo.
 * Não modifica o horário prescrito, os registros de dose ou o estoque.
 */
import { VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";

export const VAULT_DOSE_PAUSE_CHANGED_M99P2 = "vault:m99-p2-pause-changed";
const STORAGE_KEY = "vault_m99_p2_pause_by_person";
const VALID_MINUTES = new Set([0, 15, 30, 60, 120]);

function validPersonId(value: string): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 && id.length <= 160 ? id : null;
}

function load(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([key, value]) => validPersonId(key) &&
          typeof value === "number" && Number.isSafeInteger(value) && value > 0)
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Se a pausa venceu, retorna null: nenhum bloqueio oculto permanece. */
export function getVaultDosePauseUntil(personId: string, now = Date.now()): number | null {
  const id = validPersonId(personId);
  if (!id || !Number.isFinite(now)) return null;
  const until = load()[id];
  return typeof until === "number" && until > now && until <= now + 120 * 60_000
    ? until : null;
}

/** Só concede pausa por uma das janelas visíveis; 0 retoma imediatamente. */
export function setVaultDosePauseMinutes(personId: string, minutes: number, now = Date.now()): boolean {
  const id = validPersonId(personId);
  if (!id || !VALID_MINUTES.has(minutes) || !Number.isSafeInteger(now) || typeof window === "undefined") return false;
  try {
    const values = load();
    if (minutes === 0) delete values[id];
    else values[id] = now + minutes * 60_000;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    window.dispatchEvent(new CustomEvent(VAULT_DOSE_PAUSE_CHANGED_M99P2));
    // Um único reconciliador canônico decide quais alarmes remover e manter.
    window.dispatchEvent(new CustomEvent(VAULT_NOTIFICATION_PREFERENCES_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Nunca bloqueia o alarme primário: apenas reforços do atraso. */
export function shouldKeepOverdueReinforcement(at: Date, now: Date, pauseUntil: number | null): boolean {
  const time = at.getTime();
  return Number.isFinite(time) && time > now.getTime() && (pauseUntil === null || time >= pauseUntil);
}
