/** VAULT A4: projections of explicit clinical statements, not medical instructions. */
import type { A1TreatmentPhase, A4RegimenSnapshot } from "@/lib/clinical-a1/types";
import { validCivilDate } from "@/lib/clinical-a1/types";

const trim = (value: unknown, max: number): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("A4: campo de texto inválido.");
  const result = value.trim();
  if (result.length > max) throw new Error(`A4: texto excede ${max} caracteres.`);
  return result || null;
};

const id = (value: unknown): string | null => {
  const v = trim(value, 100);
  if (v && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(v)) throw new Error("A4: referência clínica inválida.");
  return v;
};

export function normalizeA4Regimen(input: Partial<A4RegimenSnapshot>, effectiveOn: string): A4RegimenSnapshot {
  if (!validCivilDate(effectiveOn)) throw new Error("A4: informe a data efetiva real.");
  const times = input.horarios ?? [];
  if (!Array.isArray(times) || times.length > 12) throw new Error("A4: máximo de 12 horários declarados.");
  const horarios = times.map(v => {
    if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) {
      throw new Error("A4: horários devem estar em HH:mm, sem inferência.");
    }
    return v;
  });
  if (new Set(horarios).size !== horarios.length) throw new Error("A4: horários repetidos.");
  const fimPrevisto = trim(input.fim_previsto, 10);
  if (fimPrevisto && (!validCivilDate(fimPrevisto) || fimPrevisto < effectiveOn)) {
    throw new Error("A4: revisão ou fim previsto anterior ao início.");
  }
  const laterality = input.lateralidade ?? null;
  if (laterality && !["esquerda", "direita", "bilateral", "nao_aplicavel"].includes(laterality)) {
    throw new Error("A4: lateralidade inválida.");
  }
  const natureza=input.natureza ?? "nao_informado";
  if (!["temporario","continuo","nao_informado"].includes(natureza)) throw new Error("A4: natureza do tratamento inválida.");
  const result: A4RegimenSnapshot = {
    versao: 1, natureza,
    medicamento_id: id(input.medicamento_id),
    dose_texto: trim(input.dose_texto, 90),
    frequencia_texto: trim(input.frequencia_texto, 120),
    horarios,
    via: trim(input.via, 80),
    lateralidade: laterality,
    local_anatomico: trim(input.local_anatomico, 100),
    fim_previsto: fimPrevisto,
    documento_id: id(input.documento_id),
    consulta_id: id(input.consulta_id),
  };
  if ((result.dose_texto || result.frequencia_texto || horarios.length || result.via) && !result.medicamento_id) {
    throw new Error("A4: vincule um medicamento real antes de registrar um regime com dose, horário ou via.");
  }
  return result;
}

export function a4PhaseKindLabel(kind: A1TreatmentPhase["tipo"]): string {
  return {inicio:"Início registrado",ajuste:"Mudança registrada",pausa:"Pausa informada",retomada:"Retomada informada",conclusao:"Encerramento informado"}[kind];
}

export function a4PhaseSourceLabel(source: A1TreatmentPhase["origem"]): string {
  return {relato_pessoal:"Relato pessoal",orientacao_profissional:"Orientação profissional informada",documento_revisado:"Documento revisado declarado"}[source];
}

export type A4HistoryEntry = { item: A1TreatmentPhase; nextRecordedDate: string | null; isLatestRecorded: boolean };
/** Chronology of *recorded* facts. Never infer that a phase is a currently valid prescription. */
export function a4History(phases: readonly A1TreatmentPhase[], userId: string, personId: string, treatmentId: string): A4HistoryEntry[] {
  const allowed = phases.filter(row => row && !row.deleted_at && row.user_id === userId && row.person_id === personId && row.tratamento_id === treatmentId && validCivilDate(row.data_efetiva))
    .sort((a,b) => a.data_efetiva.localeCompare(b.data_efetiva) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return allowed.map((item,i) => ({item,nextRecordedDate: allowed[i+1]?.data_efetiva ?? null,isLatestRecorded:i===allowed.length-1})).reverse();
}

/** Never infer medication administration, treatment closure or clinical improvement from time. */
export function a4RecordedSummary(history: readonly A4HistoryEntry[]): string {
  if (!history.length) return "Sem mudanças de tratamento registradas.";
  const latest=history[0].item;
  return `Último registro: ${a4PhaseKindLabel(latest.tipo)} em ${latest.data_efetiva}. A situação clínica não é inferida.`;
}
