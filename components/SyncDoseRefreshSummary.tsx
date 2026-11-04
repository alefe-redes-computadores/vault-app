"use client";
import { CheckCircle2, CloudOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useRecentDoseRefreshStatus } from "@/lib/sync/recent-dose-status";

/** Read-only feedback. Never triggers a pull, queue retry, dose write or reconciliation. */
export function SyncDoseRefreshSummary({ userId }: { userId: string | null | undefined }) {
  const status = useRecentDoseRefreshStatus();
  const current = userId && status.userId === userId ? status : null;
  const phase = current?.phase ?? "idle";
  const label = phase === "checking" ? "Conferindo doses recentes" : phase === "error" ? "Conferência não concluída" :
    phase === "complete" ? "Doses recentes conferidas" : "Conferência recente não realizada nesta sessão";
  const DetailIcon = phase === "checking" ? RefreshCw : phase === "error" ? CloudOff : phase === "complete" ? CheckCircle2 : ShieldCheck;
  const details = phase === "complete" && current
    ? `${current.imported} atualização(ões) aplicadas · ${current.unchanged} já idêntica(s) · ${current.protectedLocal} preservada(s) no aparelho`
    : phase === "checking" ? "Comparando a nuvem com o aparelho, sem apagar alterações locais pendentes."
    : phase === "error" ? "O resultado permanece desconhecido. Os registros locais e a fila não são apagados."
    : "Abra a sincronização quando houver conexão. Sem conferência não significa que os aparelhos estão iguais.";
  return <section aria-label="Conferência de doses entre dispositivos" className="mt-3 rounded-[20px] border border-surface-border/60 bg-surface/80 p-3.5">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><DetailIcon size={18} className={phase === "checking" ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true"/></span>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-ink-primary">{label}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{details}</p>
        {phase === "complete" && current ? <p className="mt-1 text-[10px] text-ink-faint">{current.consulted} registro(s) de doses na janela recente · {current.checkedAt ? new Date(current.checkedAt).toLocaleString("pt-BR") : ""}</p> : null}
        <p className="mt-1 text-[9px] leading-relaxed text-ink-faint">Conferência de dados, não confirmação de tomada nem garantia de sincronização completa.</p>
      </div>
    </div>
  </section>;
}
