/** M121 — Horizonte de continuidade. Projeção pura, só leitura e sem autoridade nova. */
import type { HealthInsightContext } from "@/lib/health-insights";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export type HorizonDaysM121 = 7 | 14 | 30;
export type HorizonItemM121 = {
  key: string;
  kind: "scheduled" | "overdue" | "undated" | "document_review";
  title: string;
  description: string;
  date: string | null;
  href: string;
  evidence: readonly string[];
  caution: string;
};
export type CareHorizonM121 = {
  state: "unavailable" | "ready";
  today: string;
  windows: Record<HorizonDaysM121, {count: number; scheduled: number; overdue: number}>;
  upcoming: HorizonItemM121[];
  overdue: HorizonItemM121[];
  undated: HorizonItemM121[];
  documents: HorizonItemM121[];
  unknownStock: number;
  note: string;
};
const windows: readonly HorizonDaysM121[] = [7, 14, 30];
const validDay = (day: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, date));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === date;
};
const noon = (day: string): number => Date.parse(`${day}T12:00:00Z`);
const distance = (from: string, until: string): number => Math.round((noon(until) - noon(from)) / 86400000);
const emptyWindows = (): CareHorizonM121["windows"] => ({
  7: { count: 0, scheduled: 0, overdue: 0 },
  14: { count: 0, scheduled: 0, overdue: 0 },
  30: { count: 0, scheduled: 0, overdue: 0 },
});
const empty = (today: string): CareHorizonM121 => ({
  state: "unavailable", today, windows: emptyWindows(), upcoming: [], overdue: [], undated: [],
  documents: [], unknownStock: 0, note: "Identidade ou dados da pessoa ainda não confirmados.",
});
export function buildCareHorizonM121(
  context: HealthInsightContext | null,
  command: CareCommandSnapshot | null | undefined,
  ownerId: string,
  personId: string,
  today: string,
): CareHorizonM121 {
  if (!validDay(today) || !ownerId || !personId || !context || !command ||
      context.userId !== ownerId || context.personId !== personId || command.forecast.generatedFor !== today) {
    return empty(today);
  }
  const owned = context.medicamentos.filter(med => med.user_id === ownerId && med.person_id === personId && med.id);
  const validMedicationIds = new Set(owned.map(med => med.id!));
  // Usa somente ações canônicas e a carteira documental já calculadas no mesmo snapshot do Brain.
  const actions = command.surfaceActions.filter(action => validMedicationIds.has(action.medicationId));
  const unique = new Set<string>();
  const upcoming: HorizonItemM121[] = [];
  const overdue: HorizonItemM121[] = [];
  const undated: HorizonItemM121[] = [];
  for (const action of actions) {
    if (!action.id || unique.has(action.id)) continue;
    unique.add(action.id);
    const known = Boolean(action.date && validDay(action.date));
    const delta = known ? distance(today, action.date!) : null;
    // Informações sem data NUNCA viram um prazo inventado.
    const kind: HorizonItemM121["kind"] = delta === null ? "undated" : delta < 0 ? "overdue" : "scheduled";
    const item: HorizonItemM121 = {
      key: action.id, kind, title: action.title, description: action.reason, date: known ? action.date : null,
      href: action.href, evidence: action.evidence || [],
      caution: action.kind === "planned_acquisition" ? "Aquisição planejada; não confirma compra, pagamento ou entrada em estoque."
        : action.kind === "stock_projection" ? "Estimativa de estoque, não confirmação de consumo futuro."
        : action.kind.includes("withdrawal") ? "Compromisso registrado; não confirma retirada realizada."
        : "Revise os dados na origem antes de qualquer decisão.",
    };
    if (delta !== null && delta < 0) overdue.push(item);
    else if (delta !== null && delta <= 30) upcoming.push(item);
    else if (delta === null) undated.push(item);
  }
  upcoming.sort((a,b)=>(a.date || "").localeCompare(b.date || "") || a.key.localeCompare(b.key));
  overdue.sort((a,b)=>(a.date || "").localeCompare(b.date || "") || a.key.localeCompare(b.key));
  const resultWindows = emptyWindows();
  for (const days of windows) {
    const scheduled = upcoming.filter(row => row.date && distance(today, row.date) <= days).length;
    resultWindows[days] = {count: scheduled + overdue.length, scheduled, overdue: overdue.length};
  }
  const documents: HorizonItemM121[] = [];
  const seenDocument = new Set<string>();
  for (const item of command.documents.items) {
    if (!validMedicationIds.has(item.medicationId)) continue;
    for (const requirement of item.requirements) {
      // Somente ausência EXPLICITAMENTE classificada como missing é pendência.
      // not_informed é desconhecido, nunca exigência automaticamente inferida.
      if (requirement.status !== "missing") continue;
      const key = `${item.medicationId}:${requirement.lane}`;
      if (seenDocument.has(key)) continue;
      seenDocument.add(key);
      documents.push({key,kind:"document_review",title:`${item.medicationName}: ${requirement.label}`,
        description: requirement.detail,date:null,href:item.href,evidence:requirement.evidence,
        caution:"Conferir o processo cadastrado. Nenhuma regra geral de município ou do SUS foi presumida."});
    }
  }
  const unknownStock = owned.filter(med => med.status !== "descontinuado" &&
    med.tipo_uso !== "sos" && med.tipo_uso !== "esporadico" &&
    (typeof med.estoque_quantidade !== "number" || !Number.isFinite(med.estoque_quantidade))).length;
  return { state:"ready",today,windows:resultWindows,upcoming,overdue,undated,documents,
    unknownStock,note:"Horizonte informativo: datas, estoque e documentos têm fontes independentes. Falta de registro não comprova falta de medicamento ou descumprimento de cuidado."};
}
