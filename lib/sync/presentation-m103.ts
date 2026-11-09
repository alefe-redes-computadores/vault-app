/** M103 P3 — authority for sync presentation; never triggers a data mutation. */
import type { VaultSyncPhase } from "./runtime-status";

export type RecoveryPresentationM103 = Readonly<{
  tone: "confirmed" | "working" | "waiting" | "issue";
  title: string;
  detail: string;
}>;

/** An empty queue proves only that no local upload is pending, not cloud parity. */
export function describeRecoveryStatusM103(input: {
  online: boolean;
  phase: VaultSyncPhase;
  pending: number;
  failed: number;
  pullFailures: number;
}): RecoveryPresentationM103 {
  const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  const failed = nonNegative(input.failed), pending = nonNegative(input.pending), pullFailures = nonNegative(input.pullFailures);
  if (failed > 0 || pullFailures > 0 || input.phase === "error") {
    return {tone:"issue",title:"Sincronização precisa de revisão",detail: failed ? `${failed} envio(s) chegaram ao limite de tentativas. Os registros locais foram preservados.` : pullFailures ? `${pullFailures} leitura(s) da nuvem não foram concluídas.` : "A última operação terminou com erro. Consulte os detalhes antes de tentar novamente."};
  }
  if (!input.online) {
    return {tone:"waiting",title:"Trabalhando offline",detail:"Os dados já disponíveis neste aparelho podem continuar acessíveis. A nuvem não foi conferida agora."};
  }
  if (input.phase === "pulling" || input.phase === "background" || input.phase === "pushing") {
    return {tone:"working",title:"Conferência em andamento",detail:"O resultado ainda não está confirmado. Não feche o aplicativo durante uma operação importante."};
  }
  if (pending > 0) {
    return {tone:"waiting",title:"Envios aguardando",detail:`${pending} item(ns) permanecem na fila local. A sincronização ainda não foi concluída.`};
  }
  if (input.phase === "synced") {
    return {tone:"confirmed",title:"Sincronização concluída",detail:"A última conferência terminou sem pendências conhecidas. Isso não comprova entrega de notificações Android."};
  }
  return {tone:"waiting",title:"Aguardando conferência",detail:"Nenhum envio pendente não significa que a nuvem foi conferida nesta sessão."};
}
