'use client';
import { Suspense } from 'react';
import { HospitalizationA5Workspace } from '@/components/saude/HospitalizationA5Workspace';
export default function HospitalizationsA5(){return <Suspense fallback={<main className="min-h-screen bg-void p-4 text-xs text-ink-muted">Preparando internações…</main>}><HospitalizationA5Workspace view="list"/></Suspense>;}
