"use client";

import { useState } from "react";
import { BellRing, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isVaultNative } from "@/lib/native-runtime";
import { summarizeNativeDoseAgenda, type NativeDoseAgendaSummary } from "@/lib/dose-reminder-diagnostics";

/** Explicit read only. Never schedules, cancels or requests notification permission. */
export function NativeDoseAgendaInspection({personId}:{personId:string}) {
  const [summary,setSummary]=useState<NativeDoseAgendaSummary|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [owner,setOwner]=useState("");
  const active=Boolean(personId)&&isVaultNative();
  const visible=owner===personId?summary:null;

  async function inspect() {
    if(!active||loading)return;
    setLoading(true);setError("");setSummary(null);setOwner("");
    try {
      const pending=await LocalNotifications.getPending();
      // Scope is evaluated on every explicit inspection, never using another profile's result.
      setSummary(summarizeNativeDoseAgenda(pending.notifications,personId));
      setOwner(personId);
    }catch{
      setError("Não foi possível consultar os alarmes do Android agora.");
    }finally{setLoading(false);}
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
      <p>{visible.grouped} agrupados · {visible.individual} individuais · {visible.planned} avulsos · {visible.stockReview} de estoque · {visible.overdue} atrasos</p>
      {visible.simultaneousIndividualSlots>0?<p className="mt-1 text-amber-300">{visible.simultaneousIndividualSlots} horário(s) ainda possuem alarmes individuais simultâneos. Revise após a reconciliação.</p>:null}
      <p className="mt-1 flex items-start gap-1"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>Consulta somente leitura. Sem enviar dados ou registrar doses.</p>
    </div>:null}
    {error?<p role="alert" className="mt-1 text-[10px] text-amber-300">{error}</p>:null}
  </div>;
}
