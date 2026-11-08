# Histórico de versões do VAULT

## M98 — Central de Relatórios 360 (2026-11-08)

- Nova Central clínica com períodos 7/30/90 dias, intervalo livre e seleção de pessoa e conteúdo.
- Relatórios factual, factual + Brain persistido e resumo para consulta, com exportações PDF/CSV/JSON locais.
- Compartilhamento voluntário e médico pré-selecionado pelo cadastro; o VAULT não envia nem confirma entrega por e-mail.
- Mantidos relatório M95, doses originais, estoque, privacidade e auditoria do Brain.

## M97 — Correlações documentais e evolução do Cérebro (2026-11-08)

- Projeção conservadora de coincidências temporais em 14 dias: doses explicitamente ignoradas ou retiradas não realizadas + sintomas vinculados + aumento em registros SOS/extra, sem presumir causalidade ou abstinência.
- Central de Inteligência ganha painel progressivo somente leitura; alertas atômicos e push permanecem intactos.
- Nova página offline “Evolução do Cérebro” documenta capacidades M94–M97 com exemplos, evidências e limitações.
- Pesquisa comparativa Medisafe/Pillo e roadmap VAULT 360 guardados em docs/, sem copiar software de terceiros.

## M96 — Agrupamento conservador de episódios (2026-11-08)

- Agrupamento temporal de alertas persistidos com vínculos por medicamento, preservando o detalhe individual e a urgência original.

## M95 — Episódios preservados e relatório mensal (2026-11-08)

- Reconciliação automática dos alertas de quantidade confirmada no ledger sincronizado do Brain V5; preservação histórica dos snapshots realmente registrados.
- Destaque de episódios por dia na Linha de Cuidado e no histórico do medicamento, sem reclassificar doses antigas.
- PDF mensal com doses, horários, motivos, eventos de saúde, alertas históricos e limitações, com download web/compartilhamento Android.
- Nenhum diagnóstico, horário fictício, alteração de estoque ou envio automático do relatório.


Este arquivo registra entregas efetivas. O `versionCode` Android identifica cada compilação aprovada; `APP_VERSION` representa a versão-base do produto.

## M94 — Central unificada de avisos e paridade de APK (2026-11-08)

- Tela de notificações separa categorias automáticas, lembretes manuais e atualizações do app, sem duplicar agendamentos.
- Acesso direto a categorias e antecedência sob demanda; atalhos e indicadores visuais no padrão Lucide/dark premium.
- Mais preserva o comando rápido de avisos e oferece a Central para personalização.
- Acompanhar Action ao vivo separado da release Android certificada; sem prometer APK pronto durante compilação ou falha.
- Alerta de quantidade atípica com comparação numérica clara e revisão sem duplicidade; avaliação clínica não é inferida.
- Não altera dose confirmada, consulta, estoque, dados de saúde ou regras de notificação, nem instala APK silenciosamente.

## M90 — Fechamento de atualização premium (2026-11-08)

- Interface da Central com transições suaves, ícones Lucide, leitura acessível e preferência de movimento reduzido.
- Inspeção opcional do artefato `Vault-App-debug` por ID do run e prazo real `expires_at` do GitHub, separada do APK durável publicado em Releases.
- Lembrete local opcional do prazo temporário apenas quando há versão certificada correspondente e o APK instalado ainda é antigo; evita alarmes repetitivos e cancela lembretes ao desativar a preferência.
- Diagnóstico aprimorado, copiar SHA-256, link oficial da release e informações de build. Nenhuma porcentagem falsa de download, instalação silenciosa, dado clínico ou push remoto prometido.
- Testes de regressão herméticos; a atualização física do APK ainda precisa ser homologada no dispositivo.

## M87–M89 — VAULT Update Center (2026-11-07)

- **M87:** pipeline publica APK Android aprovado em GitHub Releases depois do gate, exportação, assinatura, versão nativa e upload do artefato; mantém retenção de sete dias para o artefato do Actions.
- **M88:** Central de Atualizações na aba Mais mostra versão realmente instalada, build, release, novidades, estados de compilação e diagnóstico copiável. PWA é apresentado separadamente do APK.
- **M89:** verificação no primeiro plano ao abrir/retomar, intervalo de seis horas, aviso local opt-in e deduplicação por build. Notificação com aplicativo fechado **não** é prometida; exige futura infraestrutura push.

### Restrições e segurança

- Download somente de APK de release pública não rascunho/não pré-release publicada pelo workflow, sob o repositório oficial, com metadados e SHA-256 registrados.
- Não há instalação silenciosa; a pessoa escolhe baixar e o Android solicita confirmação de instalação.
- Não altera banco Dexie, Supabase, medicamentos, estoque, doses ou dados pessoais.
- O primeiro APK com Update Center precisa ser instalado pelo método já existente; builds anteriores não podem executar retroativamente funções que não continham.
- Teste de instalação e atualização em aparelho físico continua na M90.

## M77–M86 — Ciclo Premium 360

- M77–M79: interface progressiva clínica, evolução do Brain e inspeção da Fênix 3D.
- M80–M82: lista única de medicamentos, mantendo agrupamentos clínicos.
- M83–M85: carregamento progressivo e verificações de fechamento.
- M86: identidade do princípio ativo discreta, ações e resumo operacional alinhados; contratos visuais legados atualizados.
