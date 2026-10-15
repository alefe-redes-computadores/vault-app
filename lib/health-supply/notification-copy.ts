/** Presentation-only formatting for an already validated preparation-cycle deadline. */
export function formatSupplyDeadline(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "data não informada";
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    return "data não informada";
  return `${day}/${month}/${year}`;
}

/** Copy for push, in-app Brain and screen readers. No clinical inference. */
export function supplyPreparationMessage(input: {
  processTitle: string;
  deadline: string;
  missing: string[];
  daysRemaining: number;
}): string {
  const processTitle = input.processTitle.trim() || "Fornecimento";
  const date = formatSupplyDeadline(input.deadline);
  const lead = input.daysRemaining < 0
    ? `Preparação atrasada (data informada: ${date})`
    : input.daysRemaining === 0
      ? `Preparar documentação hoje (${date})`
      : `Preparar documentação até ${date}`;
  const missing = [...new Set(input.missing.map(x=>x.trim()).filter(Boolean))];
  const details = missing.length === 0
    ? "Confira as exigências da unidade."
    : `Pendências: ${missing.join("; ")}.`;
  return `${processTitle} · ${lead}. ${details}`;
}
