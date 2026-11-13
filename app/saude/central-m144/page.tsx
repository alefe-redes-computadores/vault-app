'use client';
import Link from 'next/link';
import { ArrowLeft, Layers3 } from 'lucide-react';
import { M144ClinicalPanel } from '@/components/saude/M144ClinicalPanel';
export default function CentralM144Page(){return <main className="min-h-[100dvh] bg-void px-3.5 pb-24 pt-4 text-ink-primary"><div className="mx-auto max-w-2xl space-y-4"><header className="flex items-center gap-3"><Link href="/hoje" aria-label="Voltar ao Hoje" className="grid size-11 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300">VAULT · M144</p><h1 className="font-display text-xl font-semibold">Continuidade e contexto</h1><p className="text-xs text-ink-muted">Contingências, segurança, episódios e imunizações</p></div><Layers3 size={22} className="text-emerald-300"/></header><M144ClinicalPanel/></div></main>}
