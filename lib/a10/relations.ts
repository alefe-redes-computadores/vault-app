/** A10.2 — graph of evidence explicitly linked by canonical IDs, not dates or names. */
import type {A10Fact,A10Authority,A10Datasets,A10Row} from './longitudinal';
export interface A10RelationProof {
 from:string;to:string;sourceAuthority:A10Authority;kind:'explicit_id';label:string;
}
export type A10EvidenceGraph={edges:A10RelationProof[];privateEvidenceCounts:Record<string,number>;excludedWrongScope:number};
const str=(value:unknown)=>typeof value==='string'?value.trim():'';
const scoped=(r:A10Row,uid:string,pid:string)=>str(r.user_id)===uid&&str(r.person_id)===pid&&!r.deleted_at;
export const sameScopeA10=(a:Pick<A10Fact,'userId'|'personId'>,b:Pick<A10Fact,'userId'|'personId'>):boolean=>Boolean(a.userId&&a.personId&&a.userId===b.userId&&a.personId===b.personId);
const ENTITY_A5:Record<string,A10Authority>={cirurgia:'cirurgias',consulta:'consultas',exam_order:'exam_orders'};
const EVIDENCE_A7:Record<string,A10Authority>={procedure_event_a9:'procedure_events_a9',exam_order:'exam_orders',medication:'medicamentos',health_record:'registros_saude'};
const M3_ENTITIES:Record<string,A10Authority>={exam_order:'exam_orders',exam_order_item:'exam_order_items',vaccination_event:'vaccination_events_a8',procedure_event:'procedure_events_a9',sensitivity_event:'sensitivity_events_a9',surgery_event:'surgery_journey_events_a7',surgical_intent:'surgical_intents_a7m5',rehab_milestone:'rehab_milestones_m5',hospitalization:'hospitalizations_a5'};
/** Links never expose private Storage paths or file contents. */
export function graphFromExistingA10(facts:readonly A10Fact[],data:A10Datasets,uid:string,pid:string):A10EvidenceGraph{
 if(!uid||!pid)return {edges:[],privateEvidenceCounts:{},excludedWrongScope:0};
 const scopeFacts=facts.filter(f=>f.userId===uid&&f.personId===pid);
 const index=new Map(scopeFacts.map(f=>[f.key,f]));
 const links:A10RelationProof[]=[];const seen=new Set<string>();let excludedWrongScope=0;
 const link=(from:string,to:string,authority:A10Authority)=>{
  if(from===to||!index.has(from)||!index.has(to))return;
  const k=[from,to].sort().join('|');if(seen.has(k))return;seen.add(k);
  links.push({from,to,sourceAuthority:authority,kind:'explicit_id',label:index.get(to)!.title});
 };
 const read=(authority:A10Authority)=>data[authority]||[];
 for(const f of scopeFacts)for(const rel of f.relationTargets)link(f.key,`${rel.authority}:${rel.id}`,f.authority);
 for(const r of read('hospitalization_relations_a5')){
  if(!scoped(r,uid,pid)){excludedWrongScope++;continue;}
  const dest=ENTITY_A5[str(r.entity_type)];if(dest)link(`hospitalizations_a5:${str(r.hospitalization_id)}`,`${dest}:${str(r.entity_id)}`,'hospitalization_relations_a5');
 }
 const evidenceRows=read('surgery_evidence_links_a7m5').filter(r=>scoped(r,uid,pid));
 const replaced=new Set(evidenceRows.map(r=>str(r.corrects_link_id)).filter(Boolean));
 for(const r of read('surgery_evidence_links_a7m5')){
  if(!scoped(r,uid,pid)){excludedWrongScope++;continue;}
  if(str(r.action)!=='link'||replaced.has(str(r.id)))continue;
  const dest=EVIDENCE_A7[str(r.target_type)];if(dest)link(`cirurgias:${str(r.surgery_id)}`,`${dest}:${str(r.target_id)}`,'surgery_evidence_links_a7m5');
 }
 for(const r of read('rehab_origin_links_m5')){
  if(!scoped(r,uid,pid)){excludedWrongScope++;continue;}
  const origin=str(r.origin_type),dest=origin==='consulta'?'consultas':origin==='cirurgia'?'cirurgias':null;
  if(!dest)continue;
  const programId=str(r.program_id);
  for(const f of scopeFacts)if(f.authority==='rehab_sessions_m5'&&f.relationId===programId)link(f.key,`${dest}:${str(r.origin_id)}`,'rehab_origin_links_m5');
 }
 const privateEvidenceCounts:Record<string,number>={};
 // Do not count dangling, deleted or foreign private binary metadata as a valid asset link.
 const ownedAssets=new Set(read('clinical_assets').filter(x=>scoped(x,uid,pid)).map(x=>str(x.id)).filter(Boolean));
 for(const r of read('clinical_asset_links')){
  if(!scoped(r,uid,pid)){excludedWrongScope++;continue;}
  if(!ownedAssets.has(str(r.asset_id)))continue;
  const dest=M3_ENTITIES[str(r.entity_type)];const k=dest?`${dest}:${str(r.entity_id)}`:'';
  if(k&&index.has(k))privateEvidenceCounts[k]=(privateEvidenceCounts[k]||0)+1;
 }
 return {edges:links,privateEvidenceCounts,excludedWrongScope};
}
export function relatedFactsA10(source:A10Fact,all:readonly A10Fact[],graph?:A10EvidenceGraph):A10RelationProof[]{
 const ids=new Set(source.relationTargets.map(x=>x.authority+':'+x.id));
 const links:A10RelationProof[]=[];const seen=new Set<string>();
 for(const target of all){
  if(!sameScopeA10(source,target)||source.key===target.key)continue;
  const forward=ids.has(target.key);
  const reverse=target.relationTargets.some(x=>x.authority===source.authority&&x.id===source.id);
  const joined=graph?.edges.some(x=>(x.from===source.key&&x.to===target.key)||(x.to===source.key&&x.from===target.key))??false;
  if(!forward&&!reverse&&!joined)continue;
  if(seen.has(target.key))continue;seen.add(target.key);
  links.push({from:source.key,to:target.key,sourceAuthority:forward?source.authority:target.authority,kind:'explicit_id',label:target.title});
 }
 return links;
}
export function relationSummaryA10(facts:readonly A10Fact[],graph?:A10EvidenceGraph):{facts:number;linked:number;noVerifiedLink:number}{
 const linked=facts.filter(x=>relatedFactsA10(x,facts,graph).length>0).length;
 return {facts:facts.length,linked,noVerifiedLink:facts.length-linked};
}
