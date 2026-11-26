import type { Scope } from './model';
import { own,civil } from './validation';
/** Read-only projection of the existing registros_saude water authority. No target inference. */
export function vitalHydrationToday(scope:Scope,day:string,rows:readonly (Scope&{id?:string;tipo:string;data:string;valor_numerico?:number;unidade_medida?:string})[]){
 civil(day);const seen=new Map<string,number>();let conflict=false;for(const r of rows){if(!own(r,scope)||r.tipo!=='agua'||r.data!==day||r.unidade_medida!=='ml'||typeof r.valor_numerico!=='number'||!Number.isFinite(r.valor_numerico)||r.valor_numerico<=0)continue;if(!r.id){conflict=true;continue;}if(seen.has(r.id)&&seen.get(r.id)!==r.valor_numerico)conflict=true;seen.set(r.id,r.valor_numerico);}
 return {amount:conflict||!seen.size?null:[...seen.values()].reduce((a,b)=>a+b,0),count:seen.size,conflict};
}
/** Canonical validated reading adapter supplies the numeric value; never creates another measurement. */
export type BodyPoint={id:string;day:string;time:string|null;value:number;source:string};
export function bodySeries(scope:Scope,from:string,to:string,rows:readonly {id?:string;user_id?:string;person_id?:string;data:string;horario?:string|null;valor_numerico?:number|null;source?:string|null}[],accept:(r:typeof rows[number])=>boolean):BodyPoint[]{
 civil(from);civil(to);if(from>to)return [];const seen=new Map<string,BodyPoint>(),conflicts=new Set<string>();for(const r of rows){if(r.user_id!==scope.user_id||r.person_id!==scope.person_id||!r.id||r.data<from||r.data>to||!accept(r)||typeof r.valor_numerico!=='number'||!Number.isFinite(r.valor_numerico))continue;try{civil(r.data);}catch{continue;}const p={id:r.id,day:r.data,time:r.horario&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.horario)?r.horario:null,value:r.valor_numerico,source:r.source??'unknown'};const prev=seen.get(p.id);if(prev&&JSON.stringify(prev)!==JSON.stringify(p))conflicts.add(p.id);seen.set(p.id,p);}return [...seen.values()].filter(p=>!conflicts.has(p.id)).sort((a,b)=>a.day.localeCompare(b.day)||(a.time??'').localeCompare(b.time??'')||a.id.localeCompare(b.id));
}
