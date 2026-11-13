'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, CalendarClock, FileText, Info, PackageCheck, PackagePlus, ShieldCheck, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useMedicamentos } from '@/hooks/useMedicamentos';
import { useRenovacoes } from '@/hooks/useRenovacoes';
import { useLocalDay } from '@/hooks/useLocalDay';
import { indexMedicationSupplyRoutes } from '@/lib/health-supply/route-authority';
import { buildSupplyShieldMedicationSS7, sortSupplyShieldSS7 } from '@/lib/health-supply/supply-shield-ss7';
import { medicationStockCountHref, medicationRestockHref } from '@/lib/health-intelligence/medication-restock-navigation';

const tone = { review: 'text-rose-200 border-rose-400/25 bg-rose-400/[.055]', d5: 'text-amber-200 border-amber-400/25 bg-amber-400/[.055]', d10:'text-amber-200 border-amber-400/20 bg-amber-400/[.04]', unknown:'text-sky-200 border-sky-400/20 bg-sky-400/[.04]', ok:'text-emerald-200 border-emerald-400/20 bg-emerald-400/[.035]' } as const;
const priorityLabel = { review:'Revisar saldo/unidade', d5:'Revisão de estoque prioritária', d10:'Planejar reposição', unknown:'Previsão insuficiente', ok:'Sem alerta nesta projeção' } as const;

export function SupplyShieldDashboardSS7() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { medicamentos } = useMedicamentos();
  const { renovacoes } = useRenovacoes();
  const today = useLocalDay();
  const graph = useLiveQuery(async () => {
    if (!user?.id || !activePersonId) return null;
    const [processos, itens] = await Promise.all([db.fornecimentos.toArray(), db.fornecimento_itens.toArray()]);
    return {userId:user.id,personId:activePersonId,
      processos:processos.filter(p=>p.user_id===user.id&&p.person_id===activePersonId),
      itens:itens.filter(i=>i.user_id===user.id&&i.person_id===activePersonId)};
  }, [user?.id,activePersonId]);
  const routeIndex = useMemo(() => {
    if (!graph || graph.userId!==user?.id || graph.personId!==activePersonId) return new Map();
    return indexMedicationSupplyRoutes({...graph, ciclos:[], documentos:[]},renovacoes||[],activePersonId||'',user?.id||'');
  },[graph,renovacoes,activePersonId,user?.id]);
  const rows = useMemo(()=>sortSupplyShieldSS7((medicamentos||[]).map(m=>buildSupplyShieldMedicationSS7({medication:m, renewals:renovacoes||[],route:routeIndex.get(m.id||''),userId:user?.id||'',personId:activePersonId||'',todayISO:today})).filter((r):r is NonNullable<typeof r> => Boolean(r))),[medicamentos,renovacoes,routeIndex,user?.id,activePersonId,today]);
  const total = rows.filter(r=>r.priority==='d5'||r.priority==='d10'||r.priority==='review').length;
  return <main className="min-h-[100dvh] bg-void px-3.5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-ink-primary">
    <div className="mx-auto max-w-xl space-y-4">
      <header className="flex items-center gap-3"><Link href="/saude/medicamentos" aria-label="Voltar aos medicamentos" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-emerald-300">VAULT · Supply Shield</p><h1 className="text-xl font-bold">Estoque e receituário</h1></div></header>
      <section className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/[.045] p-4">
        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-200"/><strong className="text-sm">Proteção contra faltas e confusão de unidades</strong></div>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">Projeções usam somente saldo e rotina explicitamente cadastrados. Não comprovam estoque físico, validade de receita ou autorização de dispensação. A confirmação acontece nos formulários próprios.</p>
        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-surface p-3"><p className="text-[11px] text-ink-muted">Medicamentos cadastrados</p><strong className="text-xl tabular-nums">{rows.length}</strong></div><div className="rounded-xl bg-surface p-3"><p className="text-[11px] text-ink-muted">Revisões sugeridas</p><strong className="text-xl tabular-nums">{total}</strong></div></div>
      </section>
      {!user?.id || !activePersonId ? <p role="status" className="rounded-xl border border-surface-border p-3 text-sm text-ink-muted">Selecione sua conta e pessoa ativa para consultar o estoque.</p> : null}
      {user?.id && activePersonId && (!medicamentos || !renovacoes || !graph) ? <p role="status" className="rounded-xl border border-surface-border p-3 text-sm text-ink-muted">Conferindo dados locais e rotas de aquisição…</p> : null}
      {rows.map(row=>{
        const med=medicamentos?.find(m=>m.id===row.medicationId);
        const returnTo=`/saude/supply-shield`;
        return <section key={row.medicationId} className={`rounded-[22px] border p-3 ${tone[row.priority]}`}>
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="text-sm font-bold text-ink-primary underline-offset-4 hover:underline" href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(row.medicationId)}`}>{row.name}</Link><p className="mt-1 text-[11px] font-semibold">{priorityLabel[row.priority]}</p></div><span className="rounded-lg border border-current/10 px-2 py-1 text-[10px] font-medium">{row.routeMode==='hybrid'?'SUS + particular':row.routeMode==='public'?'SUS':row.routeMode==='private'?'Particular':'Origem não vinculada'}</span></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-secondary"><span className="rounded-lg bg-surface px-2 py-1.5">Saldo: {row.stockState==='unknown'?'não informado':`${row.quantity} ${row.unit||'unidade não indicada'}`}</span><span className="rounded-lg bg-surface px-2 py-1.5">Autonomia: {row.projectedDays===null?'não calculável':`~${row.projectedDays} dia(s)`}</span></div>
          {row.priority==='d10'||row.priority==='d5' ? <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed"><CalendarClock size={14} className="mt-0.5 shrink-0"/> {row.priority==='d10'?'Faixa de preparação (D-10). Confira disponibilidade e, se necessário, agende orientação para renovação.':'Faixa prioritária (D-5 ou saldo zero). Confira o estoque real e a documentação antes da próxima retirada.'}</p> : null}
          {row.unitWarning && <p role="note" className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed"><Info size={14} className="mt-0.5 shrink-0"/>{row.unitWarning}</p>}
          <div className="mt-2 rounded-xl bg-surface/70 p-2.5 text-[11px] text-ink-muted"><p><FileText size={13} className="mr-1 inline"/>Documento vinculado ao cadastro: <strong>{row.documentLinked?'sim':'não identificado'}</strong> · exigência de nova receita na última aquisição conhecida: {row.lastAcquisitionDate ? row.requiresNewPrescriptionReported?'informada':'não informada' : 'sem aquisição com data confirmada'}</p><p className="mt-1"><Wallet size={13} className="mr-1 inline"/>Últimos 90 dias documentados: R$ {row.paid90Days.toFixed(2).replace('.',',')} de compras particulares informadas ({row.paidEvents90Days} eventos); {row.publicEvents90Days} retirada(s) SUS/gratuita(s). Isso não representa economia ou cobertura monetária do SUS.</p></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Link href={medicationStockCountHref(row.medicationId,returnTo)} className="flex min-h-11 items-center justify-center rounded-xl border border-surface-border bg-surface px-2 text-center text-xs font-semibold text-ink-primary"><PackageCheck size={14} className="mr-1"/>Informar saldo</Link><Link href={medicationRestockHref(row.medicationId,returnTo)} className="flex min-h-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-2 text-center text-xs font-semibold text-emerald-200"><PackagePlus size={14} className="mr-1"/>Registrar aquisição</Link></div>
          {med && !row.unit && <Link href={`/saude/medicamentos/editar?id=${encodeURIComponent(row.medicationId)}`} className="mt-3 block text-xs font-semibold text-amber-200 underline underline-offset-2">Revisar unidade do estoque no cadastro</Link>}
          {row.routeLabels.length>0 && <p className="mt-2 text-[10px] text-ink-muted">Rotas explícitas: {row.routeLabels.join(' · ')}</p>}
        </section>;
      })}
      {rows.length===0 && medicamentos && renovacoes && graph && <p className="rounded-xl border border-surface-border p-3 text-sm text-ink-muted">Nenhum medicamento desta pessoa encontrado.</p>}
      <details className="rounded-2xl border border-surface-border bg-surface p-3"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold"><FileText size={15}/> Checklist de documentação antes da retirada</summary><div className="space-y-2 pt-2 text-xs leading-relaxed text-ink-muted"><p>Use como conferência, não como declaração de validade ou autorização:</p><p>□ Confirmar com médico/farmacêutico o tipo de receita exigido neste caso.</p><p>□ Conferir documentos e validade conforme regra vigente e exigência local.</p><p>□ Conferir quantidade, apresentação, disponibilidade e necessidade de agendamento.</p><p>□ Se houver Notificação de Receita A ou outra documentação controlada, confirmar o procedimento atualizado com a unidade dispensadora.</p><p>□ Não considerar um arquivo digital automaticamente aceito pela farmácia.</p></div></details>
    </div>
  </main>;
}
