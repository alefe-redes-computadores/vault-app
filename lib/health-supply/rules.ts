import type { Medicamento, Retirada, Document } from "@/lib/types";
import type { SupplyData, SupplyProcess, SupplyCycle } from "./types";
// Data civil estrita: nenhuma contagem de retiradas prolonga uma autorização.
export function validSupplyDate(
  value: string | null | undefined
): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number),
    date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}
export function supplyDays(from: string, to: string): number {
  return (
    (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000
  );
}
export function estimatedCycleEnd(
  start: string,
  months: number
): string | null {
  if (
    !validSupplyDate(start) ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 24
  )
    return null;
  const [y, m, d] = start.split("-").map(Number),
    last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(y, m - 1 + months, Math.min(d, last)));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
export function latestSupplyCycle(
  process: SupplyProcess,
  cycles: SupplyCycle[]
) {
  return cycles
    .filter(
      (x) =>
        x.processo_id === process.id &&
        x.person_id === process.person_id &&
        x.user_id === process.user_id
    )
    .sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
    )[0];
}
export function supplyChecklist(
  process: SupplyProcess,
  cycle: SupplyCycle,
  med: Medicamento,
  withdrawal: Retirada | undefined,
  data: SupplyData,
  documents: Document[],
  today: string
) {
  const links = data.documentos.filter(
    (x) =>
      x.processo_id === process.id &&
      x.ciclo_id === cycle.id &&
      x.person_id === process.person_id &&
      x.user_id === process.user_id &&
      (!x.retirada_id || x.retirada_id === withdrawal?.id)
  );
  const linked = (type: string) =>
    links.some(
      (x) =>
        x.tipo === type &&
        documents.some(
          (d) =>
            d.id === x.document_id &&
            d.person_id === process.person_id &&
            d.user_id === process.user_id &&
            (type !== "receita" || x.retirada_id === withdrawal?.id)
        )
    );
  const target = withdrawal?.data || today;
  const covered =
    cycle.status === "autorizado" &&
    validSupplyDate(cycle.inicio) &&
    validSupplyDate(cycle.fim) &&
    target >= cycle.inicio &&
    target <= cycle.fim;
  const needsLme = process.origem === "estadual_ceaf" && !covered;
  const item = data.itens.find(
    (x) =>
      x.ciclo_id === cycle.id &&
      x.processo_id === process.id &&
      x.medicamento_id === med.id &&
      x.person_id === process.person_id &&
      x.user_id === process.user_id
  );
  const changed =
    cycle.status === "autorizado" &&
    !!item &&
    (item.dosagem.toLowerCase().replace(/\s+/g, "") !==
      med.dosagem.toLowerCase().replace(/\s+/g, "") ||
      (withdrawal?.quantidade_prevista != null &&
        item.quantidade_mensal != null &&
        withdrawal.quantidade_prevista > item.quantidade_mensal));
  const days = validSupplyDate(cycle.fim) ? supplyDays(today, cycle.fim) : null;
  return {
    covered,
    needsLme,
    lmeReady: linked("lme") && (cycle.status !== "autorizado" || covered),
    prescriptionReady: linked("receita"),
    cyclePrescriptionReady: links.some(
      (x) =>
        x.tipo === "receita" &&
        !x.retirada_id &&
        documents.some(
          (d) =>
            d.id === x.document_id &&
            d.person_id === process.person_id &&
            d.user_id === process.user_id
        )
    ),
    needsPrescription:
      !!withdrawal &&
      (process.receita_cada_retirada || !!withdrawal.exige_nova_receita),
    changed,
    days,
    renewalSoon:
      process.origem === "estadual_ceaf" &&
      cycle.status === "autorizado" &&
      days !== null &&
      days >= 0 &&
      days <= process.antecedencia_dias,
  };
}

export function resolveSupplyWithdrawal(
  data: SupplyData,
  medId: string,
  pid: string,
  uid: string,
  date: string
) {
  const empty = { fornecimento_id: null, fornecimento_ciclo_id: null };
  if (!validSupplyDate(date)) return empty;
  const processes = data.processos.filter(
    (p) =>
      p.person_id === pid &&
      p.user_id === uid &&
      p.status === "ativo" &&
      data.itens.some(
        (i) =>
          i.processo_id === p.id &&
          i.medicamento_id === medId &&
          i.person_id === pid &&
          i.user_id === uid
      )
  );
  // Dois fornecimentos simultâneos exigem seleção explícita; nenhum é adivinhado.
  if (processes.length !== 1) return empty;
  const process = processes[0];
  const cycles = data.ciclos
    .filter(
      (c) =>
        c.processo_id === process.id &&
        c.person_id === pid &&
        c.user_id === uid &&
        c.status !== "encerrado" &&
        data.itens.some(
          (i) =>
            i.ciclo_id === c.id &&
            i.medicamento_id === medId &&
            i.person_id === pid &&
            i.user_id === uid
        )
    )
    .sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
    );
  const cycle =
    cycles.find(
      (c) =>
        c.status === "autorizado" &&
        c.inicio &&
        c.fim &&
        date >= c.inicio &&
        date <= c.fim
    ) || cycles[0];
  return cycle
    ? { fornecimento_id: process.id, fornecimento_ciclo_id: cycle.id }
    : empty;
}
