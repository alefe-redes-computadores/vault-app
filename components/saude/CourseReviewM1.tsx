"use client";
import { useRef, useState } from "react";
import { ChevronRight, CircleCheck, ClipboardList, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/lib/db";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import type { Medicamento } from "@/lib/types";
import { recordCourseReviewM1, reviewLabelsM1, type CourseReviewOutcomeM1 } from "@/lib/clinical/episode-m1";
const dateToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export function CourseReviewM1({med,personId,courseKey,through}:{med:Medicamento;personId:string;courseKey:string;through:string}){
 const {user}=useAuth(),{trigger}=useHapticFeedback(),{showToast}=useToast();
 const saveInFlight=useRef(false);
 const [open,setOpen]=useState(false),[percepcao,setPercepcao]=useState<CourseReviewOutcomeM1>("nao_informado"),[nota,setNota]=useState(""),[saving,setSaving]=useState(false);
 const reviewed=med.contexto_clinico_m1?.revisoes?.find(x=>x.course_key===courseKey);
 if(!med.id||med.user_id!==user?.id||med.person_id!==personId||through>=dateToday())return null;
 async function save(){if(saving||saveInFlight.current)return;saveInFlight.current=true;setSaving(true);try{
   const fresh=await db.medicamentos.get(med.id!);
   if(!fresh||fresh.user_id!==user?.id||fresh.person_id!==personId)throw Error("Pessoa ativa ou conta mudou.");
   const next=recordCourseReviewM1(fresh.contexto_clinico_m1,{id:crypto.randomUUID(),course_key:courseKey,periodo_fim:through,avaliado_em:dateToday(),percepcao,nota:nota.trim(),registrado_em:new Date().toISOString()},dateToday());
   await medicamentosRepository.update(med.id!,personId,{contexto_clinico_m1:next});
   trigger("vibrate");showToast("Acompanhamento pessoal salvo, sem alterar doses ou estoque.","success");setOpen(false);
 }catch(e){trigger("error");showToast(e instanceof Error?e.message:"Não foi possível registrar o acompanhamento.","error");}finally{saveInFlight.current=false;setSaving(false);}}
 if(reviewed)return <div className="mt-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.035] p-3 text-[11px] text-emerald-200"><div className="flex items-center gap-1 font-bold"><CircleCheck size={15}/>Acompanhamento registrado</div><p className="mt-1 text-ink-primary">{reviewLabelsM1[reviewed.percepcao]}</p>{reviewed.nota&&<p className="mt-1 whitespace-pre-wrap text-ink-muted">{reviewed.nota}</p>}</div>;
 return <div className="mt-2 space-y-2"><button type="button" aria-expanded={open} onClick={()=>setOpen(x=>!x)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[.04] px-3 text-left text-[11px] font-semibold text-sky-200"><ClipboardList size={16}/><span className="flex-1">Como foi este período?</span><ChevronRight size={15} className={open?"rotate-90":""}/></button>
  {open&&<div className="space-y-2 rounded-xl border border-violet-300/20 bg-surface/65 p-3"><p className="text-[11px] leading-relaxed text-ink-muted">O fim do período não confirma melhora nem indica continuar doses. Registre somente sua percepção.</p>
   {(Object.keys(reviewLabelsM1) as CourseReviewOutcomeM1[]).map(k=><button key={k} type="button" aria-pressed={percepcao===k} onClick={()=>setPercepcao(k)} className={`min-h-11 w-full rounded-lg border px-3 text-left text-xs ${percepcao===k?"border-violet-300/50 bg-violet-300/10 text-violet-200":"border-surface-border/50 text-ink-muted"}`}>{reviewLabelsM1[k]}</button>)}
   <label className="block text-[11px] font-semibold text-ink-primary">Observação pessoal (opcional)<textarea value={nota} maxLength={800} onChange={e=>setNota(e.target.value)} rows={2} placeholder="Ex.: o que observou e quando" className="mt-2 w-full rounded-lg border border-surface-border bg-surface-raised p-3 text-xs text-ink-primary"/></label>
   <button type="button" disabled={saving} onClick={save} className="min-h-11 w-full rounded-lg bg-violet-300/15 text-xs font-bold text-violet-200 disabled:opacity-50">{saving?"Salvando...":"Salvar acompanhamento"}</button>
  </div>}
  <p className="flex items-center gap-1 text-[10px] text-ink-muted"><ShieldCheck size={12}/>Sem extensão automática da prescrição.</p>
 </div>;
}
