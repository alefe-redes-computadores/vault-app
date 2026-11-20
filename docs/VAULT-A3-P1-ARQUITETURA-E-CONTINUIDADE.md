# VAULT A3 — P1: linha de receitas, aquisições e retiradas

Data: 20/11/2026 · Base de código auditada: GitHub `702c32149bd6` (M3). A UX360 e a M4 são frentes concorrentes. Esta cirurgia não toca a autoridade de ambas; o instalador faz guarda de blob por arquivo e exige `origin/main` alinhada antes da cópia.

## Escopo entregue nesta etapa

- Projeção **somente leitura** `projectSupplyContinuityA3` sobre registros canônicos `renovacoes` e `retiradas`, por usuário, pessoa e ID real de medicamento vinculado a processo.
- Bloco integrado à **página existente** `app/saude/fornecimento/page.tsx`, sem nova URL, nova tabela, novo escritor, nova fila de sincronização, duplicação da interface ou manutenção paralela.
- Fatos preservados: receita isolada (`data_aquisicao === null`, quantidade nula e sem origem de aquisição), aquisição comprovada (`data_aquisicao` civil válida, quantidade positiva), retirada conforme status real; eventos legados ambíguos continuam identificados como **a conferir**.
- Aquisição já vinculada por `renovacao_realizada_id` a uma retirada realizada aparece na cronologia, mas não duplica o agregado de aquisição avulsa.
- Local de retirada exibido pelo ID persistido **no próprio evento** (`farmacia_id`/`local_id`), nunca herdado da farmácia atual do medicamento. Nota honesta: se renomearem a entidade farmácia, o nome atual será exibido; capturar snapshot imutável completo do nome/endereço depende de evolução de banco + Dexie + push/pull da P2.
- Próxima retirada somente com `status === 'agendada'`, data civil válida >= hoje. Data passada continua agendada, gerando alerta, jamais realização automática.
- Documentos M3, doses, estoque, ciclos, consultas e cirurgia **não** são alterados.

## Fronteiras e decisões

- A página continua usando `useHealthSupply`, `useRenovacoes`, `useRetiradas`, `buildSupplyRelationshipIndex`, sem segundo estado local ou autoridade.
- Um vínculo pelo medicamento não significa vínculo formal ao ciclo SUS: o texto da UI comunica essa distinção. Uma data de receita declarada no cadastro de Medicamento sem evento separado em `renovacoes` não é fabricada como ocorrência.
- Dados sem `id` persistido, fora da conta ou pessoa, com data inválida, não entram na projeção. Não se infere aquisição de `tipo_aquisicao` isolado ou da quantidade sem confirmação temporal.
- Visão colapsada por padrão, ações com destino real em páginas existentes, min-h-11/14; densidade mobile-first, sem tocar BottomNav.

## Etapas subsequentes que ainda NÃO foram entregues

1. **A3 P2 — Identidade e revisão de prescrição:** autoridade versionada e migração aditiva após modelar `prescription` e `prescription_revision` com FK composta owner/person. Preservar todos os IDs de `renovacoes` e não converter eventos ambíguos. Não inventar migração SQL sem confirmar baseline Supabase e versão Dexie pós-M4.
2. **A3 P3 — Local histórico imutável:** snapshot do local no evento de retirada, com marca temporal e fonte, paridade TypeScript → Dexie → banco → push → pull e testes cross-device. Alteração de farmácia atual não retroage.
3. **A3 P4 — Relações documentais e planos:** ligar prescrições a assets **existentes** M3 após whitelist do trigger com ownership; regras de renovação/ações reais do fornecimento com testes de idempotência e Quiet Hours via reconciliador comum.
4. **A3 P5 — Fechamento:** sincronização bidirecional, UI lista/criação/edição/detalhe nas autoridades existentes, V63/V70, Android e prova negativa de RLS com duas contas/pessoas, sem estoque fictício.

## Procedimento seguro

- ZIP completo com `INSTALAR-VALIDAR.sh` e `PUBLICAR.sh` independentes.
- Bloqueia colisão de conteúdo no arquivo canônico `app/saude/fornecimento/page.tsx`, mas **não bloqueia HEAD novo** apenas por ser novo.
- Teste dirigido da projeção + TypeScript completo + sweep V63; aprovado gera marcador e backup seletivo. PUBLICAR com commit e push seletivo, nunca `git add -A`.
- Não alegar que P1 conclui A3 inteira: P1 é a primeira cirurgia funcional, com alcance explicitamente restrito.
