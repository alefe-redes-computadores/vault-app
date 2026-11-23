/** A10.2: compare declared coverage, never demand a Home summary list all private events. */
import type {A10Fact} from './longitudinal';
export type A10ReaderName='home'|'today'|'careflow'|'brain'|'fenix'|'medical_preview'|'pdf';
export type A10ConsumerRow={id:string;authority:string;userId:string;personId:string;status:string};
export type A10ParityGap={key:string;type:'missing'|'different_state'|'unscoped';reader:A10ReaderName};
/** expectedKeys is an explicit contract, e.g. all rows in detailed Modo Médico/PDF; empty means observational comparison only. */
export function compareConsumerA10(facts:readonly A10Fact[],rows:readonly A10ConsumerRow[],reader:A10ReaderName,uid:string,pid:string,expectedKeys:readonly string[]=[]):A10ParityGap[]{
 if(!uid||!pid)return [];
 const source=new Map(facts.filter(f=>f.userId===uid&&f.personId===pid&&f.revision==='current').map(f=>[f.key,f]));
 const out:A10ParityGap[]=[];const targets=new Map<string,A10ConsumerRow>();
 for(const row of rows){
  const key=row.authority+':'+row.id;
  if(row.userId!==uid||row.personId!==pid){out.push({key,type:'unscoped',reader});continue;}
  targets.set(key,row);
  const canonical=source.get(key);
  if(canonical&&canonical.status!==row.status)out.push({key,type:'different_state',reader});
 }
 for(const key of new Set(expectedKeys))if(source.has(key)&&!targets.has(key))out.push({key,type:'missing',reader});
 return out;
}
/** A stale selected person's prepared report is never trusted after an account/person change. */
export function safeA10ReportScope(uid:string,pid:string,loaded:{uid:string;pid:string},facts:readonly A10Fact[]):readonly A10Fact[]{
 if(!uid||!pid||loaded.uid!==uid||loaded.pid!==pid)return [];
 return facts.filter(f=>f.userId===uid&&f.personId===pid&&f.revision==='current');
}
