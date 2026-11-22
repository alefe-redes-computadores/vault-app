'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {VaccinationA8Workspace} from '@/components/saude/VaccinationA8Workspace';
import {safeReturnTarget} from '@/lib/navigation/return-context';
function Entry(){const params=useSearchParams();return <VaccinationA8Workspace returnTo={safeReturnTarget(params.get('return_to'),'/saude/minha-saude')}/>;}
export default function VaccinationA8Page(){return <Suspense fallback={<main className="min-h-screen bg-void p-4 text-sm text-ink-muted">Abrindo carteira de vacinação…</main>}><Entry/></Suspense>}
