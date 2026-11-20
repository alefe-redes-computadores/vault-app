'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClinicalJourneyM4 } from '@/components/saude/ClinicalJourneyM4';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
function JourneyRouteM4(){
 const params=useSearchParams();const {user}=useAuth();const {activePersonId}=useActivePersonId();
 // Remount after person/account switch: do not reuse another person's selection.
 return <ClinicalJourneyM4 key={`${user?.id||''}:${activePersonId||''}`} initialSurgeryId={params.get('cirurgia')||''} initialConsultationId={params.get('consulta')||''}/>;
}
export default function ClinicalJourneyPageM4(){return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-sm text-ink-muted">Preparando jornada clínica…</main>}><JourneyRouteM4/></Suspense>}
