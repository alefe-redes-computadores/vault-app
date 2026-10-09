import { healthPriorityPresentation } from "./priority";
import type { HealthInsight } from "@/lib/health-insights";

export type BrainV5State = "active"|"acknowledged"|"monitoring"|"resolved";
export type BrainV5Feedback = "useful"|"already_knew"|"not_relevant"|"review_later"|"dismissed";
export type BrainV5Family = "now"|"medication"|"interaction"|"pattern"|"data_quality"|"other";

export type BrainV5Alert = {
  key:string; person_id:string; insight_id:string; family:BrainV5Family;
  state:BrainV5State; feedback?:BrainV5Feedback;
  first_detected_at:string; last_detected_at:string; last_seen_at?:string; resolved_at?:string;
  occurrences:number; episode:number; severity_rank:number; material_fingerprint:string;
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
const snap=(i:HealthInsight):BrainV5Alert["snapshot"]=>({kind:i.kind,categoria:i.categoria,titulo:i.titulo,mensagem:i.mensagem,urgencia:i.urgencia,confianca:i.confianca,amostra:i.amostra||0,periodo_dias:i.periodoDias,link:i.link,evidencias:i.evidencias||[],fontes_internas:i.fontesInternas||[],fontes_externas:i.fontesExternas||[],acao_segura:i.acaoSegura,limitacao_seguranca:i.limitacaoSeguranca,gravidade_seguranca:i.gravidadeSeguranca,comparacao:i.comparacao,cobertura_dias:i.coberturaDias});
const fingerprint=(i:HealthInsight)=>norm(JSON.stringify([i.kind,i.categoria,i.titulo,i.mensagem,i.urgencia,i.confianca,i.amostra||0,i.gravidadeSeguranca,i.evidencias||[],i.entidadeIds||[],i.entidadeId||""]));
export function reconcileBrainV5(personId:string,current:HealthInsight[],previous:BrainV5Alert[],now=new Date().toISOString()){
  const foreign=previous.filter(x=>x.person_id!==personId), map=new Map(previous.filter(x=>x.person_id===personId).map(x=>[x.key,x])), active=new Set<string>();
  for(const i of current){
    const key=brainV5Key(personId,i), old=map.get(key), rank=brainV5Severity(i), fp=fingerprint(i); active.add(key);
    const material=!old||old.material_fingerprint!==fp, resurfaced=old?.state==="resolved", escalated=!!old&&((sev[i.gravidadeSeguranca||"informativa"]||0)>(sev[old.snapshot.gravidade_seguranca||"informativa"]||0)||(sev[i.urgencia]||0)>(sev[old.snapshot.urgencia]||0));
    map.set(key,{key,person_id:personId,insight_id:i.id,family:brainV5Family(i),state:resurfaced||((old?.feedback==="dismissed")&&escalated)?"active":old?.state||"active",feedback:(resurfaced||escalated)&&old?.feedback==="dismissed"?undefined:old?.feedback,first_detected_at:old?.first_detected_at||now,last_detected_at:material||resurfaced?now:old?.last_detected_at||now,last_seen_at:resurfaced?undefined:old?.last_seen_at,resolved_at:resurfaced||escalated?undefined:old?.resolved_at,occurrences:old?(material||resurfaced?(old.occurrences||1)+1:(old.occurrences||1)):1,episode:old?(resurfaced?(old.episode||1)+1:(old.episode||1)):1,severity_rank:rank,material_fingerprint:fp,snapshot:snap(i)});
  }
  for(const [key,x] of map) if(!active.has(key)&&x.state!=="resolved") map.set(key,{...x,state:"resolved",resolved_at:now});
  return [...foreign,...map.values()].sort((a,b)=>b.last_detected_at.localeCompare(a.last_detected_at)).slice(0,1200);
}
export function rankBrainV5(items:BrainV5Alert[]){const fp:Record<string,number>={useful:20,already_knew:-10,not_relevant:-40,review_later:-15,dismissed:-1000};const sp:Record<BrainV5State,number>={active:0,acknowledged:-20,monitoring:-10,resolved:-500};const score=(x:BrainV5Alert)=>x.severity_rank+Math.min(40,(x.occurrences-1)*4)+(fp[x.feedback||""]||0)+sp[x.state];return [...items].sort((a,b)=>(sev[b.snapshot.gravidade_seguranca||"informativa"]||0)-(sev[a.snapshot.gravidade_seguranca||"informativa"]||0)||score(b)-score(a)||b.last_detected_at.localeCompare(a.last_detected_at));}
export function brainV5Counters(items:BrainV5Alert[]){const a=items.filter(x=>x.state!=="resolved");return {active:a.length,new:a.filter(x=>!x.last_seen_at).length,monitoring:a.filter(x=>x.state==="monitoring").length,resolved:items.filter(x=>x.state==="resolved").length,attention:a.filter(brainV5RequiresAttention).length};}

// A cor usa gravidade explícita; confiança/amostra nunca pintam o cartão de vermelho.
export function brainV5Presentation(x: BrainV5Alert) {
  return healthPriorityPresentation({ ...x.snapshot, id:x.insight_id,
    kind:x.snapshot.kind as HealthInsight["kind"], categoria:x.snapshot.categoria as HealthInsight["categoria"],
    urgencia:x.snapshot.urgencia as HealthInsight["urgencia"], confianca:x.snapshot.confianca as HealthInsight["confianca"],
    gravidadeSeguranca:x.snapshot.gravidade_seguranca as HealthInsight["gravidadeSeguranca"] });
}
export function brainV5RequiresAttention(x: BrainV5Alert) {
  return ["critica","importante","atencao"].includes(x.snapshot.gravidade_seguranca||"") || x.snapshot.kind==="alert";
}
