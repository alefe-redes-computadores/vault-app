"use client";
import { useRef, useState } from "react";
import { CalendarClock, Check, ChevronRight, ClipboardCopy, FileHeart, HeartPulse, Link2, Pill, Stethoscope } from "lucide-react";
import type { buildTreatmentCareDossier } from "@/lib/health-network/care-continuity";

type Dossier = NonNullable<ReturnType<typeof buildTreatmentCareDossier>>;
type M115VisitSections={medications:boolean;symptoms:boolean;consultations:boolean;documents:boolean};
/** Projection in this component preserves the isolated rendering contracts M11/M51. */
function selectiveVisitBriefM115(dossier:Dossier,sections:M115VisitSections,questions:string):string{
  const body:string[]=[];
  // R2: tolerate sparse legacy M11/M51 dossiers; never invent clinical evidence.
  const medications=Array.isArray(dossier.medications)?dossier.medications:[];
  const symptoms=Array.isArray(dossier.symptoms)?dossier.symptoms:[];
  const consultations=Array.isArray(dossier.consultations)?dossier.consultations:[];
  const upcoming=Array.isArray(dossier.upcoming)?dossier.upcoming:[];
  const documents=Array.isArray(dossier.documents)?dossier.documents:[];
  if(sections?.medications)body.push(`Medicamentos explicitamente vinculados (${medications.length}): ${medications.map(m=>(m.nome||"nome não informado")+(m.dosagem?` ${m.dosagem}`:"")).join("; ")||"nenhum"}`);
  if(sections?.symptoms)body.push(`Sintomas relatados nos últimos 30 dias: ${symptoms.length} em ${Number.isFinite(dossier.daysWithSymptoms)?dossier.daysWithSymptoms:"quantidade não informada"} dia(s).`,...(dossier.latestSymptoms??[]).slice(0,5));
  if(sections?.consultations)body.push(`Consultas vinculadas (${consultations.length}): ${upcoming.slice(0,3).map(c=>c.data.split("-").reverse().join("/")+" "+(c.especialidade||"")).join("; ")||"sem consulta futura vinculada"}`);
  if(sections?.documents)body.push(`Documentos vinculados: ${documents.length}; exames: ${dossier.exams?.length??0}; cirurgias: ${dossier.surgeries?.length??0}.`);
  const prompt=typeof questions==="string"?questions.trim().slice(0,1500):"";
  if(prompt)body.push("Dúvidas que quero levar à consulta:\n"+prompt);
  if(!body.length)return "";
  const treatmentName=dossier.treatment?.nome?.trim()||"não identificado nos dados disponíveis";
  return ["VAULT — resumo escolhido para consulta",`Tratamento: ${treatmentName}`, "Conteúdo selecionado manualmente; apenas vínculos explícitos.","",...body,"", "Dias sem registro não comprovam ausência de sintomas ou uso. Não é diagnóstico nem orientação para alterar tratamento.","Revisar antes de compartilhar."].join("\n");
}
export function TreatmentVisitBrief({dossier,color,onNavigate}:{dossier:Dossier|null;color:string;onNavigate:(path:string)=>void}) {
  const [copied,setCopied]=useState<"copied"|"unavailable"|null>(null);
  const area=useRef<HTMLTextAreaElement>(null);
  const [include,setInclude]=useState<M115VisitSections>({medications:false,symptoms:false,consultations:false,documents:false});
  const [questions,setQuestions]=useState("");
  if(!dossier)return null;
  const selectedSummary=selectiveVisitBriefM115(dossier,include,questions);
  async function copySummary(){
    if(!dossier||!selectedSummary)return;
    try {
      if(!navigator.clipboard?.writeText)throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(selectedSummary);
      setCopied("copied");
    } catch {
      setCopied("unavailable");
      area.current?.focus();area.current?.select();
    }
  }
  async function copyOriginalM115(){
    if(!dossier)return;
    try{await navigator.clipboard.writeText(dossier.synopsis);setCopied("copied");}catch{setCopied("unavailable");}
  }
  const stats=[{label:"Medicamentos",value:dossier.medications.length,Icon:Pill},{label:"Sintomas · 30d",value:dossier.symptoms.length,Icon:HeartPulse},{label:"Consultas",value:dossier.consultations.length,Icon:Stethoscope},{label:"Documentos",value:dossier.documents.length,Icon:FileHeart}];
  const hasVisitEvidence=stats.some(item=>item.value>0)||dossier.upcoming.length>0;
  return <section aria-label="Preparação clínica do tratamento" className="overflow-hidden rounded-[22px] border border-surface-border bg-surface">
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.035]" style={{color}}><Link2 size={17}/></span>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-ink-primary">Preparar consulta</h3><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Resumo dos vínculos explícitos deste tratamento. Nada é compartilhado sem sua ação.</p></div>
    </div>
    {hasVisitEvidence?<div className="grid grid-cols-4 border-y border-surface-border/60 bg-black/10">{stats.map(({label,value,Icon})=><div key={label} className="min-w-0 border-r border-surface-border/60 px-1 py-2 text-center last:border-r-0"><Icon size={14} className="mx-auto text-ink-muted"/><strong className="mt-1 block text-sm text-ink-primary">{value}</strong><span className="block break-words text-[9px] leading-snug text-ink-muted">{label}</span></div>)}</div>:<p className="mx-3 rounded-xl bg-surface-raised/40 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">Sem eventos vinculados para resumir. O texto para consulta continua disponível abaixo.</p>}
    <div className="space-y-3 p-3">
       <section aria-label="Escolher dados para levar à consulta" className="rounded-xl border border-violet-300/15 bg-violet-300/[.035] p-3">
         <strong className="text-xs text-ink-primary">Escolha o que vai no resumo</strong>
         <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Nada é copiado sem sua seleção. O diário privado e o plano de segurança nunca entram automaticamente.</p>
         <div className="mt-2 grid grid-cols-2 gap-2">{([ ["medications","Medicamentos"],["symptoms","Sintomas"],["consultations","Consultas"],["documents","Documentos"] ] as const).map(([field,label])=><label key={field} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/70 p-2 text-[11px] text-ink-secondary"><input type="checkbox" checked={include[field]} onChange={e=>setInclude(old=>({...old,[field]:e.target.checked}))} className="size-4 accent-violet-300"/>{label}</label>)}</div>
         <label className="mt-3 grid gap-1 text-xs text-ink-muted">Dúvidas que quero levar (opcional)<textarea rows={2} maxLength={1500} value={questions} onChange={e=>setQuestions(e.target.value)} className="rounded-xl border border-surface-border bg-surface-raised p-3 text-xs text-ink-primary" placeholder="Perguntas com suas próprias palavras…"/></label>
       </section>
      {dossier.upcoming.length>0 && <button type="button" disabled={!dossier.upcoming[0].id} onClick={()=>dossier.upcoming[0].id&&onNavigate(`/saude/consultas/detalhes?id=${encodeURIComponent(dossier.upcoming[0].id)}`)} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.045] px-3 text-left text-xs disabled:cursor-default"><CalendarClock size={15} className="text-emerald-300"/><span className="min-w-0 flex-1"><strong className="block text-ink-primary">Próxima consulta vinculada</strong><span className="text-[10px] text-ink-muted">{dossier.upcoming[0].data.split("-").reverse().join("/")} · {dossier.upcoming[0].especialidade}</span></span><ChevronRight size={15} className="text-emerald-300"/></button>}
      {dossier.upcoming.length>1?<details className="rounded-xl border border-surface-border/70">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-semibold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Outras consultas vinculadas · {dossier.upcoming.length-1}</summary>
        <div className="space-y-1 border-t border-surface-border/60 px-2 py-2">
          {dossier.upcoming.slice(1,7).map((consultation,index)=>consultation.id?<button key={consultation.id} type="button"
            onClick={()=>onNavigate(`/saude/consultas/detalhes?id=${encodeURIComponent(consultation.id!)}`)}
            className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-xs text-ink-primary hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
            <span className="min-w-0 flex-1 break-words">{consultation.data.split("-").reverse().join("/")} · {consultation.especialidade}</span><ChevronRight size={14} className="shrink-0"/>
          </button>:<p key={`sem-id-${index}`} className="px-2 py-2 text-xs text-ink-muted">Consulta vinculada sem destino de detalhes disponível.</p>)}
          {dossier.upcoming.length>7?<button type="button" onClick={()=>onNavigate("/saude/consultas")}
            className="mt-1 flex min-h-11 w-full items-center justify-between rounded-xl border border-surface-border/70 px-3 text-left text-xs text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
            Ver consultas restantes na lista <ChevronRight size={14} aria-hidden="true"/>
          </button>:null}
        </div>
      </details>:null}
      <details className="rounded-xl border border-surface-border/70"><summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-semibold text-ink-primary">Prévia do resumo escolhido</summary><textarea ref={area} readOnly aria-label="Resumo clínico selecionável" value={selectedSummary} rows={Math.min(13,Math.max(7,dossier.synopsis.split("\n").length+2))} className="w-full resize-none border-t border-surface-border/60 bg-transparent px-3 py-2 font-mono text-[10px] leading-relaxed text-ink-muted outline-none"/><p className="px-3 pb-2 text-[10px] leading-relaxed text-ink-faint">Vínculo não significa causalidade. Dias sem registro não contam como dias sem sintomas.</p></details>
      <details className="rounded-xl border border-surface-border/70"><summary className="min-h-11 cursor-pointer px-3 py-3 text-xs text-ink-muted">Consultar resumo original completo</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border-t border-surface-border/60 p-3 text-[10px] text-ink-muted">{dossier.synopsis}</pre><button type="button" onClick={()=>void copyOriginalM115()} className="min-h-11 w-full border-t border-surface-border/50 px-3 text-xs text-ink-secondary">Copiar resumo original completo (opcional)</button></details>
      <button type="button" onClick={()=>void copySummary()} disabled={!selectedSummary} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2" aria-label="Copiar resumo do tratamento para consulta">{copied==="copied"?<Check size={15}/>:<ClipboardCopy size={15}/>} {copied==="copied"?"Resumo copiado":"Copiar resumo para consulta"}</button>
      {copied==="unavailable"&&<p role="status" className="text-[10px] text-amber-300">A cópia automática não foi autorizada. Abra o resumo acima e selecione o texto manualmente.</p>}
      {dossier.pendingLocal>0 && <p className="text-[10px] text-amber-300">{dossier.pendingLocal} registro(s) ainda não marcados como sincronizados. Este resumo usa dados locais.</p>}
    </div>
  </section>;
}
