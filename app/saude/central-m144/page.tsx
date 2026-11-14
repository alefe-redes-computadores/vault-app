'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { safeReturnTarget } from '@/lib/navigation/return-context';
import { ArrowLeft, HeartPulse } from 'lucide-react';
import dynamic from 'next/dynamic';
const M144ClinicalPanel = dynamic(
  () => import('@/components/saude/M144ClinicalPanel').then(mod => mod.M144ClinicalPanel),
  { ssr: false, loading: () => <p role="status" className="rounded-xl border border-surface-border bg-surface p-3 text-xs text-ink-muted">Carregando registros da pessoa ativa…</p> },
);
export default function CentralM144Page(){
 const [returnTargetM147,setReturnTargetM147]=useState('/hoje');
 useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('return_to');setReturnTargetM147(safeReturnTarget(requested,'/hoje'));},[]);
 return <main className="min-h-[100dvh] bg-void px-3.5 pb-24 pt-4 text-ink-primary"><div className="mx-auto max-w-2xl space-y-4"><header className="flex items-center gap-3"><Link href={returnTargetM147} aria-label="Voltar à origem" className="grid size-11 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300">VAULT · Saúde</p><h1 className="font-display text-xl font-semibold">Ocorrências, ciclos e vacinas</h1><p className="text-xs text-ink-muted">Contingências, segurança, episódios e imunizações</p></div><HeartPulse size={22} className="text-emerald-300" aria-hidden="true"/></header><M144ClinicalPanel/></div></main>}
