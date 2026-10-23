export type ScheduleSlot={medicamentoId?:string;horario:string;tomada:boolean;ignorada:boolean;isAvulsa?:boolean;estoqueRestante?:number;isExpectedUnconfirmed?:boolean;isSintoma?:boolean;doseKind?:"sos"|"extra"|"planned"};
/** Distinct actionable scheduled slots only. Planned, SOS and projected future logs never enter a batch. */
export function eligibleGroupDoseItems<T extends ScheduleSlot>(items:readonly T[]): T[] {
  const seen=new Set<string>(), result:T[]=[];
  for(const item of items){
    if(!item.medicamentoId || item.tomada || item.ignorada || item.isAvulsa ||
       item.isSintoma || item.isExpectedUnconfirmed || item.doseKind === "planned" ||
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
    const key=item.medicamentoId&&!item.isAvulsa&&!item.isSintoma&&item.doseKind!=="planned"?`time:${item.horario}`:`single:${index}`;
    let group=groups.get(key);if(!group){group={key,entries:[]};groups.set(key,group);}
    group.entries.push({item,index});
  });
  return [...groups.values()].map(group=>{
    const slots=group.entries.map(entry=>entry.item);
    const pending=slots.filter(item=>!item.tomada&&!item.ignorada);
    return {...group,slots,pending,resolved:slots.length-pending.length,unavailable:pending.filter(item=>typeof item.estoqueRestante==='number'&&item.estoqueRestante<=0).length};
  });
}
