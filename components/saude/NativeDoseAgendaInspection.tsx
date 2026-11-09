"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isVaultNative } from "@/lib/native-runtime";
import { inspectNativeDoseAgenda, summarizeNativeCareAgenda, type NativeCareAgendaSummary, type NativeDoseAlarmDetail } from "@/lib/dose-reminder-diagnostics";

/** Explicit read only. Never schedules, cancels or requests notification permission. */
export function NativeDoseAgendaInspection({personId}:{personId:string}) {
  const [summary,setSummary]=useState<NativeCareAgendaSummary|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [owner,setOwner]=useState("");
  const [details,setDetails]=useState<NativeDoseAlarmDetail[]>([]);
  const active=Boolean(personId)&&isVaultNative();
  const ownerRef=useRef(personId);
  const requestRef=useRef(0);
  ownerRef.current=personId;
  useEffect(()=>{
    requestRef.current+=1;
    setSummary(null);setDetails([]);setOwner("");setError("");setLoading(false);
    return ()=>{requestRef.current+=1;};
  },[personId]);
  const visible=owner===personId?summary:null;

  async function inspect() {
    if(!active||loading)return;
    const selectedPerson=personId, request=++requestRef.current;
    const current=()=>requestRef.current===request && ownerRef.current===selectedPerson;
    setLoading(true);setError("");setSummary(null);setDetails([]);setOwner("");
    try {
      const pending=await LocalNotifications.getPending();
      if(!current())return;
      // Scope is evaluated on every explicit inspection; late results cannot leak across profiles.
      setSummary(summarizeNativeCareAgenda(pending.notifications,selectedPerson));
      setDetails(inspectNativeDoseAgenda(pending.notifications,selectedPerson));
      setOwner(selectedPerson);
    }catch{
      if(current())setError("Não foi possível consultar os alarmes do Android agora.");
    }finally{if(current())setLoading(false);}
  }

  if(!active)return null;
  return <div className="mt-2 rounded-xl border border-surface-border/50 bg-surface-raised/40 px-3 py-2.5">
    <button type="button" disabled={loading} onClick={()=>void inspect()} className="flex min-h-10 w-full items-center gap-2 text-left text-xs font-medium text-ink-primary disabled:opacity-60" aria-label="Inspecionar agenda nativa de doses">
      {loading?<Loader2 size={15} className="animate-spin text-emerald-300"/>:<BellRing size={15} className="text-emerald-300"/>}
      <span className="flex-1">Conferir lembretes no Android</span>
      <RefreshCw size={14} className="text-ink-muted"/>
    </button>
    {visible?<div className="mt-2 border-t border-surface-border/60 pt-2 text-[10px] leading-relaxed text-ink-muted" role="status">
      <p className="font-semibold text-ink-primary">{visible.total} aviso(s) aguardando no Android</p>
      <p>{visible.grouped} agrupados · {visible.individual} individuais · {visible.planned} avulsos · {visible.stockReview} de estoque · {visible.overdue} atrasos · {visible.plannedPurchase} de compras planejadas</p>
      {visible.simultaneousIndividualSlots>0?<p className="mt-1 text-amber-300">{visible.simultaneousIndividualSlots} horário(s) ainda possuem alarmes individuais simultâneos. Revise após a reconciliação.</p>:null}
      {details.length?<details className="group mt-2 rounded-lg border border-surface-border/60"><summary className="flex min-h-10 cursor-pointer list-none items-center px-2 font-semibold text-ink-primary">Ver horário e destino ({details.length})</summary><div className="border-t border-surface-border/50 px-2 py-1">{details.slice(0,8).map(item=><div key={item.id} className="border-b border-surface-border/30 py-2 last:border-0"><p className="font-semibold text-ink-primary">{item.type} · {item.date ? item.date.split("-").reverse().join("/") : "data interna"}{item.time?` às ${item.time}`:""}</p><p className="mt-0.5 break-all text-[9px] text-ink-faint">Abre {item.target}</p></div>)}{details.length>8?<p className="py-2 text-[9px] text-ink-muted">Mais {details.length-8} aviso(s) permanecem no Android.</p>:null}</div></details>:null}
      <p className="mt-1 flex items-start gap-1"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>Consulta somente leitura. Agendado não significa entregue: teste a notificação no aparelho. Nenhuma dose é registrada aqui.</p>
    </div>:null}
    {error?<p role="alert" className="mt-1 text-[10px] text-amber-300">{error}</p>:null}
  </div>;
}
