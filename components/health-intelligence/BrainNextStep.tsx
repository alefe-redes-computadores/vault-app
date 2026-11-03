import { ArrowUpRight, CalendarClock, ClipboardList, ShieldCheck } from "lucide-react";
import type { BrainCarePlanItem } from "@/lib/health-intelligence/care-plan";

const evidenceLabels = {
  recorded: "Registro",
  projected: "Projeção",
  association: "Associação",
  missing_data: "Dados incompletos",
} satisfies Record<BrainCarePlanItem["evidenceKind"], string>;

const confidenceLabels = { high: "alta", moderate: "moderada", limited: "limitada" };

export function BrainNextStep({ decision, onOpen }: {
  decision: BrainCarePlanItem;
  onOpen: (href: string) => void;
}) {
  const urgent = decision.lane === "now";
  const Icon = urgent ? ClipboardList : CalendarClock;
  const date = decision.dueDate?.slice(0, 10).split("-").reverse().join("/");

  return (
    <section aria-labelledby="brain-next-step" className="mb-3 rounded-[20px] border border-violet-400/20 bg-gradient-to-br from-violet-400/[0.08] to-surface p-3.5">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${urgent ? "bg-rose-400/10 text-rose-300" : "bg-violet-400/10 text-violet-200"}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="brain-next-step" className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Próximo passo</h2>
          <p className="mt-1 break-words text-sm font-semibold text-ink-primary">{decision.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{decision.reason}</p>
          {date || decision.supplyRoute ? (
            <p className="mt-1 text-xs text-ink-muted">{[date, decision.supplyRoute].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onOpen(decision.href)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 text-xs font-semibold text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
          Abrir próxima etapa <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        <details className="min-w-0 basis-full">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 text-xs text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
            <ShieldCheck size={15} aria-hidden="true" /> Ver base e confiança
          </summary>
          <div className="space-y-2 border-t border-surface-border/60 pt-2 text-xs text-ink-muted">
            <p>{evidenceLabels[decision.evidenceKind]} · confiança {confidenceLabels[decision.confidence]}</p>
            {decision.evidence.length ? (
              <ul className="list-disc space-y-1 pl-4">
                {decision.evidence.map((entry, index) => <li key={index}>{entry}</li>)}
              </ul>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}
