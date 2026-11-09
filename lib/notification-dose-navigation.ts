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
    case "dose_snooze_m99p3":
      return doseRoute;
    default:
      return null;
  }
}

/**
 * M107: sinaliza o modal somente se a Home JA estiver montada.
 * Em outra rota, a query /?open=pending-doses e a autoridade do destino.
 * Funcao pura: nao confirma doses, nao escreve dados nem troca de pessoa.
 */
export function shouldSignalPendingDosesInPlace(
  destination: string | null | undefined,
  pathname: string,
): boolean {
  return destination === "/?open=pending-doses" && pathname === "/";
}
