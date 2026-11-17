"use client";
import { useRef, useState } from "react";
import { ClipboardCheck, PlusCircle, Save, Stethoscope, ShieldCheck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/lib/db";
import { consultasRepository } from "@/lib/repositories/consultas";
import type { Consulta } from "@/lib/types";
import { saveConsultationOutcomeM1, type ConsultationDecisionKindM1, type ConsultationDecisionStateM1 } from "@/lib/clinical/episode-m1";
const KINDS:Record<ConsultationDecisionKindM1,string>={medicamento:"Medicamento",exame:"Exame solicitado",monitoramento:"Acompanhamento",retorno:"Retorno",orientacao:"Orientação",outro:"Outro"};
const STATES:Record<ConsultationDecisionStateM1,string>={discutido:"Apenas discutido",prescricao_relatada:"Relato de prescrição",solicitado_relato:"Solicitação relatada",pendente:"Ficou pendente",realizado_confirmado:"Realizado por mim"};
export function ConsultationOutcomeM1({consultation}:{consultation:Consulta}){
 const router=useRouter(),{user}=useAuth(),{activePersonId}=useActivePersonId(),{trigger}=useHapticFeedback(),{showToast}=useToast();
 const saveInFlight=useRef(false);
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
 const [resumo,setResumo]=useState(consultation.desfecho_clinico_m1?.relato||"");
 const [tipo,setTipo]=useState<ConsultationDecisionKindM1>("orientacao"),[situacao,setSituacao]=useState<ConsultationDecisionStateM1>("discutido");
 const [descricao,setDescricao]=useState(""),[fonte,setFonte]=useState<"relato_usuario"|"documento_conferido">("relato_usuario"),[marcarRealizada,setMarcarRealizada]=useState(false);
 const owned=Boolean(consultation.id&&consultation.user_id===user?.id&&consultation.person_id===activePersonId);
 const d=consultation.desfecho_clinico_m1;
 async function save(withDecision:boolean){
  if(!owned||saving||saveInFlight.current)return;
  saveInFlight.current=true;setSaving(true);
  try{
    const fresh=await db.consultas.get(consultation.id!);
    if(!fresh||fresh.user_id!==user?.id||fresh.person_id!==activePersonId)throw Error("Consulta ou pessoa ativa mudou; reabra o atendimento.");
    const now=new Date().toISOString();
    const event=withDecision?{id:crypto.randomUUID(),tipo,situacao,descricao:descricao.trim(),fonte,registrado_em:now}:null;
    if(withDecision&&!descricao.trim())throw Error("Descreva a decisão antes de adicioná-la.");
    const outcome=saveConsultationOutcomeM1(fresh.desfecho_clinico_m1,resumo,event,now);
    await consultasRepository.update(fresh.id!,activePersonId!,{desfecho_clinico_m1:outcome,...(marcarRealizada&&fresh.status==="agendada"?{status:"realizada" as const}:{})});
    trigger("vibrate");showToast(withDecision?"Decisão registrada sem alterar outros cadastros.":"Desfecho salvo.","success");setDescricao("");setMarcarRealizada(false);
  }catch(error){trigger("error");showToast(error instanceof Error?error.message:"Não foi possível salvar o desfecho.","error");}
  finally{saveInFlight.current=false;setSaving(false);}
 }
 if(!owned)return null;
 return <section aria-label="Desfecho e próximos passos da consulta" className="rounded-[20px] border border-sky-300/20 bg-sky-300/[.035] p-3.5 space-y-3">
  <header className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><Stethoscope size={19}/></div><div className="flex-1"><h3 className="text-sm font-bold text-ink-primary">Depois da consulta</h3><p className="text-[11px] text-ink-muted">O que aconteceu e o que ainda precisa ser feito?</p></div></header>
  {d?.relato&&<div className="rounded-xl bg-surface p-3 text-xs leading-relaxed text-ink-primary whitespace-pre-wrap">{d.relato}</div>}
  {(d?.eventos||[]).length>0&&<div className="space-y-2">{d!.eventos.map(e=><div key={e.id} className="rounded-xl border border-surface-border/45 bg-surface/60 p-3"><p className="text-[11px] font-bold text-sky-200">{KINDS[e.tipo]} · {STATES[e.situacao]}</p><p className="mt-1 text-xs text-ink-primary whitespace-pre-wrap">{e.descricao}</p><p className="mt-1 text-[10px] text-ink-muted">{e.fonte==="documento_conferido"?"Documento conferido":"Relato do usuário"} · {new Date(e.registrado_em).toLocaleDateString("pt-BR")}</p></div>)}</div>}
  <button type="button" onClick={()=>{trigger("vibrate");setOpen(v=>!v);}} aria-expanded={open} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/25 text-xs font-bold text-sky-200"><ClipboardCheck size={17}/>{open?"Recolher desfecho":"Como foi? Registrar desfecho"}</button>
  {open&&<div className="space-y-3 border-t border-surface-border/45 pt-3">
   <label className="block text-xs font-semibold text-ink-primary">Resumo do que aconteceu<textarea value={resumo} onChange={e=>setResumo(e.target.value)} maxLength={4000} rows={3} placeholder="Somente fatos ou relatos, sem diagnóstico automático" className="mt-2 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-sm text-ink-primary outline-none focus:border-sky-300"/></label>
   {consultation.status==="agendada"&&<label className="flex items-center gap-2 rounded-xl border border-surface-border p-3 text-xs text-ink-primary"><input type="checkbox" checked={marcarRealizada} onChange={e=>setMarcarRealizada(e.target.checked)} className="size-5 accent-sky-400"/>Confirmo que esta consulta aconteceu (não marcar automaticamente pelo horário)</label>}
   <button type="button" disabled={saving} onClick={()=>save(false)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/40 bg-sky-300/10 text-xs font-semibold text-sky-200"><Save size={16}/>Salvar resumo</button>
   <div className="border-t border-surface-border/40 pt-3"><p className="text-xs font-bold text-ink-primary">Adicionar uma decisão ou providência</p><p className="mt-1 text-[11px] text-ink-muted">Registrar uma discussão não muda a dose nem cria pedido, exame ou medicamento.</p></div>
   <div className="grid grid-cols-2 gap-2">{(Object.keys(KINDS) as ConsultationDecisionKindM1[]).map(k=><button key={k} type="button" onClick={()=>setTipo(k)} aria-pressed={tipo===k} className={`min-h-11 rounded-xl border p-2 text-left text-xs ${tipo===k?"border-sky-300/60 bg-sky-300/10 text-sky-200":"border-surface-border/50 text-ink-secondary"}`}>{KINDS[k]}</button>)}</div>
   <p className="text-xs font-bold text-ink-primary">Estado real desta decisão</p><div className="grid grid-cols-2 gap-2">{(Object.keys(STATES) as ConsultationDecisionStateM1[]).map(s=><button key={s} type="button" onClick={()=>setSituacao(s)} aria-pressed={situacao===s} className={`min-h-11 rounded-xl border p-2 text-left text-xs ${situacao===s?"border-sky-300/60 bg-sky-300/10 text-sky-200":"border-surface-border/50 text-ink-secondary"}`}>{STATES[s]}</button>)}</div>
   <label className="block text-xs font-semibold text-ink-primary">Descrição da decisão<input value={descricao} onChange={e=>setDescricao(e.target.value)} maxLength={650} placeholder="Ex.: pedido de exames de rotina; acompanhamento de pressão" className="mt-2 min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none focus:border-sky-300"/></label>
   <p className="text-xs font-semibold text-ink-primary">Origem</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setFonte("relato_usuario")} aria-pressed={fonte==="relato_usuario"} className={`min-h-11 rounded-xl border text-xs ${fonte==="relato_usuario"?"border-sky-300/60 text-sky-200":"border-surface-border text-ink-muted"}`}>Relato pessoal</button><button type="button" onClick={()=>setFonte("documento_conferido")} aria-pressed={fonte==="documento_conferido"} className={`min-h-11 rounded-xl border text-xs ${fonte==="documento_conferido"?"border-sky-300/60 text-sky-200":"border-surface-border text-ink-muted"}`}>Documento conferido</button></div>
   <button type="button" disabled={saving} onClick={()=>save(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-300/15 text-sm font-semibold text-sky-200 disabled:opacity-50"><PlusCircle size={16}/>Registrar decisão</button>
  </div>}
  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>router.push(`/saude/consultas/editar?id=${consultation.id}`)} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-surface-border px-2 text-xs font-semibold text-ink-secondary">Vincular medicamentos <ChevronRight size={14}/></button><button type="button" onClick={()=>router.push("/saude/exames/novo")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-surface-border px-2 text-xs font-semibold text-ink-secondary">Cadastrar exame <ChevronRight size={14}/></button></div>
  <p className="flex items-start gap-2 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="shrink-0"/>Esses registros são seus relatos com fonte identificada. Exames, receitas, horários e alterações de dose continuam em cadastros próprios.</p>
 </section>;
}
