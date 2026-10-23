import Link from 'next/link';
import { MOOD_CHOICES, readMoodContext, type AvatarBodyContext } from '@/lib/health-profile/avatar-body';

const formatDate = (value: string) => value.split('-').reverse().join('/');

export function AvatarMoodEvidence({ context }: { context: AvatarBodyContext }) {
  const { moods, moodEvidence: evidence } = context;
  // V224: only actual reported days count toward facial expression evidence.
  const coverageDays = Math.max(0, Math.min(7, evidence.days));
  const coveragePercent = Math.round((coverageDays / 7) * 100);
  const title = evidence.reason === 'positive' ? 'Rosto feliz' : evidence.reason === 'negative' ? 'Rosto reflexivo' : 'Expressão neutra';
  const explanation = evidence.reason === 'positive'
    ? `${evidence.positive} de ${evidence.days} dias com humor Bem ou Muito bem.`
    : evidence.reason === 'negative'
    ? `${evidence.negative} de ${evidence.days} dias com humor Triste ou Muito triste.`
    : evidence.reason === 'insufficient'
    ? `Há ${evidence.days} de pelo menos 3 dias necessários com humor declarado.`
    : 'Os relatos não mostram predominância de bem-estar ou tristeza suficiente para mudar o rosto.';

  return <div className="mt-3 space-y-3">
    <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-3">
      <h3 className="text-sm font-semibold text-violet-200">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-primary">{explanation}</p>
      <p className="mt-2 text-[11px] text-ink-muted">{evidence.days} de 7 dias com relato{evidence.from ? ` · ${formatDate(evidence.from)} a ${formatDate(evidence.to)}` : ''}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label="Cobertura de humor declarado nos últimos sete dias" aria-valuemin={0} aria-valuemax={7} aria-valuenow={coverageDays}>
        <div className="h-full rounded-full bg-violet-400" style={{width:`${coveragePercent}%`}}/>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Dias sem registro continuam desconhecidos — não são interpretados como humor neutro. O rosto não substitui o diário nem descreve seu estado atual.</p>
    </div>
    {moods.length ? <>
      <p className="text-xs leading-relaxed text-ink-muted">Último relato: {MOOD_CHOICES[readMoodContext(moods[0].contexto)!]} em {formatDate(moods[0].data)}. A expressão resume seus relatos; não mede como você está agora.</p>
      <ul className="space-y-2" aria-label="Humores usados na expressão">
        {moods.map(record => <li key={record.id || record.data}>
          <Link className="block min-h-11 rounded-xl border border-surface-border p-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" href={record.id ? `/saude/registros/detalhes?id=${encodeURIComponent(record.id)}` : '/saude/registros'}>
            {formatDate(record.data)} · {MOOD_CHOICES[readMoodContext(record.contexto)!]} ›
          </Link>
        </li>)}
      </ul>
    </> : <p className="text-xs text-ink-muted">Ainda não há humor declarado nesse formato. A expressão permanece neutra.</p>}
    <details className="rounded-xl border border-surface-border p-3">
      <summary className="min-h-11 cursor-pointer content-center text-xs text-ink-muted">Como esse rosto foi escolhido</summary>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">O resumo da rotina cruza registros datados de sono, caminhada, humor e doses em uma seção separada. A expressão do Avatar continua dependendo exclusivamente dos seus relatos de humor. Não há medição automática de emoção.</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">Usamos o último humor explicitamente informado em cada dia, nos últimos 7 dias. São necessários ao menos 3 dias e predominância de dois terços. Dias sem relato não contam como neutros. Diagnósticos, remédios e a intensidade não escolhem a expressão. Humor informado não elimina outros alertas.</p>
    </details>
    <div className="grid grid-cols-2 gap-2">
      <Link className="flex min-h-11 items-center justify-center rounded-xl bg-violet-400/10 px-2 text-center text-[11px] font-semibold text-violet-300" href="/saude/registros/novo?preset=humor">Registrar humor ›</Link>
      <Link className="flex min-h-11 items-center justify-center rounded-xl border border-surface-border px-2 text-center text-[11px] font-semibold text-ink-primary" href="/saude/registros/relatorio">Resumo para consulta ›</Link>
    </div>
  </div>;
}
