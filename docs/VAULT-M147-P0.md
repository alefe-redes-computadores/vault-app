# VAULT M147 P0 — Navegação e proveniência temporal (pós-Gemini)

## Correções incluídas
- Acesso à Central por navegação Next.js do cliente, sem `a href` de recarga integral, em Home, Hoje, Lista e Detalhes. Links retêm `return_to` validado com o helper existente.
- Central renomeada para **Ocorrências, ciclos e vacinas**. Remoção do rótulo técnico M144 da superfície.
- Registro da Central distingue data declarada do evento, hora de lançamento e `created_at` canônico; datas retroativas reais passam a compor `data`, futuro permanece lançamento de planejamento. Não inventa hora de ocorrência — o campo `horario` obrigatório é identificado como horário de lançamento.
- Lista da Central ordena por data do evento declarada, inclusive entradas antigas sem reescrever seu registro em Dexie.
- Lista distingue SOS suspenso: botão primário de registrar uso não aparece; permanece ação secundária **Registrar uso já ocorrido**, sem recomendar medicação ou reativá-la.
- Título da agenda da Home não chama horários passados de "próximos" — apresenta **Agenda de hoje** até que a etapa P1 integre separação cronológica explícita.
- Gate global M147 integrado depois da M144, preservando M92 em primeiro; provas determinísticas P0.

## Limites e não escopo
- Não altera DoseLog, estoque, Regime, Renovacao, alertas regulatórios, Dexie schema, Supabase ou sincronização.
- Não migra dados antigos: a Central os apresenta pela data declarada; o Diário legado pode manter data de lançamento para eventos de versões anteriores. Uma eventual migração precisaria de consentimento, backup e projeto próprio.
- **Sem alteração do agrupamento do Brain M146.** Consolidar Home e prioridade em uma história por entidade exige modelagem, regressões dos seletores e inspeção visual — programado para M147 P1.
- Não muda toda a lista/Detalhes: redesenho Dark Premium e três domínios é M148.
- `horario` ainda é obrigatório no contrato do Diário; em eventos sem hora declarada, representa hora do lançamento, NÃO momento real da ocorrência. Essa limitação deve constar na UI e ser auditada.
- Não é fonte para decisão farmacológica, não recomenda suspensão, uso ou retomada de SOS.
- **O gate local não prova navegação no WebView**: validar APK da Action correspondente, PWA, offline, histórico e troca de pessoa.

## Segurança de publicação
Pré-voo em checkout isolado, fast-forward apenas, SHA256, backups, patch por âncoras únicas, `tsc --noEmit`, `npm run test:release`, `git diff --check`, recibo com hash e push normal somente após gates, com allowlist explícita. Sem `git add -A`, `git reset --hard`, `git clean` e sem `push --force`.
