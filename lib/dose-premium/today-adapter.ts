import {doseCenterView,validHour,type CanonicalDoseRow,type HistoricalDose,type Scope,type DoseStatus} from './center-view';
/** Structural subset of TodayTimelineItem. No duplicated timeline builder or slot resolver. */
export type TodayDoseEvidence={medicamentoId?:string;medicamentoNome?:string;formato?:string;cores?:string[];horario:string;tomada:boolean;ignorada:boolean;isDataConflict?:boolean;isExpectedUnconfirmed?:boolean;isAvulsa?:boolean;isSintoma?:boolean;doseKind?:'sos'|'extra'|'planned';scheduleOrigin?:'continuous'|'temporary_course'|'ad_hoc'|'sos'|'extra'|'unknown';logId?:string;dosagem?:string;tratamentoCor?:string;medicationAvailable?:boolean};
export type CanonicalSlotEvidence={state:'absent'|'pending'|'taken'|'ignored'|'conflict';records:readonly HistoricalDose[]};
export type TodayAdapterInput<T extends TodayDoseEvidence>={scope:Scope;snapshotScope:Scope;snapshotDay:string;day:string;today:string;now:string;asOf:string;load:'ready'|'loading'|'error';items:readonly T[];logs:readonly HistoricalDose[];
  /** Host callbacks must use current committed canonical projection and existing authorities. */
  keyOf:(item:T)=>string;isRoutine:(item:T)=>boolean;isEligible:(item:T)=>boolean;stockState:(item:T)=>CanonicalDoseRow['stock'];resolveSlot:(item:T)=>CanonicalSlotEvidence;plannedQuantityLabel:(item:T)=>string|undefined;
};
export function adaptTodayDoseCenter<T extends TodayDoseEvidence>(input:TodayAdapterInput<T>){
  const {scope,day,today,now,asOf}=input;
  const base={scope,day,today,now,asOf,logs:input.logs};
  if(input.load!=='ready'||input.snapshotScope.user_id!==scope.user_id||input.snapshotScope.person_id!==scope.person_id||input.snapshotDay!==day)
    return doseCenterView({...base,load:input.load==='error'?'error':'loading',rows:[]});
  const rows:CanonicalDoseRow[]=[];
  for(const item of input.items){
    if(item.isSintoma)continue;
    const independent=item.doseKind==='sos'||item.doseKind==='extra'||item.scheduleOrigin==='sos'||item.scheduleOrigin==='extra';
    const routine=!independent&&(input.isRoutine(item)||item.scheduleOrigin==='temporary_course'||item.scheduleOrigin==='ad_hoc'||item.doseKind==='planned'&&item.scheduleOrigin!=='continuous');
    const origin=item.scheduleOrigin==='continuous'?'scheduled':item.scheduleOrigin??(item.doseKind==='sos'?'sos':item.doseKind==='extra'?'extra':routine?'scheduled':'unknown');
    let status:DoseStatus,log_id=item.logId;
    if(item.isDataConflict||item.tomada&&item.ignorada)status='conflict';
    else if(item.doseKind==='planned'){
      // A planned row is factual only when its exact persisted log confirms it.
      const fact=log_id?input.logs.filter(l=>l.id===log_id&&l.user_id===scope.user_id&&l.person_id===scope.person_id&&l.data===day&&l.medicamento_id===item.medicamentoId&&typeof l.horario==='string'&&l.horario.slice(0,5)===item.horario&&l.dose_kind==='planned'):[];
      if(item.tomada||item.ignorada){status=fact.length===1?(item.tomada?'confirmed':'ignored'):'unconfirmed';}
      else if(routine&&day===today&&validHour(item.horario))status=item.horario>now?'upcoming':item.horario===now?'due_now':'overdue';
      else status='planned';
    } else if(item.tomada||item.ignorada){
      status=item.tomada?'confirmed':'ignored';
      if(!log_id&&routine){const slot=input.resolveSlot(item);const expected=item.tomada?'taken':'ignored';const candidates=slot.records.filter(x=>x.user_id===scope.user_id&&x.person_id===scope.person_id&&x.data===day&&x.medicamento_id===item.medicamentoId&&typeof x.horario==='string'&&x.horario.slice(0,5)===item.horario&&(item.tomada?Boolean(x.tomado_em)&&!x.ignorado_em:Boolean(x.ignorado_em)&&!x.tomado_em));if(slot.state===expected&&candidates.length===1)log_id=candidates[0].id;else status='conflict';}
    } else if(item.isExpectedUnconfirmed||!routine||!validHour(item.horario)||day!==today)status='unconfirmed';
    // Presentation partition of canonical unresolved slots. Clinical eligibility stays upstream.
    else status=item.horario>now?'upcoming':item.horario===now?'due_now':'overdue';
    rows.push({...scope,key:input.keyOf(item),day,hour:item.horario,medication_id:item.medicamentoId??'',name:item.medicamentoNome??'Medicamento não identificado',format:item.formato,colors:item.cores,concentration:item.dosagem,relationColor:item.tratamentoCor,medicationAvailable:item.medicationAvailable,status,routine,eligible:input.isEligible(item),stock:input.stockState(item),origin,log_id,planned_quantity_label:input.plannedQuantityLabel(item)});
  }
  return doseCenterView({...base,load:'ready',rows});
}
