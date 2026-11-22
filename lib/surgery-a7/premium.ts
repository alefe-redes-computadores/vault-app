/** A7/M6 Premium: selectors and search over proven local facts; no persistence. */
export type SurgeryCandidateA7={id?:string;user_id:string;person_id?:string|null;deleted_at?:string|null};
export type EpisodeRelationA7=SurgeryCandidateA7 & {hospitalization_id:string;entity_type:string;entity_id:string};
export function normalizeSurgerySearchA7(value:string):string{
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}
/** Returns an ID ONLY when an owned A5 episode and owned relation target an owned Cirurgia. */
export function resolveSurgeryForHospitalizationA7(input:{userId:string;personId:string;episodeId:string;
 episodes:readonly SurgeryCandidateA7[];relations:readonly EpisodeRelationA7[];surgeries:readonly SurgeryCandidateA7[]}):string{
 const {userId:uid,personId:pid,episodeId}=input;
 if(!uid||!pid||!episodeId)return '';
 const own=(x:SurgeryCandidateA7)=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at&&!!x.id;
 if(!input.episodes.some(x=>own(x)&&x.id===episodeId))return '';
 const ids=new Set(input.surgeries.filter(own).map(x=>x.id));
 const matched=new Set(input.relations.filter(x=>own(x)&&x.hospitalization_id===episodeId&&
  x.entity_type==='cirurgia'&&ids.has(x.entity_id)).map(x=>x.entity_id));
 // Avoid arbitrary selection when the episode is related to several operations.
 return matched.size===1?[...matched][0]||'':'';
}
