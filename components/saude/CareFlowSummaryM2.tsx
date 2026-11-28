'use client';
import Link from 'next/link';
import { Activity, ChevronRight } from 'lucide-react';
import {withReturnTarget} from '@/lib/navigation/return-context';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
/** Compact entry: no duplicated action engine and no fake overdue urgency. */
export function CareFlowSummaryM2({ returnTo = "/", onNavigate }: { returnTo?: string; onNavigate?: (href: string) => void } = {}){const {events=[],loading,activePersonId,userId}=useCareFlowM2();if(!activePersonId||!userId)return null;
  const scoped = events.filter(e=>e.user_id===userId&&e.person_id===activePersonId);
  const orders=scoped.filter(e=>e.kind==='exam_order').length,plans=scoped.filter(e=>e.kind==='monitor_plan').length;
  return <Link href={withReturnTarget("/saude/careflow", returnTo)}
    onClick={event => {
      if (!onNavigate || event.defaultPrevented || event.button !== 0 ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      onNavigate("/saude/careflow");
    }} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-violet-300/15 bg-surface px-3 py-2.5" aria-label="Abrir CareFlow: exames e monitoramento"><span className="grid size-10 place-items-center rounded-xl bg-violet-300/10 text-violet-300"><Activity size={18}/></span><span className="min-w-0 flex-1"><strong className="flex items-center gap-1 text-xs font-bold">CareFlow</strong><span className="mt-1 block text-[10px] text-ink-muted">{loading?'Carregando registros…':`${orders} pedido(s) · ${plans} plano(s) · exames, pressão e relatórios`}</span></span><ChevronRight size={15} className="text-ink-muted"/></Link>;
}
