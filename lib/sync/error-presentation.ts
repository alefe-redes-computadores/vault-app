export type SyncErrorPresentation = {
  title: string;
  explanation: string;
  technical: string;
  permanent: boolean;
};

export function presentSyncError(raw: unknown): SyncErrorPresentation {
  const technical = String(raw || "O servidor não informou o motivo da falha.").trim();
  const normalized = technical.toLowerCase();
  if (normalized.includes("schema cache") && normalized.includes("is_sus")) return {
    title: "Cadastro de farmácia aguarda atualização da nuvem",
    explanation: "O registro continua protegido neste aparelho. Atualize o contrato da nuvem e tente novamente; não recrie a farmácia.",
    technical,
    permanent: true,
  };
  if (normalized.includes("foreign key constraint") && normalized.includes("farmacia")) return {
    title: "Medicamento aguarda a farmácia relacionada",
    explanation: "A farmácia precisa chegar à nuvem primeiro. O medicamento ficou na fila e não deve ser cadastrado novamente.",
    technical,
    permanent: false,
  };
  if (normalized.includes("row-level security") || normalized.includes("permission denied")) return {
    title: "A conta não autorizou este envio",
    explanation: "Confira a sessão e a propriedade do registro. O conteúdo local não foi descartado.",
    technical,
    permanent: true,
  };
  return {
    title: "Envio não concluído",
    explanation: "O registro permanece no aparelho e pode ser reenviado após a causa ser revisada.",
    technical,
    permanent: false,
  };
}
