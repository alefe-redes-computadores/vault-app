'use client';
import { Suspense } from 'react';
import { PharmaLensWorkspaceV7 } from '@/components/saude/PharmaLensWorkspaceV7';
export default function PharmaLensPage() {
  return <Suspense fallback={<main className="min-h-screen bg-void p-6 text-xs text-ink-muted">Preparando PharmaLens…</main>}><PharmaLensWorkspaceV7/></Suspense>;
}
