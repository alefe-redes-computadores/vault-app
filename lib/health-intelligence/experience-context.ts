import type { HealthInsightContext } from "@/lib/health-insights";
import { isIsoDateM2, isClockM2, scopedEventsM2, type CareFlowEventM2 } from "@/lib/careflow-m2/domain";
import type { RehabProgramM5 } from "@/lib/rehab-m5/types";
import type { CareCommandSnapshot } from "./care-command";

export type ExperienceContextItem = {
  key: string;
  category: "rotina" | "agenda" | "tratamento" | "reabilitação" | "monitoramento" | "registros" | "acesso";
  state: "atual" | "previsto" | "histórico" | "dados insuficientes";
  label: string;
  provenance: string;
  day?: string;
  entityId?: string;
  href: string;
  priority: number;
};

export function projectExperienceContext(
  context: HealthInsightContext,
  command: CareCommandSnapshot | null | undefined,
  events: readonly CareFlowEventM2[],
  programs: readonly RehabProgramM5[],
  day: string,
): ExperienceContextItem[] {
  const { userId, personId, hoje } = context;
  if (!userId || !personId || !isIsoDateM2(day)) return [];
  const owned = (row: { user_id?: string; person_id?: string }) => row.user_id === userId && row.person_id === personId;
  const items = new Map<string, ExperienceContextItem>();
  function add(item: ExperienceContextItem) {
    if (!items.has(item.key)) items.set(item.key, item);
  }
  const dateRoute = (path: string, id: string) => `${path}?id=${encodeURIComponent(id)}`;
  const routine = context.medicamentos.filter(row => owned(row) && row.status === "ativo" &&
    row.tipo_uso === "continuo" && row.estoque_horarios?.some(isClockM2));
  if (day === hoje && routine.length) add({key:"routine", category:"rotina", state:"atual",
    label:`${routine.length} medicamento(s) de rotina com horários cadastrados`, provenance:"Programação atual de Medicamentos",
    href:"/hoje?focus=doses", priority:50});

  for (const visit of context.consultas) {
    if (!owned(visit) || !visit.id || visit.data !== day) continue;
    add({key:`consultation:${visit.id}`, category:"agenda", state:visit.status === "agendada" && (!hoje || day >= hoje) ? "previsto" : "histórico",
      label:visit.especialidade || "Consulta", provenance:`Consulta · situação cadastrada: ${visit.status}`, day,
      href:dateRoute("/saude/consultas/detalhes", visit.id), priority:visit.status === "agendada" ? 85 : 25});
  }
  for (const exam of context.exames) {
    if (!owned(exam) || !exam.id || exam.data !== day) continue;
    add({key:`exam:${exam.id}`, category:"agenda", state:hoje && day < hoje ? "histórico" : "previsto",
      label:exam.nome || "Exame cadastrado", provenance:"Data cadastrada em Exames · situação clínica não inferida",
      day, href:dateRoute("/saude/exames/detalhes", exam.id), priority:75});
  }
  for (const record of context.registrosSaude) {
    if (!owned(record) || !record.id || record.data !== day || (hoje && day > hoje)) continue;
    add({key:`record:${record.id}`, category:"registros", state:day === hoje ? "atual" : "histórico",
      label:record.nome || "Registro de saúde", provenance:"Registro de saúde vinculado à pessoa ativa", day,
      href:dateRoute("/saude/registros/detalhes", record.id), priority:40});
  }
  // Current status is a snapshot. It cannot establish an earlier lifecycle boundary.
  if (day === hoje) {
    for (const treatment of context.tratamentos) {
      if (!owned(treatment) || !treatment.id) continue;
      const current = treatment.status === "ativo";
      add({key:`treatment:${treatment.id}`, category:"tratamento", state:current ? "atual" : "histórico",
        label:treatment.nome, entityId:treatment.id, provenance:`Tratamento · situação cadastrada: ${treatment.status}`,
        href:dateRoute("/saude/tratamentos/detalhes", treatment.id), priority:current ? 55 : 15});
    }
    for (const program of programs) {
      if (!owned(program) || program.deleted_at) continue;
      const state = program.status === "active" ? "atual" : program.status === "planned" ? "previsto" : "histórico";
      add({key:`rehab:${program.id}`, category:"reabilitação", state, label:program.title,
        provenance:"Programa e situação registrados em Reabilitação",
        href:dateRoute("/saude/reabilitacao/detalhes", program.id), priority:state==="histórico" ? 15 : 60});
    }
  }
  for (const plan of scopedEventsM2(events, userId, personId, "monitor_plan")) {
    const { start, end } = plan.payload;
    if (typeof start !== "string" || typeof end !== "string" || !isIsoDateM2(start) || !isIsoDateM2(end) || start > end) continue;
    if (day !== hoje && (day < start || day > end)) continue;
    const state = day < start ? "previsto" : day > end || (hoje && day < hoje) ? "histórico" : "atual";
    add({key:`monitor:${plan.id}`, category:"monitoramento", state,
      label:"Plano de acompanhamento registrado", provenance:"CareFlow · período cadastrado, sem inferir conclusão",
      day:start, href:`/saude/careflow/pressao#careflow-plano-${encodeURIComponent(plan.id)}`, priority:state === "histórico" ? 14 : 57});
  }
  if (day === hoje && command?.plan.ownerKey === `${userId}:${personId}`) {
    for (const entry of command.plan.items) {
      if (!["withdrawal","acquisition","prescription","stock","supply","schedule"].includes(entry.phenomenon)) continue;
      add({key:entry.id, category:"acesso", state:entry.evidenceKind === "missing_data" ? "dados insuficientes" :
          entry.dueDate && entry.dueDate > day ? "previsto" : "atual",
        label:entry.title, provenance:entry.reason, day:entry.dueDate ?? undefined,
        href:entry.href, priority:entry.priorityScore});
    }
  }
  return [...items.values()].sort((a,b) => {
    const historical = Number(a.state === "histórico") - Number(b.state === "histórico");
    return historical || b.priority - a.priority || (a.day ?? "").localeCompare(b.day ?? "") || a.key.localeCompare(b.key);
  });
}
