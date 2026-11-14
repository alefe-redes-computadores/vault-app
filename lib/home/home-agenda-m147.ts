/** M147 P1: projeções exclusivamente visuais da Home. Nenhuma mudança clínica/dose/banco. */
export type HomeAgendaBucketM147 = 'pendente_anterior'|'horario_passado'|'ainda_hoje'|'sem_horario'|'data_futura';
export type HomeTimedEventM147 = { data?:string|null; horario?:string|null };
const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const validClock=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
/** Comparações por dia e HH:mm locais, sem converter para UTC ou inventar hora. */
export function homeAgendaBucketM147(event:HomeTimedEventM147,today:string,nowHHMM:string):HomeAgendaBucketM147 {
 const day=String(event.data||''),time=String(event.horario||'').trim();
 if(!validDay(today)||!validDay(day))return 'sem_horario';
 if(day<today)return 'pendente_anterior';
 if(day>today)return 'data_futura';
 if(!validClock(nowHHMM)||!validClock(time))return 'sem_horario';
 return time<=nowHHMM?'horario_passado':'ainda_hoje';
}
export function homeAgendaCountsM147(events:readonly HomeTimedEventM147[],today:string,nowHHMM:string){
 const counters={pendenteAnterior:0,horarioPassado:0,aindaHoje:0,semHorario:0,futuro:0};
 for(const event of events){
  switch(homeAgendaBucketM147(event,today,nowHHMM)){
   case 'pendente_anterior':counters.pendenteAnterior++;break;
   case 'horario_passado':counters.horarioPassado++;break;
   case 'ainda_hoje':counters.aindaHoje++;break;
   case 'sem_horario':counters.semHorario++;break;
   case 'data_futura':counters.futuro++;break;
  }
 }
 return counters;
}
/** Ordenação estável: pendências antigas -> horário passado -> ainda hoje -> sem horário. */
export function sortHomeWithdrawalsM147<T extends HomeTimedEventM147>(events:readonly T[],today:string,nowHHMM:string):T[]{
 const rank:Record<HomeAgendaBucketM147,number>={pendente_anterior:0,horario_passado:1,ainda_hoje:2,sem_horario:3,data_futura:4};
 return events.map((event,i)=>({event,i,rank:rank[homeAgendaBucketM147(event,today,nowHHMM)]})).sort((a,b)=>{
  if(a.rank!==b.rank)return a.rank-b.rank;
  if(a.rank<=2){const cmp=String(a.event.data||'').localeCompare(String(b.event.data||''))||String(a.event.horario||'').localeCompare(String(b.event.horario||''));if(cmp)return cmp;}
  return a.i-b.i;
 }).map(item=>item.event);
}
type AlertM147={id:string;kind:string;level:string;href:string;title?:string;subtitle?:string};
type WithdrawalM147={id?:string|null};
/** Apenas o mesmo evento de retirada (mesmo ID e destino), nunca medicamento pelo nome.
 * Alertas urgentes/atrasados/regulatórios e outros fenômenos continuam independentes. */
export function mergeExactWithdrawalAliasesM147<A extends AlertM147,W extends WithdrawalM147>(withdrawals:readonly W[],alerts:readonly A[]){
 const ids=new Set(withdrawals.map(w=>String(w.id||'')).filter(Boolean));
 const aliases=new Set<string>();const byWithdrawal=new Map<string,A[]>();
 for(const alert of alerts){
  if(alert.kind!=='sus'||!['ok','atencao'].includes(alert.level))continue;
  let u:URL;
  try{u=new URL(alert.href,'https://vault.local');}catch{continue;}
  if(u.origin!=='https://vault.local'||!/^\/saude\/retiradas\/detalhes\/?$/.test(u.pathname))continue;
  const id=u.searchParams.get('id')||'';
  if(!ids.has(id))continue;
  aliases.add(alert.id);byWithdrawal.set(id,[...(byWithdrawal.get(id)||[]),alert]);
 }
 return {aliasIds:aliases,byWithdrawal};
}
