'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {ArrowLeft,Activity,Brain,CalendarClock,FileCheck2,ShieldCheck,ChevronRight} from 'lucide-react';
import {PageTransition} from '@/components/PageTransition';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {buildBrainFactsP2} from '@/lib/m3/brain-facts-p2';

const dayText=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)?day.split('-').reverse().join('/'):day;
function dateMinus(days:number){const now=new Date();now.setHours(12,0,0,0);now.setDate(now.getDate()-Math.max(0,days-1));return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export default function BrainLongitudinalP2(){
  const {user}=useAuth(),{activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'';
  const [days,setDays]=useState<7|30|90>(30);
  const result=useLiveQuery(async()=>{
    if(!uid||!pid)return {uid,pid,facts:[]};
    const [consultas,cirurgias,exames,doses,registros,careflow]=await Promise.all([
      db.consultas.where('user_id').equals(uid).toArray(),db.cirurgias.where('user_id').equals(uid).toArray(),
      db.exames.where('user_id').equals(uid).toArray(),db.doseLogs.where('user_id').equals(uid).toArray(),
      db.registros_saude.where('user_id').equals(uid).toArray(),db.careflow_events_m2.where('user_id').equals(uid).toArray()]);
    return {uid,pid,facts:buildBrainFactsP2({userId:uid,personId:pid,consultas,cirurgias,exames,doses,registros,careflow},250)};
  },[uid,pid]);
  const facts=result?.uid===uid&&result?.pid===pid?result.facts:[];
  const filtered=useMemo(()=>facts.filter(f=>f.date>=dateMinus(days)),[facts,days]);
  const last7=facts.filter(f=>f.date>=dateMinus(7));
  const last30=facts.filter(f=>f.date>=dateMinus(30));
  const measurements=filtered.filter(f=>f.kind==='medicao').length;
  const consultations=filtered.filter(f=>f.kind==='consulta').length;
  const taken=filtered.filter(f=>f.kind==='dose_tomada').length;
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-2xl space-y-4">
    <header className="flex items-start gap-3"><Link href="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">VAULT · M3 P2</p><h1 className="text-xl font-bold">Brain longitudinal</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Uma linha do tempo de fatos registrados. Sem inferir diagnósticos, causalidade ou adesão pela ausência de registro.</p></div></header>
    <section className="rounded-[24px] border border-emerald-300/20 bg-surface p-4" aria-label="Cobertura e fatos"><div className="flex items-center gap-2 text-xs font-semibold"><Brain size={18} className="text-emerald-300"/> Sua história documentada</div>
      <div className="mt-3 grid grid-cols-3 gap-2">{[{label:'Consultas',value:consultations},{label:'Medições',value:measurements},{label:'Doses marcadas',value:taken}].map(x=><div key={x.label} className="rounded-xl bg-void/40 p-2.5"><strong className="block text-lg tabular-nums">{x.value}</strong><span className="text-[10px] text-ink-muted">{x.label}</span></div>)}</div>
      <p className="mt-3 flex gap-2 text-[11px] text-ink-muted"><ShieldCheck size={14} className="shrink-0 text-emerald-300"/> A contagem reflete apenas os registros disponíveis no aparelho e nesta pessoa; ausência de dado não significa resultado normal ou dose esquecida.</p>
    </section>
    <section className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold">Eventos e evidências</h2><div className="flex rounded-xl border border-surface-border bg-surface p-1">{([7,30,90] as const).map(n=><button key={n} type="button" onClick={()=>setDays(n)} aria-pressed={days===n} className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${days===n?'bg-emerald-300/10 text-emerald-200':'text-ink-muted'}`}>{n} dias</button>)}</div></section>
    <div className="rounded-2xl border border-surface-border bg-surface p-3 text-[11px] text-ink-muted"><div className="flex gap-2"><Activity size={15} className="shrink-0 text-sky-300"/><p>Janela de 7 dias: <strong className="text-ink-primary">{last7.length}</strong> fatos disponíveis. Janela de 30 dias: <strong className="text-ink-primary">{last30.length}</strong>. Comparação de cobertura, não interpretação clínica de melhora ou piora.</p></div></div>
    <section aria-label="Linha do tempo por pessoa" className="space-y-2">{!uid||!pid?<p className="rounded-2xl border border-surface-border p-5 text-xs text-amber-200">Entre na sua conta e selecione uma pessoa.</p>:!filtered.length?<p className="rounded-2xl border border-dashed border-surface-border p-6 text-xs text-ink-muted">Não há fatos registrados nesta janela. Experimente ampliar o período; nenhum dado foi fabricado.</p>:filtered.map(item=><Link href={item.href} key={item.key} className="flex min-h-[86px] items-start gap-3 rounded-2xl border border-surface-border/70 bg-surface p-3 active:bg-surface-raised"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-void/40"><FileCheck2 size={16} className="text-sky-300"/></span><span className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{item.title}</strong><span className="mt-1 block text-[11px] text-ink-muted">{dayText(item.date)} · {item.provenance}</span><span className="mt-1 block break-words text-[10px] leading-relaxed text-ink-faint">{item.detail}</span></span><ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint"/></Link>)}</section>
    <p className="flex items-start gap-2 px-2 text-[10px] leading-relaxed text-ink-faint"><CalendarClock size={14} className="shrink-0"/> Este Brain reúne fontes registradas e links de volta aos seus cadastros. Não substitui avaliação profissional; não cria decisões, receitas, exames ou movimentações de estoque.</p>
  </div></main></PageTransition>;
}
