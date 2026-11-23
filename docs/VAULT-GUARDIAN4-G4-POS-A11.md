# VAULT 360 — Guardian⁴ G4-02/04/05/06 | Fechamento clínico seletivo pós-A11

**Base obrigatória Git:** `82150bc5157dfdcae7e97cb4b63b6776c57c51b1` (`fix(vault): Guardian3 Premium 360 UX e feedback pos-salvamento`). **A11 instalada:** `VAULT-A11-INTEGRAL-360-MACRO1-82150BC-REBASE1`, 19 arquivos, 557 contratos V63. **Sem commit, push, SQL, Dexie, writer, nova fila ou alteração do V63.**

## Protocolo de verdade

O usuário informou que a A11 foi aprovada localmente. Esta microcirurgia **não confia somente no relato**: exige recibo `approved_local` da A11, verifica os 19 hashes contra o manifesto original, reconstrói os 2 arquivos modificados sobre os blobs do Git e mantém as 17 criações intactas. Se outra frente publicar, modificar um blob clínico ou ocupar um novo caminho, bloqueia. A candidatura G4 é construída em `git archive` com sobreposição exata da A11 e executa os testes antes de tocar no checkout.

## G4-02 — Modo Médico e PDF

- `lib/m3/medical-dossier-p3.ts`: `source=f.authority` e `sourceId=f.id` permanecem **idênticos** para deduplicação, período, episódio e links. A **apresentação** da origem utiliza o rótulo humano compartilhado. O detalhe A10 deixa de incluir `f.source` bruto e relações não resolvidas por nome.
- `lib/m3/medical-human-g4.ts`: tabela genérica de rótulos para as autoridades A10 e os escritores legados; fontes desconhecidas resultam em texto neutro, **sem inventar entidade**. Relações por `authority + id` só recebem título se existe um fato atual na **mesma conta e pessoa**. UUID não resolvido não é exibido.
- `lib/m3/medical-pdf-p3.ts`: o PDF existente é mantido e reutiliza o mesmo helper. A lista de linhas/valores da prévia é a autoridade. Não existe segundo PDF, nem exportação automática.

## G4-04 — Semântica M5

`lib/a10/longitudinal.ts`: `planned` é verdadeiro **somente** quando `status` é `scheduled` (agendada) ou `confirmed` (confirmada). `performed`, `cancelled`, `missed` e desconhecido deixam de aparecer como planejados e permanecem com relato/estado distinto. O **dia exibido continua sendo o dia civil da agenda** calculado por fuso explícito; não inferir o dia de comparecimento, cancelamento ou falta. Um estado não é prova de realização.

## G4-05 — Anexos M3

`lib/a10/relations.ts`: os `clinical_asset_links` passam a resolver também `consultation → consultas`, `rehab_session → rehab_sessions_m5` e `hospitalization_event → hospitalization_events_a5`. O mapa cobre assim as 12 entidades M3 com representação factual na A10, sem inventar ocorrências para `exam_session`, `rehab_program` ou `hospitalization_discharge`, que não têm fato direto nessa projeção.

- A verificação exige `user_id`, `person_id`, `asset_id` e `entity_id` reais no mesmo escopo e metadados não excluídos. Nenhum nome, data ou tipo semelhante é aceito como vínculo.
- Conta **um asset por fato**, mesmo que existam links ativos duplicados; preserva N:N (um arquivo ligado a mais de um fato) e remoção lógica por `deleted_at`.
- Se `storage_bucket` existe e não é `clinical-private`, o item é rejeitado. Metadados legados que não informam `storage_bucket` são tratados apenas como **vínculo de metadados**, sem qualquer afirmação sobre binário remoto, para manter a compatibilidade da suíte A10 publicada.
- Não há novas URLs públicas, URLs assinadas, downloads, duplicação de documento, nem escrita de fato clínico.

## G4-06 — Retorno contextual

A tela `/saude/linha-clinica/detalhe` reutiliza `safeReturnTarget` e `withReturnTarget` canônicos. O link **Abrir registro canônico** passa `return_to` para o detalhe exato; deste, o usuário pode voltar à linha clínica com filtro/período preservados. Links para fatos relacionados seguem a mesma navegação. `origem` e `id` não são substituídos; open-redirect para URL externa é recusado.

## Testes dirigidos e certificação

Novo script `scripts/test-vault-guardian4-g4-clinico.cjs` cobre 0/1/N, cinco estados M5 + desconhecido, diferença dia civil UTC, 2 contas × 2 pessoas, 12 tipos M3 factuais, N:N, link duplicado, desvínculo, órfão, documento de outra pessoa/conta, bucket público explícito, metadado legado, UUID redigido, vínculo resolvido por ID, nomes não inventados, retorno filtrado e retorno externo bloqueado, parser TS e manutenção do V63.

**Gates do instalador:** G4 dirigido, regressão A10 dirigida, regressão A11 dirigida, TypeScript integral, V63 **557/557** (uma vez na candidata), V70 Super Integrity e V70 Final Completeness; após instalação: dirigidos + TypeScript + V70 duplo + `git diff --check`. Se falhar antes de aplicar, nada muda. Se falhar após aplicar, rollback restaura **somente os oito caminhos G4** quando os hashes ainda conferem. Os 19 arquivos A11 não são revertidos.

**V63:** conforme ordem do Guardian, `scripts/test-v63-release-gate.mjs` **NÃO** integra a allowlist desta microcirurgia. O teste G4 dirigido roda explicitamente pelo instalador. A futura inclusão ao V63 pertence à frente Work **após a reconciliação**, em commit próprio e com auditoria (557 ainda é o número permanente neste pacote).

## Escopo e governança

**Oito caminhos:** 5 alterados (`medical-dossier`, `medical-pdf`, `longitudinal`, `relations`, `detalhe/page.tsx`) e 3 novos (`medical-human-g4.ts`, teste G4, este relatório). Exatamente 12 patches ancorados, cada um exigindo a contagem esperada e blob Git específico. Sem mudança em A7/M5, A8, A9, M3 Storage, A11, Avatar, Update 360, V63, sincronização ou SQL.

**Pendente após aprovação local:** auditoria independente Guardian⁴ dos diffs/recibos e autorização de publicação conjunta A11+G4; Action do SHA e homologação Android física; ensaio 2×2 autenticado, sincronização concorrente M5 e segurança Storage; PWA Vercel `READY` (o SHA `f393b06` teve OOM). **Nenhuma dessas provas é inferida dos testes herméticos.**

## Artefatos da homologação

- `RESULTADO.json` do G4 com manifestos, hashes, recibo A11 e marca `approved_local` somente após pós-gates.
- `CANDIDATO-*.log` do teste dirigido, A10, A11, TypeScript, V63 e V70; `POS-*.log` após aplicar.
- `G4-DIFF-TRACKEADOS.patch` e `applied_sha256` para o Guardian. As três criações constam integralmente do pacote, com hash no manifesto.
- Pasta de backup seletivo `~/storage/downloads/vault-guardian4-g4-backups/`.

**STOP / GO:** GO somente para aprovação **local de código** após todos os gates. Nunca afirmar publicação, certificação física ou PWA sem evidência externa correspondente.


## FIX1 — Compatibilidade M3/V34X (23/11/2026)

A R1 foi bloqueada na candidata, sem aplicar arquivos. O V63 em modo coleta executou 557 contratos: 554 passaram, 3 falharam nos contratos M3 P3, P6 P3-D1 e V34X. O TypeScript e V70 duplo passaram na mesma coleta. O adaptador de apresentação G4 foi mantido no dossiê sem nova importação runtime, preservando os ambientes herméticos antigos, e a máscara de vínculos foi aplicada antes do formatador `humanRowTextV34X(link)` no PDF. V63 e os três contratos existentes não foram alterados. Os três contratos reprovados executam primeiro no preflight; depois, no Termux, V63 integral estrito continua obrigatório na candidata final. A11 e as oito vias da G4 permanecem com hashes e rollback seletivos.
