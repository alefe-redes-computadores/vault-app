import type { Renovacao } from "@/lib/types";
import type { SupplyProcess } from "./types";

/** An explicit missing ID must never silently open a different health record. */
export function resolveProcessSelection(processes: SupplyProcess[], selected: string) {
  return selected ? processes.find(p => p.id === selected) : processes[0];
}

/** Only confirmed private purchases; prescriptions/free dispensations are not costs. */
export function purchaseHistory(rows: Renovacao[], pid: string, uid: string, ids: Set<string>) {
  return rows.filter(r => r.id && r.person_id === pid && r.user_id === uid && ids.has(r.medicamento_id) &&
    r.tipo_aquisicao === "comprado" && typeof r.preco === "number" && Number.isFinite(r.preco) && r.preco >= 0)
    .sort((a,b) => (b.data_aquisicao || b.data).localeCompare(a.data_aquisicao || a.data) || (a.id || "").localeCompare(b.id || ""));
}
