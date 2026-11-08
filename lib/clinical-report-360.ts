/** M98: local, deterministic and person-scoped clinical export. Never infers dose intake. */
import type { HealthInsightContext } from "@/lib/health-insights";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";

export type Report360Section = "medications" | "doses" | "symptoms" | "measurements" | "consultations" | "documents";
export type Report360Mode = "factual" | "brain" | "consultation";
export type Report360Category = Report360Section | "brain";
export interface Report360Row {
  category: Report360Category;
  date: string;
  time: string | null;
  title: string;
  detail: string;
  source: string;
  sourceId: string;
  severity: string | null;
  evidence: string[];
}
export interface Report360 {
  schemaVersion: 1;
  mode: Report360Mode;
  personName: string;
  start: string;
  end: string;
  includedSections: Report360Section[];
  rows: Report360Row[];
  summary: { confirmed: number; explicitlyIgnored: number; sos: number; extra: number; healthRecords: number; brainSnapshots: number; daysWithRecords: number };
  limitations: string[];
}
export interface Report360Input {
  context: HealthInsightContext;
  ledger: readonly BrainV5Alert[];
  ownerId: string;
  personId: string;
  personName: string;
  start: string;
  end: string;
  sections: readonly Report360Section[];
  mode: Report360Mode;
}

export function validClinicalDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m-1 && dt.getUTCDate() === d;
}
const clean = (v: unknown): string => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,3000);
const clock = (value: string | undefined | null): string | null => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "") ? value! : null;
const isoTime = (value: string | undefined | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
};
const row = (category: Report360Category, date: string, time: string | null, title: unknown, detail: unknown, source: string, sourceId: string, severity: string | null = null, evidence: string[] = []): Report360Row => ({
  category, date, time, title: clean(title), detail: clean(detail), source, sourceId, severity, evidence: evidence.map(clean).filter(Boolean).slice(0,30),
});

export function buildClinicalReport360(input: Report360Input): Report360 {
  const {context, ledger, ownerId, personId, personName, start, end, mode} = input;
  if (!ownerId || !personId || context.personId !== personId || context.userId !== ownerId) throw new Error("Pessoa ou conta divergente. Exportação bloqueada.");
  if (!validClinicalDay(start) || !validClinicalDay(end) || end < start) throw new Error("Selecione um intervalo válido.");
  const startMs = Date.parse(`${start}T12:00:00Z`), endMs = Date.parse(`${end}T12:00:00Z`);
  if ((endMs-startMs)/86400000 > 366) throw new Error("O período máximo é de 367 dias, contando as datas inicial e final.");
  const chosen = [...new Set(input.sections)].filter((s):s is Report360Section =>
    ["medications","doses","symptoms","measurements","consultations","documents"].includes(s));
  if (!chosen.length) throw new Error("Selecione pelo menos uma seção.");
  const includes = (key: Report360Section) => chosen.includes(key);
  const within = (date: string) => validClinicalDay(date) && date >= start && date <= end;
  const owned = <T extends {user_id?:string;person_id?:string}>(value: T) => value.user_id === ownerId && value.person_id === personId;
  const rows: Report360Row[] = [];
  const meds = new Map(context.medicamentos.filter(m => owned(m) && m.id).map(m => [m.id!, m] as const));
  if (includes("medications")) {
    for (const med of meds.values()) {
      rows.push(row("medications", end, null, med.nome, `Cadastro atual no momento da exportação · ${med.dosagem || "dosagem não informada"} · ${med.tipo_uso || "uso não informado"} · ${med.status || "status não informado"}. Não representa histórico da prescrição.`, "medication_current_snapshot", med.id!));
    }
  }
  if (includes("doses")) {
    for (const dose of context.doseLogs) {
      if (!owned(dose) || !within(dose.data) || (!dose.tomado_em && !dose.ignorado_em)) continue;
      const recorded = Boolean(dose.tomado_em);
      const kind = dose.dose_kind || "scheduled";
      rows.push(row("doses", dose.data, clock(dose.horario), meds.get(dose.medicamento_id)?.nome || "Medicamento sem cadastro acessível", `${recorded ? "Tomada confirmada" : "Ignorada explicitamente"} · Tipo: ${kind} · Quantidade: ${recorded && typeof dose.quantidade === "number" && Number.isFinite(dose.quantidade) && dose.quantidade > 0 ? dose.quantidade : "não informada"} · Horário do evento: ${isoTime(recorded ? dose.tomado_em : dose.ignorado_em) || "não registrado"}${dose.motivo ? ` · Motivo informado: ${clean(dose.motivo)}` : ""}`, "dose_log", dose.id || `${dose.medicamento_id}:${dose.data}:${dose.horario}`));
    }
  }
  for (const entry of context.registrosSaude) {
    if (!owned(entry) || !within(entry.data)) continue;
    const category: Report360Section | null = entry.categoria === "sintoma" || entry.categoria === "humor" ? "symptoms" : entry.categoria === "medicao" || entry.categoria === "habito" ? "measurements" : null;
    if (!category || !includes(category)) continue;
    rows.push(row(category, entry.data, clock(entry.horario), entry.nome || entry.tipo || "Registro de saúde", [entry.valor_medicao, typeof entry.intensidade === "number" ? `Intensidade declarada: ${entry.intensidade}/10` : "", entry.observacoes, entry.contexto].filter(Boolean).map(clean).join(" · "), entry.source === "health_connect" ? "health_connect" : entry.source === "samsung_manual" ? "samsung_manual" : "user_reported", entry.id || `${entry.data}:${entry.horario}:${entry.nome}`));
  }
  if (includes("consultations")) {
    for (const item of context.consultas) {
      if (!owned(item) || !within(item.data)) continue;
      rows.push(row("consultations", item.data, clock(item.horario), item.especialidade || "Consulta", `Status registrado: ${item.status} · Profissional: ${item.medico || "não informado"}${item.motivo ? ` · Motivo: ${clean(item.motivo)}` : ""}`, "consultation", item.id || `${item.data}:${item.medico}`));
    }
  }
  if (includes("documents")) {
    for (const doc of context.documentos) {
      const date = doc.created_at?.slice(0,10) || "";
      if (!owned(doc) || doc.category_id !== "saude" || !within(date)) continue;
      rows.push(row("documents", date, null, doc.title || "Documento de saúde", `Tipo: ${doc.type} · Data de cadastro, não do evento clínico. Sem anexos, conteúdo, credenciais ou metadados.`, "health_document_metadata", doc.id || `${date}:${doc.type}`));
    }
  }
  if (mode === "brain" || mode === "consultation") {
    for (const item of ledger) {
      const day = item.first_detected_at?.slice(0,10) || "";
      if (item.person_id !== personId || !within(day)) continue;
      rows.push(row("brain", day, isoTime(item.first_detected_at), item.snapshot.titulo,
        `${item.snapshot.mensagem} · Gravidade registrada: ${item.snapshot.gravidade_seguranca || "não informada"} · Confiança declarada: ${item.snapshot.confianca} · Estado atual: ${item.state} · Ocorrências registradas: ${item.occurrences || 1}. ${item.snapshot.limitacao_seguranca || "É uma leitura automatizada, não um diagnóstico."}`,
        "stored_brain_v5_snapshot", item.key, item.snapshot.gravidade_seguranca || null,
        [...(item.snapshot.evidencias || []), ...(item.snapshot.fontes_internas || []).map(s => `Fonte interna: ${s}`)]));
    }
  }
  rows.sort((a,b)=>b.date.localeCompare(a.date) || (b.time||"").localeCompare(a.time||"") || a.category.localeCompare(b.category) || a.sourceId.localeCompare(b.sourceId));
  const doseRows = rows.filter(r=>r.category==="doses");
  const summary = {
    confirmed: doseRows.filter(r=>r.detail.startsWith("Tomada confirmada")).length,
    explicitlyIgnored: doseRows.filter(r=>r.detail.startsWith("Ignorada explicitamente")).length,
    sos: doseRows.filter(r=>r.detail.startsWith("Tomada confirmada") && r.detail.includes("Tipo: sos ")).length,
    extra: doseRows.filter(r=>r.detail.startsWith("Tomada confirmada") && r.detail.includes("Tipo: extra ")).length,
    healthRecords: rows.filter(r=>r.category==="symptoms"||r.category==="measurements").length,
    brainSnapshots: rows.filter(r=>r.category==="brain").length,
    daysWithRecords: new Set(rows.filter(r=>r.category!=="medications").map(r=>r.date)).size,
  };
  return {schemaVersion:1,mode,personName:clean(personName) || "Pessoa selecionada",start,end,includedSections:chosen,rows,summary,
    limitations:["A ausência de registros não comprova omissão de medicamentos nem ausência de sintomas.","Alertas do Brain somente aparecem se já existirem no ledger persistido; não há diagnóstico retrospectivo.","Dados automáticos de relógios/aneis e registros manuais têm limitações distintas. A origem de cada linha está indicada.","Medicamentos mostram o cadastro atual, não uma reconstrução do histórico da prescrição.","Anexos, senhas, cartões e metadados sensíveis de documentos nunca entram nesta exportação.","O documento é preparado localmente; nenhum compartilhamento ou envio é automático."]};
}
