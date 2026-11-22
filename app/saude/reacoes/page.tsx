'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {A9ClinicalWorkspace} from '@/components/saude/A9ClinicalWorkspace';
import {safeReturnTarget} from '@/lib/navigation/return-context';
function Entry(){const params=useSearchParams();return <A9ClinicalWorkspace initial="sensitivity" returnTo={safeReturnTarget(params.get('return_to'),'/saude/minha-saude')}/>;}
export default function Page(){return <Suspense fallback={<p className="min-h-screen bg-void p-5 text-xs text-ink-muted">Abrindo relatos…</p>}><Entry/></Suspense>;}
