# VAULT 360 — A3 MACRO2 | Receitas e Fornecimento canônicos

**Base de arquitetura:** Relatório Mestre V24, B7 / sugestões Gemini/usuário, A1 e A3 P1 já publicados. Nenhuma reconstrução paralela dos formulários de consultas, exames, pressão ou receituário; evolução das autoridades existentes.

## Autoridades preservadas

- `renovacoes` continua sendo o **evento** canônico de receita isolada ou aquisição real. A opção `somenteReceita` não altera estoque, compra, farmácia ou retirada; `somenteAquisicao` continua exigindo quantidade real e saldo inicial conhecido/contado.
- `a1_prescription_links` (A1) permanece **a única cadeia explícita de versões de prescrições**. A receita nova entra em `renovacoes` e o vínculo da anterior ocorre no mesmo escopo transacional Dexie; não há outra tabela de prescrições criada. Seleção de antecessora é opcional e factual, nunca adivinhada pela data.
- `a1_supply_locations` (A1) permanece histórico temporal por `inicio_vigencia`; a MACRO2 acrescenta o nome/endereço registrados no momento da declaração, sem reescrever locais de outros eventos.
- `retiradas` mantém `status`, `renovacao_origem_id` e `renovacao_realizada_id` e seus links históricos. Retirada agendada não vira realizada por tempo; recebimento real depende do registro canônico e suas proteções.
- `fornecimentos`, `fornecimento_ciclos`, `fornecimento_itens`, `documents` e os assets M3 continuam intactos. Nenhum novo armazenamento, fila, bucket ou rota canônica de registro é introduzido.

## Três blocos B7 na tela existente

1. **Situação atual**: medicamentos pertencentes ao processo e número com saldo informado. Não soma apresentações heterogêneas nem calcula dias sem rotina confirmada.
2. **Próxima ação**: retirada informada/agendada e alertas de data passada, sem concluir evento nem gerar receita automaticamente.
3. **Histórico registrado**: eventos por IDs canônicos, com versão de receita somente quando há vínculo A1 expresso. Farmácia/local novos usam snapshot imutável no evento; legados sem snapshot mostram dado atual do diretório com advertência explícita.

## Consistência, histórico e concorrência

- Snapshot de farmácia/local guarda ID, nome, endereço, instante e fonte. Registros legados **não** são preenchidos retroativamente com o nome atual.
- Edição da localização de retirada apenas quando agendada, com trilha append-only. Alterar uma retirada concluída por esse caminho é bloqueado.
- O repositório de renovação não permite converter receita já versionada em aquisição, nem trocar sua data e medicamento sem reconstrução explícita do relacionamento histórico.
- O índice parcial `vault_a3_one_active_prescription_successor_uidx` recusa dois sucessores ativos para uma mesma receita, mesmo em dois aparelhos. Um conflito remoto permanece visível para resolução; não se faz *last-write-wins* silencioso.
- A3 reutiliza a fila/sync central em `hooks/useSyncQueue.ts` e o pull `lib/sync/pull.ts`, sem motor paralelo.
- As três tabelas A1 remotas, ausentes no início desta cirurgia, foram instaladas com SQL original publicado da A1 e validadas com RLS ativo e 3 políticas por tabela. E2E de duas contas e sincronismo entre aparelhos permanece obrigação de homologação; o teste local usa dados sintéticos.

## Banco e migração

Migração `supabase/migrations/20261120_a3_canonical_prescription_lineage_historical_locations.sql` é **aditiva**: somente `a3_location_snapshot` e trilha `a3_location_changes` em `renovacoes` e `retiradas`, snapshot opcional em `a1_supply_locations`, CHECKs e índice parcial da relação A1. Não altera saldo, não transfere ownership e não reescreve eventos. A migração remota foi aplicada via plugin e conferida: 5 colunas JSONB e índice exclusivo presentes. E2E de segurança entre contas/dispositivos permanece pendente.

## Validação

- Pacote `INSTALAR-VALIDAR.sh`: hash dos blobs editados (não HEAD fixo), worktree isolada, aplicação atômica em candidato, testes dirigidos, TS completo, `git diff --check` e V63/V70; aprova sem commit. Em caso de HEAD concorrente, bloqueia sem tocar main.
- `PUBLICAR.sh`: autentica SHA dos arquivos aprovados e stage restrito à allowlist (nunca `git add -A`), revalida HEAD remoto, commit e push sem force.
- `test-vault-a3-macro2.cjs`: dados sintéticos para isolamento entre contas/pessoas, receitas independentes/encadeadas, aquisição ≠ receita, snapshot de local, histórico auditável, ausência de fatos inferidos e limites SQL. Registrado no gate cumulativo.
- `test-vault-a3-p1-continuity.cjs` modernizado com runtime de dependências reais; preserva 36 garantias. `test-vault-a1-domain-execution.cjs` modernizado para o helper de snapshot de local; preserva contratos A1.

## Pontos não declarados como concluídos

- Prescrição multimedicação e contrato de validade por categoria documental ainda precisam de homologação de um caso real; não se criou segunda fonte de prescrição.
- E2E da migração com duas contas/pessoas, sincronismo entre aparelhos, concorrência real e PDFs M3 exigem testes em ambientes autenticados após publicação.
- Homologação do acabamento físico Android (320/360/393/430dp), como combinado, fica para fechamento global, enquanto TypeScript/V63 são obrigatórios agora.
