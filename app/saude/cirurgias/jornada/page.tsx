'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { SurgeryJourneyA7 } from '@/components/saude/SurgeryJourneyA7';
function JourneyEntryA7(){
 const params=useSearchParams();const {user}=useAuth(),{activePersonId}=useActivePersonId();
 return <SurgeryJourneyA7 key={`${user?.id||''}:${activePersonId||''}`} initialSurgeryId={params.get('id')||''}/>;
}
export default function SurgeryJourneyPageA7(){return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-sm text-ink-muted">Preparando jornada cirúrgica…</main>}><JourneyEntryA7/></Suspense>;}
