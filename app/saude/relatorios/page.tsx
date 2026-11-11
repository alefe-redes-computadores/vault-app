"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BrainCircuit, Check, ClipboardCopy, FileJson2, FileSpreadsheet, FileText, LockKeyhole, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { CustomDatePicker } from "@/components/DatePicker";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { useBrainV5Pulse } from "@/hooks/useBrainV5Pulse";
import { useMedicos } from "@/hooks/useMedicos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";
import { getLocalTodayISO } from "@/lib/health-utils";
import { buildClinicalReport360, type Report360Mode, type Report360Section } from "@/lib/clinical-report-360";
import { ConsultationChangeM121 } from "@/components/saude/ConsultationChangeM121";

const SECTIONS: {id:Report360Section;label:string}[] = [
  {id:"medications",label:"Medicamentos"},{id:"doses",label:"Doses"},{id:"symptoms",label:"Sintomas/humor"},
  {id:"measurements",label:"Medições"},{id:"consultations",label:"Consultas"},{id:"documents",label:"Documentos de saúde (somente títulos)"},
];
function backDays(end:string, days:number){const [y,m,d]=end.split("-").map(Number);const date=new Date(Date.UTC(y,m-1,d-days+1));return date.toISOString().slice(0,10);}
export default function Reports360Page(){
  const router=useRouter();
  const {user}=useAuth();
  const {activePersonId,persons,changePerson}=useActivePersonId();
  const health=useHealthIntelligence({includeAudit:false});
  const brain=useBrainV5Pulse();
  const {medicos=[]}=useMedicos();
  const today=getLocalTodayISO();
  const [start,setStart]=useState(()=>backDays(getLocalTodayISO(),30));
  const [end,setEnd]=useState(()=>getLocalTodayISO());
  const [mode,setMode]=useState<Report360Mode>("factual");
  const [sections,setSections]=useState<Report360Section[]>(["medications","doses","symptoms","measurements","consultations"]);
  const [medicoId,setMedicoId]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("medico");if(requested)setMedicoId(requested);},[]);
  const ownDoctors=useMemo(()=>medicos.filter(m=>m.user_id===user?.id&&m.id),[medicos,user?.id]);
  const doctor=ownDoctors.find(m=>m.id===medicoId);
  const person=persons.find(p=>p.id===activePersonId);
  const ready=Boolean(user?.id&&activePersonId&&!health.isLoading&&!health.error&&!brain.isLoading&&health.context?.personId===activePersonId&&health.context?.userId===user?.id);
  const result=useMemo(()=>{
    if(!ready||!user?.id||!activePersonId||!health.context)return {report:null,error:null};
    try{return {report:buildClinicalReport360({context:health.context,ledger:brain.records,ownerId:user.id,personId:activePersonId,personName:person?.name||"Pessoa selecionada",start,end,sections,mode}),error:null};}
    catch(e){return {report:null,error:e instanceof Error?e.message:"Não foi possível preparar o relatório."};}
  },[ready,user?.id,activePersonId,health.context,brain.records,person?.name,start,end,sections,mode]);
  const choose=(section:Report360Section)=>{setMessage("");setSections(value=>value.includes(section)?value.filter(x=>x!==section):[...value,section]);};
  const preset=(days:7|30|90)=>{setEnd(today);setStart(backDays(today,days));setMessage("");};
  const exportFile=async(kind:"pdf"|"csv"|"json")=>{
    if(!result.report||busy)return;setBusy(true);setMessage("");
    try{
      if(kind==="pdf"){
        const {exportClinicalReport360Pdf}=await import("@/lib/clinical-report-360-pdf");
        await exportClinicalReport360Pdf(result.report);
      }else{
        const {deliverClinicalReport360File}=await import("@/lib/clinical-report-360-export");
        await deliverClinicalReport360File(result.report,kind);
      }
      setMessage("Arquivo preparado. Se abriu o compartilhamento, confirme o destinatário no aplicativo escolhido. O VAULT não confirma envio.");
    }catch(e){setMessage(e instanceof Error&&e.name==="AbortError"?"Compartilhamento cancelado. Nenhum envio confirmado.":"Falha ao preparar ou compartilhar. Seus registros não foram alterados.");}
    finally{setBusy(false);}
  };
  const copyDoctorEmail=async()=>{
    if(!doctor?.email)return;
    try{const {Clipboard}=await import("@capacitor/clipboard");await Clipboard.write({string:doctor.email.trim()});setMessage("E-mail do médico copiado. Confira o destinatário e anexe o arquivo no aplicativo de e-mail.");}
    catch{setMessage("Não foi possível copiar o e-mail. Confira o cadastro do médico.");}
  };
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary">
    <header className="mx-auto flex max-w-2xl items-start gap-3"><button type="button" onClick={()=>router.back()} aria-label="Voltar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={19}/></button><div className="min-w-0 flex-1"><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">VAULT · M98</p><h1 className="mt-1 text-xl font-bold">Central de Relatórios 360</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Prepare um arquivo clínico com dados reais, seu período e suas escolhas. Funciona offline.</p></div></header>
    <div className="mx-auto mt-4 max-w-2xl space-y-3">
      <ConsultationChangeM121 context={health.context} ownerId={user?.id || ""} personId={activePersonId || ""} today={today} onPrepare={(date)=>{setStart(date);setEnd(today);setMode("consultation");setMessage("Período preparado. Confira as seções, a prévia e o destinatário antes de exportar.");}} />
      <section className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-bold"><Users size={17} className="text-violet-300"/>Pessoa e período</div>
        <label className="mt-3 block text-[11px] text-ink-muted" htmlFor="m98-person">Pessoa selecionada</label>
        <details className="group mt-1 rounded-xl border border-surface-border bg-void">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-ink-primary"><span className="truncate">{person?.name||"Selecione uma pessoa"}</span><span aria-hidden="true" className="text-xs text-ink-muted">Alterar</span></summary>
          <div aria-label="Escolher pessoa do relatório" className="max-h-52 space-y-1 overflow-y-auto border-t border-surface-border p-2">{persons.filter(p=>p.id).map(p=><button key={p.id} type="button" aria-pressed={p.id===activePersonId} onClick={()=>{setMessage("");void changePerson(p.id!);}} className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs ${p.id===activePersonId?"bg-violet-400/10 text-violet-300":"bg-surface-raised text-ink-primary"}`}>{p.name}</button>)}</div>
        </details>
        <div className="mt-3 flex flex-wrap gap-2">{([7,30,90] as const).map(days=><button key={days} type="button" onClick={()=>preset(days)} className="min-h-10 rounded-xl border border-surface-border px-3 text-xs font-semibold">{days} dias</button>)}<button type="button" onClick={()=>{setStart(`${today.slice(0,7)}-01`);setEnd(today);}} className="min-h-10 rounded-xl border border-surface-border px-3 text-xs font-semibold">Este mês</button></div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><CustomDatePicker label="Início" value={start} maxDate={today} onChange={v=>{setStart(v);setMessage("");}}/><CustomDatePicker label="Fim" value={end} maxDate={today} onChange={v=>{setEnd(v);setMessage("");}}/></div>
      </section>
      <section className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-bold"><BrainCircuit size={17} className="text-violet-300"/>Modo do relatório</div><div className="mt-3 grid gap-2">{([ ["factual","Factual","Somente registros e eventos explícitos"], ["brain","Factual + Brain","Adiciona alertas e evidências já persistidos"], ["consultation","Resumo para consulta","Síntese inicial e anexos detalhados"]] as const).map(([id,label,description])=><button key={id} type="button" aria-pressed={mode===id} onClick={()=>setMode(id)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left ${mode===id?"border-violet-400/50 bg-violet-400/[.08]":"border-surface-border bg-surface-raised"}`}><span className="min-w-0 flex-1"><strong className="block text-xs">{label}</strong><span className="mt-1 block text-[10px] text-ink-muted">{description}</span></span>{mode===id&&<Check size={16} className="text-violet-300"/>}</button>)}</div></section>
      <section className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck size={17} className="text-emerald-300"/>Selecionar conteúdo</div><div className="mt-3 grid grid-cols-2 gap-2">{SECTIONS.map(s=><label key={s.id} className={`flex min-h-11 items-center gap-2 rounded-xl border p-2 text-[11px] ${sections.includes(s.id)?"border-emerald-300/40 bg-emerald-300/[.045]":"border-surface-border"}`}><input type="checkbox" checked={sections.includes(s.id)} onChange={()=>choose(s.id)} className="accent-emerald-400"/>{s.label}</label>)}</div><p className="mt-2 text-[10px] text-ink-faint">Documentos são opcionais. O arquivo inclui somente títulos de documentos de saúde, sem imagens, senhas, cartões ou conteúdo dos anexos.</p></section>
      <section className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-bold"><Stethoscope size={17} className="text-emerald-300"/>Compartilhar com médico (opcional)</div><p className="mt-3 text-[11px] text-ink-muted">Profissional cadastrado</p><details className="group mt-1 rounded-xl border border-surface-border bg-void"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-ink-primary"><span className="truncate">{doctor?.nome||"Escolher depois"}</span><span aria-hidden="true" className="text-xs text-ink-muted">Alterar</span></summary><div aria-label="Escolher médico destinatário" className="max-h-52 space-y-1 overflow-y-auto border-t border-surface-border p-2"><button type="button" aria-pressed={!medicoId} onClick={()=>setMedicoId("")} className="flex min-h-11 w-full items-center rounded-xl bg-surface-raised px-3 text-left text-xs text-ink-muted">Escolher depois</button>{ownDoctors.map(m=><button key={m.id} type="button" aria-pressed={medicoId===m.id} onClick={()=>setMedicoId(m.id!)} className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs ${medicoId===m.id?"bg-emerald-400/10 text-emerald-300":"bg-surface-raised text-ink-primary"}`}>{m.nome}</button>)}</div></details>{doctor&&<div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2"><span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{doctor.email?.trim()||"Sem e-mail cadastrado"}</span><button type="button" disabled={!doctor.email} onClick={()=>void copyDoctorEmail()} className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-surface-border px-2 text-[10px] disabled:opacity-40"><ClipboardCopy size={14}/>Copiar</button></div>}<p className="mt-2 text-[10px] leading-relaxed text-ink-faint">Primeiro gere o arquivo; o compartilhamento abre o seletor Android ou salva no navegador. O VAULT não anexa automaticamente ao e-mail nem envia sem sua ação.</p></section>
      {health.error&&<p role="alert" className="text-xs text-amber-300">{health.error}</p>}
      {!ready?<div role="status" className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">{health.isLoading||brain.isLoading?"Carregando dados da pessoa…":"Aguardando identificação e dados da pessoa ativa."}</div>:result.error?<p role="alert" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-300">{result.error}</p>:result.report&&<section className="rounded-[22px] border border-emerald-300/20 bg-emerald-300/[.035] p-4"><div className="flex items-center gap-2 text-xs font-bold"><FileText size={16} className="text-emerald-300"/>Prévia do arquivo</div><p className="mt-2 text-sm">{result.report.rows.length} itens · {result.report.summary.daysWithRecords} dias documentados</p><p className="mt-1 text-[11px] text-ink-muted">{result.report.summary.confirmed} tomadas confirmadas · {result.report.summary.explicitlyIgnored} ignoradas explicitamente · {result.report.summary.brainSnapshots} alertas preservados</p><div className="mt-3 space-y-2">{result.report.rows.slice(0,3).map((entry,i)=><div key={`${entry.sourceId}:${i}`} className="rounded-xl border border-surface-border bg-surface p-2"><strong className="block text-xs">{entry.title}</strong><p className="mt-1 line-clamp-2 text-[10px] text-ink-muted">{entry.date} · {entry.source} · {entry.detail}</p></div>)}</div><p className="mt-2 text-[10px] leading-relaxed text-ink-faint">A prévia mostra até três itens. O PDF apresenta as seções selecionadas e as limitações, incluindo as evidências quando o Brain foi escolhido.</p></section>}
      <div className="grid grid-cols-3 gap-2"><button type="button" onClick={()=>void exportFile("pdf")} disabled={!result.report||busy} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-emerald-300 text-xs font-bold text-void disabled:opacity-40"><FileText size={18}/>PDF</button><button type="button" onClick={()=>void exportFile("csv")} disabled={!result.report||busy} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface text-xs font-semibold disabled:opacity-40"><FileSpreadsheet size={18}/>CSV</button><button type="button" onClick={()=>void exportFile("json")} disabled={!result.report||busy} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface text-xs font-semibold disabled:opacity-40"><FileJson2 size={18}/>JSON</button></div>
      {message&&<p role="status" className="rounded-xl border border-surface-border bg-surface p-3 text-xs text-ink-muted">{message}</p>}
      <div className="flex items-start gap-2 rounded-2xl border border-amber-300/15 p-3 text-[11px] leading-relaxed text-ink-muted"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-amber-300"/>Nenhum dado é transmitido pelo VAULT para gerar o relatório. Confira o conteúdo e quem receberá o arquivo. Sensores não são medidas clínicas infalíveis.</div>
    </div>
  </main></PageTransition>;
}
