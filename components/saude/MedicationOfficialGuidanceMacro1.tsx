'use client';
import {useEffect,useMemo,useState} from 'react';
import {BookOpenCheck,ExternalLink,Info,ShieldAlert,ShieldCheck,Thermometer} from 'lucide-react';
import {getLocalTodayISO} from '@/lib/health-utils';
import type {Medicamento} from '@/lib/types';
import {exactOfficialProductId,selectVerifiedUseFactsM1,useFactLabels,type MedicationUseFactM1} from '@/lib/medication-catalog/use-evidence-macro1';
import {readOfficialUseEvidenceM1} from '@/lib/medication-catalog/use-evidence-provider-macro1';
import {catalogExactPresentationSTB,catalogScopeSTB} from '@/lib/health/medication-reference-fit-stb';
import type {MedicationReference} from '@/lib/medication-intelligence/types';

export function MedicationOfficialGuidanceMacro1({medication}:{medication:Medicamento}){
 const scope=catalogScopeSTB(medication);
 const productId=useMemo(()=>{const snapshot=medication.catalog_snapshot;return catalogExactPresentationSTB(medication,snapshot?.reference as MedicationReference|undefined)?exactOfficialProductId(snapshot):null;},[medication.catalog_snapshot,scope]);
 const [result,setResult]=useState<{key:string;rows:MedicationUseFactM1[]|null}|null>(null);
 useEffect(()=>{
  let alive=true;
  if(!productId){setResult(null);return()=>{alive=false;};}
  setResult(null);
  void readOfficialUseEvidenceM1(productId).then(rows=>{if(alive)setResult({key:productId,rows});});
  return()=>{alive=false;};
 },[productId]);
 const pending=Boolean(productId&&result?.key!==productId);
 const state=!productId?'needs_exact_identity':pending?'loading':result?.rows===null?'unavailable':'ready';
 const today=getLocalTodayISO();
 const evidence=state==='ready'?selectVerifiedUseFactsM1({productId,rows:result?.rows||[],today}):null;
 return <section aria-label="Orientações verificadas de bula" className="rounded-[22px] border border-sky-300/20 bg-sky-300/[.035] p-4">
  <div className="flex items-start gap-2.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[.075] text-sky-300"><BookOpenCheck size={18}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-ink-primary">Bula e conservação</h3><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Orientações somente quando produto e fonte oficial estão comprovados. Nenhum ajuste automático de dose ou alarme.</p></div></div>
  {state==='loading'&&<p role="status" className="mt-3 text-xs text-ink-muted">Conferindo fontes disponíveis…</p>}
  {state==='unavailable'&&<p className="mt-3 text-xs leading-relaxed text-amber-200">Consulta às evidências indisponível neste momento (rede, catálogo ou ativação pendente). Nenhuma orientação foi presumida.</p>}
  {state==='needs_exact_identity'&&<p className="mt-3 text-xs leading-relaxed text-ink-muted">Identifique o produto regulatório exato no catálogo para conferir orientações específicas. Não basta coincidir o nome do princípio ativo.</p>}
  {evidence&&evidence.state!=='verified'&&<div className="mt-3 flex gap-2 rounded-xl border border-amber-300/20 p-3 text-xs leading-relaxed text-amber-200"><ShieldAlert size={17} className="shrink-0"/><span>{evidence.limitations.join(' ')}</span></div>}
  {evidence?.state==='verified'&&<div className="mt-3 space-y-2">{evidence.facts.map(f=><details key={f.id} className="rounded-xl border border-surface-border/80 bg-surface/60 p-3"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-left"><span className="shrink-0 text-sky-300">{f.fact_kind==='refrigeration'||f.fact_kind==='light_protection'?<Thermometer size={16}/>:<ShieldCheck size={16}/>}</span><span className="min-w-0 flex-1"><span className="block text-[10px] uppercase tracking-wide text-ink-muted">{useFactLabels[f.fact_kind]}</span><strong className="block break-words text-xs text-ink-primary">{f.statement}</strong>{f.qualification&&<span className="mt-1 block text-[11px] leading-relaxed text-amber-200">Condição: {f.qualification}</span>}</span><Info size={14} className="shrink-0 text-ink-muted"/></summary><div className="mt-2 space-y-1 border-t border-surface-border/60 pt-3 text-[11px] leading-relaxed text-ink-muted">{f.qualification&&<p>Condição: {f.qualification}</p>}<p>Trecho: {f.source_section} · Fonte: {f.source_version}</p><p>Revisão: {f.reviewed_at.slice(0,10).split('-').reverse().join('/')}</p><a href={f.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sky-300 underline underline-offset-2">Conferir fonte oficial <ExternalLink size={13}/></a></div></details>)}<p className="mt-2 text-[11px] leading-relaxed text-ink-muted">A ausência de uma orientação NÃO confirma ausência de restrição. Verifique sempre a bula da apresentação e as instruções do profissional.</p></div>}
 </section>;
}
