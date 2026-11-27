import {metadataPendingProtection} from '@/lib/dose-premium/cutover-metadata-pending';
import { db } from "@/lib/db";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import { isPrescriptionOnly } from "@/lib/health-supply/renewal-event";
import { captureHistoricalLocationA3 } from "@/lib/health-supply/a3-historical-locations";
import { a1Today, validCivilDate, type A1Source, type A1PhaseKind, type A1TreatmentPhase, type A4RegimenSnapshot, type A1PrescriptionLink, type A1SupplyLocation } from "./types";

const str=(value: string | null | undefined):string => typeof value==="string"?value.trim():"";
function ensureDate(date:string, factual=true):string {
  const day=str(date);
  if (!validCivilDate(day)) throw new Error("Informe uma data real no formato AAAA-MM-DD.");
  if (factual && day>a1Today()) throw new Error("Um acontecimento ainda não realizado não pode ser registrado como fato.");
  return day;
}
function ensureIdentity(userId:string, personId:string):void {
  if(!str(userId)||!str(personId)) throw new Error("Selecione uma pessoa e entre na sua conta antes de registrar.");
}
function newMeta(userId:string,personId:string){const now=new Date().toISOString();return {id:crypto.randomUUID(),user_id:userId,person_id:personId,created_at:now,updated_at:now,deleted_at:null as null,synced:false};}
async function requireProfessional(id:string|null,userId:string):Promise<void>{
  if(!id)return;
  const row=await db.medicos.get(id);
  if(!row||row.user_id!==userId)throw new Error("Profissional não pertence à sua Rede de Saúde.");
}
function completed():void{solicitarProcessamentoSync();}

export const clinicalA1Repository={
  async recordPhase(input:{userId:string;personId:string;treatmentId:string;tipo:A1PhaseKind;data:string;origem:A1Source;professionalId?:string|null;titulo:string;observacoes?:string;regimeA4?:Partial<A4RegimenSnapshot>|null}):Promise<string>{
    ensureIdentity(input.userId,input.personId);
    const treatment=await db.tratamentos.get(input.treatmentId);
    if(!treatment||treatment.user_id!==input.userId||treatment.person_id!==input.personId)throw new Error("Tratamento de outra pessoa ou indisponível.");
    await requireProfessional(input.professionalId??null,input.userId);
    const title=str(input.titulo);
    if(title.length<3||title.length>110)throw new Error("Informe um título de 3 a 110 caracteres.");
    // A4 records only a user-declared event. Nothing updates medication, treatment, DoseLog or inventory.
    const effectiveOn=ensureDate(input.data);
    const regimeA4=input.regimeA4 ? (await import("@/lib/treatment-a4/regimen")).normalizeA4Regimen(input.regimeA4,effectiveOn) : null;
    if (regimeA4?.medicamento_id) {
      const med=await db.medicamentos.get(regimeA4.medicamento_id);
      if(!med||med.user_id!==input.userId||med.person_id!==input.personId)
        throw new Error("Medicamento fora da pessoa ativa; não foi criado vínculo automático.");
    }
    if (regimeA4?.consulta_id) {
      const consulta=await db.consultas.get(regimeA4.consulta_id);
      if(!consulta||consulta.user_id!==input.userId||consulta.person_id!==input.personId)
        throw new Error("Consulta não pertence à pessoa ativa.");
    }
    if (regimeA4?.documento_id) {
      const documento=await db.documents.get(regimeA4.documento_id);
      if(!documento||documento.user_id!==input.userId||documento.person_id!==input.personId)
        throw new Error("Documento não pertence à pessoa ativa.");
    }
    const row:A1TreatmentPhase={...newMeta(input.userId,input.personId),tratamento_id:input.treatmentId,tipo:input.tipo,data_efetiva:effectiveOn,origem:input.origem,profissional_id:input.professionalId||null,titulo:title,observacoes:str(input.observacoes).slice(0,1000)||null,regime_a4:regimeA4};
    await db.transaction("rw",[db.a1_treatment_phases,db.syncQueue],async()=>{
      await db.a1_treatment_phases.add(row);
      await enfileirarOperacao("a1_treatment_phases","add",row,{dispatchSync:false});
    });
    completed();return row.id;
  },
  async linkPrescriptions(input:{userId:string;personId:string;medicationId:string;previousId:string;currentId:string;tipo:"renovacao"|"substituicao";origem:A1Source;observacoes?:string}, behavior?:{notify?:boolean}):Promise<string>{
    ensureIdentity(input.userId,input.personId);
    if(!input.previousId||!input.currentId||input.previousId===input.currentId)throw new Error("Selecione duas receitas diferentes.");
    const [previous,current,medicine]=await Promise.all([db.renovacoes.get(input.previousId),db.renovacoes.get(input.currentId),db.medicamentos.get(input.medicationId)]);
    if(!medicine||medicine.user_id!==input.userId||medicine.person_id!==input.personId)throw new Error("Medicamento não pertence à pessoa ativa.");
    for(const event of [previous,current]){
      if(!event||event.user_id!==input.userId||event.person_id!==input.personId||event.medicamento_id!==input.medicationId||!isPrescriptionOnly(event))throw new Error("Selecione apenas receitas existentes do mesmo medicamento, sem eventos de aquisição.");
    }
    if(previous!.data>current!.data)throw new Error("A receita anterior não pode ser posterior à atual.");
    const row:A1PrescriptionLink={...newMeta(input.userId,input.personId),medicamento_id:input.medicationId,renovacao_anterior_id:input.previousId,renovacao_atual_id:input.currentId,tipo:input.tipo,origem:input.origem,observacoes:str(input.observacoes).slice(0,1000)||null};
    await db.transaction("rw",[db.a1_prescription_links,db.syncQueue],async()=>{
      if(metadataPendingProtection(await db.syncQueue.toArray(),input.userId).has('medicamentos',input.medicationId))throw Error('Vínculo clínico anterior aguarda confirmação.');
      const existing=await db.a1_prescription_links.where("person_id").equals(input.personId).filter(x=>x.user_id===input.userId&&!x.deleted_at&&x.renovacao_atual_id===input.currentId).toArray();
      if(existing.length)throw new Error("Esta receita já possui vínculo de versão. Abra o histórico existente.");
      // A1 version graph must be acyclic, including two same-day prescriptions.
      const allLinks=await db.a1_prescription_links.where("person_id").equals(input.personId)
        .filter(x=>x.user_id===input.userId&&!x.deleted_at&&x.medicamento_id===input.medicationId).toArray();
      if(allLinks.some(link=>link.renovacao_anterior_id===input.previousId))
        throw new Error("A receita anterior já foi vinculada a uma nova versão. Reabra o histórico antes de tentar outra.");
      const successors=new Map<string,string[]>();
      for(const link of allLinks)successors.set(link.renovacao_anterior_id,[...(successors.get(link.renovacao_anterior_id)||[]),link.renovacao_atual_id]);
      const visited=new Set<string>(),stack=[input.currentId];
      while(stack.length){const candidate=stack.pop()!;if(visited.has(candidate))continue;
        if(candidate===input.previousId)throw new Error("Esse vínculo formaria um ciclo entre receitas. Revise a ordem.");
        visited.add(candidate);stack.push(...(successors.get(candidate)||[]));}
      await db.a1_prescription_links.add(row);
      await enfileirarOperacao("a1_prescription_links","add",row,{dispatchSync:false});
    });
    if(behavior?.notify===false)return row.id;
    completed();return row.id;
  },
  async registerSupplyLocation(input:{userId:string;personId:string;processId:string;farmaciaId?:string|null;localId?:string|null;startOn:string;origem:A1Source;observacoes?:string}):Promise<string>{
    ensureIdentity(input.userId,input.personId);
    const process=await db.fornecimentos.get(input.processId);
    if(!process||process.user_id!==input.userId||process.person_id!==input.personId)throw new Error("Fornecimento não pertence à pessoa ativa.");
    const pharmacy=str(input.farmaciaId)||null,location=str(input.localId)||null;
    if(Boolean(pharmacy)===Boolean(location))throw new Error("Escolha uma farmácia ou um local de saúde, não ambos.");
    if(pharmacy){const a=await db.farmacias.get(pharmacy);if(!a||a.user_id!==input.userId)throw new Error("Farmácia fora da sua Rede de Saúde.");}
    if(location){const a=await db.locais.get(location);if(!a||a.user_id!==input.userId)throw new Error("Local fora da sua Rede de Saúde.");}
    const locationSnapshotA3=captureHistoricalLocationA3({userId:input.userId,pharmacyId:pharmacy,placeId:location,
      pharmacy:pharmacy?await db.farmacias.get(pharmacy):null,
      place:location?await db.locais.get(location):null,
      now:new Date().toISOString(),source:"planned_assignment"});
    const row:A1SupplyLocation={...newMeta(input.userId,input.personId),fornecimento_id:input.processId,farmacia_id:pharmacy,local_id:location,inicio_vigencia:ensureDate(input.startOn,false),origem:input.origem,observacoes:str(input.observacoes).slice(0,1000)||null,a3_location_snapshot:locationSnapshotA3};
    await db.transaction("rw",[db.a1_supply_locations,db.syncQueue],async()=>{
      const conflict=await db.a1_supply_locations.where("person_id").equals(input.personId).filter(x=>x.user_id===input.userId&&!x.deleted_at&&x.fornecimento_id===input.processId&&x.inicio_vigencia===row.inicio_vigencia).first();
      if(conflict)throw new Error("Já existe um local registrado para essa data e fornecimento.");
      await db.a1_supply_locations.add(row);
      await enfileirarOperacao("a1_supply_locations","add",row,{dispatchSync:false});
    });
    completed();return row.id;
  }
};
