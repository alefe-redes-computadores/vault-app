import type {
  CreateHealthReminderInput,
  HealthReminderFrequency,
  HealthReminderStatus,
} from "./types";

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export const HEALTH_REMINDER_TARGETS = [
  { type: "health_record:agua", route: "/saude/hidratacao", label: "Registrar hidratação", description: "Abre os atalhos e o histórico de água." },
  { type: "health_record:medicao", route: "/saude/registros/novo?preset=medicao", label: "Registrar medição", description: "Abre um novo registro já preparado para uma medição." },
  { type: "health_record:sintoma", route: "/saude/registros/novo?preset=sintoma", label: "Registrar sintoma", description: "Abre um novo registro já preparado para um sintoma." },
] as const;

export type HealthReminderTargetType = typeof HEALTH_REMINDER_TARGETS[number]["type"];

export function normalizeWeekdays(value: readonly number[]): number[] {
  return Array.from(new Set(value.filter((day) =>
    Number.isInteger(day) && day >= 0 && day <= 6
  ))).sort((a, b) => a - b);
}

function validFrequency(value: string): value is HealthReminderFrequency {
  return value === "daily" || value === "weekly" || value === "custom";
}

function validStatus(value: string): value is HealthReminderStatus {
  return value === "active" || value === "paused";
}

export function normalizeHealthReminderInput(
  input: CreateHealthReminderInput
): CreateHealthReminderInput {
  const title = input.title.trim();
  const body = input.body?.trim() || undefined;
  const targetType = input.target_type.trim();
  const targetRoute = input.target_route.trim();
  const weekdays = normalizeWeekdays(input.weekdays || []);

  if (!title) throw new Error("Informe um título para o lembrete.");
  if (!CLOCK.test(input.time)) throw new Error("Informe um horário válido.");
  if (!validFrequency(input.frequency)) throw new Error("Frequência inválida.");
  if (!validStatus(input.status)) throw new Error("Status inválido.");
  if (!targetRoute.startsWith("/") || targetRoute.startsWith("//")) {
    throw new Error("O lembrete precisa abrir uma rota interna do Vault.");
  }
  if (!HEALTH_REMINDER_TARGETS.some((target) =>
    target.type === targetType && target.route === targetRoute
  )) {
    throw new Error("Destino do lembrete não reconhecido pelo Vault.");
  }
  if (input.frequency === "weekly" && weekdays.length !== 1) {
    throw new Error("O lembrete semanal precisa ter exatamente um dia selecionado.");
  }
  if (input.frequency === "custom" && weekdays.length === 0) {
    throw new Error("Selecione pelo menos um dia para a frequência personalizada.");
  }

  return {
    ...input,
    title,
    body,
    target_type: targetType,
    target_route: targetRoute,
    weekdays: input.frequency === "daily" ? [] : weekdays,
  };
}

export function reminderRunsOnWeekday(
  frequency: HealthReminderFrequency,
  weekdays: readonly number[],
  weekday: number
): boolean {
  return frequency === "daily" || normalizeWeekdays(weekdays).includes(weekday);
}
