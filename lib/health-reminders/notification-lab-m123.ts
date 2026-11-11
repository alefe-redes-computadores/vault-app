/** M123 — read-only preview. Only the scheduler may actually schedule or cancel. */
import type { HealthReminderRule } from "./types";

export type NotificationLabStatusM123 = "missing_scope" | "none" | "paused" | "master_off" | "category_off" | "permission" | "quiet" | "eligible";
export type NotificationLabPreviewM123 = Readonly<{
  status: NotificationLabStatusM123;
  title: string;
  body: string;
  channel: "vault-health-reminders" | "vault-health-checkin-private-m115" | null;
  visibility: "public" | "private" | "not_applicable";
  nextTime: string | null;
  route: string | null;
  note: string;
}>;

/** Inputs come from existing owner-scoped hook, scheduler occurrence and M115 quiet-hours engine. */
export function projectNotificationLabM123(input: {
  rule: HealthReminderRule | null;
  userId: string;
  personId: string;
  next: Date | null;
  quietAtNext: boolean;
  master: boolean;
  category: boolean;
  permission: string;
}): NotificationLabPreviewM123 {
  const { rule, userId, personId, next, quietAtNext, master, category, permission } = input;
  const validScope = Boolean(userId && personId && rule && rule.user_id === userId && rule.person_id === personId);
  const privateCheckIn = validScope && rule?.target_type === "health_record:humor";
  const nextTime = next instanceof Date && Number.isFinite(next.getTime()) ? next.toISOString() : null;
  const validRoute = validScope && typeof rule!.target_route === "string" && rule!.target_route.startsWith("/") && !rule!.target_route.startsWith("//") && !/[\\\u0000-\u001f]/.test(rule!.target_route);
  const status: NotificationLabStatusM123 = !validScope ? "missing_scope"
    : rule!.status !== "active" ? "paused"
    : !master ? "master_off"
    : !category ? "category_off"
    : permission !== "granted" ? "permission"
    : !nextTime ? "none"
    : quietAtNext ? "quiet" : "eligible";
  if (!validScope) return {
    status, title: "Prévia indisponível", body: "Selecione uma pessoa e um lembrete desta conta.", channel: null,
    visibility: "not_applicable", nextTime: null, route: null, note: "Nenhum dado de outra pessoa é apresentado.",
  };
  const title = privateCheckIn ? "Lembrete do Vault" : rule!.title;
  const body = privateCheckIn ? "Abra o aplicativo para revisar uma atividade que você configurou." : rule!.body || "Hora de registrar no Vault.";
  const note = status === "eligible" ? "Elegível para agendamento; não comprova que o Android entregará o aviso."
    : status === "quiet" ? "A ocorrência apresentada está no silêncio configurado e é omitida pelo agendador."
    : status === "permission" ? "Permissão do aparelho não confirmada: o aviso não será agendado agora."
    : status === "master_off" ? "Preferência geral desativada."
    : status === "category_off" ? "Categoria lembretes de saúde desativada."
    : status === "paused" ? "Lembrete pausado."
    : "Nenhuma próxima ocorrência válida identificada na janela consultada.";
  return { status, title, body,
    channel: privateCheckIn ? "vault-health-checkin-private-m115" : "vault-health-reminders",
    visibility: privateCheckIn ? "private" : "public", nextTime,
    route: validRoute ? rule!.target_route : null, note };
}
