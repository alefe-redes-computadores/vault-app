# VAULT M97 — Brain V5.1-B e catálogo de evoluções

**Base de instalação:** M96 `8d7c52a7064e0bcdd9cae8a79bf86308f3dd9a30`.

## Escopo real
- Novo seletor local `buildCareCrossCorrelations` em `lib/health-intelligence/care-cross-correlation.ts`.
- Combina **somente registros documentados**: ao menos 2 dias distintos com doses programadas explicitamente ignoradas **OU** retirada explicitamente marcada não realizada; ao menos 2 registros de sintomas/humor vinculados ao medicamento/tratamento; e 3+ tomadas SOS/extra registradas na janela recente, superiores à contagem da janela anterior (com exigência de 1,5x quando a anterior for diferente de zero).
- Janelas de 14 dias consecutivos para observação e 14 dias precedentes para comparação; a data da referência é local `YYYY-MM-DD`. Valida datas inexistentes e não cria horários artificiais.
- Associação entre medicamentos distintos **somente por** ID de tratamento compartilhado; sintomas devem declarar medicamento ou tratamento relacionado. Sem essa vinculação, não há episódio.
- O resultado lista contagens e IDs reais, sem gerar `HealthInsight`, sem nova notificação, sem alterar a máquina de estados do Brain V5, sem modificar dose, estoque, receita ou sync.
- `CareCrossCorrelationPreview` é disclosure progressivo na Central, preserva todos os alertas atômicos e seu detalhe original. Máximo quatro cartões e 36 evidências exibidas por cartão, sem esconder estados clínicos.
- `VAULT_CAPABILITIES` é catálogo **estático e embarcado** das entregas M94–M97, com evidências, limitações e exemplos; a página `/inteligencia/evolucoes` é offline. Não consulta nem supõe o estado de APK, Action ou release Android.

## Semântica e limites
- `ignorado_em` explícito é um **registro de dose ignorada**, não prova de interrupção prolongada ou síndrome de retirada.
- `nao_realizada` comprova apenas o **estado administrativo registrado** de uma retirada, não ausência de medicamento.
- Ausência de dose ou estoque zerado jamais ativa essa correlação. Um aumento no número de registros SOS/extra **não equivale a aumento real de uso ou diagnóstico de tolerância**.
- Fonte da verdade continua `DoseLog`; perfil e tratamento apenas limitam o escopo. Não há recomendação de posologia nem interpretação clínica de causalidade.
- Sem migração de banco; sem novas permissões ou comunicação remota; performance bounded; apenas `HealthInsightContext` da pessoa ativa, previamente carregado.

## Homologação
- Isolamento `userId`/`personId`, vínculo de tratamento, distinção entre omitido/ignorado, datas inválidas, coleta de eventos em janela, comparação anterior e dedupe.
- Sintaxe TS/TSX dos novos módulos, regressão M95/M96, `npm run test:release`, `npx tsc --noEmit`, `git diff --check`, status e allowlist exatos, commit/push somente após aprovação.
- A checagem de produção e a homologação de uso real permanecem externas ao teste hermético. Se a main divergir da base esperada, abortar sem tocar no repositório.

## Próximos passos
- M98: Central de relatórios e compartilhamento consciente ao médico (PDF/CSV/JSON).
- M99: investigação e homologação de alarmes Android, sem prometer persistência além das permissões da plataforma.
- M100: vínculo de pessoas/dependentes e papéis.
- M101: Health Connect 2.0 com origem e precisão; M102 Avatar Vivo, follow-up e preferências pessoais; M103 auditoria geral.
