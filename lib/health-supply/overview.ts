import type { Document, Medicamento, Retirada, Renovacao } from "@/lib/types";
import type { SupplyData } from "./types";
import {
  resolveSupplyWithdrawal,
  supplyChecklist,
  validSupplyDate,
  supplyDays,
} from "./rules";
import { supplyDossier } from "./knowledge";
export function withdrawalSourceNote(
  withdrawal: Retirada,
  renewals: Renovacao[]
) {
  return (
    renewals
      .find(
        (r) =>
          r.id === withdrawal.renovacao_origem_id &&
          r.person_id === withdrawal.person_id &&
          r.user_id === withdrawal.user_id &&
          r.medicamento_id === withdrawal.medicamento_id
      )
      ?.observacoes?.trim() || null
  );
}
export function preparationStart(end: string, days: number) {
  if (
    !validSupplyDate(end) ||
    !Number.isInteger(days) ||
    days < 0 ||
    days > 180
  )
    return null;
  const date = new Date(end + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
export function withdrawalPreparation(
  r: Retirada,
  med: Medicamento | undefined,
  data: SupplyData,
  documents: Document[],
  today: string
) {
  const empty = {
    process: null,
    cycle: null,
    pending: [] as string[],
    label: "Organizar fornecimento",
    tone: "neutral",
    recipe: null as string | null,
    linked: false,
  };
  if (
    !med ||
    med.id !== r.medicamento_id ||
    med.person_id !== r.person_id ||
    med.user_id !== r.user_id ||
    r.status !== "agendada"
  )
    return empty;
  const association =
    r.fornecimento_id && r.fornecimento_ciclo_id
      ? r
      : resolveSupplyWithdrawal(
          data,
          r.medicamento_id,
          r.person_id!,
          r.user_id,
          r.data
        );
  const process = data.processos.find(
    (p) =>
      p.id === association.fornecimento_id &&
      p.person_id === r.person_id &&
      p.user_id === r.user_id &&
      p.status === "ativo"
  );
  const cycle = data.ciclos.find(
    (c) =>
      c.id === association.fornecimento_ciclo_id &&
      c.processo_id === process?.id &&
      c.person_id === r.person_id &&
      c.user_id === r.user_id
  );
  if (!process || !cycle) return empty;
  const check = supplyChecklist(process, cycle, med, r, data, documents, today),
    dossier = supplyDossier(process, cycle, med, data, documents, today, r);
  const pending: string[] = [
    ...new Set(
      dossier.missing.map((x) =>
        x.tipo === "pessoais"
          ? "Documentos pessoais"
          : x.tipo === "formulario"
          ? "Formulário de Dor Crônica"
          : x.tipo === "receita"
          ? "Receita do processo"
          : "LME"
      )
    ),
  ];
  if (check.needsLme && !check.lmeReady && !pending.includes("LME"))
    pending.push("LME");
  if (check.needsPrescription && !check.prescriptionReady)
    pending.push("Receita desta retirada");
  const days = validSupplyDate(r.data) ? supplyDays(today, r.data) : null;
  const waiting = !check.covered && cycle.status === "protocolado";
  return {
    process,
    cycle,
    pending,
    label: check.changed
      ? "Conferir dose ou quantidade"
      : waiting
      ? "Aguardando autorização"
      : pending.length
      ? `${pending.length} documento(s) a preparar`
      : !check.covered && process.origem === "estadual_ceaf"
      ? "Conferir autorização"
      : "Anexos vinculados · conferir validade",
    tone:
      pending.length && days !== null && days <= 1
        ? "important"
        : check.changed || pending.length || waiting
        ? "attention"
        : "ready",
    recipe: dossier.prescriptionModel,
    linked: r.fornecimento_ciclo_id === cycle.id,
  };
}
