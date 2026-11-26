'use client';
/** A10: exact, read-only source fact. No edit action or independent writer. */
import {Suspense,useEffect,useMemo} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {safeReturnTarget,withReturnTarget} from '@/lib/navigation/return-context';
import {sanitizeClinicalBackHrefUX360,scrubLegacyClinicalQueryUX360} from '@/lib/ui/clinical-a10-filter-session-ux360';
import {useLiveQuery} from 'dexie-react-hooks';
import {ArrowLeft,ArrowUpRight,CalendarDays,FileText,Link2,ShieldCheck} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {loadScopedA10} from '@/lib/a10/client-data';
import {isCanonicalAuthorityA10} from '@/lib/a10/authority-ledger';
import {A10_DOMAIN_LABELS,projectLongitudinalA10} from '@/lib/a10/longitudinal';
import {graphFromExistingA10,relatedFactsA10} from '@/lib/a10/relations';

function ExactFactView(){
 const params=useSearchParams();const authority=params.get('origem')||'',id=params.get('id')||'';
 // Same privacy authority as the longitudinal list, including deep links.
 const backHref=sanitizeClinicalBackHrefUX360(safeReturnTarget(params.get('return_to'),'/saude/linha-clinica'));
 useEffect(()=>{scrubLegacyClinicalQueryUX360();},[params]);
 const detailHref=withReturnTarget(`/saude/linha-clinica/detalhe?origem=${encodeURIComponent(params.get('origem')||'')}&id=${encodeURIComponent(params.get('id')||'')}`,backHref);
 const {user,loading}=useAuth();const {activePersonId}=useActivePersonId();
 const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const snapshot=useLiveQuery(()=>loadScopedA10(uid,pid),[uid,pid]);
 const projection=useMemo(()=>snapshot?.verified&&snapshot.scope===scope?projectLongitudinalA10(snapshot.data,uid,pid,true,Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'):null,[snapshot,scope,uid,pid]);
 const permitted=isCanonicalAuthorityA10(authority)&&id.length>0&&id.length<=200;
 const current=permitted?projection?.facts.find(f=>f.authority===authority&&f.id===id):null;
 const graph=useMemo(()=>snapshot?.verified&&projection&&snapshot.scope===scope?graphFromExistingA10(projection.facts,snapshot.data,uid,pid):null,[snapshot,projection,scope,uid,pid]);
 const related=useMemo(()=>current&&projection?relatedFactsA10(current,projection.facts,graph||undefined):[],[current,projection,graph]);
 return <main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary vault-adaptive-tail">
  <div className="mx-auto max-w-2xl space-y-4">
   <header className="flex items-start gap-3"><Link href={backHref} className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface" aria-label="Voltar à linha clínica"><ArrowLeft size={19}/></Link><div className="min-w-0"><h1 className="text-xl font-bold">Detalhe do registro</h1><p className="text-xs text-ink-muted">Origem e vínculos documentados, sem deduções.</p></div></header>
   {loading||snapshot===undefined||snapshot.scope!==scope?<p role="status" className="rounded-xl border border-surface-border p-4 text-xs">Conferindo titularidade local…</p>:
    !snapshot.verified||!uid||!pid?<p role="alert" className="rounded-xl border border-rose-300/25 p-4 text-xs">Pessoa ou conta indisponível. Nenhum dado será exibido.</p>:
    !permitted||!current?<p role="alert" className="rounded-xl border border-surface-border p-4 text-xs">Registro não encontrado nesta pessoa. Ele pode ter sido retificado, removido ou pertencer a outra conta.</p>:
    <>
     <section className="space-y-3 rounded-2xl border border-surface-border bg-surface p-4"><p className="flex items-center gap-2 text-xs text-emerald-300"><FileText size={16}/>{A10_DOMAIN_LABELS[current.domain]}</p><h2 className="break-words text-lg font-bold">{current.title}</h2><p className="flex items-center gap-2 text-xs text-ink-secondary"><CalendarDays size={16}/>{current.displayedDate}{current.dateKind==='planned'?' · Planejado':current.dateKind==='reported'?' · Relatado':current.dateKind==='registration'?' · Data do cadastro':current.dateKind==='scheduled'?' · Data da rotina':current.dateKind==='unknown'?' · Data efetiva não confirmada':''}</p><p className="text-sm font-semibold text-ink-primary">{current.status}</p>{current.detail?<p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-secondary">{current.detail}</p>:null}<p className="text-xs text-ink-muted">Origem: {current.origin} · {current.source}</p><p className="text-xs text-ink-muted">{current.revision==='current'?'Registro atual':current.revision==='historical'?'Versão histórica retificada':current.revision==='deleted'?'Registro excluído no histórico':'Cancelamento documental'} · {current.sync==='synced'?'Marcado localmente como sincronizado':current.sync==='pending'?'Sincronização pendente':'Sincronização não comprovada'}</p><p className="break-all text-[11px] text-ink-muted">Identificador de origem: {current.id}</p>{graph&&(graph.privateEvidenceCounts[current.key]||0)>0?<p className="text-xs text-ink-secondary">{graph.privateEvidenceCounts[current.key]} {graph.privateEvidenceCounts[current.key]===1?'vínculo documental privado':'vínculos documentais privados'} registrados. Os arquivos originais não são expostos nesta tela.</p>:null}<div className="flex items-start gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs text-ink-secondary"><ShieldCheck size={17} className="shrink-0 text-emerald-300"/><p>Relato, plano, registro efetivo e interpretação são fatos diferentes. A ausência de evento não equivale a ausência de risco.</p></div>
      {current.originHref.includes('?id=')||current.originHref.includes('?registro=')?<Link href={withReturnTarget(current.originHref,detailHref)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold">Abrir registro canônico <ArrowUpRight size={16}/></Link>:null}
     </section>
     {related.length>0?<section className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-bold"><Link2 size={17} className="text-emerald-300"/> Vínculos por identificador</h3>{related.map(rel=>{
       const item=projection?.facts.find(f=>f.key===rel.to);return item?<Link key={rel.to} href={withReturnTarget(item.href,detailHref)} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface p-3 text-xs"><span className="min-w-0 break-words">{item.title} · {item.displayedDate}</span><ArrowUpRight size={16} className="shrink-0"/></Link>:null;
      })}<p className="text-[11px] text-ink-muted">Vínculos são relações explícitas, não prova de causa.</p></section>:null}
    </>}
  </div>
 </main>;
}
export default function ClinicalExactFactPage(){return <Suspense fallback={<div role="status" className="p-5 text-sm">Preparando registro…</div>}><ExactFactView/></Suspense>;}
