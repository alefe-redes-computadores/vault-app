import type { buildSupplyRelationshipIndex } from "@/lib/health-supply/relationship-index";
import { SUPPLY_ORIGIN_LABELS } from "@/lib/health-supply/types";
import type { SupplyData } from "@/lib/health-supply/types";

type SupplyIndex = ReturnType<typeof buildSupplyRelationshipIndex>;

/** Read-only, owner-scoped bidirectional projection. It never infers fulfillment. */
export function projectSupplyRelationshipMap(index: SupplyIndex, processId: string) {
  const process = index.processById.get(processId);
  if (!process) return null;
  const medicationIds = index.medicationIdsByProcess.get(processId) ?? new Set<string>();
  const medications = [...medicationIds].flatMap(id => {
    const row = index.medicationById.get(id);
    return row?.id ? [{id:row.id,name:row.nome,dosage:row.dosagem,format:row.formato,colors:row.cores}] : [];
  }).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const treatments = (index.treatmentsByProcess.get(processId) ?? []).flatMap(row =>
    row.id ? [{id:row.id,name:row.nome,status:row.status}] : []
  ).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const documents = (index.documentsByProcess.get(processId) ?? []).flatMap(link => {
    const row = index.documentById.get(link.document_id);
    return row?.id ? [{id:row.id,title:row.title,kind:link.tipo,state:link.estado}] : [];
  });
  const withdrawals = (index.withdrawalsByProcess.get(processId) ?? []).flatMap(row =>
    row.id ? [{id:row.id,name:row.medicamento_nome || "Retirada",date:row.data,status:row.status}] : []
  ).sort((a,b)=>b.date.localeCompare(a.date));
  const cycles = index.cyclesByProcess.get(processId) ?? [];
  return {
    process:{id:process.id,title:process.titulo,status:process.status,origin:SUPPLY_ORIGIN_LABELS[process.origem]},
    treatments, medications, documents, withdrawals,
    cycles:{total:cycles.length,active:cycles.filter(row=>row.status!=="encerrado").length},
    pharmacy:index.pharmacyById.get(process.farmacia_id || "") ?? null,
    place:index.placeById.get(process.local_id || "") ?? null,
  };
}

export type SupplyRelationshipMapProjection = NonNullable<ReturnType<typeof projectSupplyRelationshipMap>>;

export function summarizeMedicationSupplyRelations(data: SupplyData, medicationId: string) {
  const relatedItems=data.itens.filter(item=>item.medicamento_id===medicationId);
  const processIds=new Set(relatedItems.map(item=>item.processo_id));
  const cycleIds=new Set(relatedItems.map(item=>item.ciclo_id));
  const processes=data.processos.filter(process=>process.status==="ativo"&&processIds.has(process.id));
  const activeProcessIds=new Set(processes.map(process=>process.id));
  const cycles=data.ciclos.filter(cycle=>activeProcessIds.has(cycle.processo_id)&&cycleIds.has(cycle.id)&&cycle.status!=="encerrado");
  return {
    processes:processes.map(process=>({id:process.id,title:process.titulo,origin:SUPPLY_ORIGIN_LABELS[process.origem]})),
    preparing:cycles.filter(cycle=>cycle.status==="preparando").length,
    protocolled:cycles.filter(cycle=>cycle.status==="protocolado").length,
    authorized:cycles.filter(cycle=>cycle.status==="autorizado").length,
    origins:[...new Set(processes.map(process=>SUPPLY_ORIGIN_LABELS[process.origem]))],
  };
}
