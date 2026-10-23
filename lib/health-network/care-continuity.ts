/** VAULT V227 — explicit, person-and-account-owned clinical relationships.
 * Read-only projections: a shared name, CID, date or physician never creates a link.
 * Missing registration is not a negative clinical event.
 */
import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import type { Cirurgia, Consulta, Document, Exame, Medicamento, RegistroSaude, Tratamento } from "@/lib/types";

export type CareContinuityInput = {
  personId: string;
  userId: string;
  today: string;
  treatment: Tratamento | null;
  medications: Medicamento[];
  records: RegistroSaude[];
  consultations: Consulta[];
  exams: Exame[];
  surgeries: Cirurgia[];
  documents: Document[];
};

type LinkedRecord = { record: RegistroSaude; through: "treatment" | "medication" };

function dateMs(value?: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d), check = new Date(utc);
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d ? utc : null;
}
function own(row: {user_id?: string | null; person_id?: string | null}, userId: string, personId: string): boolean {
  return Boolean(userId && personId && row.user_id === userId && row.person_id === personId);
}
function dedupe<T extends {id?: string}>(items: T[]): T[] {
  const used = new Set<string>();
  return items.filter(row => !row.id || (!used.has(row.id) && Boolean(used.add(row.id))));
}
function linked(ids: string[] | undefined, id: string): boolean {
  return Array.isArray(ids) && ids.includes(id);
}
function dateSort<T extends {data?: string | null}>(a: T, b: T): number {
  return String(b.data || "").localeCompare(String(a.data || ""));
}
function clinicalRecords(records: LinkedRecord[], today: number, days: number): LinkedRecord[] {
  return records.filter(({record}) => {const time = dateMs(record.data);return time !== null && time <= today && time >= today - (days - 1) * 86400000;});
}

export function buildTreatmentCareDossier(input: CareContinuityInput) {
  const {treatment, userId, personId, today} = input;
  if (!treatment?.id || !own(treatment, userId, personId)) return null;
  const treatmentId = treatment.id;
  const todayMs = dateMs(today);
  if (todayMs === null) return null;
  const medications = dedupe(input.medications.filter(med =>
    Boolean(med.id) && own(med, userId, personId) &&
    (linked(med.tratamento_ids, treatmentId) || linked(treatment.medicamento_ids, med.id!))
  ));
  const medicationIds = new Set(medications.map(med => med.id!));
  const records: LinkedRecord[] = dedupe(input.records.filter(record =>
    Boolean(record.id) && own(record, userId, personId) &&
    (linked(record.tratamento_ids, treatmentId) ||
      (!record.tratamento_ids?.length && Boolean(record.medicamento_id && medicationIds.has(record.medicamento_id))))
  )).map(record => ({record, through: linked(record.tratamento_ids, treatmentId) ? "treatment" as const : "medication" as const}));
  const consultations = dedupe(input.consultations.filter(item => own(item, userId, personId) && linked(item.tratamento_ids, treatmentId))).sort(dateSort);
  const exams = dedupe(input.exams.filter(item => own(item, userId, personId) && linked(item.tratamento_ids, treatmentId))).sort(dateSort);
  const surgeries = dedupe(input.surgeries.filter(item => own(item, userId, personId) && linked(item.tratamento_ids, treatmentId))).sort(dateSort);
  const consultationDocIds = new Set(consultations.map(x => x.document_id).filter((x): x is string => Boolean(x)));
  const examDocIds = new Set(exams.map(x => x.document_id).filter((x): x is string => Boolean(x)));
  const medicationDocIds = new Set(medications.map(x => x.document_id).filter((x): x is string => Boolean(x)));
  const documents = dedupe(input.documents.filter(doc => {
    if (!doc.id || !own(doc, userId, personId) || doc.category_id !== "saude") return false;
    return (doc.entidade_tipo === "tratamento" && doc.entidade_id === treatmentId) ||
      doc.metadata?.tratamento_id === treatmentId ||
      medicationDocIds.has(doc.id) || consultationDocIds.has(doc.id) || examDocIds.has(doc.id);
  }));
  const last30 = clinicalRecords(records, todayMs, 30).sort((a,b)=>dateSort(a.record,b.record));
  const symptoms = last30.filter(x => x.record.categoria === "sintoma");
  const upcoming = consultations.filter(item => {
    const when = dateMs(item.data);
    return item.status === "agendada" && when !== null && when >= todayMs && when <= todayMs + 30 * 86400000;
  }).sort((a,b)=>a.data.localeCompare(b.data));
  const pendingLocal = [...medications, ...records.map(x=>x.record), ...consultations, ...exams, ...documents]
    .filter(item => 'synced' in item && item.synced === false).length;
  const daysWithSymptoms = new Set(symptoms.map(item => item.record.data)).size;
  const medicalSummaries = [...new Map(symptoms.map(({record}) => [record.tipo || record.nome, record])).values()].slice(0,5).map(x => x.nome || x.tipo);
  const latestSymptoms = symptoms.slice(0,5).map(({record}) =>
    `${record.data.split("-").reverse().join("/")}: ${record.nome || record.tipo}${typeof record.intensidade === "number" && Number.isFinite(record.intensidade) && record.intensidade >= 0 && record.intensidade <= 10 ? ` (${record.intensidade}/10)` : ""}`
  );
  const synopsis = [
    `VAULT — resumo de cuidado (${today.split("-").reverse().join("/")})`,
    `Tratamento: ${treatment.nome} (${treatment.status})`,
    `Medicamentos vinculados: ${medications.length ? medications.map(m => `${m.nome}${m.dosagem ? ` ${m.dosagem}` : ""}${m.status === "descontinuado" ? " [histórico]" : ""}`).join("; ") : "nenhum vínculo registrado"}`,
    `Registros de sintomas nos últimos 30 dias: ${symptoms.length} em ${daysWithSymptoms} dia(s) documentados`,
    ...(latestSymptoms.length ? ["Últimos relatos: "+latestSymptoms.join("; ")] : []),
    `Consultas vinculadas: ${consultations.length}${upcoming.length ? `; próxima ${upcoming[0].data.split("-").reverse().join("/")}` : ""}`,
    `Exames relacionados: ${exams.length}; cirurgias relacionadas: ${surgeries.length}; documentos vinculados: ${documents.length}`,
    pendingLocal ? `${pendingLocal} vínculo(s)/registro(s) locais ainda não marcados como sincronizados.` : "",
    "Somente vínculos explícitos. Ausência de registro não significa ausência de sintoma ou uso. Não é diagnóstico nem orientação para alterar medicamentos.",
  ].filter(Boolean).join("\n");
  return {
    treatment, medications, records, consultations, exams, surgeries, documents, recentRecords:last30, symptoms,
    latestSymptoms, medicalSummaries, daysWithSymptoms, upcoming, pendingLocal, synopsis,
    coverage: {medications:medications.length, records:records.length, symptoms:symptoms.length, consultations:consultations.length, exams:exams.length, surgeries:surgeries.length, documents:documents.length},
  };
}

export function buildCareContinuityOverview(context: HealthInsightContext) {
  const current = dateMs(context.hoje);
  const active = context.tratamentos.filter(t => t.status === "ativo" && Boolean(t.id) && t.person_id === context.personId && Boolean(context.userId) && t.user_id === context.userId);
  if (current === null) return { total:0, appointments:0, documented:0, ready:[] as NonNullable<ReturnType<typeof buildTreatmentCareDossier>>[] };
  const ready = active.map(treatment => buildTreatmentCareDossier({
    personId:context.personId,userId:treatment.user_id,today:context.hoje!, treatment,
    medications:context.medicamentos, records:context.registrosSaude, consultations:context.consultas,
    exams:context.exames,surgeries:context.cirurgias,documents:context.documentos,
  })).filter((x):x is NonNullable<typeof x> => x !== null);
  return {total:ready.length, appointments:ready.reduce((n,x)=>n+x.upcoming.length,0), documented:ready.filter(x=>x.recentRecords.length>0).length, ready};
}

/** Low-urgency, evidence-only contextual Brain signal. No treatment adherence inference. */
export function buildCareContinuityInsights(context: HealthInsightContext): HealthInsight[] {
  const overview = buildCareContinuityOverview(context);
  return overview.ready.filter(x => x.upcoming.length>0 && x.daysWithSymptoms>=2).slice(0,3).map(x => ({
    id:`v227-consulta-cuidado-${x.treatment.id}`, kind:"observation", categoria:"tratamento",
    titulo:`${x.treatment.nome}: histórico disponível para consulta`,
    mensagem:`Há ${x.symptoms.length} relato(s) de sintomas em ${x.daysWithSymptoms} dia(s) dos últimos 30 dias, ligados explicitamente ao tratamento ou aos seus medicamentos. Uma consulta vinculada está agendada para ${x.upcoming[0].data.split("-").reverse().join("/")}.`,
    urgencia:"baixa", confianca:x.daysWithSymptoms >= 5 ? "alta" : "media", amostra:x.symptoms.length, periodoDias:30,
    gravidadeSeguranca:"informativa", entidadeTipo:"tratamento", entidadeId:x.treatment.id,
    relacoesContextuais:[{tipo:"consulta",id:x.upcoming[0].id || ""}].filter(y=>Boolean(y.id)),
    link:`/saude/tratamentos/detalhes?id=${encodeURIComponent(x.treatment.id!)}`,
    evidencias:[`${x.medications.length} medicamento(s) com vínculo explícito`,`${x.daysWithSymptoms} dia(s) de sintomas documentados`,`${x.documents.length} documento(s) relacionado(s)`,`${x.pendingLocal} registro(s) ainda não marcados como sincronizados`],
    fontesInternas:["Tratamentos","Registros de Saúde","Consultas","Documentos vinculados"],
    acaoSegura:"Abra o resumo do tratamento e revise os dados com o profissional responsável.",
    limitacaoSeguranca:"Associação documental, não diagnóstico. Relatos ausentes e consultas sem vínculo não entram nessa análise. Nenhuma dose é alterada.",
  }));
}
