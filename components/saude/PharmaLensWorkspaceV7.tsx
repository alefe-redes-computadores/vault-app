'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, BookOpen, Check, ClipboardCopy, Factory, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useLocalDay } from '@/hooks/useLocalDay';
import { buildPharmaLensReportV7 } from '@/lib/health-intelligence/pharmalens-v7';
import { buildPharmaLensObservationsV7 } from '@/lib/health-intelligence/pharmalens-observation-v7';
import { makePharmaLensConsultationBriefV7 } from '@/lib/health-intelligence/pharmalens-brief-v7';
import { PharmaLensOverviewV7 } from '@/components/saude/PharmaLensOverviewV7';
import { PharmaLensObservationPanelV7 } from '@/components/saude/PharmaLensObservationPanelV7';

function daysAgo(day: string, n: number) {
  const t = new Date(`${day}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() - n);
  return t.toISOString().slice(0,10);
}

/** The reactive queries are scoped in IndexedDB BEFORE bringing data to React. */
export function PharmaLensWorkspaceV7() {
  const params = useSearchParams();
  const wantedId = params.get('medicamento_id') || '';
  const { user, loading: authLoading } = useAuth();
  const { activePersonId } = useActivePersonId();
  const today = useLocalDay();
  const [filter, setFilter] = useState('');
  const [chosen, setChosen] = useState('');
  const [rangeDays, setRangeDays] = useState<7 | 30>(30);
  const [copied, setCopied] = useState('');
  const scopeKey = `${user?.id || ''}:${activePersonId || ''}`;
  const data = useLiveQuery(async () => {
    if (!user?.id || !activePersonId) return null;
    const uid = user.id;
    const person = activePersonId;
    try {
      const min = daysAgo(today, 29);
      const [medications, acquisitions, doseLogs, healthRecords] = await Promise.all([
        db.medicamentos.where('[user_id+person_id]').equals([uid,person]).toArray(),
        db.renovacoes.where('[user_id+person_id]').equals([uid,person]).toArray(),
        db.doseLogs.where('[user_id+person_id+data]').between([uid,person,min],[uid,person,today],true,true).toArray(),
        db.registros_saude.where('[user_id+person_id+data]').between([uid,person,min],[uid,person,today],true,true).toArray(),
      ]);
      return { scopeKey: `${uid}:${person}`, medications, acquisitions, doseLogs, healthRecords, error: '' };
    } catch (error) {
      return { scopeKey: `${uid}:${person}`, medications: [], acquisitions: [], doseLogs: [], healthRecords: [], error: error instanceof Error ? error.message : 'Falha ao consultar histórico local.' };
    }
  }, [user?.id, activePersonId, today]);
  const snapshot = data?.scopeKey === scopeKey ? data : null;
  const medicines = useMemo(() => (snapshot?.medications || []).filter(m => m.id && m.user_id === user?.id && m.person_id === activePersonId).sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR')), [snapshot, user?.id, activePersonId]);
  const selectedId = [chosen,wantedId].find(id => medicines.some(m=>m.id===id)) || medicines[0]?.id || '';
  const selected = medicines.find(m => m.id === selectedId) || null;
  const report = useMemo(() => selected && user?.id && activePersonId ? buildPharmaLensReportV7({
    userId:user.id, personId:activePersonId, medicationId:selected.id!, acquisitions:snapshot?.acquisitions || [], todayISO:today,
  }) : null, [selected, user?.id, activePersonId, snapshot, today]);
  const observations = useMemo(() => report && selected && user?.id && activePersonId ? buildPharmaLensObservationsV7({
    report, userId:user.id, personId:activePersonId, medicationId:selected.id!, medications:medicines,
    doseLogs:snapshot?.doseLogs || [], healthRecords:snapshot?.healthRecords || [], rangeDays, todayISO:today,
  }) : null, [report, selected, user?.id, activePersonId, medicines, snapshot, rangeDays, today]);
  const brief = useMemo(() => report && observations && selected ? makePharmaLensConsultationBriefV7({ medicationName: selected.nome, report, observations, generatedOn: today }) : '', [report, observations, selected, today]);
  const found = medicines.filter(m => `${m.nome} ${m.dosagem}`.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR'))).slice(0,30);
  async function copyBrief() {
    setCopied('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(brief);
      setCopied('Resumo copiado para a área de transferência deste dispositivo.');
    } catch { setCopied('Cópia automática indisponível. Selecione e copie o texto abaixo.'); }
  }
  return <main className="min-h-[100dvh] bg-void px-3.5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-ink-primary">
    <div className="mx-auto max-w-xl space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/saude/minha-saude" aria-label="Voltar para Minha saúde" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-300">VAULT · PharmaLens V7 · Fênix</p><h1 className="font-display text-2xl font-semibold">PharmaLens</h1><p className="mt-1 text-xs text-ink-muted">Experiência documentada por fabricante</p></div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><Factory size={20}/></span>
      </header>
      {/* BRAIN_V7_UNIVERSAL_MACRO: contextual clinical evidence is separate from manufacturer causality. */}
      <Link href="/saude/brain-v7" className="flex min-h-11 items-center justify-between rounded-xl border border-sky-400/25 bg-sky-400/[.055] px-3 py-2 text-left text-xs font-semibold text-sky-200">
        <span>Brain V7 · estabilidade, histórico e dossiê</span><span aria-hidden="true">›</span>
      </Link>
      {/* V8_VISUAL_STUDIO: display-only bridge from PharmaLens. */}
      <Link href="/saude/visual-studio" className="flex min-h-11 items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-400/[.055] px-3 py-2 text-xs font-semibold text-emerald-200"><span>Visual Studio V8 · formas e quatro eixos</span><span aria-hidden="true">›</span></Link>
      <section className="rounded-2xl border border-violet-400/15 bg-violet-400/[.035] p-3 text-xs leading-relaxed text-ink-muted"><div className="flex items-center gap-2 font-bold text-violet-200"><Sparkles size={15}/>Comparação pessoal, com evidências</div><p className="mt-1">O PharmaLens reúne aquisições, trocas e registros reais. Não determina qual fabricante é mais eficaz nem recomenda substituição ou ajuste de dose.</p></section>
      {authLoading ? <p role="status" className="text-sm text-ink-muted">Restaurando sessão…</p> : !user?.id ? <p role="status" className="text-sm text-ink-muted">Entre na sua conta para consultar dados pessoais.</p> : !activePersonId ? <p role="status" className="text-sm text-ink-muted">Selecione uma pessoa para consultar o histórico.</p> : data === undefined || !snapshot ? <p role="status" className="text-sm text-ink-muted">Lendo apenas os registros autorizados…</p> : snapshot.error ? <p role="alert" className="rounded-xl border border-rose-400/20 p-3 text-xs text-rose-300">Não foi possível carregar PharmaLens: {snapshot.error}</p> : !medicines.length ? <p className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">Ainda não há medicamentos cadastrados para esta pessoa.</p> : <>
        <section className="rounded-2xl border border-surface-border bg-surface/80 p-3">
          <label htmlFor="pl7-med-search" className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><Search size={15} className="text-violet-300"/>Escolher medicamento</label>
          <input id="pl7-med-search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar nome ou dosagem" autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm outline-none focus:border-violet-400"/>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Medicamentos registrados">{found.map(m => <button key={m.id} type="button" onClick={()=>{setChosen(m.id!);setCopied('');}} aria-pressed={selectedId===m.id} className={`min-h-11 shrink-0 rounded-xl border px-3 text-xs font-semibold ${selectedId===m.id ? 'border-violet-300/50 bg-violet-400/10 text-violet-100' : 'border-surface-border bg-surface-raised text-ink-muted'}`}>{m.nome}{m.dosagem ? ` · ${m.dosagem}` : ''}</button>)}</div>
          {!found.length && <p className="mt-2 text-xs text-ink-muted">Nenhum medicamento corresponde à busca.</p>}
          {selected && <Link href={`/saude/medicamentos/detalhes?id=${encodeURIComponent(selected.id!)}`} className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-violet-200 underline underline-offset-2">Abrir detalhes do medicamento</Link>}
        </section>
        {selected && report && observations && <>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface/70 p-3"><span className="text-xs font-semibold text-ink-primary">Janela de evidências</span><div className="flex gap-2" role="group" aria-label="Período">{([7,30] as const).map(n=><button key={n} type="button" aria-pressed={rangeDays===n} onClick={()=>setRangeDays(n)} className={`min-h-11 rounded-xl border px-3 text-xs font-bold ${rangeDays===n?'border-violet-300/50 bg-violet-400/10 text-violet-200':'border-surface-border text-ink-muted'}`}>{n} dias</button>)}</div></div>
          <PharmaLensOverviewV7 report={report}/>
          <PharmaLensObservationPanelV7 report={report} observations={observations} medicationId={selected.id!}/>
          <section className="rounded-[24px] border border-sky-400/15 bg-surface/70 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><BookOpen size={17} className="text-sky-300"/>Resumo pessoal para consulta</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">Documento descritivo para conversar com o profissional. A cópia usa a área de transferência do aparelho; nenhuma informação é enviada pelo PharmaLens.</p>
            <button type="button" onClick={()=>void copyBrief()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 text-xs font-semibold text-sky-200"><ClipboardCopy size={15}/>Copiar resumo para consulta</button>
            {copied && <p role="status" className="mt-2 flex items-center gap-1 text-xs text-sky-200"><Check size={14}/>{copied}</p>}
            <details className="mt-3 rounded-xl border border-surface-border/70 px-3 py-1"><summary className="min-h-11 cursor-pointer py-2 text-xs text-ink-muted">Revisar texto antes de compartilhar</summary><textarea readOnly aria-label="Resumo pessoal PharmaLens" value={brief} rows={12} className="my-2 w-full rounded-lg border border-surface-border bg-surface-raised p-2 font-mono text-[11px] leading-relaxed text-ink-primary"/></details>
          </section>
          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>PharmaLens não faz diagnósticos, não solicita novos medicamentos e não altera dados originais. Cada relato pode ser consultado na aquisição que o originou.</p>
        </>}
      </>}
    </div>
  </main>;
}
