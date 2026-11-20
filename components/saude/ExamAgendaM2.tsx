'use client';
/** Shared facts-only projection for Home and Hoje; one confirmed session = one card. */
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarCheck, FlaskConical, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { displayCivilM2, projectExamWorkspaceM2 } from '@/lib/clinical-exams-m2/domain';

const localKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function ExamAgendaM2({day,compact=false}:{day?:string;compact?:boolean}){
  const router=useRouter(),{user}=useAuth(),{activePersonId}=useActivePersonId();
  const uid=user?.id||'',pid=activePersonId||'';
  const source=useLiveQuery(async()=>{
    if(!uid||!pid)return [];
    const [orders,items,sessions,links]=await Promise.all([
      db.exam_orders.where('person_id').equals(pid).toArray(),
      db.exam_order_items.where('person_id').equals(pid).toArray(),
      db.exam_sessions.where('person_id').equals(pid).toArray(),
      db.exam_session_items.where('person_id').equals(pid).toArray(),
    ]);
    return projectExamWorkspaceM2(orders,items,sessions,links,uid,pid);
  },[uid,pid]);
  const matches=useMemo(()=>{
    const today=Date.now();
    return (source||[]).flatMap(row=>row.sessions.map(({session,links})=>({order:row.order,session,links})))
      .filter(x=>x.session.status==='scheduled'&&!x.session.deleted_at&&x.links.some(l=>l.status==='scheduled'&&!l.deleted_at))
      .filter(x=>{
        const d=new Date(x.session.scheduled_at);if(!Number.isFinite(d.getTime()))return false;
        return day?localKey(d)===day:d.getTime()>=today-60_000;
      }).sort((a,b)=>a.session.scheduled_at.localeCompare(b.session.scheduled_at))
      .slice(0,compact?3:6);
  },[source,day,compact]);
  if(!matches.length)return null;
  return <section aria-label="Exames agendados confirmados" className="rounded-2xl border border-sky-300/20 bg-sky-300/[.045] p-3">
    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-primary"><FlaskConical size={16} className="text-sky-300"/> Exames com agendamento confirmado</h2>
    <div className="space-y-2">{matches.map(({order,session,links})=><button key={session.id} type="button"
      onClick={()=>router.push(`/saude/exames/pedidos?id=${encodeURIComponent(order.id)}&sessao=${encodeURIComponent(session.id)}`)}
      className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-surface-border/50 bg-surface p-2.5 text-left">
        <CalendarCheck size={16} className="shrink-0 text-sky-300"/><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{session.laboratory_name||order.title}</strong>
          <span className="block text-[11px] text-ink-muted">{displayCivilM2(session.scheduled_at)} · {links.filter(l=>l.status==='scheduled').length} exames agendados</span></span><ChevronRight size={15} className="shrink-0 text-sky-300"/>
      </button>)}</div>
  </section>;
}
