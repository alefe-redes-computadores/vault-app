'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ArrowLeft, Bell, BrainCircuit, CalendarDays, ChevronDown, ChevronRight,
  ClipboardList, Clock3, Compass, Droplets, Factory, FileHeart, FlaskConical,
  HeartPulse, Layers3, Pill, Search, Eye, ShieldCheck, Stethoscope,
  Syringe, Truck, Users, X,
} from 'lucide-react';
import { useHapticFeedback } from '@/lib/haptics';
import { PageTransition } from '@/components/PageTransition';
import { clinicalDirectoryM150, searchClinicalDirectoryM150 } from '@/lib/navigation/clinical-directory-m150';
import type { ClinicalMapIconM150, ClinicalMapEntryM150 } from '@/lib/navigation/clinical-directory-m150';
import { safeClinicalReturnM150 } from '@/lib/navigation/clinical-return-m150';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { clinicalMapToneM150P3, clinicalMapSectionToneM150P5P3 } from '@/lib/navigation/clinical-map-tones-m150-p3';

const icons: Record<ClinicalMapIconM150, LucideIcon> = {
  clock: Clock3, pill: Pill, heart: HeartPulse, file: FileHeart,
  truck: Truck, calendar: CalendarDays, activity: Activity,
  stethoscope: Stethoscope, flask: FlaskConical, droplet: Droplets,
  bell: Bell, users: Users, shield: ShieldCheck, brain: BrainCircuit,
  eye: Eye, layers: Layers3, factory: Factory, clipboard: ClipboardList,
  syringe: Syringe,
};

/** P5 P4: Inicio/Hoje/Documentos/Mais já têm BottomNav. Nenhum atalho
 * adicional na navegação inferior; Hoje permanece encontrável na busca e no
 * grupo secundário, mas não compete com os quatro cards principais. */
const bottomNavDestinations = new Set(['hoje','documentos']);
const featuredBySection: Readonly<Record<string,readonly string[]>> = {
  rotina: ['medicamentos','tratamentos','retiradas','fornecimento'],
  saude: ['minha-saude','rede','consultas','exames'],
  evidencias: [], documentos: [],
};

/** Um card para cada rota, sem contadores duplicados nem dados clínicos. */
function EntryCard({entry,large,onNavigate}: {entry:ClinicalMapEntryM150;large:boolean;onNavigate:()=>void}) {
  const Icon=icons[entry.icon];
  // Map is the immediate origin; do not propagate a return_to chain.
  const href=withReturnTarget(entry.href,'/saude/mapa');
  return <Link href={href} onClick={onNavigate}
    aria-label={`${entry.label}. ${entry.description}`}
    className={`group flex min-w-0 flex-col gap-2.5 rounded-[20px] border p-3 text-left shadow-sm transition-[transform,border-color,background-color] active:scale-[.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${clinicalMapToneM150P3(entry.id)} ${large?'min-h-[118px] justify-between':'min-h-[91px] justify-start'}`}>
    <span className="flex items-center justify-between gap-1.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-current/15 bg-black/10"><Icon size={19} aria-hidden="true"/></span>
      <ChevronRight size={14} className="opacity-45 transition-transform group-active:translate-x-0.5" aria-hidden="true"/>
    </span>
    <span className="min-w-0">
      <strong className="block break-words text-[12px] font-semibold leading-snug text-ink-primary">{entry.label}</strong>
      <span className="mt-0.5 block break-words text-[10px] leading-snug text-ink-muted">{entry.description}</span>
    </span>
  </Link>;
}

/** M150 — one discoverable gateway to existing areas; creates no new clinical authority. */
export default function ClinicalMapM150Page() {
  const { trigger } = useHapticFeedback();
  const [query,setQuery] = useState('');
  const [returnTo,setReturnTo] = useState('/');
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('return_to');
    setReturnTo(safeClinicalReturnM150(requested,'/saude/mapa','/'));
  }, []);
  const groups = useMemo(() => searchClinicalDirectoryM150(query), [query]);
  const entriesCount = groups.reduce((count,group)=>count+group.items.length,0);
  const searching=Boolean(query.trim());
  const total=clinicalDirectoryM150.reduce((n,g)=>n+g.items.length,0);
  const onNavigate=()=>trigger('vibrate');
  return <PageTransition><main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 text-ink-primary">
    <div className="mx-auto max-w-2xl space-y-5 px-4">
      <header className="flex items-center gap-3">
        <Link href={returnTo} onClick={onNavigate} aria-label="Voltar à origem do mapa" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-surface-raised/50 text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><ArrowLeft size={18}/></Link>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300" aria-hidden="true"><Compass size={22}/></span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">VAULT · Saúde</p><h1 className="font-display text-xl font-bold tracking-tight">Explorar o VAULT</h1><p className="text-xs text-ink-muted">Sua saúde, organizada em um só lugar</p></div>
      </header>

      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true"/>
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Medicamento, receita, Fênix, SUS…" aria-label="Buscar áreas de saúde"
          className="min-h-12 w-full rounded-2xl border border-violet-400/20 bg-surface-raised/70 pl-11 pr-11 text-sm text-ink-primary outline-none placeholder:text-ink-faint focus:border-violet-300/55"/>
        {query && <button type="button" onClick={()=>setQuery('')} aria-label="Limpar busca de áreas" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-ink-muted"><X size={17}/></button>}
      </div>
      <p role="status" className="text-xs text-ink-muted" aria-live="polite">{searching ? `${entriesCount} resultado${entriesCount===1?'':'s'}` : `${total} áreas reais · por tarefa, sem repetir a navegação inferior`}</p>

      {groups.length === 0 && <div className="rounded-2xl border border-surface-border/60 bg-surface/45 p-4 text-sm text-ink-secondary">Nenhuma área encontrada. Tente outro nome ou limpe a busca.</div>}
      {groups.map(group=>{
        const preferred=featuredBySection[group.id]||[];
        const defaultItems=searching ? group.items : group.items.filter(item=>!bottomNavDestinations.has(item.id));
        const featured=searching ? group.items : preferred.map(id=>defaultItems.find(item=>item.id===id)).filter((item):item is ClinicalMapEntryM150=>Boolean(item));
        const remaining=searching ? [] : defaultItems.filter(item=>!preferred.includes(item.id));
        const collapsed=group.id==='evidencias'||group.id==='documentos';
        return <section key={group.id} aria-labelledby={`m150-${group.id}`} className="space-y-2.5">
          <div className="flex items-start gap-2 px-0.5"><span className={`mt-0.5 ${clinicalMapSectionToneM150P5P3(group.id)}`} aria-hidden="true"><Layers3 size={16}/></span><div><h2 id={`m150-${group.id}`} className={`text-sm font-bold ${clinicalMapSectionToneM150P5P3(group.id)}`}>{group.title}</h2><p className="mt-0.5 text-[11px] text-ink-muted">{group.description}</p></div></div>
          {!collapsed || searching ? <>
            {featured.length>0 && <div className="grid min-w-0 grid-cols-2 gap-2.5">{featured.map(entry=><EntryCard key={entry.id} entry={entry} large={group.id==='rotina'&&!searching} onNavigate={onNavigate}/>)}</div>}
            {remaining.length>0 && <details className="group rounded-[18px] border border-surface-border/50 bg-surface/35">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span>Mais nesta área · {remaining.length}</span><ChevronDown size={16} className="transition-transform group-open:rotate-180"/></summary>
              <div className="grid grid-cols-2 gap-2 border-t border-surface-border/40 p-2">{remaining.map(entry=><EntryCard key={entry.id} entry={entry} large={false} onNavigate={onNavigate}/>)}</div>
            </details>}
          </> : <details className="group rounded-[18px] border border-surface-border/50 bg-surface/35">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span>Ver {defaultItems.length} funcionalidades</span><ChevronDown size={16} className="transition-transform group-open:rotate-180"/></summary>
            <div className="grid grid-cols-2 gap-2 border-t border-surface-border/40 p-2">{defaultItems.map(entry=><EntryCard key={entry.id} entry={entry} large={false} onNavigate={onNavigate}/>)}</div>
          </details>}
        </section>;
      })}
      <p className="pb-3 text-[11px] leading-relaxed text-ink-muted">Este mapa organiza acessos existentes. Análises de Brain, Fênix e PharmaLens não substituem seus registros nem confirmam diagnósticos, receitas, estoque ou aquisições.</p>
    </div>
  </main></PageTransition>;
}
