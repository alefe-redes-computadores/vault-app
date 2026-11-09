"use client";
import { ClipboardCheck, ChevronRight, WifiOff, ShieldAlert } from "lucide-react";
import { vaultReadinessM103 } from "@/lib/quality/operational-readiness-m103";

/** Navegação deliberada; nenhuma requisição nem consulta adicional é disparada. */
export function OperationalReadinessM103({ authenticated, hasPerson, online, pending, native, onNavigate }: {
  authenticated: boolean; hasPerson: boolean; online: boolean; pending: number | null;
  native: boolean; onNavigate: (href: string) => void;
}) {
  const state = vaultReadinessM103({ authenticated, hasPerson, online, pending, native });
  return <details className="group rounded-[22px] border border-surface-border/70 bg-surface/70" aria-label="Conferência de uso e recuperação">
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-3.5 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ice/10 text-ice">{state.status === "offline" ? <WifiOff size={18} aria-hidden="true"/> : state.status === "pending" ? <ShieldAlert size={18} aria-hidden="true"/> : <ClipboardCheck size={18} aria-hidden="true"/>}</span>
      <span className="min-w-0 flex-1"><strong className="block text-sm text-ink-primary">Prontidão e recuperação</strong><span className="mt-0.5 block text-xs text-ink-muted">{state.title}</span></span>
      <ChevronRight size={17} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform group-open:rotate-90 motion-reduce:transition-none"/>
    </summary>
    <div className="space-y-3 border-t border-surface-border/50 px-3.5 pb-4 pt-3">
      <p className="text-xs leading-relaxed text-ink-secondary">{state.explanation}</p>
      <p className="text-[11px] leading-relaxed text-ink-muted">Antes de trocar de aparelho, limpar dados ou reinstalar: confira a fila, faça uma cópia e verifique o arquivo. Um backup JSON pode conter senhas e dados médicos e não é criptografado automaticamente.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => onNavigate(state.priorityHref)} className="min-h-11 rounded-xl border border-ice/30 bg-ice/10 px-3 text-left text-xs font-semibold text-ice">{state.status === "account" ? "Entrar na conta" : state.status === "person" ? "Escolher pessoa" : "Conferir recuperação"}</button>
        <button type="button" onClick={() => onNavigate("/saude/plano-seguranca")} className="min-h-11 rounded-xl border border-surface-border px-3 text-left text-xs font-medium text-ink-secondary">Meu plano de segurança</button>
        <button type="button" onClick={() => onNavigate("/saude/registros/relatorio")} className="min-h-11 rounded-xl border border-surface-border px-3 text-left text-xs font-medium text-ink-secondary">Relatórios clínicos</button>
        <button type="button" onClick={() => onNavigate("/ajuda")} className="min-h-11 rounded-xl border border-surface-border px-3 text-left text-xs font-medium text-ink-secondary">Ajuda e limites do app</button>
      </div>
      <p className="text-[10px] leading-relaxed text-ink-muted">Esse resumo não verifica permissões do Android, notificações, servidor ou dados clínicos. O funcionamento do APK exige teste no aparelho.</p>
    </div>
  </details>;
}
