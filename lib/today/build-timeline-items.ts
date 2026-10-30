import { buildDoseSlotIndex, resolveDoseSlot } from "@/lib/dose-slot-authority";
import { computeEstoqueInfo, getDaysUntil } from "@/lib/health-utils";
import { analisarComportamentoUso, isReceitaAtualVencida, sugerirRenovacao } from "@/lib/health-insights";

export interface TodayTimelineItem {
  medicamentoId?: string;
  medicamentoNome?: string;
  dosagem?: string;
  formato?: string;
  cores?: string[];
  horario: string;
  tomada: boolean;
  ignorada: boolean;
  cor: string;
  estoqueRestante?: number;
  estoqueTotal?: number;
  unidadeMedida?: string;
  unidadePorDose?: number;
  unidadeDose?: string;
  medicoNome?: string;
  medicoId?: string;
  tratamentoNome?: string;
  tratamentoId?: string;
  tratamentoCor?: string;
  farmaciaNome?: string;
  farmaciaId?: string;
  estabelecimentoNome?: string;
  estabelecimentoId?: string;
  proximaRenovacao?: string;
  diasRestantes?: number | null;
  insight?: { deveRenovar: boolean; mensagem: string; urgencia: "alta" | "media" | "nenhuma" };
  receitaVencida?: boolean;
  comportamento?: any;
  isAvulsa?: boolean;
  motivoAvulsa?: string;
  doseKind?: "sos" | "extra" | "planned";
  logId?: string;
  isExpectedUnconfirmed?: boolean;
  isDataConflict?: boolean;
  isSintoma?: boolean;
  sintomaId?: string;
  sintomaNome?: string;
  sintomaTipo?: string;
  intensidade?: number;
  observacoesSintoma?: string;
}

type Entity = Record<string, any>;

type BuildTodayTimelineInput = {
  medicamentos: Entity[];
  doseLogs: Entity[];
  medicos: Entity[];
  tratamentos: Entity[];
  farmacias: Entity[];
  hospitais: Entity[];
  historicoDoses: Entity[];
  registros: Entity[];
  renovacoes: Entity[];
  dataSelecionada: string;
  isHoje: boolean;
  userId?: string;
  personId?: string;
  retroReviewMode?: boolean;
  retroReviewMedicationId?: string | null;
};

const byId = (items: Entity[]) => new Map(items.filter(item => item.id).map(item => [item.id, item]));
const groupedBy = (items: Entity[], key: string) => {
  const groups = new Map<string, Entity[]>();
  for (const item of items) {
    const id = item[key];
    if (!id) continue;
    const group = groups.get(id);
    if (group) group.push(item);
    else groups.set(id, [item]);
  }
  return groups;
};

const doseUnit = (med: Entity) => String(med.forma_farmaceutica || med.formato || "")
  .toLocaleLowerCase("pt-BR").includes("gota")
  ? "gotas"
  : med.estoque_unidade_medida || "unidades";

export function buildTodayTimelineItems(input: BuildTodayTimelineInput): TodayTimelineItem[] {
  const list: TodayTimelineItem[] = [];
  const scheduledKeys = new Set<string>();
  const slotIndex = buildDoseSlotIndex(input.doseLogs as any, { userId: input.userId, personId: input.personId });
  const medicationById = byId(input.medicamentos);
  const doctorById = byId(input.medicos);
  const treatmentById = byId(input.tratamentos);
  const pharmacyById = byId(input.farmacias);
  const hospitalById = byId(input.hospitais);
  const renewalsByMedication = groupedBy(input.renovacoes, "medicamento_id");
  const historyByMedication = groupedBy(input.historicoDoses, "medicamento_id");

  for (const med of input.medicamentos) {
    if (input.retroReviewMode && input.retroReviewMedicationId && med.id !== input.retroReviewMedicationId) continue;
    if (!med.id || med.status === "descontinuado" || med.tipo_uso === "sos" || med.tipo_uso === "esporadico") continue;
    const horarios = Array.from(new Set<string>((med.estoque_horarios || [])
      .map((time: string) => String(time || "").trim())
      .filter((time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))).sort();
    if (!horarios.length) continue;

    const acquisitionDates = (renewalsByMedication.get(med.id) || [])
      .map(item => String(item.data_aquisicao || item.data || "").slice(0, 10))
      .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
    const createdDate = String(med.created_at || "").slice(0, 10);
    const knownStartDate = acquisitionDates[0]
      || (/^\d{4}-\d{2}-\d{2}$/.test(createdDate) ? createdDate : null)
      || med.estoque_data_referencia || med.data_receita || null;
    if (knownStartDate && input.dataSelecionada < knownStartDate) continue;

    const stock = computeEstoqueInfo(med as any);
    const doctor = doctorById.get(med.medico_id);
    const treatment = treatmentById.get((med.tratamento_ids || [])[0]);
    const pharmacy = pharmacyById.get(med.farmacia_id);
    const hospital = hospitalById.get(med.local_id);
    const insight = sugerirRenovacao(med as any);
    const receitaVencida = isReceitaAtualVencida(med as any);
    const comportamento = analisarComportamentoUso(med as any, (historyByMedication.get(med.id) || []) as any);

    for (const horario of horarios) {
      scheduledKeys.add(`${med.id}-${horario}`);
      const slot = resolveDoseSlot(slotIndex, med.id, input.dataSelecionada, horario);
      list.push({
        medicamentoId: med.id, medicamentoNome: med.nome, dosagem: med.dosagem, formato: med.formato, cores: med.cores,
        horario, tomada: slot.state === "taken", ignorada: slot.state === "ignored", isDataConflict: slot.state === "conflict",
        cor: treatment?.cor || med.cor_principal || "#8B5CF6", estoqueRestante: stock?.quantidadeRestante ?? 0,
        estoqueTotal: med.estoque_quantidade || 0, unidadeMedida: med.estoque_unidade_medida || "unidades",
        unidadePorDose: med.estoque_unidade_por_dose, unidadeDose: doseUnit(med), medicoNome: doctor?.nome || med.medico,
        medicoId: doctor?.id, tratamentoNome: treatment?.nome, tratamentoId: treatment?.id, tratamentoCor: treatment?.cor,
        farmaciaNome: pharmacy?.nome, farmaciaId: pharmacy?.id, estabelecimentoNome: hospital?.nome,
        estabelecimentoId: hospital?.id, proximaRenovacao: med.proxima_renovacao,
        diasRestantes: getDaysUntil(med.proxima_renovacao), insight, receitaVencida, comportamento,
        isAvulsa: false, isExpectedUnconfirmed: !input.isHoje && slot.state === "absent",
      });
    }
  }

  for (const log of input.doseLogs) {
    if (!log.medicamento_id) continue;
    const med = medicationById.get(log.medicamento_id);
    if (!med) continue;
    const scheduled = scheduledKeys.has(`${med.id}-${log.horario}`);
    const displaySeparately = !scheduled || log.dose_kind === "extra" || log.dose_kind === "sos" || log.dose_kind === "planned";
    if (!displaySeparately || (!log.tomado_em && log.dose_kind !== "planned") || list.some(item => item.logId === log.id)) continue;
    const treatment = treatmentById.get((med.tratamento_ids || [])[0]);
    const doctor = doctorById.get(med.medico_id);
    list.push({
      medicamentoId: med.id, medicamentoNome: med.nome, dosagem: med.dosagem, formato: med.formato, cores: med.cores,
      horario: log.horario || "00:00", tomada: Boolean(log.tomado_em), ignorada: false,
      cor: treatment?.cor || med.cor_principal || "#8B5CF6", estoqueRestante: med.estoque_quantidade ?? 0,
      estoqueTotal: med.estoque_quantidade || 0, unidadeMedida: med.estoque_unidade_medida || "unidades",
      unidadePorDose: log.quantidade ?? med.estoque_unidade_por_dose, unidadeDose: doseUnit(med),
      medicoNome: doctor?.nome || med.medico, tratamentoNome: treatment?.nome, tratamentoId: treatment?.id,
      tratamentoCor: treatment?.cor, isAvulsa: true,
      motivoAvulsa: log.motivo || (log.dose_kind === "planned" ? "Dose avulsa agendada" : log.dose_kind === "extra" ? "Dose extra" : "Dose avulsa / SOS"),
      doseKind: log.dose_kind === "planned" ? "planned" : log.dose_kind === "extra" ? "extra" : "sos", logId: log.id,
    });
  }

  for (const reg of input.registros) if (reg.categoria === "sintoma") list.push({
    horario: reg.horario || "00:00", tomada: true, ignorada: false, cor: "#F59E0B", isSintoma: true,
    sintomaId: reg.id, sintomaNome: reg.nome || reg.tipo || "Sintoma registrado", sintomaTipo: reg.tipo,
    intensidade: reg.intensidade, observacoesSintoma: reg.observacoes,
  });
  return list.sort((a, b) => a.horario.localeCompare(b.horario));
}
