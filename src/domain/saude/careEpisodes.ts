/** M144: projeção observacional de episódios sem reescrever cadastro, doses ou tratamentos. */
export type EpisodeM144={id:string;user_id:string;person_id:string;title:string;startDay:string;endDay:string;kind:'ciclo_curto'|'contingencia'};
export function validLocalDayM144(day:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const d=new Date(day+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;
}
export function episodeProgressM144(startDay:string,endDay:string,today:string):null|{elapsed:number;total:number;state:'agendado'|'ativo'|'historico'} {
 if(!validLocalDayM144(startDay)||!validLocalDayM144(endDay)||!validLocalDayM144(today)||endDay<startDay)return null;
 const days=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
 const total=days(startDay,endDay)+1;
 if(today<startDay)return {elapsed:0,total,state:'agendado'};
 if(today>endDay)return {elapsed:total,total,state:'historico'};
 return {elapsed:days(startDay,today)+1,total,state:'ativo'};
}
export function projectEpisodesM144(entries:readonly EpisodeM144[],owner:string,person:string,today:string){
 const owned=entries.filter(e=>e.user_id===owner&&e.person_id===person&&episodeProgressM144(e.startDay,e.endDay,today));
 return {active:owned.filter(e=>e.startDay<=today&&e.endDay>=today),future:owned.filter(e=>e.startDay>today),history:owned.filter(e=>e.endDay<today)};
}
export type ImmunizationM144={id:string;user_id:string;person_id:string;title:string;date:string;lot?:string|null;boosterDate?:string|null;kind:'vacina'|'procedimento'};
export function projectPeriodicCareM144(events:readonly ImmunizationM144[],userId:string,personId:string,today:string){
 return events.filter(x=>x.user_id===userId&&x.person_id===personId&&validLocalDayM144(x.date)).map(x=>({...x,boosterStatus:!x.boosterDate||!validLocalDayM144(x.boosterDate)?'nao_informado':x.boosterDate<today?'revisar_data':x.boosterDate===today?'declarado_para_hoje':'planejado'} as const));
}
