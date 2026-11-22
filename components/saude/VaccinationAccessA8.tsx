'use client';
/** Same A8 records, three contextual views; never adds an independent vaccination writer. */
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {CalendarDays,Syringe,ArrowUpRight} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {datePtA8,currentVaccinationEventsA8} from '@/lib/vaccination-a8/types';
import {withReturnTarget} from '@/lib/navigation/return-context';
export function VaccinationAccessA8({context='home'}:{context?:'home'|'today'|'careflow'}) {
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',key=`${uid}:${pid}`;
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope:key,valid:false,courses:[],events:[]};
  const [person,courses,events]=await Promise.all([db.persons.get(pid),db.vaccination_courses_a8.where('[user_id+person_id]').equals([uid,pid]).toArray(),db.vaccination_events_a8.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
  return {scope:key,valid:person?.user_id===uid,courses,events};
 },[uid,pid]);
 if(!data||data.scope!==key||!data.valid)return null;
 const courses=data.courses.filter(c=>!c.deleted_at);
 if(!courses.length)return null;
 const active=new Set(courses.map(c=>c.id));
 const events=currentVaccinationEventsA8(data.events,uid,pid).filter(e=>active.has(e.course_id));
 const planned=events.filter(e=>e.effective_kind==='plan'&&e.planned_on).sort((a,b)=>(a.planned_on||'').localeCompare(b.planned_on||''));
 const doses=events.filter(e=>e.effective_kind==='dose');
 const shown=planned.slice(0,2);
 const origin=context==='home'?'/':context==='today'?'/hoje':'/saude/careflow';
 return <section className="mx-4 my-3 space-y-2 rounded-[20px] border border-teal-300/20 bg-teal-300/[.035] p-3 text-ink-primary" aria-label="Carteira de vacinação declarada">
  <div className="flex items-center gap-2 text-sm font-bold"><Syringe size={18} className="text-teal-300"/>Vacinação <span className="ml-auto text-xs font-normal text-ink-muted">{courses.length} {courses.length===1?'vacina cadastrada':'vacinas cadastradas'}</span></div>
  {shown.map(e=><Link key={e.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface p-2.5 text-xs" href={withReturnTarget(`/saude/vacinas?curso=${encodeURIComponent(e.course_id)}`,origin)}><CalendarDays size={17} className="shrink-0 text-teal-300"/><span className="min-w-0 flex-1 break-words">Data planejada: {datePtA8(e.planned_on)} · {courses.find(c=>c.id===e.course_id)?.vaccine_name||'Vacina'}</span><ArrowUpRight size={16} className="shrink-0"/></Link>)}
  <Link href={withReturnTarget('/saude/vacinas',origin)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-teal-200"><Syringe size={16}/>Abrir carteira · {doses.length} {doses.length===1?'aplicação declarada':'aplicações declaradas'}<ArrowUpRight size={16} className="ml-auto"/></Link>
  <p className="text-[11px] text-ink-muted">Datas e registros informados. Planejamento não comprova aplicação, e ausência de registro não comprova falta de vacina.</p>
 </section>;
}
