'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RehabM5Workspace } from '@/components/saude/RehabM5Workspace';
function Details(){const params=useSearchParams();return <RehabM5Workspace key={params.get('id')||''} view="details" selectedId={params.get('id')||''}/>}
export default function RehabDetailsPageM5(){return <Suspense fallback={<main className="p-5 text-ink-muted">Carregando reabilitação…</main>}><Details/></Suspense>}
