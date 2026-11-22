'use client';
import Link from 'next/link';
import {ArrowLeft,ClipboardList} from 'lucide-react';
import {SurgicalIntentPanelA7M5} from '@/components/saude/SurgicalIntentPanelA7M5';
export default function SurgicalIntentPageA7M5(){return <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 bg-void px-3 pb-32 pt-5 sm:px-5">
 <Link href="/saude/cirurgias" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-emerald-200"><ArrowLeft size={17}/>Cirurgias</Link>
 <div className="flex items-center gap-3"><ClipboardList size={23} className="text-emerald-300"/><div><h1 className="text-lg font-bold text-ink-primary">Encaminhamentos informados</h1><p className="text-xs text-ink-muted">É possível documentar um pedido sem data e sem cirurgia cadastrada.</p></div></div>
 <SurgicalIntentPanelA7M5/>
 </main>}
