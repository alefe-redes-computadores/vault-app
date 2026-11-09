/** M103 P1: resumo de estado local, não uma certificação clínica, de nuvem ou APK. */
export type VaultReadinessInputM103 = {
  authenticated: boolean;
  hasPerson: boolean;
  online: boolean;
  pending: number | null;
  native: boolean;
};
export type VaultReadinessM103 = {
  status: "account" | "person" | "offline" | "pending" | "review";
  title: string;
  explanation: string;
  priorityHref: "/login" | "/pessoas" | "/recuperacao";
};
export function vaultReadinessM103(input: VaultReadinessInputM103): VaultReadinessM103 {
  const queue = typeof input.pending === "number" && Number.isFinite(input.pending)
    ? Math.max(0, Math.floor(input.pending)) : null;
  if (!input.authenticated) return {
    status: "account", title: "Entre na conta para conferir",
    explanation: "Sem autenticação não é possível atribuir dados locais à sua conta.",
    priorityHref: "/login",
  };
  if (!input.hasPerson) return {
    status: "person", title: "Selecione a pessoa antes de registrar",
    explanation: "Confirme a pessoa ativa para manter registros e documentos no perfil certo.",
    priorityHref: "/pessoas",
  };
  if (!input.online) return {
    status: "offline", title: "Conexão indisponível nesta leitura",
    explanation: queue === null ? "Não foi possível conferir a fila local. Não limpe os dados sem verificar."
      : queue > 0 ? `${queue} operação(ões) locais aguardam revisão ou envio. Não limpe os dados do aparelho.`
      : "A fila local não mostrou pendências; isso não comprova que tudo chegou à nuvem.",
    priorityHref: "/recuperacao",
  };
  if (queue === null) return {
    status: "review", title: "Conferir a fila de sincronização",
    explanation: "A leitura local não foi concluída; o estado da nuvem ainda não foi verificado.",
    priorityHref: "/recuperacao",
  };
  if (queue > 0) return {
    status: "pending", title: `${queue} operação(ões) aguardam sincronização`,
    explanation: "A fila é local e não deve ser apagada antes da confirmação de envio.",
    priorityHref: "/recuperacao",
  };
  return {
    status: "review", title: "Fila local vazia neste momento",
    explanation: input.native ? "Isso não confirma a nuvem nem a versão do APK instalado."
      : "Isso não confirma a nuvem nem que o PWA está atualizado.",
    priorityHref: "/recuperacao",
  };
}
