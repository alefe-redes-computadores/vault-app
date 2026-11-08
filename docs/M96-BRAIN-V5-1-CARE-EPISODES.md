# VAULT M96 — Brain V5.1-A: CareEpisode Core

## Escopo entregue

- Uma **projeção pura** `buildCareEpisodesFromLedger(context, ledger, now)` gera agrupamentos **somente a partir do ledger Brain V5 já persistido**. Não produz novos insights, não classifica dose como segura, não altera notificações e não escreve em Dexie/Supabase.
- Isolamento por `userId` e `personId`; exige origem de medicamento efetivamente cadastrada na conta ativa. Nunca mistura pessoas.
- Janela dos últimos 14 dias, limitada a 96 sinais; agrupamento conservador só quando **há pelo menos dois sinais distintos** com vínculo explícito de medicamento, preservando os alertas-filhos em suas próprias telas.
- `evidenceRefs` com classificação epistemológica: `documented_fact`, `unconfirmed_gap`, `user_reported_state` e `pharmacological_risk_hypothesis`.
- A única prova direta `binding: exact` entre um alerta de quantidade e um DoseLog reutiliza o verificador M95 `indexConfirmedDoseSafetyEpisodes`. Outros sinais são **snapshots do Brain**, não registros clínicos comprovados.
- Relato de saúde só entra vinculado se já tiver `medicamento_id` explícito, `user_id`, `person_id` e data válida, com rótulo `user_linked`.
- Painel expansível e inicialmente recolhido na Central de Inteligência, que **não substitui nem esconde** alertas originais; cada sinal abre o detalhe canônico do Brain V5.
- Ausência de log, saldo de estoque ou atraso de retirada não vira interrupção presumida. Associação temporal não prova causa.

## Limites conscientes

- Esta entrega é **fase A: contratos/evidência/projeção read-only**. Não implanta check-in sensível, não persiste CareEpisode em JSONB, não adiciona fontes regulatórias nem orienta posologia.
- `viewKey` não é ID estável para persistência; muda se novos sinais entrarem. A etapa B tratará identidade estável de episódios e reconciliação com instantâneos imutáveis.
- A `nature` dos insights é hipótese interpretativa ou lacuna. `documented_fact` é reservado ao vínculo exato de dose confirmado no verificador da M95. Não se assume que a mensagem inteira de um Insight é fato clínico.
- Sem atualização da tela central enquanto o hook não tiver contexto clínico carregado; a apresentação segue o mesmo contexto compartilhado do Brain.

## Etapas seguintes

1. V5.1-B: correlações cruzadas conservadoras com fonte explícita, comparadores de janelas e rejeição de hipóteses causais sem dados.
2. V5.1-C: follow-up voluntário com esquema próprio e plano de apoio humano, preservando segurança e privacidade.
3. Avatar facial + Health Connect com evidência e baixo consumo, sem diagnosticar pela aparência.

## Gates

`node scripts/test-vault-m96-care-episodes.cjs`

`npm run test:release`

`npx tsc --noEmit`

`git diff --check`

Somente depois de todos os gates passarem o instalador cria commit e executa push; falhas anteriores ao commit restauram exclusivamente os arquivos M96.
