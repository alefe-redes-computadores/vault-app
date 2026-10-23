"use client";
import { useMemo, useState } from "react";
import { Activity, BarChart3, ChevronDown } from "lucide-react";
import type { RegistroSaude } from "@/lib/types";
import { buildHealthFactorTrend, FACTOR_LABELS, type HealthFactor } from "@/lib/health-intelligence/health-factor-trends";

const FACTORS:HealthFactor[]=["sono","caminhada","humor","sintoma"];
const SHORT_DATE=(date:string)=>date.slice(8)+"/"+date.slice(5,7);

/** The Avatar / Brain comparison uses existing scoped records. No Dexie or Supabase query. */
export function HealthTrendsExplorer({records,userId,personId,today}:{records:RegistroSaude[];userId:string;personId:string;today:string}){
 const [open,setOpen]=useState(false),[period,setPeriod]=useState<7|30>(30);
 const [primary,setPrimary]=useState<HealthFactor>("sono"),[secondary,setSecondary]=useState<HealthFactor>("sintoma");
 const first=useMemo(()=>buildHealthFactorTrend({records,userId,personId,today,factor:primary,days:period}),[records,userId,personId,today,primary,period]);
 const second=useMemo(()=>buildHealthFactorTrend({records,userId,personId,today,factor:secondary,days:period}),[records,userId,personId,today,secondary,period]);
 return <section id="vault-trends-explorer" aria-label="Comparar fatores de saúde registrados" className="overflow-hidden rounded-2xl border border-surface-border/70 bg-surface">
  <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-3 py-3 text-left"><BarChart3 size={17} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Explorar tendências</strong><span className="block text-[10px] text-ink-muted">Compare registros de sono, caminhada, humor e sintomas</span></span><ChevronDown size={15} className={`text-ink-muted transition-transform ${open?"rotate-180":""}`}/></button>
  {open&&<div className="space-y-3 border-t border-surface-border/60 p-3">
   <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-ink-muted">Dois fatores · escalas separadas</p><div className="flex gap-1" role="group" aria-label="Janela dos gráficos">{([7,30] as const).map(d=><button key={d} type="button" aria-pressed={period===d} onClick={()=>setPeriod(d)} className={`min-h-9 rounded-lg border px-2 text-[10px] ${period===d?"border-violet-300/35 bg-violet-300/10 text-violet-200":"border-surface-border text-ink-muted"}`}>{d} dias</button>)}</div></div>
   <FactorStrip index={1} value={primary} onChange={setPrimary} trend={first}/>
   <FactorStrip index={2} value={secondary} onChange={setSecondary} trend={second}/>
   {primary===secondary&&<p className="text-[10px] text-amber-300">Você selecionou o mesmo fator nas duas faixas. Escolha outro para comparar.</p>}
   <p className="text-[10px] leading-relaxed text-ink-muted">Cada barra representa somente um dia com dado válido. Altura relativa ao maior registro mostrado em cada gráfico; não é escala clínica. Ausência de registro não significa zero. Gráficos lado a lado não demonstram correlação nem causa.</p>
  </div>}
 </section>;
}
function FactorStrip({index,value,onChange,trend}:{index:1|2;value:HealthFactor;onChange:(v:HealthFactor)=>void;trend:ReturnType<typeof buildHealthFactorTrend>}){
 const desc=FACTOR_LABELS[value];const max=trend.max??0;
 return <div className="rounded-xl border border-surface-border/70 bg-surface-raised/40 p-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><Activity size={14} className="shrink-0 text-violet-300"/><span className="text-[10px] font-semibold text-ink-muted">Fator {index}</span></div><span className="text-[9px] text-ink-muted">{trend.documentedDays} dia(s) registrados de {trend.days.length}</span></div>
  <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label={`Escolher fator de saúde ${index}`}>
   {FACTORS.map(f=><button key={f} type="button" aria-pressed={value===f} onClick={()=>onChange(f)} className={`min-h-11 rounded-xl border px-2 py-2 text-center text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${value===f?"border-violet-300/50 bg-violet-300/10 text-violet-100":"border-surface-border/75 bg-surface text-ink-muted hover:bg-surface-raised"}`}>{FACTOR_LABELS[f].label}</button>)}
  </div>
  <div className="mt-2 flex items-end justify-between"><div className="text-xs text-ink-primary">{trend.mean===null?"Sem média documentada":`Média dos dias: ${trend.mean.toLocaleString("pt-BR")} ${desc.unit}`}</div><span className="text-[10px] text-ink-muted">{trend.samples} relato(s)</span></div>
  <div className="mt-3 flex h-20 items-end gap-px" role="img" aria-label={`${desc.label}: ${trend.documentedDays} dias documentados. Média ${trend.mean===null?"não disponível":`${trend.mean} ${desc.unit}`}.`}>
   {trend.days.map(d=><div key={d.date} className="flex h-full min-w-0 flex-1 items-end" title={`${SHORT_DATE(d.date)}: ${d.value===null?"sem registro":`${d.value} ${desc.unit}`}`}><div className={`w-full rounded-t-sm ${d.value===null?"h-0.5 bg-surface-border/50":index===1?"bg-violet-400/70":"bg-emerald-400/70"}`} style={d.value===null?undefined:{height:`${Math.max(4,max>0?d.value/max*100:4)}%`}}/></div>)}
  </div>
  <div className="mt-1 flex justify-between text-[9px] text-ink-muted"><span>{trend.days[0]?SHORT_DATE(trend.days[0].date):"—"}</span><span>{trend.days[trend.days.length-1]?SHORT_DATE(trend.days[trend.days.length-1].date):"—"}</span></div>
 </div>;
}
