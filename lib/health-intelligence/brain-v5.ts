import { healthPriorityPresentation } from "./priority";
import type { HealthInsight } from "@/lib/health-insights";
import { brainMeaningfulEvidence, brainSignalSemantics, type BrainActionability, type BrainDecisionLane, type BrainDomain, type BrainEvidenceQuality, type BrainPriorityFactors } from "./brain-next";

export type BrainV5State = "active"|"acknowledged"|"monitoring"|"resolved";
export type BrainV5Feedback = "useful"|"already_knew"|"not_relevant"|"review_later"|"dismissed";
export type BrainV5Family = "now"|"medication"|"interaction"|"pattern"|"data_quality"|"other";

export type BrainV5Alert = {
  key:string; person_id:string; insight_id:string; family:BrainV5Family;
  state:BrainV5State; feedback?:BrainV5Feedback; feedback_updated_at?:string; feedback_reset_at?:string;
  first_detected_at:string; last_detected_at:string; last_seen_at?:string; resolved_at?:string;
  occurrences:number; episode:number; severity_rank:number; material_fingerprint:string;
  schema_version?: 1; lane?: BrainDecisionLane; domain?: BrainDomain;
  actionability?: BrainActionability; evidence_quality?: BrainEvidenceQuality;
  priority_factors?: BrainPriorityFactors;
  snapshot:{
    kind:string; categoria:string; titulo:string; mensagem:string; urgencia:string;
    confianca:string; amostra:number; periodo_dias?:number; link?:string; evidencias:string[];
    fontes_internas:string[]; fontes_externas:Array<{titulo:string;autoridade:string;url:string;revisadoEm:string}>;
    comparacao?:HealthInsight["comparacao"]; cobertura_dias?:HealthInsight["coberturaDias"];
    acao_segura?:string; limitacao_seguranca?:string; gravidade_seguranca?:string;
  };
};

const norm=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const sev:Record<string,number>={critica:500,importante:400,alta:350,atencao:300,media:200,baixa:100,informativa:50,nenhuma:0};
export function brainV5Key(personId:string,i:HealthInsight){return [personId,i.kind,i.categoria,i.entidadeTipo||"health",i.entidadeId||i.entidadeIds?.[0]||"global",norm(i.id)].join(":");}
export function brainV5Family(i:HealthInsight):BrainV5Family{
  const t=norm([i.categoria,i.titulo,i.mensagem,i.gravidadeSeguranca].join(" "));
  if(i.kind==="data_quality"||i.categoria==="dados") return "data_quality";
  if(/interacao|seroton|sobreposi|combinacao|depressores/.test(t)) return "interaction";
  if(i.kind==="pattern"||/padrao|recorr|tendencia|mudanca|interrupcao|descontinuacao|abstinencia|tolerancia|dependencia/.test(t)) return "pattern";
  if(/medic|dose|sos|estoque|receita|renov|aquis|retirada/.test(t)) return "medication";
  if(i.urgencia==="alta"||i.gravidadeSeguranca==="critica"||i.gravidadeSeguranca==="importante") return "now";
  return "other";
}
export function brainV5Severity(i:HealthInsight){return (sev[i.gravidadeSeguranca||""]||0)+(sev[i.urgencia]||0)+(i.confianca==="alta"?30:i.confianca==="media"?20:10)+Math.min(30,i.amostra||0);}
const snap=(i:HealthInsight):BrainV5Alert["snapshot"]=>{const meaningful=brainMeaningfulEvidence(i);return {kind:i.kind,categoria:i.categoria,titulo:i.titulo,mensagem:i.mensagem,urgencia:i.urgencia,confianca:i.confianca,amostra:i.amostra||0,periodo_dias:i.periodoDias,link:i.link,evidencias:meaningful.evidence,fontes_internas:meaningful.sources,fontes_externas:i.fontesExternas||[],acao_segura:i.acaoSegura,limitacao_seguranca:i.limitacaoSeguranca,gravidade_seguranca:i.gravidadeSeguranca,comparacao:i.comparacao,cobertura_dias:i.coberturaDias};};
// V122: evidence order and duplicate lines are not a new analysis.
const canonicalStrings=(values:string[]=[])=>[...new Set(values.map(norm))].sort();
const fingerprint=(i:HealthInsight)=>norm(JSON.stringify([i.kind,i.categoria,i.titulo,i.mensagem,i.urgencia,i.confianca,i.amostra||0,i.gravidadeSeguranca,canonicalStrings(i.evidencias),canonicalStrings(i.entidadeIds),i.entidadeId||""]));
function previousFingerprint(x:BrainV5Alert){
  try { const fields:unknown[]=JSON.parse(x.material_fingerprint); if(!Array.isArray(fields)||fields.length!==11)return x.material_fingerprint;
    for(const index of [8,9]) { const values=fields[index]; if(!Array.isArray(values)||values.some(v=>typeof v!=="string"))return x.material_fingerprint; fields[index]=canonicalStrings(values); }
    return norm(JSON.stringify(fields));
  } catch { return x.material_fingerprint; }
}
export function reconcileBrainV5(personId:string,current:HealthInsight[],previous:BrainV5Alert[],now=new Date().toISOString(), options: { complete?: boolean } = {}){
  const foreign=previous.filter(x=>x.person_id!==personId), map=new Map(previous.filter(x=>x.person_id===personId).map(x=>[x.key,x])), active=new Set<string>();
  for(const i of current){
    const key=brainV5Key(personId,i), old=map.get(key), semantics=brainSignalSemantics(i), rank=semantics.factors.total, fp=fingerprint(i); active.add(key);
    const material=!old||previousFingerprint(old)!==fp, resurfaced=old?.state==="resolved", escalated=!!old&&((sev[i.gravidadeSeguranca||"informativa"]||0)>(sev[old.snapshot.gravidade_seguranca||"informativa"]||0)||(sev[i.urgencia]||0)>(sev[old.snapshot.urgencia]||0));
    map.set(key,{key,person_id:personId,insight_id:i.id,family:brainV5Family(i),schema_version:1,lane:semantics.lane,domain:semantics.domain,actionability:semantics.actionability,evidence_quality:semantics.evidenceQuality,priority_factors:semantics.factors,state:resurfaced||((old?.feedback==="dismissed")&&escalated)?"active":old?.state||"active",feedback:(resurfaced||escalated)&&old?.feedback==="dismissed"?undefined:old?.feedback,feedback_reset_at:(resurfaced||escalated)&&old?.feedback==="dismissed"?now:old?.feedback_reset_at,feedback_updated_at:(resurfaced||escalated)&&old?.feedback==="dismissed"?undefined:old?.feedback_updated_at,first_detected_at:old?.first_detected_at||now,last_detected_at:material||resurfaced?now:old?.last_detected_at||now,last_seen_at:resurfaced?undefined:old?.last_seen_at,resolved_at:resurfaced||escalated?undefined:old?.resolved_at,occurrences:old?(material||resurfaced?(old.occurrences||1)+1:(old.occurrences||1)):1,episode:old?(resurfaced?(old.episode||1)+1:(old.episode||1)):1,severity_rank:rank,material_fingerprint:fp,snapshot:snap(i)});
  }
  for(const [key,x] of map) if(options.complete !== false && !active.has(key)&&x.state!=="resolved") map.set(key,{...x,state:"resolved",resolved_at:now});
  // Retention applies to resolved history; an old active alert must not disappear.
  const owned = [...map.values()].sort((a,b)=>b.last_detected_at.localeCompare(a.last_detected_at));
  const open = owned.filter(x=>x.state!=="resolved");
  const history = owned.filter(x=>x.state==="resolved").slice(0, Math.max(0, 1200-open.length));
  return [...foreign, ...open, ...history];
}
function alertInsight(x: BrainV5Alert): HealthInsight { return { id:x.insight_id,kind:x.snapshot.kind as HealthInsight["kind"],categoria:x.snapshot.categoria as HealthInsight["categoria"],titulo:x.snapshot.titulo,mensagem:x.snapshot.mensagem,urgencia:x.snapshot.urgencia as HealthInsight["urgencia"],confianca:x.snapshot.confianca as HealthInsight["confianca"],amostra:x.snapshot.amostra,periodoDias:x.snapshot.periodo_dias,link:x.snapshot.link,evidencias:x.snapshot.evidencias,fontesInternas:x.snapshot.fontes_internas,acaoSegura:x.snapshot.acao_segura,limitacaoSeguranca:x.snapshot.limitacao_seguranca,gravidadeSeguranca:x.snapshot.gravidade_seguranca as HealthInsight["gravidadeSeguranca"],comparacao:x.snapshot.comparacao,coberturaDias:x.snapshot.cobertura_dias}; }
export function brainV5Lane(x: BrainV5Alert): BrainDecisionLane { return x.lane ?? brainSignalSemantics(alertInsight(x)).lane; }
const feedbackPriority:Record<string,number>={useful:20,already_knew:-40,not_relevant:-180,review_later:-120,dismissed:-1000};
const statePriority:Record<BrainV5State,number>={active:3,monitoring:2,acknowledged:1,resolved:0};
export function brainV5PriorityScore(x:BrainV5Alert){
  const factors=x.priority_factors?.total??x.severity_rank??brainSignalSemantics(alertInsight(x)).factors.total;
  return factors+(feedbackPriority[x.feedback||""]||0)+Math.min(30,Math.max(0,(x.episode||1)-1)*10);
}
export function brainV5PriorityReason(x:BrainV5Alert){
  const lane={now:"ação prioritária",next:"próxima ação",follow_up:"acompanhamento",review_data:"qualidade dos dados"}[brainV5Lane(x)];
  const quality={strong:"evidência forte",moderate:"evidência moderada",limited:"evidência limitada"}[x.evidence_quality??"limited"];
  const memory=x.state==="monitoring"||x.feedback==="review_later"?"adiado por você":x.state==="acknowledged"?"já revisado":!x.last_seen_at?"novo":"ativo";
  return `${lane} · ${quality} · ${memory}`;
}
export function rankBrainV5(items:BrainV5Alert[]){const lp:Record<BrainDecisionLane,number>={now:4,next:3,follow_up:2,review_data:1};return [...items].sort((a,b)=>lp[brainV5Lane(b)]-lp[brainV5Lane(a)]||statePriority[b.state]-statePriority[a.state]||brainV5PriorityScore(b)-brainV5PriorityScore(a)||b.last_detected_at.localeCompare(a.last_detected_at)||a.key.localeCompare(b.key));}
export function brainV5Counters(items:BrainV5Alert[]){const a=items.filter(x=>x.state!=="resolved");return {active:a.length,new:a.filter(x=>!x.last_seen_at).length,monitoring:a.filter(x=>x.state==="monitoring").length,resolved:items.filter(x=>x.state==="resolved").length,attention:a.filter(brainV5RequiresAttention).length};}

// A cor usa gravidade explícita; confiança/amostra nunca pintam o cartão de vermelho.
export function brainV5Presentation(x: BrainV5Alert) {
  return healthPriorityPresentation(alertInsight(x));
}
export function brainV5RequiresAttention(x: BrainV5Alert) {
  return brainV5Lane(x) === "now" || (brainV5Lane(x) === "next" && ["critica","importante","atencao"].includes(x.snapshot.gravidade_seguranca||""));
}
