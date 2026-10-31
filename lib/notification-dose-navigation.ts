/** Destinos explícitos por tipo. Nunca confirma dose nem muda pessoa. */
export function resolveDoseNotificationDestination(type: unknown, horario?: unknown): string | null {
  // P8: metadado de horário apenas localiza o grupo; não marca tomada.
  const validTime = typeof horario === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);
  const doseRoute = validTime ? `/hoje?focus=doses&time=${encodeURIComponent(horario)}` : "/hoje?focus=doses";
  switch (type) {
    case "dose_overdue":
    case "dose_overdue_group":
      return "/?open=pending-doses";
    case "dose_reminder":
    case "dose_reminder_group":
    case "dose_planned":
      return doseRoute;
    default:
      return null;
  }
}
