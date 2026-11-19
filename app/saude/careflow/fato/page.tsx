'use client';
/** R1: leitura de uma evidência clínica pelo seu ID canônico; sem escrita ou inferência. */
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, CalendarClock, CircleAlert, HeartPulse, Pill, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { PageTransition } from '@/components/PageTransition';

function brDate(v: string | undefined | null) {
  if (!v) return 'Data não informada';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`;
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? 'Data não reconhecida' : new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(parsed);
}
const safe = (v: unknown, max=180) => typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max) : '';
const displayed = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? String(v).replace('.',',') : '';

function CareFlowFactContent(){
  const params=useSearchParams(); const type=params.get('tipo'); const id=params.get('id')||'';
  const {user}=useAuth(); const {activePersonId}=useActivePersonId();
  const uid=user?.id||'',pid=activePersonId||'';
  const valid=useMemo(()=>Boolean(uid&&pid&&id.length>0&&id.length<=180&&(type==='dose'||type==='registro')),[uid,pid,id,type]);
  const fact=useLiveQuery(async()=>{
    if(!valid)return null;
    if(type==='dose'){
      const d=await db.doseLogs.get(id);
      if(!d||d.user_id!==uid||d.person_id!==pid)return {missing:true} as const;
      const m=d.medicamento_id?await db.medicamentos.get(d.medicamento_id):null;
      const ownMed=m&&m.user_id===uid&&m.person_id===pid?m:null;
      const status=d.tomado_em?'Tomada registrada':d.ignorado_em?'Dose ignorada registrada':'Dose documentada sem confirmação de tomada';
      return {missing:false as const,kind:'dose' as const,title:ownMed?`${safe(ownMed.nome,90)}${safe(ownMed.dosagem,60)?' · '+safe(ownMed.dosagem,60):''}`:'Medicamento não identificado no cadastro atual',date:brDate(d.data),time:safe(d.horario,12)||'Horário não informado',occurred:brDate(d.tomado_em||d.ignorado_em||null),status,detail:'Registro factual preservado. A ausência de confirmação não demonstra tomada nem esquecimento.',source:'Diário de doses da pessoa ativa'};
    }
    const r=await db.registros_saude.get(id);
    if(!r||r.user_id!==uid||r.person_id!==pid)return {missing:true} as const;
    const value=displayed(r.valor_numerico)||safe(r.valor_medicao,70);
    return {missing:false as const,kind:'registro' as const,title:safe(r.nome,100)||safe(r.tipo,90)||'Registro de saúde',date:brDate(r.data),time:safe(r.horario,12)||'Horário não informado',occurred:'',status:'Registro documentado',detail:[value?`Valor informado: ${value}${safe(r.unidade_medida,30)?' '+safe(r.unidade_medida,30):''}`:'Valor numérico não informado',safe(r.observacoes,500)].filter(Boolean).join(' · '),source:r.source==='health_connect'?'Health Connect / dispositivo conectado':'Registro da pessoa ativa'};
  },[uid,pid,id,type,valid]);
  const unavailable=!valid||fact?.missing;
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-2xl space-y-4">
    <header className="flex items-start gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow/linha-do-tempo" aria-label="Voltar à evolução clínica" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"/><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">Evidência clínica · leitura</p><h1 className="mt-1 text-xl font-bold">Registro de origem</h1><p className="text-xs text-ink-muted">Localize o fato exato, sem mudar informações clínicas.</p></div></header>
    {!fact&&valid?<p role="status" className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-ink-muted">Localizando o registro da pessoa ativa…</p>:unavailable?<section role="status" className="rounded-2xl border border-amber-400/25 bg-surface p-4"><CircleAlert size={20} className="text-amber-300"/><h2 className="mt-2 text-sm font-bold">Registro não disponível neste perfil</h2><p className="mt-2 text-xs leading-relaxed text-ink-muted">Ele pode não estar neste aparelho, ter sido removido ou pertencer a outra pessoa. Nenhuma informação de outra conta é mostrada.</p></section>:fact&&!fact.missing?<article className="rounded-[24px] border border-violet-300/25 bg-surface p-4"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-400/10 text-violet-300">{fact.kind==='dose'?<Pill size={21}/>:<HeartPulse size={21}/>}</span><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{fact.title}</h2><p className="mt-1 text-xs text-ink-secondary">{fact.status}</p></div></div><div className="mt-4 space-y-3 border-t border-surface-border pt-4 text-sm"><p className="flex items-center gap-2"><CalendarClock size={16} className="text-sky-300"/>{fact.date} · {fact.time}</p>{fact.kind==='dose'&&<p className="text-xs text-ink-muted">Confirmação registrada em: {fact.occurred}</p>}<p className="break-words text-xs leading-relaxed text-ink-secondary">{fact.detail}</p><p className="flex items-start gap-2 text-xs text-ink-muted"><Activity size={15} className="shrink-0 text-violet-300"/>{fact.source}</p></div></article>:null}
    <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={16} className="shrink-0 text-emerald-300"/>Este detalhe é somente leitura e utiliza o ID do evento sob a conta e pessoa ativas. Não modifica doses, estoque ou prontuário.</p>
  </div></main></PageTransition>;
}

/** Suspense evita bloqueio CSR bail-out do Next 14 na exportação PWA/APK. */
export default function CareFlowFactPage(){
  return <Suspense fallback={<main className="min-h-screen bg-void px-4 pt-5 text-ink-muted">Localizando registro clínico…</main>}><CareFlowFactContent/></Suspense>;
}
