// components/saude/DailyProgress.tsx
import { CheckCircle2, Activity } from "lucide-react";

export interface DailyProgressProps {
  total: number;
  completed: number;
}

export function DailyProgress({ total, completed }: DailyProgressProps) {
  // Se não houver medicamentos contínuos para hoje, a barra não ocupa espaço à toa
  if (total === 0) return null; 

  // Previne erros matemáticos e garante limite de 100%
  const percentage = Math.min(Math.round((completed / total) * 100), 100);
  const isAllDone = completed >= total;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAllDone ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Activity size={18} className="text-blue-400" />
          )}
          <h3 className="text-sm font-bold text-ink-primary">Progresso Diário</h3>
        </div>
        <span className="rounded-md bg-surface-raised px-2 py-1 text-[10px] font-bold text-ink-muted">
          {completed} de {total} doses
        </span>
      </div>
      
      {/* Container da Barra */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        {/* Barra Preenchida com animação suave */}
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            isAllDone ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {isAllDone && (
        <p className="mt-2 text-[10px] font-semibold text-emerald-500/80">
          Todas as doses contínuas de hoje foram concluídas!
        </p>
      )}
    </div>
  );
}
