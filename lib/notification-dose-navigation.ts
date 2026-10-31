/** Destinos explícitos por tipo. Nunca confirma dose nem muda pessoa. */
export function resolveDoseNotificationDestination(type: unknown): string | null {
  switch (type) {
    case "dose_overdue":
    case "dose_overdue_group":
      return "/?open=pending-doses";
    case "dose_reminder":
    case "dose_reminder_group":
    case "dose_planned":
      return "/hoje?focus=doses";
    default:
      return null;
  }
}
