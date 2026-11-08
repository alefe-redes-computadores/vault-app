/**
 * VAULT M97 — local, bundled capability history. An entry is shipped only in
 * source code of a completed surgery; never inferred from GitHub run/APK status.
 * A compiled PWA and an installed Android APK may therefore list different sets.
 */
export type VaultCapability = {
  id: string;
  surgery: `M${number}`;
  domain: "brain" | "medications" | "reports" | "updates";
  title: string;
  changed: string;
  canDo: string;
  evidence: string;
  limits: string;
  example: string;
  location: string;
  status: "included_in_this_build";
};

export const VAULT_CAPABILITIES: readonly VaultCapability[] = [
  {
    id:"m97-care-correlation",surgery:"M97",domain:"brain",title:"Relações temporais entre registros",
    changed:"Organiza em conjunto acontecimentos de continuidade do cuidado, sintomas vinculados e mudanças na frequência registrada de SOS/extra.",
    canDo:"Apresentar os registros que coincidiram numa janela de 14 dias quando existem vínculos explícitos entre medicamentos e tratamentos.",
    evidence:"Doses marcadas como ignoradas ou retirada não realizada; sintomas declarados e vinculados; tomadas SOS/extra registradas.",
    limits:"Não identifica a causa clínica, não comprova abstinência e não recomenda alterar a medicação. A análise é somente leitura.",
    example:"Duas doses ignoradas, dois relatos de sintomas relacionados e aumento dos registros SOS/extra aparecem juntos para conferência.",
    location:"Inteligência → Central de Inteligência",status:"included_in_this_build",
  },
  {
    id:"m96-episodes",surgery:"M96",domain:"brain",title:"Episódios de cuidado por evidências",
    changed:"Alertas persistidos sobre medicamentos relacionados podem ser consultados em conjunto.",
    canDo:"Reunir sinais com identificadores compatíveis numa janela temporal e abrir os alertas individuais.",
    evidence:"Snapshots já persistidos do Brain V5 e vínculos com doses verificados pela M95.",
    limits:"Agrupamento não diagnostica, não modifica a urgência e não esconde alertas independentes.",
    example:"Um aviso de quantidade fora do padrão e um sinal relacionado podem compartilhar a mesma visualização.",
    location:"Inteligência → Central de Inteligência",status:"included_in_this_build",
  },
  {
    id:"m95-history",surgery:"M95",domain:"reports",title:"Histórico clínico e PDF mensal",
    changed:"Alertas de quantidade realmente preservados acompanham doses no histórico; relatório mensal exportável.",
    canDo:"Exportar doses, motivos e horários registrados, além de episódios e insights previamente armazenados.",
    evidence:"DoseLog original, registros de saúde e ledger persistido do Brain V5.",
    limits:"Não gera alertas retroativos que não foram registrados e não transforma referência de cadastro em dose recomendada.",
    example:"Um registro de quantidade atípica salvo pode aparecer no PDF de seu mês.",
    location:"Saúde → Linha de Cuidado",status:"included_in_this_build",
  },
  {
    id:"m94-updates",surgery:"M94",domain:"updates",title:"Notificações e atualizações organizadas",
    changed:"Central de avisos separada por categorias; atualização Android distingue compilação e APK certificado.",
    canDo:"Revisar preferências de notificações e identificar o estado conhecido de uma release Android.",
    evidence:"Preferências configuradas e metadados oficiais das releases quando disponíveis.",
    limits:"Uma Action em execução não significa APK pronto, e avisos do sistema dependem de permissões Android.",
    example:"A compilação pode estar em andamento enquanto o APK certificado anterior continua disponível.",
    location:"Mais → Atualizações",status:"included_in_this_build",
  },
];

export function listVaultCapabilities(domain: VaultCapability["domain"] | "all" = "all"): VaultCapability[] {
  return VAULT_CAPABILITIES.filter(item => domain === "all" || item.domain === domain);
}
