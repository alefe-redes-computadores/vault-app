/** A10.3 — supplementary explanation for existing Brain V5, never a parallel alert ledger. */
import type {A10Fact} from './longitudinal';
import type {BrainV5Alert} from '@/lib/health-intelligence/brain-v5';
export type A10BrainEvidence={alertKey:string;state:'linked'|'not_documented'|'wrong_scope';facts:readonly A10Fact[];explanation:string;limitations:string[];title?:string;severity?:string;confidence?:string;sources?:readonly string[]};
export function explainBrainA10(alert:BrainV5Alert, facts:readonly A10Fact[],userId:string,personId:string):A10BrainEvidence {
 const denied: A10BrainEvidence={alertKey:alert.key,state:'wrong_scope',facts:[],explanation:'Não foi possível confirmar a titularidade da evidência.',limitations:['Não exibir dados de outra pessoa.']};
 if(!userId||!personId||alert.person_id!==personId)return denied;
 const ids=new Set([alert.snapshot.entidade_id,...alert.snapshot.entidade_ids||[]].filter((x):x is string=>typeof x==='string'&&x.length>0));
 const type=(alert.snapshot.entidade_tipo||'').toLowerCase();
 // Source ID match is necessary; never use a date, title, relation note or substring.
 const grounded=facts.filter(f=>f.userId===userId&&f.personId===personId&&(ids.has(f.id)||(type==='medicamento'&&f.domain==='doses'&&f.relationId!==null&&ids.has(f.relationId)))&&
   (!type||type===f.domain||type===f.authority||
     (type==='medicamento'&&f.domain==='doses')||
     (type==='consulta'&&f.domain==='consultations')||
     (type==='cirurgia'&&f.domain==='surgery')||
     (type==='registro'&&f.domain==='health')));
 if(!grounded.length)return {alertKey:alert.key,state:'not_documented',facts:[],explanation:'Este alerta não aponta para um fato identificável nesta seleção. Consulte a evidência original do Brain.',limitations:['Ausência de vínculo não invalida o alerta nem significa ausência de risco.']};
 return {alertKey:alert.key,state:'linked',facts:grounded,
   explanation:`${grounded.length} ${grounded.length===1?'fato vinculado por ID':'fatos vinculados por IDs'} à interpretação existente.`,
   limitations:['Associação documental não prova causa.','O Brain não modifica registro clínico, dose, diagnóstico ou prescrição.']};
}
export function auditBrainLinksA10(alerts:readonly BrainV5Alert[],facts:readonly A10Fact[],uid:string,pid:string){
 const evidences=alerts.filter(a=>a.person_id===pid).map(a=>{const evidence=explainBrainA10(a,facts,uid,pid);if(evidence.state==='wrong_scope')return evidence;return {...evidence,title:a.snapshot.titulo||'Observação do Brain',severity:a.snapshot.gravidade_seguranca||a.snapshot.urgencia,confidence:a.snapshot.confianca,sources:(a.snapshot.fontes_internas||[]).filter(Boolean).slice(0,4)};});
 return {total:evidences.length,linked:evidences.filter(x=>x.state==='linked').length,unresolved:evidences.filter(x=>x.state==='not_documented').length,evidences};
}
