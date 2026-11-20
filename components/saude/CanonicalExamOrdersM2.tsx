'use client';
/** M2 group cards; does not duplicate old exams or CareFlow event rows. */
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, FlaskConical } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { projectExamWorkspaceM2 } from '@/lib/clinical-exams-m2/domain';
export function CanonicalExamOrdersM2(){
  const router=useRouter(),{user}=useAuth(),{activePersonId}=useActivePersonId();
  const uid=user?.id||'',pid=activePersonId||'';
  const rows=useLiveQuery(async()=>{
    if(!uid||!pid)return [];
    const [orders,items,sessions,links]=await Promise.all([
      db.exam_orders.where('person_id').equals(pid).toArray(),
      db.exam_order_items.where('person_id').equals(pid).toArray(),
      db.exam_sessions.where('person_id').equals(pid).toArray(),
      db.exam_session_items.where('person_id').equals(pid).toArray(),
    ]);
    return projectExamWorkspaceM2(orders,items,sessions,links,uid,pid);
  },[uid,pid]);
  if(!rows?.length)return null;
  return <section aria-label="Pedidos canônicos de exames" className="space-y-2">
    <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><FlaskConical size={17} className="text-sky-300"/> Pedidos de exames 360</h2><span className="text-[11px] text-ink-muted">{rows.length} pedidos</span></div>
    {rows.map(row=><button type="button" key={row.order.id} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-sky-300/20 bg-surface p-3 text-left" onClick={()=>router.push(`/saude/exames/pedidos?id=${encodeURIComponent(row.order.id)}`)}>
      <FlaskConical size={19} className="shrink-0 text-sky-300"/><span className="min-w-0 flex-1"><strong className="block break-words text-sm text-ink-primary">{row.order.title}</strong><span className="mt-1 block text-[11px] text-ink-muted">{row.items.length} exames · {row.sessions.length} sessões · {row.pending} pendentes · {row.collected} coletados · {row.resulted} resultados</span></span><ChevronRight size={17} className="shrink-0 text-sky-300"/>
    </button>)}
  </section>;
}
