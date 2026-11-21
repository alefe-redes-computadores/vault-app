'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { HospitalizationA5Workspace } from '@/components/saude/HospitalizationA5Workspace';
function EditA5(){const params=useSearchParams();return <HospitalizationA5Workspace view="edit" selectedId={params.get('id')||undefined}/>;}
export default function HospitalizationEditA5(){return <Suspense fallback={<main className="min-h-screen bg-void p-4 text-xs text-ink-muted">Carregando edição…</main>}><EditA5/></Suspense>;}
