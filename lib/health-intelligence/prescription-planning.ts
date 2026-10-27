import type { HealthInsightContext } from "@/lib/health-insights";

export type PrescriptionPlanItem = {
  medicationId: string;
  medicationName: string;
  date: string;
  dayOffset: number;
  due: boolean;
  href: string;
};

export type PrescriptionPlanningPortfolio = {
  items: PrescriptionPlanItem[];
  upcoming: number;
  due: number;
  next: PrescriptionPlanItem | null;
};

const DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dayAt = (value: string) => Date.parse(`${value}T12:00:00.000Z`);

/** Explicit user dates only. A plan never becomes a received prescription. */
export function buildPrescriptionPlanningPortfolio(context: HealthInsightContext): PrescriptionPlanningPortfolio {
  const today = DATE_RE.test(context.hoje || "") ? context.hoje! : new Date().toISOString().slice(0, 10);
  const items = context.medicamentos.flatMap<PrescriptionPlanItem>(medication => {
    const date = medication.lembrete_receita_modo === "data_personalizada" ? medication.lembrete_receita_data || "" : "";
    if (!medication.id || medication.status === "descontinuado" || !DATE_RE.test(date)) return [];
    const dayOffset = Math.round((dayAt(date) - dayAt(today)) / DAY);
    return [{
      medicationId: medication.id,
      medicationName: medication.nome,
      date,
      dayOffset,
      due: dayOffset <= 0,
      href: `/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(medication.id)}&mode=plan&return_to=${encodeURIComponent("/inteligencia")}`,
    }];
  }).sort((a, b) => a.date.localeCompare(b.date) || a.medicationName.localeCompare(b.medicationName, "pt-BR"));
  return { items, upcoming: items.filter(item => !item.due).length, due: items.filter(item => item.due).length, next: items[0] || null };
}
