"use client";
import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Ear, Eye, Pill, PlusCircle, Save, ShieldCheck } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { useToast } from "@/components/ToastProvider";
import { useHapticFeedback } from "@/lib/haptics";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";
import type { Medicamento, Consulta } from "@/lib/types";
import { appendRouteEpisodeM1, administrationRouteLabelsM1, administrationRouteM1, type AdministrationRouteM1, type AdministrationSideM1 } from "@/lib/clinical/episode-m1";

const todayLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const sides:AdministrationSideM1[]=["nao_informado","direito","esquerdo","ambos"];
export function MedicationRegimeM1({med,personId}:{med:Medicamento;personId:string}){
 const {user}=useAuth();const {showToast}=useToast();const {trigger}=useHapticFeedback();
 const saveInFlight=useRef(false);
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
 const [via,setVia]=useState<AdministrationRouteM1>("nao_informada"),[lado,setLado]=useState<AdministrationSideM1>("nao_informado");
 const [local,setLocal]=useState(""),[inicio,setInicio]=useState(todayLocal),[fim,setFim]=useState("");
 const [fonte,setFonte]=useState<"relato_usuario"|"documento_conferido">("relato_usuario"),[consultaId,setConsultaId]=useState("");
 const owned=Boolean(med.id&&med.user_id&&med.user_id===user?.id&&med.person_id===personId);
 const consultas=useLiveQuery(async()=>{
   if(!owned)return [] as Consulta[];
   const rows=await db.consultas.where("person_id").equals(personId).toArray();
   return rows.filter(c=>c.user_id===user?.id && (c.medicamento_ids||[]).includes(med.id!)).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,12);
 },[personId,user?.id,med.id,owned],[] as Consulta[])||[];
 const regimes=useMemo(()=>[...(med.contexto_clinico_m1?.regimes||[])].sort((a,b)=>b.registrado_em.localeCompare(a.registrado_em)),[med.contexto_clinico_m1]);
 const ladoDisponivel=["otologica","oftalmica","nasal","topica","injetavel","outra"].includes(via);
 const current=regimes[0];
 async function save(){
  if(!owned||saving||saveInFlight.current)return;
  saveInFlight.current=true;setSaving(true);
  try{
    const fresh=await db.medicamentos.get(med.id!);
    if(!fresh||fresh.user_id!==user?.id||fresh.person_id!==personId)throw Error("A pessoa ou sessão mudou. Reabra o medicamento.");
    if(consultaId){const c=consultas.find(x=>x.id===consultaId);if(!c||c.user_id!==user?.id||c.person_id!==personId||(c.medicamento_ids||[]).includes(med.id!)===false)throw Error("Consulta não vinculada explicitamente a este medicamento.");}
    const next=appendRouteEpisodeM1(fresh.contexto_clinico_m1,{id:crypto.randomUUID(),via,local:local.trim(),lado:ladoDisponivel?lado:"nao_informado",inicio,fim:fim||undefined,consulta_id:consultaId||undefined,fonte,registrado_em:new Date().toISOString()});
    await medicamentosRepository.update(med.id!,personId,{contexto_clinico_m1:next});
    trigger("vibrate");showToast("Regime registrado com histórico e fonte preservados.","success");setOpen(false);
  }catch(error){trigger("error");showToast(error instanceof Error?error.message:"Não foi possível registrar o regime.","error");}
  finally{saveInFlight.current=false;setSaving(false);}
 }
 if(!owned)return null;
 return <section aria-label="Via e local de administração" className="rounded-[20px] border border-emerald-300/20 bg-emerald-300/[.035] p-3.5 space-y-3">
  <header className="flex items-center gap-2"><div className="grid size-10 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">{current?.via==="otologica"?<Ear size={18}/>:current?.via==="oftalmica"?<Eye size={18}/>:<Pill size={18}/>}</div><div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-ink-primary">Via e local de aplicação</h3><p className="text-[11px] text-ink-muted">Forma farmacêutica não determina a via; confirme o regime usado.</p></div></header>
  {current?<div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-3"><p className="text-sm font-semibold text-emerald-200">{administrationRouteLabelsM1[current.via]}{current.lado!=="nao_informado"?` · ${current.lado}`:""}</p>{current.local&&<p className="text-xs text-ink-primary mt-1">{current.local}</p>}<p className="mt-1 text-[11px] text-ink-muted">Desde {current.inicio.split("-").reverse().join("/")}{current.fim?` · até ${current.fim.split("-").reverse().join("/")}`:""} · {current.fonte==="documento_conferido"?"Documento conferido":"Informado por você"}</p></div>:<p className="text-xs text-ink-muted">Via não informada para este medicamento. Nenhuma inferência do catálogo foi gravada.</p>}
  <button type="button" onClick={()=>{trigger("vibrate");setOpen(v=>!v);}} aria-expanded={open} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/[.055] text-xs font-bold text-emerald-200"><PlusCircle size={16}/>{open?"Fechar revisão":"Registrar regime / corrigir histórico"}</button>
  {open&&<div className="space-y-3 border-t border-surface-border/50 pt-3">
    <p className="text-[11px] leading-relaxed text-ink-muted">Um novo registro não apaga os anteriores. Escolha a data real de início; não use automaticamente a data de hoje para um evento passado.</p>
    <div className="grid grid-cols-2 gap-2">{administrationRouteM1.map(route=><button key={route} type="button" onClick={()=>{setVia(route);if(!["otologica","oftalmica","nasal","topica","injetavel","outra"].includes(route))setLado("nao_informado");}} aria-pressed={via===route} className={`min-h-11 rounded-xl border p-2 text-left text-xs font-semibold ${via===route?"border-emerald-300/60 bg-emerald-300/10 text-emerald-200":"border-surface-border/50 text-ink-secondary"}`}>{administrationRouteLabelsM1[route]}</button>)}</div>
    {ladoDisponivel&&<div><p className="mb-2 text-xs font-semibold text-ink-primary">Lado anatômico</p><div className="grid grid-cols-2 gap-2">{sides.map(s=><button key={s} type="button" aria-pressed={lado===s} onClick={()=>setLado(s)} className={`min-h-11 rounded-xl border px-2 text-xs ${lado===s?"border-emerald-300/60 text-emerald-200 bg-emerald-300/10":"border-surface-border/50 text-ink-secondary"}`}>{s.replace("_"," ")}</button>)}</div></div>}
    <label className="block text-xs font-semibold text-ink-primary">Local específico (se houver)<input value={local} onChange={e=>setLocal(e.target.value)} maxLength={90} placeholder={via==="otologica"?"Ex.: ouvido direito":via==="oftalmica"?"Ex.: olho esquerdo":"Ex.: local descrito na receita"} className="mt-2 min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none focus:border-emerald-300"/></label>
    <div className="grid grid-cols-2 gap-2"><CustomDatePicker label="Início verdadeiro" value={inicio} onChange={setInicio}/><CustomDatePicker label="Fim (opcional)" value={fim} onChange={setFim}/></div>
    <p className="text-xs font-semibold text-ink-primary">Fonte da informação</p><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={fonte==="relato_usuario"} onClick={()=>setFonte("relato_usuario")} className={`min-h-11 rounded-xl border px-2 text-xs ${fonte==="relato_usuario"?"border-emerald-300/50 text-emerald-200":"border-surface-border/50 text-ink-secondary"}`}>Informado por mim</button><button type="button" aria-pressed={fonte==="documento_conferido"} onClick={()=>setFonte("documento_conferido")} className={`min-h-11 rounded-xl border px-2 text-xs ${fonte==="documento_conferido"?"border-emerald-300/50 text-emerald-200":"border-surface-border/50 text-ink-secondary"}`}>Documento conferido</button></div>
    {consultas.length>0&&<div role="group" aria-label="Consulta já vinculada (opcional)" className="space-y-2">
      <p className="text-xs font-semibold text-ink-primary">Consulta já vinculada (opcional)</p>
      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-surface-border/50 bg-surface-raised/40 p-2">
        <button type="button" aria-pressed={consultaId===""} onClick={()=>setConsultaId("")} className={`min-h-11 w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold ${consultaId===""?"border-emerald-300/50 bg-emerald-300/10 text-emerald-200":"border-surface-border/50 text-ink-secondary"}`}>Não vincular neste registro</button>
        {consultas.filter(c=>Boolean(c.id)).map(c=><button type="button" key={c.id} aria-pressed={consultaId===c.id} onClick={()=>setConsultaId(c.id!)} className={`min-h-11 w-full rounded-lg border px-3 py-2 text-left text-xs ${consultaId===c.id?"border-emerald-300/50 bg-emerald-300/10 text-emerald-200":"border-surface-border/50 text-ink-secondary"}`}>{c.data.split("-").reverse().join("/")} · {c.medico||c.especialidade||"Consulta"}</button>)}
      </div>
    </div>}
    <button type="button" disabled={saving} onClick={save} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400/15 text-sm font-bold text-emerald-200 disabled:opacity-50"><Save size={16}/>{saving?"Registrando...":"Registrar via e contexto"}</button>
  </div>}
  {regimes.length>1&&<details className="rounded-xl border border-surface-border/50 p-2"><summary className="min-h-11 cursor-pointer p-2 text-xs font-semibold text-ink-secondary">Ver {regimes.length-1} regimes anteriores</summary><div className="space-y-2 p-2">{regimes.slice(1).map(r=><div key={r.id} className="border-l-2 border-surface-border pl-3 text-xs text-ink-muted">{administrationRouteLabelsM1[r.via]} · {r.inicio} · {r.lado}{r.local?` · ${r.local}`:""}</div>)}</div></details>}
  <p className="flex items-start gap-2 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="shrink-0"/>Não altera prescrição, dose, histórico de tomadas nem estoque. Informações somente após sua confirmação.</p>
 </section>;
}
