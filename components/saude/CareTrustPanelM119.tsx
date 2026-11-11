"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { ArrowUpRight, Link2, ShieldCheck } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { auditCareLinksM119 } from "@/lib/health-intelligence/trust-spine-m119";

type Props = {
  context: HealthInsightContext | null;
  userId: string;
  personId: string;
  onNavigate: (href: string) => void;
};

export function CareTrustPanelM119({ context, userId, personId, onNavigate }: Props) {
  const [opened, setOpened] = useState(false);
  const audit = useMemo(() => opened ? auditCareLinksM119(context, userId, personId) : null, [opened, context, userId, personId]);
  const reviewCount = audit?.findings.filter(item => item.level === 'review').length ?? 0;
  return (
    <details onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => setOpened(event.currentTarget.open)} className="group rounded-[18px] border border-sky-400/20 bg-sky-400/[0.035] p-3" aria-label="Integridade dos vínculos de cuidado">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
        <ShieldCheck size={17} className="shrink-0 text-sky-300" aria-hidden="true"/>
        <span className="min-w-0 flex-1">Conferir vínculos e evidências<span className="mt-0.5 block text-[10px] font-normal text-ink-muted">Inspeção local, sem alterar registros</span></span>
        {audit?.state === 'ready' && audit.total > 0 && <span className="rounded-full bg-sky-300/10 px-2 py-1 text-[10px] text-sky-200">{audit.total} para consultar</span>}
        <Link2 size={15} className="shrink-0 text-sky-300" aria-hidden="true"/>
      </summary>
      <div className="mt-2 space-y-2 border-t border-surface-border/40 pt-3">
        {!audit || audit.state === 'unavailable' ? (
          <p role="status" className="text-xs text-ink-muted">Carregando dados desta pessoa ou identidade ainda não confirmada. Nenhuma análise cruzada é realizada.</p>
        ) : (
          <>
            <p className="text-[11px] leading-relaxed text-ink-muted">Recorte disponível: {audit.observed.medications} medicamentos, {audit.observed.treatments} tratamentos e {audit.observed.documents} documentos. {reviewCount} referência(s) exigem conferência nos primeiros {audit.findings.length} achados visíveis. Ausência no recorte não comprova exclusão.</p>
            {audit.total === 0 ? <p role="status" className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3 text-xs text-emerald-200">Nenhuma divergência detectada nos vínculos examinados. Isso não certifica completude clínica nem sincronização com o servidor.</p> : (
              <ul className="space-y-2">
                {audit.findings.map(item => <li key={item.key} className="rounded-xl border border-surface-border/50 bg-surface/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold text-ink-primary">{item.title}</p><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{item.detail}</p><span className="mt-1 inline-block text-[10px] text-sky-300">{item.level === 'review' ? 'Conferir referência' : 'Observação, não correção'}</span></div>
                    <button type="button" onClick={() => onNavigate(item.route)} className="grid size-11 shrink-0 place-items-center rounded-lg border border-sky-400/20 text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300" aria-label={`Abrir registro para conferir: ${item.title}`}><ArrowUpRight size={18}/></button>
                  </div>
                </li>)}
              </ul>
            )}
            {audit.truncated && <p className="text-[11px] text-amber-200">Exibidos os primeiros {audit.findings.length} de {audit.total} achados; nenhum foi alterado.</p>}
          </>
        )}
        <p className="text-[10px] leading-relaxed text-ink-faint">Sugestões e referências incompletas nunca geram associação automática. Repare somente pela edição original, após conferir cada registro. Dados de outra conta/pessoa são excluídos da análise.</p>
      </div>
    </details>
  );
}
