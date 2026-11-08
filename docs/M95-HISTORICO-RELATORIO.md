# VAULT M95 — Episódios de quantidade e PDF mensal

## Autoridade dos dados

- `DoseLog` segue como única fonte do fato de tomada ou ignorada e da quantidade registrada. A cirurgia não recalcula estoque, não reescreve doses e não cria registros clínicos duplicados.
- O ledger já sincronizado do Brain V5 (`settings.brain_v5_alert_ledger`) guarda os snapshots realmente produzidos e as conferências feitas pela pessoa. Episódios de quantidade confirmada deixam de participar do limite geral de 1200 históricos resolvidos.
- Um reconciliador global reage ao insight original de `quantidade-confirmada-*` mesmo quando a Central de Alertas está fechada. Não mostra sucesso falso se o armazenamento local falhar.
- Associação pela pessoa, conta, medicamento, identificador único da dose e quantidade originalmente registrada. Divergência faz o vínculo falhar fechado.
- **Limite:** uma dose antiga sem snapshot previamente persistido não ganha alerta fictício. A regra atual do Brain prioriza a maior divergência em sete dias e não substitui uma auditoria farmacológica.

## PDF mensal

- Entrada na Linha de Cuidado, com mês do calendário selecionável. PDF multipágina gerado localmente sob clique voluntário.
- Fonte das doses: `DoseLog`. Entram apenas tomadas ou ignoradas explicitamente. Ausência de registro não é uma dose ignorada.
- Horário programado (`horario`) e de confirmação (`tomado_em` ou `ignorado_em`) aparecem como campos diferentes. Hora inválida/ausente permanece não informada.
- Inclui medicamento, quantidade, origem, motivos informados, registros de saúde e episódios do Brain com snapshot preservado.
- Reutiliza `deliverPdf` da M93 (download PWA / chooser do Android). Não envia arquivo a servidor nem cria permissões de armazenamento global.
- Verificações: TypeScript, testes M95, suíte global, `git diff --check`, HEAD/allowlist, backup/rollback e publicação somente sob aprovação.

## Próxima evolução (M96–M99)

- M96: Avatar facial e expressões sutis com orçamento WebGL.
- M97: Samsung Health / Health Connect: métricas autorizadas, permissão, origem, sincronização e falhas.
- M98: Avatar corporal com evidência explícita para dispositivos, procedimentos e peso; sem inventar estado.
- M99: homologação, bateria, fallback e desempenho Android.
