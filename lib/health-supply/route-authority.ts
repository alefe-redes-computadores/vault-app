import type { Renovacao } from "@/lib/types";
import type { SupplyData, SupplyOrigin } from "./types";
import { SUPPLY_ORIGIN_LABELS } from "./types";

export type MedicationSupplyRoute={origins:SupplyOrigin[];hasPrivatePurchase:boolean;labels:string[];mode:"none"|"private"|"public"|"hybrid"};
const emptyRoute=():MedicationSupplyRoute=>({origins:[],hasPrivatePurchase:false,labels:[],mode:"none"});

/** Índice O(processos + itens + renovações), compartilhável por todas as superfícies. */
export function indexMedicationSupplyRoutes(data:SupplyData,renewals:Renovacao[],personId:string,userId:string):Map<string,MedicationSupplyRoute>{
 const activeProcessOrigin=new Map(data.processos.filter(p=>p.person_id===personId&&p.user_id===userId&&p.status==="ativo").map(p=>[p.id,p.origem]));
 const originsByMedication=new Map<string,Set<SupplyOrigin>>();
 for(const item of data.itens){
  if(item.person_id!==personId||item.user_id!==userId)continue;
  const origin=activeProcessOrigin.get(item.processo_id);if(!origin)continue;
  const origins=originsByMedication.get(item.medicamento_id)??new Set<SupplyOrigin>();origins.add(origin);originsByMedication.set(item.medicamento_id,origins);
 }
 const privateByMedication=new Set(renewals.filter(r=>r.person_id===personId&&r.user_id===userId&&r.tipo_aquisicao==="comprado").map(r=>r.medicamento_id));
 const medicationIds=new Set([...originsByMedication.keys(),...privateByMedication]);
 const index=new Map<string,MedicationSupplyRoute>();
 for(const medicationId of medicationIds){
  const origins=[...(originsByMedication.get(medicationId)??[])],hasPrivatePurchase=privateByMedication.has(medicationId);
  const publicOrigins=origins.filter(o=>o!=="comprado"&&o!=="outro"),privateRoute=hasPrivatePurchase||origins.includes("comprado");
  index.set(medicationId,{origins,hasPrivatePurchase,labels:[...publicOrigins.map(o=>SUPPLY_ORIGIN_LABELS[o]),...(privateRoute?["Comprado"]:[])],mode:publicOrigins.length&&privateRoute?"hybrid":publicOrigins.length?"public":privateRoute?"private":"none"});
 }
 return index;
}
/** Explicit process links and recorded acquisitions are independent authorities. */
export function medicationSupplyRoute(medicationId:string,data:SupplyData,renewals:Renovacao[],personId:string,userId:string):MedicationSupplyRoute{
 return indexMedicationSupplyRoutes(data,renewals,personId,userId).get(medicationId)??emptyRoute();
}
