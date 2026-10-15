export type ScheduleSlot={medicamentoId?:string;horario:string;tomada:boolean;ignorada:boolean;isAvulsa?:boolean;estoqueRestante?:number};
/** Group only scheduled medications. Symptoms/extra doses remain independent and in source order. */
export function groupScheduleSlots<T extends ScheduleSlot>(items:readonly T[]) {
  const groups=new Map<string,{key:string;entries:{item:T;index:number}[]}>();
  items.forEach((item,index)=>{
    const key=item.medicamentoId&&!item.isAvulsa?`time:${item.horario}`:`single:${index}`;
    let group=groups.get(key);if(!group){group={key,entries:[]};groups.set(key,group);}
    group.entries.push({item,index});
  });
  return [...groups.values()].map(group=>{
    const slots=group.entries.map(entry=>entry.item);
    const pending=slots.filter(item=>!item.tomada&&!item.ignorada);
    return {...group,slots,pending,resolved:slots.length-pending.length,unavailable:pending.filter(item=>typeof item.estoqueRestante==='number'&&item.estoqueRestante<=0).length};
  });
}
