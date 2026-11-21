'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RehabM5Workspace } from '@/components/saude/RehabM5Workspace';
function Editor(){const params=useSearchParams();return <RehabM5Workspace key={params.get('id')||''} view="edit" selectedId={params.get('id')||''}/>}
export default function RehabEditorPageM5(){return <Suspense fallback={<main className="p-5 text-ink-muted">Carregando edição…</main>}><Editor/></Suspense>}
