import { buildDoseSlotIndex, resolveDoseSlot } from "@/lib/dose-slot-authority";
// M137: tipo apenas; testes M19/M23/V94 usam importações de runtime fechadas.
import type { DosePlanOrigin } from "@/lib/dose-plan-authority";
import { earliestAcquisitionByMedication } from "@/lib/today/acquisition-date-index";
import { getDaysUntil } from "@/lib/health-utils";
import { getClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";
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
  estoqueRestante?: number | null;
  estoqueTotal?: number | null;
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
  scheduleOrigin?: DosePlanOrigin;
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
  // M23: one O(n) pass for every medication, no per-medication date sort.
  const firstAcquisitionByMedication = earliestAcquisitionByMedication(input.renovacoes);
  const historyByMedication = groupedBy(input.historicoDoses, "medicamento_id");
  // M47: one snapshot per medication for scheduled and SOS/extra slots.
  const stockByMedication = new Map<string, ReturnType<typeof getClinicalStockSnapshot>>();
  const stockFor = (med: Entity) => {
    const existing = stockByMedication.get(med.id);
    if (existing) return existing;
    const snapshot = getClinicalStockSnapshot(med as any);
    stockByMedication.set(med.id, snapshot);
    return snapshot;
  };

  for (const med of input.medicamentos) {
    if (input.retroReviewMode && input.retroReviewMedicationId && med.id !== input.retroReviewMedicationId) continue;
    if (!med.id || med.status === "descontinuado" || med.tipo_uso === "sos" || med.tipo_uso === "esporadico") continue;
    const horarios = Array.from(new Set<string>((med.estoque_horarios || [])
      .map((time: string) => String(time || "").trim())
      .filter((time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))).sort();
    if (!horarios.length) continue;

    const firstAcquisition = firstAcquisitionByMedication.get(med.id);
    const createdDate = String(med.created_at || "").slice(0, 10);
    const knownStartDate = firstAcquisition
      || (/^\d{4}-\d{2}-\d{2}$/.test(createdDate) ? createdDate : null)
      || med.estoque_data_referencia || med.data_receita || null;
    if (knownStartDate && input.dataSelecionada < knownStartDate) continue;

    const stock = stockFor(med);
    const doctor = doctorById.get(med.medico_id);
    const treatment = treatmentById.get((med.tratamento_ids || [])[0]);
    const pharmacy = pharmacyById.get(med.farmacia_id);
    const hospital = hospitalById.get(med.local_id);
    const insight = sugerirRenovacao(med as any);
    const receitaVencida = isReceitaAtualVencida(med as any);
    const comportamento = analisarComportamentoUso(med as any, (historyByMedication.get(med.id) || []) as any);
    // M19: one medication-level derivation for all scheduled times.
    const unidadeDose = doseUnit(med);
    const diasRestantes = getDaysUntil(med.proxima_renovacao);

    for (const horario of horarios) {
      scheduledKeys.add(`${med.id}-${horario}`);
      const slot = resolveDoseSlot(slotIndex, med.id, input.dataSelecionada, horario);
      list.push({
        medicamentoId: med.id, medicamentoNome: med.nome, dosagem: med.dosagem, formato: med.formato, cores: med.cores,
        horario, tomada: slot.state === "taken", ignorada: slot.state === "ignored", isDataConflict: slot.state === "conflict",
        cor: treatment?.cor || med.cor_principal || "#8B5CF6", estoqueRestante: stock.info?.quantidadeRestante ?? null,
        estoqueTotal: stock.registeredQuantity, unidadeMedida: med.estoque_unidade_medida || "unidades",
        unidadePorDose: med.estoque_unidade_por_dose, unidadeDose, medicoNome: doctor?.nome || med.medico,
        medicoId: doctor?.id, tratamentoNome: treatment?.nome, tratamentoId: treatment?.id, tratamentoCor: treatment?.cor,
        farmaciaNome: pharmacy?.nome, farmaciaId: pharmacy?.id, estabelecimentoNome: hospital?.nome,
        estabelecimentoId: hospital?.id, proximaRenovacao: med.proxima_renovacao,
        diasRestantes, insight, receitaVencida, comportamento,
        isAvulsa: false, scheduleOrigin: "continuous", isExpectedUnconfirmed: !input.isHoje && slot.state === "absent",
      });
    }
  }

  // M19: O(1) duplicate-log identity checks rather than scanning every card.
  // Scheduled items begin with undefined logId; keep the old legacy-ID behavior.
  const existingLogIds = new Set(list.map(item => item.logId));
  for (const log of input.doseLogs) {
    if (!log.medicamento_id) continue;
    const med = medicationById.get(log.medicamento_id);
    if (!med) continue;
    const scheduled = scheduledKeys.has(`${med.id}-${log.horario}`);
    // Prefixo canônico de lib/health-supply/temporary-course.ts.
    // Sem import runtime novo: contrato histórico M19/M23/V94 usa loader fechado.
    const courseSlot = log.dose_kind === "planned" && typeof log.motivo === "string" &&
      log.motivo.startsWith("Tratamento temporário · ");
    const planOrigin: DosePlanOrigin = log.dose_kind === "planned"
      ? courseSlot ? "temporary_course" : log.motivo?.trim() ? "ad_hoc" : "unknown"
      : log.dose_kind === "sos" ? "sos"
      : log.dose_kind === "extra" ? "extra" : "unknown";
    const displaySeparately = !scheduled || log.dose_kind === "extra" || log.dose_kind === "sos" || log.dose_kind === "planned";
    if (!displaySeparately || (!log.tomado_em && log.dose_kind !== "planned") || existingLogIds.has(log.id)) continue;
    const treatment = treatmentById.get((med.tratamento_ids || [])[0]);
    const doctor = doctorById.get(med.medico_id);
    const stock = stockFor(med);
    list.push({
      medicamentoId: med.id, medicamentoNome: med.nome, dosagem: med.dosagem, formato: med.formato, cores: med.cores,
      horario: log.horario || "00:00", tomada: Boolean(log.tomado_em), ignorada: Boolean(log.ignorado_em),
      cor: treatment?.cor || med.cor_principal || "#8B5CF6", estoqueRestante: stock.registeredQuantity,
      estoqueTotal: stock.registeredQuantity, unidadeMedida: med.estoque_unidade_medida || "unidades",
      unidadePorDose: log.quantidade ?? med.estoque_unidade_por_dose, unidadeDose: doseUnit(med),
      medicoNome: doctor?.nome || med.medico, tratamentoNome: treatment?.nome, tratamentoId: treatment?.id,
      tratamentoCor: treatment?.cor,
      // SOS e extra continuam avulsos; só o curso declarado é rotina programada.
      ...(courseSlot
        ? { isAvulsa: false, scheduleOrigin: planOrigin }
        : { isAvulsa: true, scheduleOrigin: planOrigin }),
      motivoAvulsa: courseSlot ? undefined : log.motivo || (log.dose_kind === "planned" ? "Dose avulsa agendada" : log.dose_kind === "extra" ? "Dose extra" : "Dose avulsa / SOS"),
      doseKind: log.dose_kind === "planned" ? "planned" : log.dose_kind === "extra" ? "extra" : "sos", logId: log.id,
    });
    existingLogIds.add(log.id);
  }

  for (const reg of input.registros) if (reg.categoria === "sintoma") list.push({
    horario: reg.horario || "00:00", tomada: true, ignorada: false, cor: "#F59E0B", isSintoma: true,
    sintomaId: reg.id, sintomaNome: reg.nome || reg.tipo || "Sintoma registrado", sintomaTipo: reg.tipo,
    intensidade: reg.intensidade, observacoesSintoma: reg.observacoes,
  });
  return list.sort((a, b) => a.horario.localeCompare(b.horario));
}
