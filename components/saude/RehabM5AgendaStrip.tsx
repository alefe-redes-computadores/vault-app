'use client';
import Link from 'next/link';
import { Activity, ArrowUpRight, CalendarClock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { getLocalTodayISO } from '@/lib/health-utils';
import { rehabDueSessionsM5 } from '@/lib/rehab-m5/projection';
export function RehabM5AgendaStrip(){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();
 const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope,programs:[],sessions:[],personValid:false};
  const [person,programs,sessions]=await Promise.all([db.persons.get(pid),db.rehab_programs_m5.where('user_id').equals(uid).toArray(),db.rehab_sessions_m5.where('user_id').equals(uid).toArray()]);
  return {scope,personValid:person?.user_id===uid,programs,sessions};
 },[uid,pid]);
 if(!data||data.scope!==scope||!data.personValid)return null;
 const sessions=rehabDueSessionsM5({userId:uid,personId:pid,programs:data.programs,sessions:data.sessions,today:getLocalTodayISO()}).slice(0,3);
 if(!sessions.length)return null;
 return <section aria-label="Sessões de reabilitação de hoje" className="mx-4 my-3 rounded-[20px] border border-teal-300/20 bg-teal-300/[.045] p-3.5 text-ink-primary">
  <div className="flex items-center gap-2 text-sm font-bold"><Activity size={18} className="text-teal-300"/> Reabilitação · hoje</div>
  {sessions.map(s=><Link key={s.id} href={`/saude/reabilitacao/detalhes?id=${encodeURIComponent(s.program_id)}`}
   className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised/60 p-2.5 text-left">
   <CalendarClock size={17} className="shrink-0 text-teal-300"/><span className="min-w-0 flex-1 text-xs">
   {new Date(s.scheduled_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {data.programs.find(p=>p.id===s.program_id)?.title||'Sessão agendada'}</span>
   <ArrowUpRight size={16} className="shrink-0 text-teal-300"/></Link>)}
 </section>;
}
