// components/saude/DailyProgress.tsx
import {
  CheckCircle2,
  HeartPulse,
} from "lucide-react";

export interface DailyProgressProps {
  total: number;
  completed: number;
}

export function DailyProgress({
  total,
  completed,
}: DailyProgressProps) {
  if (total === 0) {
    return null;
  }

  const safeCompleted =
    Math.min(
      Math.max(
        completed,
        0
      ),
      total
    );

  const percentage =
    Math.round(
      (
        safeCompleted /
        total
      ) * 100
    );

  const pending =
    Math.max(
      total -
        safeCompleted,
      0
    );

  const isAllDone =
    pending === 0;

  return (
    <section
      className={`mb-5 overflow-hidden rounded-[22px] border p-4 shadow-sm transition-colors ${
        isAllDone
          ? "border-emerald-400/25 bg-emerald-400/[0.055]"
          : "border-ice/15 bg-gradient-to-br from-ice/[0.07] via-surface to-surface"
      }`}
      aria-label={`Progresso diário: ${safeCompleted} de ${total} doses concluídas`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
              isAllDone
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                : "border-ice/20 bg-ice/10 text-ice"
            }`}
          >
            {isAllDone ? (
              <CheckCircle2
                size={19}
              />
            ) : (
              <HeartPulse
                size={19}
              />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
              Rotina de hoje
            </p>

            <h2 className="mt-0.5 text-sm font-bold text-ink-primary">
              {isAllDone
                ? "Todas as doses concluídas"
                : pending === 1
                  ? "1 dose ainda pendente"
                  : `${pending} doses ainda pendentes`}
            </h2>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <strong
            className={`font-display text-xl leading-none ${
              isAllDone
                ? "text-emerald-400"
                : "text-ice"
            }`}
          >
            {percentage}%
          </strong>

          <p className="mt-1 font-mono text-[9px] text-ink-faint">
            {safeCompleted}/{total}
          </p>
        </div>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised shadow-inner"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={
          safeCompleted
        }
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            isAllDone
              ? "bg-emerald-400"
              : "bg-gradient-to-r from-ice via-cyan-300 to-emerald-400"
          }`}
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[10px]">
        <span className="text-ink-faint">
          {safeCompleted === 0
            ? "Comece pela próxima dose"
            : "Progresso das doses contínuas"}
        </span>

        <span
          className={
            isAllDone
              ? "font-semibold text-emerald-400"
              : "text-ink-muted"
          }
        >
          {safeCompleted} de{" "}
          {total}
        </span>
      </div>
    </section>
  );
}
