'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ClinicalJourneyM4 } from '@/components/saude/ClinicalJourneyM4';
import { SurgeryConsultationLinksM4P2 } from '@/components/saude/SurgeryConsultationLinksM4P2';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
function JourneyRouteM4(){
 const params=useSearchParams();const {user}=useAuth();const {activePersonId}=useActivePersonId();
 // Remount after person/account switch: do not reuse another person's selection.
  return <div>{params.get('cirurgia')&&<div className="mx-auto max-w-3xl px-4 pt-3"><Link href={`/saude/cirurgias/jornada?id=${encodeURIComponent(params.get('cirurgia')||'')}`} className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-400 px-4 text-xs font-bold text-slate-950">Abrir Jornada Cirúrgica 360</Link></div>}<ClinicalJourneyM4 key={`${user?.id||''}:${activePersonId||''}`} initialSurgeryId={params.get('cirurgia')||''} initialConsultationId={params.get('consulta')||''}/>{(params.get('cirurgia')||params.get('consulta'))&&<div className="mx-auto max-w-3xl px-4 pb-28"><SurgeryConsultationLinksM4P2 surgeryId={params.get('cirurgia')||undefined} consultationId={params.get('consulta')||undefined}/></div>}</div>;
}
export default function ClinicalJourneyPageM4(){return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-sm text-ink-muted">Preparando jornada clínica…</main>}><JourneyRouteM4/></Suspense>}
