'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { HospitalizationA5Workspace } from '@/components/saude/HospitalizationA5Workspace';
function DetailsA5(){const params=useSearchParams();return <HospitalizationA5Workspace view="details" selectedId={params.get('id')||undefined}/>;}
export default function HospitalizationDetailsA5(){return <Suspense fallback={<main className="min-h-screen bg-void p-4 text-xs text-ink-muted">Carregando a internação…</main>}><DetailsA5/></Suspense>;}
