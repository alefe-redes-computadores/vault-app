export type ScheduleSlot={medicamentoId?:string;horario:string;tomada:boolean;ignorada:boolean;isAvulsa?:boolean;estoqueRestante?:number|null;isExpectedUnconfirmed?:boolean;isSintoma?:boolean;isDataConflict?:boolean;doseKind?:"sos"|"extra"|"planned"};
/** Distinct actionable scheduled slots only. Planned, SOS and projected future logs never enter a batch. */
export function eligibleGroupDoseItems<T extends ScheduleSlot>(items:readonly T[]): T[] {
  const seen=new Set<string>(), result:T[]=[];
  for(const item of items){
    if(!item.medicamentoId || item.tomada || item.ignorada || item.isAvulsa ||
       item.isSintoma || item.isDataConflict || item.isExpectedUnconfirmed || item.doseKind === "planned" ||
       item.doseKind === "sos" || item.doseKind === "extra" ||
       !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.horario))continue;
    const key=`${item.medicamentoId}-${item.horario}`;
    if(seen.has(key))continue;
    seen.add(key);result.push(item);
  }
  return result;
}
export function eligibleGroupDoseKeys<T extends ScheduleSlot>(items:readonly T[]):string[]{
  return eligibleGroupDoseItems(items).map(item=>`${item.medicamentoId}-${item.horario}`);
}
/** Group only scheduled medications. Symptoms/extra doses remain independent and in source order. */
export function groupScheduleSlots<T extends ScheduleSlot>(items:readonly T[]) {
  const groups=new Map<string,{key:string;entries:{item:T;index:number}[]}>();
  items.forEach((item,index)=>{
    // Planned DoseLogs are often projected with isAvulsa=true. The kind,
    // not the generic avulsa flag, determines their visual grouping.
    const sameTimeEligible=item.doseKind==="planned" ||
      (!item.isAvulsa && item.doseKind!=="sos" && item.doseKind!=="extra");
    const key=item.medicamentoId&&!item.isSintoma&&sameTimeEligible&&/^([01]\d|2[0-3]):[0-5]\d$/.test(item.horario)?`time:${item.horario}`:`single:${index}`;
    let group=groups.get(key);if(!group){group={key,entries:[]};groups.set(key,group);}
    group.entries.push({item,index});
  });
  // M19: summarize each time group in a single traversal. Preserve every
  // original item, entry index, pending status and zero-stock warning.
  return [...groups.values()].map(group=>{
    const slots:T[]=[];
    const pending:T[]=[];
    let unavailable=0, resolved=0;
    const planned:T[]=[];
    const unconfirmed:T[]=[];
    const conflicts:T[]=[];
    for(const {item} of group.entries){
      slots.push(item);
      // An event's type wins over contradictory legacy outcome flags.
      if(item.doseKind === "planned") { planned.push(item); continue; }
      if(item.isDataConflict) { conflicts.push(item); continue; }
      // No historical confirmation is not a planned dose or an ignored dose.
      if(item.isExpectedUnconfirmed) { unconfirmed.push(item); continue; }
      // SOS/extra/ad-hoc/symptoms remain visual-only, never routine completion.
      if(item.doseKind === "sos" || item.doseKind === "extra" || item.isAvulsa || item.isSintoma) continue;
      if(item.tomada || item.ignorada) { resolved++; continue; }
      pending.push(item);
      if(typeof item.estoqueRestante==='number'&&item.estoqueRestante<=0)unavailable++;
    }
    return {...group,slots,pending,planned,unconfirmed,conflicts,resolved,unavailable};
  });
}
