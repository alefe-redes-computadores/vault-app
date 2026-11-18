'use client';
import {useMemo} from 'react';
import {BookOpen,CalendarClock,ExternalLink,History,Info,ShieldAlert,ShieldCheck} from 'lucide-react';
import type {Medicamento} from '@/lib/types';
import {auditCatalogSourcesP4C} from '@/lib/medication-catalog/source-governance-p4c';

const dateBr=(s:string|null)=>s?s.split('-').reverse().join('/'):'não informada';
/** Um painel consultivo, sem alterações do catálogo, prescrição ou dados pessoais. */
export function RegulatorySourceTrailP4C({medication,today}:{medication:Medicamento;today:string}){
  const report=useMemo(()=>auditCatalogSourcesP4C(medication.catalog_snapshot,today),[medication.catalog_snapshot,today]);
  return <section aria-label="Histórico e fontes do catálogo" className="space-y-3 pt-3">
    <div className="flex items-start gap-2 rounded-xl border border-surface-border/70 bg-surface p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><History size={17}/></span>
      <div className="min-w-0"><h4 className="text-xs font-bold text-ink-primary">Histórico da referência</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">A versão guardada no aplicativo é uma fotografia do catálogo, não uma certificação de que o registro ou a bula continuam vigentes.</p>
        <p className="mt-2 text-[11px] text-ink-secondary">Produto vinculado: <strong>{report.productName||'não identificado'}</strong></p>
        <p className="mt-1 text-[11px] text-ink-secondary">Correspondência: <strong>{report.identity==='exact_product'?'produto específico referenciado':report.identity==='nonexact_reference'?'referência não exata':'nenhuma referência'}</strong></p>
        <p className="mt-1 text-[11px] text-ink-secondary">Capturado no catálogo: {dateBr(report.capturedAt)}</p>
      </div>
    </div>
    {report.warnings.length>0&&<div className="rounded-xl border border-amber-300/25 bg-amber-300/[.04] p-3"><strong className="flex items-center gap-1.5 text-xs text-amber-200"><ShieldAlert size={15}/>Pontos para conferir</strong>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-ink-secondary">{report.warnings.map((x,i)=><li key={i}>{x}</li>)}</ul>
    </div>}
    <div className="space-y-2"><h4 className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary"><BookOpen size={15}/>Fontes vinculadas ({report.sources.length})</h4>
      {report.sources.length===0?<p className="text-xs text-ink-muted">Ainda não existe fonte rastreável vinculada a esta referência.</p>:report.sources.map(s=><div key={s.key} className="rounded-xl border border-surface-border/70 bg-surface/70 p-3">
        <div className="flex items-start gap-2"><span className="mt-0.5 text-violet-300">{s.state==='documented'?<ShieldCheck size={15}/>:<CalendarClock size={15}/>}</span><div className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{s.title}</strong>
          <p className="mt-1 text-[11px] text-ink-muted">{s.authority}</p><p className="mt-1 text-[11px] text-ink-secondary">Versão: {s.version||'não informada'} · Data cadastrada: {dateBr(s.capturedOn)}</p><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{s.note}</p>
          {s.url&&<a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-sky-300 underline underline-offset-2">Conferir fonte oficial <ExternalLink size={14}/></a>}
        </div></div>
      </div>)}</div>
    {report.rules.length>0&&<div className="space-y-2"><h4 className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary"><CalendarClock size={15}/>Regras registradas ({report.rules.length})</h4>
      {report.rules.map(r=><div key={r.key} className="rounded-xl border border-surface-border/60 p-3 text-[11px] leading-relaxed"><strong className="text-ink-primary">{r.title}</strong><p className="mt-1 text-ink-muted">Período cadastrado: {r.range}</p><p className="mt-1 text-ink-muted">{r.state==='historical'?'Período anterior à data selecionada':r.state==='future'?'Data de início futura':r.state==='unresolved'?'Datas exigem conferência':'Período inclui a data selecionada; condições ainda devem ser avaliadas'}</p>{r.hasConditionalExceptions&&<p className="mt-1 text-amber-200">Há exceções ou condições que precisam ser verificadas na fonte original.</p>}{r.sources.length>0&&<p className="mt-1 text-ink-muted">Fontes: {r.sources.join(' · ')}</p>}</div>)}</div>}
    {report.historicalProducts>0&&<p className="flex items-start gap-1.5 rounded-xl border border-surface-border/60 p-3 text-[11px] text-ink-muted"><History size={15} className="shrink-0"/>A identidade comercial possui {report.historicalProducts} registro(s) histórico(s). Nenhum foi convertido em produto atual.</p>}
    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted"><Info size={14} className="mt-0.5 shrink-0"/>Sem sincronização ou validação regulatória em tempo real neste painel. Para decisões de uso ou prescrição, confira a bula da apresentação e o profissional responsável.</p>
  </section>;
}
