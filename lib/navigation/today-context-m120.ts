/**
 * VAULT M120 — navegação contextual somente de apresentação.
 * Não lê nem altera IndexedDB, Supabase, doses, estoque ou relações clínicas.
 * A URL transporta apenas estado de exibição; conta e pessoa permanecem
 * sob autoridade dos hooks e repositórios já existentes.
 */
import { safeReturnTarget } from "./return-context";

export type TodayStatusM120 = "todos" | "pendentes" | "tomados" | "ignorados";
export type TodayPeriodM120 = "todos" | "manha" | "tarde" | "noite";
export type TodayAppointmentM120 = "todos" | "consultas" | "cirurgias" | "exames" | "retiradas";

export type TodayNavigationInputM120 = {
  date: string;
  today: string;
  query: Pick<URLSearchParams, "get">;
  status: TodayStatusM120;
  period: TodayPeriodM120;
  appointment: TodayAppointmentM120;
  showResolved: boolean;
};

/** Checagem de calendário estrita, sem converter 31/02 em março. */
export function validTodayDateM120(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function permitted<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && allowed.some(option => option === value) ? value as T : null;
}

/**
 * Recompõe a data mantendo filtros selecionados e o return_to anterior.
 * Não propaga action, parâmetros de terceiros, IDs de conta/pessoa ou URLs externas.
 */
export function buildTodayContextUrlM120(input: TodayNavigationInputM120): string {
  const { date, today, query, status, period, appointment, showResolved } = input;
  const requested = validTodayDateM120(date) ? date : today;
  const output = new URLSearchParams();
  if (requested !== today) output.set("data", requested);

  const retro = query.get("retro") === "1";
  const medicationId = query.get("medicamento");
  if (retro && medicationId && /^[\w-]{1,128}$/.test(medicationId)) {
    output.set("retro", "1");
    output.set("medicamento", medicationId);
  }

  if (status !== "todos") output.set("status", status);
  if (period !== "todos") output.set("periodo", period);
  if (appointment !== "todos") output.set("compromisso", appointment);
  if (showResolved && status === "todos") output.set("concluidas", "1");

  if (query.get("focus") === "doses") {
    output.set("focus", "doses");
    const time = query.get("time");
    if (time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) output.set("time", time);
  }

  const returnTo = query.get("return_to");
  if (returnTo) {
    const safe = safeReturnTarget(returnTo, "");
    if (safe && safe.split(/[?#]/)[0] !== "/hoje") output.set("return_to", safe);
  }
  const qs = output.toString();
  return qs ? `/hoje?${qs}` : "/hoje";
}

/** Apenas a origem relativa e segura autoriza o botão "Voltar à origem". */
export function todayOriginM120(query: Pick<URLSearchParams, "get">): string | null {
  const returnTo = query.get("return_to");
  if (!returnTo) return null;
  const origin = safeReturnTarget(returnTo, "");
  if (!origin || origin.split(/[?#]/)[0] === "/hoje") return null;
  return origin;
}

/** Exibe o motivo de entrada, sem inferir que qualquer dose foi tomada. */
export function todayContextLabelM120(input: {
  status: TodayStatusM120; period: TodayPeriodM120; time: string | null;
  isPast: boolean; isFuture: boolean;
}): string[] {
  const statusLabel: Record<TodayStatusM120, string> = {
    todos: "", pendentes: input.isFuture ? "Doses previstas" : input.isPast ? "Doses sem confirmação" : "Doses pendentes",
    tomados: "Doses registradas como tomadas", ignorados: "Doses registradas como ignoradas",
  };
  const periodLabel: Record<TodayPeriodM120, string> = {
    todos: "", manha: "Manhã", tarde: "Tarde", noite: "Noite",
  };
  const labels = [statusLabel[input.status], periodLabel[input.period]];
  if (input.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) labels.push(`Horário ${input.time}`);
  return labels.filter(Boolean);
}

/**
 * Ao consumir `action=dose`, não use os filtros do primeiro render, que ainda
 * podem estar em hidratação. Preserve as opções explícitas da URL, validadas.
 */
export function consumeTodayActionM120(query: Pick<URLSearchParams, "get">, date: string, today: string): string {
  return buildTodayContextUrlM120({
    date, today, query,
    status: permitted(query.get("status"), ["todos", "pendentes", "tomados", "ignorados"] as const) ?? "todos",
    period: permitted(query.get("periodo"), ["todos", "manha", "tarde", "noite"] as const) ?? "todos",
    appointment: permitted(query.get("compromisso"), ["todos", "consultas", "cirurgias", "exames", "retiradas"] as const) ?? "todos",
    showResolved: query.get("concluidas") === "1",
  });
}
