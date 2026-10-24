import type { Renovacao } from "@/lib/types";
import type { SupplyData, SupplyOrigin } from "./types";
import { SUPPLY_ORIGIN_LABELS } from "./types";

export type MedicationSupplyRoute={origins:SupplyOrigin[];hasPrivatePurchase:boolean;labels:string[];mode:"none"|"private"|"public"|"hybrid"};
/** Explicit process links and recorded acquisitions are independent authorities. */
export function medicationSupplyRoute(medicationId:string,data:SupplyData,renewals:Renovacao[],personId:string,userId:string):MedicationSupplyRoute{
 const processIds=new Set(data.itens.filter(i=>i.person_id===personId&&i.user_id===userId&&i.medicamento_id===medicationId).map(i=>i.processo_id));
 const origins=[...new Set(data.processos.filter(p=>p.person_id===personId&&p.user_id===userId&&p.status==="ativo"&&processIds.has(p.id)).map(p=>p.origem))];
 const hasPrivatePurchase=renewals.some(r=>r.person_id===personId&&r.user_id===userId&&r.medicamento_id===medicationId&&r.tipo_aquisicao==="comprado");
 const publicOrigins=origins.filter(o=>o!=="comprado"&&o!=="outro");
 const privateRoute=hasPrivatePurchase||origins.includes("comprado");
 return {origins,hasPrivatePurchase,labels:[...publicOrigins.map(o=>SUPPLY_ORIGIN_LABELS[o]),...(privateRoute?["Comprado"]:[])],mode:publicOrigins.length&&privateRoute?"hybrid":publicOrigins.length?"public":privateRoute?"private":"none"};
}
