/** A5 projections: a single source of truth for cards, filters and relation counts. */
import type { A5Episode,A5Event,A5Stay,A5Relation,A5Discharge } from './types';
import { displayDayA5, A5_STATUS_LABEL, A5_UNIT_LABEL, A5_EVENT_LABEL } from './types';
export function hospitalizationSummaryA5(episodes:readonly A5Episode[],uid:string,pid:string){
 const own=episodes.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at);
 return {total:own.length,planned:own.filter(x=>x.status==='planned').length,
  current:own.filter(x=>x.status==='admitted'||x.status==='on_leave').length,
  finished:own.filter(x=>x.status==='discharged').length,cancelled:own.filter(x=>x.status==='cancelled').length};
}
export function hospitalizationTimelineA5(episode:A5Episode,stays:readonly A5Stay[],events:readonly A5Event[],discharge:readonly A5Discharge[]){
 const own=<T extends {user_id:string;person_id:string;hospitalization_id:string;deleted_at:string|null}>(rows:readonly T[])=>
  rows.filter(r=>r.user_id===episode.user_id&&r.person_id===episode.person_id&&r.hospitalization_id===episode.id&&!r.deleted_at);
 const output:Array<{key:string;title:string;subtitle:string;sortKey:string;kind:'episode'|'stay'|'event'|'discharge'}>=[];
 if(episode.admitted_on)output.push({key:`ep-${episode.id}`,title:'Data de admissão informada',subtitle:displayDayA5(episode.admitted_on),sortKey:episode.admitted_on,kind:'episode'});
 for(const stay of own(stays))output.push({key:`stay-${stay.id}`,title:A5_UNIT_LABEL[stay.unit_type],subtitle:`Entrada: ${displayDayA5(stay.entered_on)} · Saída: ${displayDayA5(stay.left_on)}`,sortKey:stay.entered_on||stay.created_at.slice(0,10),kind:'stay'});
 for(const event of own(events))output.push({key:`event-${event.id}`,title:A5_EVENT_LABEL[event.kind],subtitle:`${event.summary} · ${event.occurred_on?displayDayA5(event.occurred_on):'Data clínica não informada'}`,sortKey:event.occurred_on||event.created_at.slice(0,10),kind:'event'});
 for(const row of own(discharge))output.push({key:`discharge-${row.id}`,title:'Saída documentada',subtitle:row.summary||'Resumo não informado',sortKey:episode.discharged_on||row.created_at.slice(0,10),kind:'discharge'});
 return output.sort((a,b)=>a.sortKey.localeCompare(b.sortKey)||a.key.localeCompare(b.key));
}
export function hospitalizationRelationsA5(episode:A5Episode,relations:readonly A5Relation[]){
 return relations.filter(r=>r.user_id===episode.user_id&&r.person_id===episode.person_id&&r.hospitalization_id===episode.id&&!r.deleted_at);
}
/** Optional planned date is not a confirmed appointment or admission. Never make actionable reminders from it. */
export function hospitalizationTodayA5(episodes:readonly A5Episode[],uid:string,pid:string,day:string){
 return episodes.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at&&x.status==='planned'&&x.planned_admission_on===day)
  .map(x=>({id:x.id,title:'Internação planejada',description:'Data prevista, ainda sem confirmação de admissão.',status:A5_STATUS_LABEL[x.status]}));
}
