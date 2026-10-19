"use client";
import { BRAIN_NAME } from "@/lib/health-intelligence/version";
import { useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle,BrainCircuit,ChevronLeft,ChevronRight,CircleCheck,Database,Filter,Pill,Search,ShieldAlert,Sparkles,TrendingUp,X } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { BrainV5DetailSheet } from "@/components/vault-intelligence/BrainV5DetailSheet";
import { useReturnContext } from "@/hooks/useReturnContext";
import { useBrainV5Alerts } from "@/hooks/useBrainV5Alerts";
import { brainV5Presentation, brainV5RequiresAttention } from "@/lib/health-intelligence/brain-v5";
import type { BrainV5Alert,BrainV5Family,BrainV5State } from "@/lib/health-intelligence/brain-v5";
import { createLocalSearchIndex, filterLocalSearchIndex } from "@/lib/local-search";
const meta:Record<BrainV5Family,{label:string;icon:typeof BrainCircuit}>={now:{label:"Agora",icon:AlertTriangle},medication:{label:"Medicamentos",icon:Pill},interaction:{label:"Interações e segurança",icon:ShieldAlert},pattern:{label:"Padrões",icon:TrendingUp},data_quality:{label:"Qualidade dos dados",icon:Database},other:{label:"Outros",icon:Sparkles}};
const stateLabel:Record<BrainV5State,string>={active:"Ativo",acknowledged:"Visto",monitoring:"Acompanhando",resolved:"Resolvido"};
const areaTone:Record<BrainV5Family,string>={now:"text-amber-300",medication:"text-emerald-300",interaction:"text-rose-300",pattern:"text-violet-300",data_quality:"text-cyan-300",other:"text-slate-300"};
const formatAnalysisDate=(iso:string)=>{const date=new Date(iso);return Number.isFinite(date.getTime())?date.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"Data indisponível";};
const ageDays=(iso:string)=>Math.max(0,(Date.now()-new Date(iso).getTime())/86400000);
export default function BrainV5Central(){
 const router=useRouter(),brain=useBrainV5Alerts();
 const {backTarget,preserveReturn}=useReturnContext("/inteligencia");
 const [q,setQ]=useState(""),[family,setFamily]=useState<BrainV5Family|"all">("all"),[state,setState]=useState<BrainV5State|"open"|"all">("open"),[severity,setSeverity]=useState<"all"|"attention">("all"),[period,setPeriod]=useState<"all"|"7"|"30">("all"),[selectedKey,setSelectedKey]=useState<string|null>(null),[filtersOpen,setFiltersOpen]=useState(false);
 const openedInsight=useRef<string|null>(null);
 const [shown,setShown]=useState(8);
 useEffect(()=>setShown(8),[q,family,state,severity,period]);
 const selected=useMemo(()=>brain.records.find(x=>x.key===selectedKey)??null,[brain.records,selectedKey]);
 useEffect(()=>{if(typeof window==="undefined"||brain.isLoading)return;const id=new URLSearchParams(window.location.search).get("insight");if(!id)return;const hit=brain.records.find(x=>x.insight_id===id);if(hit&&openedInsight.current!==hit.key){openedInsight.current=hit.key;setSelectedKey(hit.key);void brain.seen(hit.key);}},[brain.isLoading,brain.records,brain.seen]);
 const searchIndex=useMemo(()=>createLocalSearchIndex(brain.ranked,x=>[x.snapshot.titulo,x.snapshot.mensagem,x.snapshot.categoria,...x.snapshot.evidencias,...x.snapshot.fontes_internas]),[brain.ranked]);
 const list=useMemo(()=>filterLocalSearchIndex(searchIndex,q).filter(x=>{if(state==="open"&&x.state==="resolved")return false;if(state!=="all"&&state!=="open"&&x.state!==state)return false;if(family!=="all"&&x.family!==family)return false;if(severity==="attention"&&!brainV5RequiresAttention(x))return false;if(period!=="all"&&ageDays(x.last_detected_at)>Number(period))return false;return true;}),[searchIndex,q,family,state,severity,period]);
 const areaCounts=useMemo(()=>{const counts:Record<BrainV5Family,number>={now:0,medication:0,interaction:0,pattern:0,data_quality:0,other:0};for(const item of brain.records)if(item.state!=="resolved")counts[item.family]++;return counts;},[brain.records]);
 const open=(x:BrainV5Alert)=>{setSelectedKey(x.key);void brain.seen(x.key);};
 const activeFilterCount=(family!=="all"?1:0)+(state!=="open"?1:0)+(severity!=="all"?1:0)+(period!=="all"?1:0);
 const clearFilters=()=>{setFamily("all");setState("open");setSeverity("all");setPeriod("all");};
 // V97 compatibilidade: severity_rank>=700 era o limiar antigo; agora a gravidade é explícita.
 const severityTone=(x:BrainV5Alert)=>brainV5Presentation(x).tone;
 const iconTone=(x:BrainV5Alert)=>brainV5Presentation(x).tone;
 return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary">
  <header className="mx-auto flex max-w-2xl items-start gap-3"><button aria-label="Voltar" onClick={()=>router.replace(backTarget)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface"><ChevronLeft size={20}/></button><div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[.25em] text-violet-300">VAULT INTELLIGENCE</p><h1 className="break-words text-2xl font-bold">Central de Inteligência</h1><p className="mt-1 text-xs text-ink-muted">{BRAIN_NAME} · Sinais priorizados, evidências e histórico.</p></div></header>
  {brain.error && <p role="alert" className="mx-auto mt-3 max-w-2xl rounded-xl border border-coral/30 p-3 text-xs text-coral">{brain.error}</p>}
  <section aria-label="Resumo da inteligência" className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-2 min-[380px]:grid-cols-4">{[["Ativos",brain.counters.active],["Novos",brain.counters.new],["Atenção",brain.counters.attention],["Histórico",brain.counters.resolved]].map(([l,v])=><div key={String(l)} className="rounded-xl border border-surface-border/70 bg-gradient-to-b from-surface to-surface/60 px-3 py-2.5 text-left min-[380px]:text-center"><strong className="text-lg leading-none">{v}</strong><p className="mt-1 text-[8px] uppercase tracking-wide text-ink-faint">{l}</p></div>)}</section>
  <section aria-label="Áreas da inteligência" className="mx-auto mt-4 max-w-2xl">
   <p className="mb-2 text-xs text-ink-muted">Explore os sinais em aberto por área</p>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(meta) as BrainV5Family[]).map(key=>{const Icon=meta[key].icon;return <button type="button" key={key} aria-pressed={family===key} onClick={()=>{setFamily(family===key?"all":key);setState("open");}} className={"flex min-h-14 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 "+(family===key?"border-violet-400/50 bg-violet-400/10":"border-surface-border bg-surface") }><Icon size={17} className={areaTone[key]}/><span className="min-w-0 flex-1">{meta[key].label}</span><strong className={areaTone[key]}>{areaCounts[key]}</strong></button>;})}</div>
  </section>
  {/* VAULT_INTELLIGENCE_EXPERIENCE_V97_R1 */}
  <section className="mx-auto mt-4 max-w-2xl space-y-2">
   <div className="flex items-center gap-2">
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-surface-border bg-surface px-3"><Search size={15}/><input aria-label="Pesquisar na Central de Inteligência" value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar insight, medicamento ou evidência" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/>{q&&<button aria-label="Limpar pesquisa" onClick={()=>setQ("")}><X size={14}/></button>}</div>
    <button type="button" aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={()=>setFiltersOpen(true)} className={"relative flex h-[46px] shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold "+(activeFilterCount?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border bg-surface text-ink-muted")}><Filter size={16}/><span className="hidden min-[350px]:inline">Filtros</span>{activeFilterCount>0&&<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-400 px-1.5 text-[9px] font-black text-void">{activeFilterCount}</span>}</button>
   </div>
   <div className="flex items-center justify-between px-1"><p className="text-[10px] text-ink-faint">{list.length} insight{list.length===1?"":"s"} nesta visão</p>{activeFilterCount>0&&<button onClick={clearFilters} className="text-[10px] font-semibold text-violet-300">Limpar filtros</button>}</div>
  </section>
  {filtersOpen&&<div className="fixed inset-0 z-[95] flex items-end bg-black/65 backdrop-blur-sm" onClick={()=>setFiltersOpen(false)}><div role="dialog" aria-modal="true" aria-labelledby="brain-filters-title" className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] border border-surface-border bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom))]" onClick={e=>e.stopPropagation()}>
   <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-violet-300">Refinar Central</p><h2 id="brain-filters-title" className="mt-1 text-lg font-bold">Filtros</h2></div><button type="button" aria-label="Fechar filtros" onClick={()=>setFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-surface-border"><X size={18}/></button></div>
   <div className="mt-4 space-y-4">
    <div><p className="mb-2 text-[10px] font-bold uppercase text-ink-faint">Área</p><div className="flex flex-wrap gap-2">{(["all",...Object.keys(meta)] as Array<"all"|BrainV5Family>).map(k=><button key={k} onClick={()=>setFamily(k)} className={"rounded-full border px-3 py-2 text-[10px] "+(family===k?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>{k==="all"?"Todas":meta[k].label}</button>)}</div></div>
    <div><p className="mb-2 text-[10px] font-bold uppercase text-ink-faint">Estado</p><div className="flex flex-wrap gap-2"><button onClick={()=>setState("open")} className={"rounded-full border px-3 py-2 text-[10px] "+(state==="open"?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>Em aberto</button><button onClick={()=>setState("all")} className={"rounded-full border px-3 py-2 text-[10px] "+(state==="all"?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>Todos</button><button onClick={()=>setState("monitoring")} className={"rounded-full border px-3 py-2 text-[10px] "+(state==="monitoring"?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>Acompanhando</button><button onClick={()=>setState("resolved")} className={"rounded-full border px-3 py-2 text-[10px] "+(state==="resolved"?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>Resolvidos</button></div></div>
    <div><p className="mb-2 text-[10px] font-bold uppercase text-ink-faint">Prioridade</p><div className="flex gap-2"><button onClick={()=>setSeverity("all")} className={"rounded-full border px-3 py-2 text-[10px] "+(severity==="all"?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>Todas</button><button onClick={()=>setSeverity("attention")} className={"rounded-full border px-3 py-2 text-[10px] "+(severity==="attention"?"border-amber-400/40 bg-amber-400/10 text-amber-300":"border-surface-border text-ink-muted")}>Requer atenção</button></div></div>
    <div><p className="mb-2 text-[10px] font-bold uppercase text-ink-faint">Período</p><div className="flex gap-2">{(["all","7","30"] as const).map(v=><button key={v} onClick={()=>setPeriod(v)} className={"rounded-full border px-3 py-2 text-[10px] "+(period===v?"border-violet-400/40 bg-violet-400/10 text-violet-300":"border-surface-border text-ink-muted")}>{v==="all"?"Todo período":v+" dias"}</button>)}</div></div>
   </div>
   <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={clearFilters} className="rounded-2xl border border-surface-border p-3 text-sm text-ink-muted">Limpar</button><button onClick={()=>setFiltersOpen(false)} className="rounded-2xl bg-violet-400 p-3 text-sm font-bold text-void">Ver {list.length}</button></div>
  </div></div>}
  <section className="mx-auto mt-4 max-w-2xl space-y-2.5">{brain.isLoading?<div className="rounded-2xl border border-surface-border bg-surface p-5 text-sm text-ink-muted">Organizando o histórico…</div>:!list.length?<div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5 text-sm text-emerald-300"><CircleCheck size={17} className="mr-2 inline"/>Nada nesta visão.</div>:list.slice(0,shown).map(x=>{const I=meta[x.family].icon;return <button type="button" key={x.key} onClick={()=>open(x)} style={{contentVisibility:"auto",containIntrinsicSize:"92px"}} className={"flex w-full items-center gap-3 rounded-[20px] border p-3.5 text-left "+severityTone(x)}><div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border "+iconTone(x)}><I size={18}/></div><div className="min-w-0 flex-1"><div className="flex gap-2"><p className="line-clamp-2 break-words text-sm font-bold">{x.snapshot.titulo}</p>{!x.last_seen_at&&<span className="shrink-0 text-[8px] text-ice">NOVO</span>}</div><p className="mt-1 line-clamp-2 text-xs text-ink-muted">{x.snapshot.mensagem}</p><p className="mt-2 font-mono text-[8px] uppercase leading-relaxed text-ink-faint">{brainV5Presentation(x).label} · Confiança {x.snapshot.confianca} · {stateLabel[x.state]} · {formatAnalysisDate(x.last_detected_at)}</p></div><ChevronRight size={16} className="shrink-0"/></button>})}</section>
  {list.length>shown&&<button type="button" onClick={()=>setShown(value=>value+8)} className="mx-auto mt-3 block w-full max-w-2xl rounded-2xl border border-violet-400/25 bg-violet-400/5 p-3 text-xs font-semibold text-violet-300">Mostrar mais {Math.min(8,list.length-shown)} · {shown} de {list.length}</button>}
  {selected && <BrainV5DetailSheet
    alert={selected}
    familyLabel={meta[selected.family].label}
    stateLabel={stateLabel[selected.state]}
    onClose={() => setSelectedKey(null)}
    onContext={href => router.push(preserveReturn(href))}
    onFeedback={value => void brain.feedback(selected.key, value)}
    onToggleResolved={() => void brain.state(selected.key, selected.state === "resolved" ? "active" : "resolved")}
  />}
 </main></PageTransition>;
}
