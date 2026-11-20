'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Brain, Check, ClipboardList, Copy, ShieldCheck } from 'lucide-react';
import { contextualEpisodeHrefD3, formatReturnBriefD3, type ReturnBriefD3 } from '@/lib/m3/brain-return-d3';

const formatDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : value;

/** Cartão de retorno SEM persistência ou compartilhamento automático. */
export function BrainReturnCardD3({brief}: {brief: ReturnBriefD3}) {
  const [copyState, setCopyState] = useState<'idle'|'copied'|'error'>('idle');
  async function copyByChoice() {
    setCopyState('idle');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(formatReturnBriefD3(brief));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }
  return <section aria-label="Brain 360 — Cartão de Retorno" className="overflow-hidden rounded-[24px] border border-violet-300/20 bg-gradient-to-br from-violet-300/[.055] via-surface to-surface p-4">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-violet-300/25 bg-violet-300/[.08] text-violet-200" aria-hidden="true"><Brain size={22}/></span>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-200">Preparação para o retorno</p>
        <h2 className="mt-0.5 text-base font-extrabold text-ink-primary">Cartão de Retorno Médico</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">Consulta {formatDay(brief.consultationDay)} · fatos vinculados, pontos para conferir e perguntas preparatórias.</p>
      </div>
    </div>
    {brief.action && <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-300/[.045] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200"><Check size={13}/>Próxima melhor ação · opcional</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink-primary">{brief.action.label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{brief.action.explanation}</p>
      <Link href={contextualEpisodeHrefD3(brief.action.href,brief.consultationId)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-violet-300/30 px-3 text-xs font-bold text-violet-200">Revisar registro de origem <ArrowUpRight size={14}/></Link>
      <details className="mt-2"><summary className="min-h-9 cursor-pointer py-2 text-[11px] text-ink-muted">Por que essa sugestão?</summary>
        <p className="pb-2 text-[11px] leading-relaxed text-ink-muted">{brief.actionReason} Essa sugestão não equivale a urgência médica ou obrigação. Você decide se quer registrar alguma mudança real.</p></details>
    </div>}
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-surface-border/70 bg-surface-raised/70 p-3">
        <h3 className="text-xs font-bold text-sky-200">1. Fatos novos documentados</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Registros explícitos deste recorte, com data e origem.</p>
        <div className="mt-3 space-y-3">
          {brief.facts.length===0?<p className="text-[11px] text-ink-muted">Nenhum fato adicional encontrado aqui. Isso não prova ausência.</p>:
            brief.facts.map(f=><article key={f.key} className="border-l-2 border-sky-300/40 pl-2.5">
              <p className="text-[10px] text-ink-muted">{formatDay(f.date)} · {f.source}</p>
              <strong className="mt-0.5 block break-words text-xs text-ink-primary">{f.title}</strong>
              <p className="mt-1 break-words text-[11px] leading-relaxed text-ink-muted">{f.detail}</p>
              {f.href&&<Link href={f.href} className="mt-1 inline-flex min-h-9 items-center gap-1 text-[11px] font-semibold text-sky-200">Abrir fonte <ArrowUpRight size={12}/></Link>}
            </article>)}
        </div>
      </div>
      <div className="rounded-2xl border border-surface-border/70 bg-surface-raised/70 p-3">
        <h3 className="text-xs font-bold text-amber-200">2. Para conferir</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Ausência de registro não significa que a atividade está atrasada.</p>
        <div className="mt-3 space-y-3">{brief.checks.map(c=><div key={c.key} className="border-l-2 border-amber-300/35 pl-2.5">
          <strong className="block break-words text-xs text-ink-primary">{c.title}</strong>
          <p className="mt-1 break-words text-[11px] leading-relaxed text-ink-muted">{c.explanation}</p>
          <Link href={c.href} className="mt-1 inline-flex min-h-9 items-center gap-1 text-[11px] font-semibold text-amber-200">Conferir <ArrowUpRight size={12}/></Link>
        </div>)}</div>
      </div>
      <div className="rounded-2xl border border-surface-border/70 bg-surface-raised/70 p-3">
        <h3 className="text-xs font-bold text-emerald-200">3. Perguntas para o retorno</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Roteiro opcional, não orientação médica automática.</p>
        <ol className="mt-3 space-y-3">{brief.questions.map((q,i)=><li key={`${i}:${q}`} className="flex gap-2 text-[11px] leading-relaxed text-ink-secondary"><span className="font-bold text-emerald-200">{i+1}.</span><span className="min-w-0 break-words">{q}</span></li>)}</ol>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={()=>void copyByChoice()} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/[.08] px-3 text-xs font-bold text-violet-200"><Copy size={15}/>Copiar cartão manualmente</button>
      <Link href={`/saude/consultas/detalhes?id=${encodeURIComponent(brief.consultationId)}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs font-bold text-ink-secondary"><ClipboardList size={15}/>Consulta original</Link>
    </div>
    {copyState==='copied'&&<p role="status" className="mt-2 text-xs text-emerald-200">Cartão copiado por sua escolha. Revise antes de compartilhar.</p>}
    {copyState==='error'&&<p role="status" className="mt-2 text-xs text-amber-200">Não foi possível copiar neste navegador. O cartão continua disponível nesta tela.</p>}
    <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>
      Exibição privada. O VAULT não envia nada automaticamente e não cria dose, diagnóstico, compra, retirada ou resultado. {brief.visibleCount} de {brief.availableCount} fonte(s) elegíveis visíveis{brief.isSummary?', com limite do modo Resumo':', no modo Detalhado'}.</p>
  </section>;
}
