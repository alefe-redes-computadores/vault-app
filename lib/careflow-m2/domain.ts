/** CI360 M2 — pure, explicit evidence contracts. No clinical diagnosis or stock changes. */
export type CareFlowKindM2 =
  | 'exam_order' | 'exam_item' | 'exam_status' | 'exam_result'
  | 'monitor_plan' | 'monitor_reading' | 'monitor_note';
export type ExamItemStateM2 = 'pending' | 'collected' | 'result_received' | 'cancelled';
export type ConfirmedMarkM2 = 'checked' | 'unchecked' | 'uncertain';
export interface CareFlowEventM2 {
  id: string; user_id: string; person_id: string; kind: CareFlowKindM2;
  parent_id: string | null; related_id: string | null;
  payload: Record<string, unknown>;
  created_at: string; updated_at: string; synced: boolean;
}
export interface CareFlowEventInputM2 {
  id?: string; kind: CareFlowKindM2; parent_id?: string | null;
  related_id?: string | null; payload: Record<string, unknown>;
}
export type ExamItemReviewM2 = { label: string; mark: ConfirmedMarkM2; confirmed: boolean };
export type ExamItemViewM2 = { item: CareFlowEventM2; state: ExamItemStateM2; result: CareFlowEventM2 | null; statusEvent: CareFlowEventM2 | null };
export type ExamOrderViewM2 = { order: CareFlowEventM2; items: ExamItemViewM2[] };
const KINDS: CareFlowKindM2[] = ['exam_order','exam_item','exam_status','exam_result','monitor_plan','monitor_reading','monitor_note'];
const STATES: ExamItemStateM2[] = ['pending','collected','result_received','cancelled'];
export const isIsoDateM2 = (day:string):boolean => {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const [y,m,d]=day.split('-').map(Number), t=new Date(Date.UTC(y,m-1,d));
  return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;
};
export const isClockM2 = (time:string):boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const str=(value:unknown,max=150)=>String(value??'').trim().slice(0,max);
export function requireCareFlowInputM2(data:CareFlowEventInputM2):void {
  if(!KINDS.includes(data.kind)||!data.payload||typeof data.payload!=='object'||Array.isArray(data.payload))throw new Error('Tipo/evidência de CareFlow inválido.');
  if(JSON.stringify(data.payload).length>12000)throw new Error('Evidência extensa demais para o registro clínico.');
  if(['exam_item','exam_status','exam_result','monitor_reading'].includes(data.kind)&&!data.parent_id)throw new Error('O evento exige vínculo explícito com o seu pedido/plano.');
  if(data.kind==='exam_order'){
    if(!isIsoDateM2(str(data.payload.date,12)))throw new Error('Informe uma data válida para o pedido.');
    if(!str(data.payload.title))throw new Error('Identifique o pedido de exames.');
  }
  if(data.kind==='exam_item'&&!str(data.payload.name))throw new Error('Informe o exame selecionado.');
  if(data.kind==='exam_status'&&!STATES.includes(data.payload.state as ExamItemStateM2))throw new Error('Estado do exame inválido.');
  if(data.kind==='exam_result'){
    if(!str(data.payload.result,500))throw new Error('Informe o resultado explicitamente, sem inferir valores.');
    if(!isIsoDateM2(str(data.payload.date,12)))throw new Error('Informe a data real do resultado.');
  }
  if(data.kind==='monitor_plan'){
    const start=str(data.payload.start,12),end=str(data.payload.end,12);
    if(!isIsoDateM2(start)||!isIsoDateM2(end)||end<start)throw new Error('Período do plano inválido.');
    if((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000>365)throw new Error('Plano de acompanhamento limitado a um ano.');
    const slots=data.payload.slots;
    if(!Array.isArray(slots)||slots.length<1||slots.length>6||slots.some(x=>!isClockM2(String(x)))||new Set(slots).size!==slots.length)throw new Error('Informe de 1 a 6 horários distintos.');
  }
  if(data.kind==='monitor_reading'&&!str(data.related_id))throw new Error('A medição real precisa existir antes do vínculo.');
  if(data.kind==='monitor_note'&&!str(data.related_id))throw new Error('O sintoma real precisa existir antes do vínculo.');
}
export function checkedExamItemsM2(items:readonly ExamItemReviewM2[]):string[] {
  if(items.length===0||items.length>100)throw new Error('Confira a lista de exames do pedido.');
  if(items.some(item=>!item.confirmed))throw new Error('Confirme visualmente cada item, inclusive os não marcados.');
  const checked=items.filter(i=>i.mark==='checked').map(i=>i.label.trim()).filter(Boolean);
  if(!checked.length)throw new Error('Nenhum exame foi marcado e confirmado.');
  return Array.from(new Set(checked));
}
export function projectExamOrdersM2(events:readonly CareFlowEventM2[],userId:string,personId:string):ExamOrderViewM2[] {
  const own=events.filter(e=>e.user_id===userId&&e.person_id===personId);
  const children=new Map<string,CareFlowEventM2[]>();
  for(const e of own){if(e.parent_id){const rows=children.get(e.parent_id)||[];rows.push(e);children.set(e.parent_id,rows);}}
  const newest=(rows:CareFlowEventM2[])=>[...rows].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0]||null;
  return own.filter(e=>e.kind==='exam_order').sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(order=>({
    order,items:(children.get(order.id)||[]).filter(e=>e.kind==='exam_item').map(item=>{
      const row=children.get(item.id)||[];
      const statusEvent=newest(row.filter(e=>e.kind==='exam_status'));
      const result=newest(row.filter(e=>e.kind==='exam_result'));
      const state=(statusEvent?.payload.state as ExamItemStateM2)|| (result?'result_received':'pending');
      return {item,state:STATES.includes(state)?state:'pending',result,statusEvent};
    })
  }));
}
export function scopedEventsM2(events:readonly CareFlowEventM2[],userId:string,personId:string,kind?:CareFlowKindM2){
  return events.filter(e=>e.user_id===userId&&e.person_id===personId&&(!kind||e.kind===kind));
}
