'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ArrowLeft, Bell, BrainCircuit, CalendarDays, ChevronRight,
  ClipboardList, Clock3, Droplets, Factory, FileHeart, FlaskConical,
  HeartPulse, Layers3, Pill, Search, Eye, ShieldCheck, Stethoscope,
  Syringe, Truck, Users, X,
} from 'lucide-react';
import { useHapticFeedback } from '@/lib/haptics';
import { PageTransition } from '@/components/PageTransition';
import { clinicalDirectoryM150, searchClinicalDirectoryM150 } from '@/lib/navigation/clinical-directory-m150';
import type { ClinicalMapIconM150 } from '@/lib/navigation/clinical-directory-m150';
import { safeClinicalReturnM150 } from '@/lib/navigation/clinical-return-m150';
import { withReturnTarget } from '@/lib/navigation/return-context';

const icons: Record<ClinicalMapIconM150, LucideIcon> = {
  clock: Clock3, pill: Pill, heart: HeartPulse, file: FileHeart,
  truck: Truck, calendar: CalendarDays, activity: Activity,
  stethoscope: Stethoscope, flask: FlaskConical, droplet: Droplets,
  bell: Bell, users: Users, shield: ShieldCheck, brain: BrainCircuit,
  eye: Eye, layers: Layers3, factory: Factory, clipboard: ClipboardList,
  syringe: Syringe,
};

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
  return <PageTransition><main className="min-h-[100dvh] bg-void pb-32 pt-4 text-ink-primary">
    <div className="mx-auto max-w-2xl space-y-5 px-4">
      <header className="flex items-center gap-3">
        <Link href={returnTo} onClick={()=>trigger('vibrate')} aria-label="Voltar à origem do mapa" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-surface-raised/50 text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><ArrowLeft size={18}/></Link>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300">VAULT · Saúde</p><h1 className="font-display text-xl font-bold tracking-tight">Explorar áreas</h1><p className="text-xs text-ink-muted">Encontre uma tarefa sem abrir vários menus</p></div>
        <Layers3 size={20} className="shrink-0 text-emerald-300" aria-hidden="true"/>
      </header>

      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true"/>
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Medicamento, receita, Fênix, SUS…" aria-label="Buscar áreas de saúde"
          className="min-h-12 w-full rounded-2xl border border-surface-border/60 bg-surface-raised/65 pl-11 pr-11 text-sm text-ink-primary outline-none placeholder:text-ink-faint focus:border-emerald-300/55"/>
        {query && <button type="button" onClick={()=>setQuery('')} aria-label="Limpar busca de áreas" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-ink-muted"><X size={17}/></button>}
      </div>
      <p role="status" className="text-xs text-ink-muted" aria-live="polite">{query ? `${entriesCount} resultado${entriesCount===1?'':'s'}` : `${clinicalDirectoryM150.reduce((n,g)=>n+g.items.length,0)} áreas reais · organizadas por tarefa`}</p>

      {groups.length === 0 && <div className="rounded-2xl border border-surface-border/60 bg-surface/45 p-4 text-sm text-ink-secondary">Nenhuma área encontrada. Tente outro nome ou limpe a busca.</div>}
      {groups.map(group=><section key={group.id} aria-labelledby={`m150-${group.id}`} className="space-y-2.5">
        <div className="px-0.5"><h2 id={`m150-${group.id}`} className="text-sm font-bold text-ink-primary">{group.title}</h2><p className="mt-0.5 text-[11px] text-ink-muted">{group.description}</p></div>
        <div className="overflow-hidden rounded-[20px] border border-surface-border/55 bg-surface/40 divide-y divide-surface-border/30">
          {group.items.map(entry=>{
            const Icon=icons[entry.icon];
            // Map is the immediate origin; do not propagate a return_to chain.
            const href=withReturnTarget(entry.href,'/saude/mapa');
            return <Link key={entry.id} href={href} onClick={()=>trigger('vibrate')}
              aria-label={`${entry.label}. ${entry.description}`}
              className="group flex min-h-[66px] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-raised/40 active:bg-surface-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-300">
              <span className="grid size-10 shrink-0 place-items-center rounded-[14px] border border-emerald-300/15 bg-emerald-300/[.065] text-emerald-300"><Icon size={19} aria-hidden="true"/></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold leading-snug text-ink-primary">{entry.label}</strong><span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{entry.description}</span></span>
              <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true"/>
            </Link>;
          })}
        </div>
      </section>)}
      <p className="pb-3 text-[11px] leading-relaxed text-ink-muted">Este mapa organiza acessos existentes. Análises de Brain, Fênix e PharmaLens não substituem seus registros nem confirmam diagnósticos, receitas, estoque ou aquisições.</p>
    </div>
  </main></PageTransition>;
}
