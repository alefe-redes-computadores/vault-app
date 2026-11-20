# VAULT 360 — Relatório de Continuidade M1 (20/11/2026)

## Situação e responsabilidade entre chats
- Projeto: `alefe-redes-computadores/vault-app` (Next.js 14 / Dexie / Supabase / Capacitor Android).
- Referência de autoria da cirurgia: `8eb28841cce14b8d2d82bec93141212775d6c7b1` (R5+R6). **A cirurgia não bloqueia HEAD diferente por si só**; compara blobs dos arquivos afetados.
- O outro chat é responsável por reparar o contrato V33.1 de BottomNav e certificar o V63 da R5+R6. **Não duplicar o trabalho neste chat.**
- Este chat é responsável pelas 3 grandes frentes de Exames: M1 banco/Dexie/sync/segurança, M2 agenda/preparo/lembretes, M3 laudos/retorno médico.

## Banco Supabase — migrações aplicadas diretamente neste chat
- `vault_exams_m0_rls_storage_owner_hardening`: corrigiu RLS de `careflow_events_m2` e restringiu INSERT/UPDATE/DELETE/SELECT do bucket `vault-attachments` por proprietário. Buckets legados **ainda são públicos para download**, pendência de transição compatível.
- `vault_exams_m1_relational_foundation_v1`: criou **7 tabelas** `exam_orders`, `exam_order_items`, `exam_sessions`, `exam_session_items`, `clinical_assets`, `clinical_asset_links`, `consultation_exam_order_links` e bucket privado `clinical-private`.
- 21 políticas RLS novas, unique parcial para um vínculo ativo por item (`exam_session_items`), unique de SHA-256 por pessoa, integridade de FKs e soft deletes.
- Nenhuma linha clínica antiga foi apagada, convertida ou copiada. Nenhum arquivo legado foi movimentado.
- Checagem real do banco: 27 objetos em `vault-attachments` seguem caminho/proprietário compatível; 4 eventos CareFlow tinham vínculo pessoa/usuário coerente; nenhuma nova tabela possuía dados de usuário no momento da confirmação.
- Migrações de banco já estão remotas: o pacote desta etapa deve mexer SOMENTE no código, não executar SQL novamente.

## Código M1 — pacote desta etapa
- Dexie V49 **aditiva**, sem modificar stores antigas.
- Tipos, dependências de FK e repositório local-first das novas entidades; novos cadastros de pedido/sessão são explícitos e não alteram `exames` ou `careflow_events_m2`.
- Fila existente `enfileirarOperacao` com prioridades na ordem `exam_orders -> exam_order_items -> exam_sessions -> exam_session_items -> clinical_assets -> clinical_asset_links -> consultation_exam_order_links`, preservando consultas como pai independente.
- Guardas para dependências pendentes, conflito de UUID e de versão de outro dispositivo; nunca fazer `DELETE` físico nas novas tabelas.
- Pull paginado de todas as sete tabelas preservando registros pendentes/unsynced e sinalizando falhas sem falso sucesso.
- Teste M1 integrado no gate canônico V63. `npm run test:release` integral com V70+TS é obrigatório no clone isolado ANTES de aplicar e publicar. Caso falhe: BLOQUEADO — NÃO PUBLICAR.
- Arquivos: seis rastreados modificados, seis novos, total 12 na allowlist. Não usar `git add -A`.
- Backup seletivo, rollback local com hash, publicação separada, recusa conflitos reais nos blobs editados, atualização fast-forward apenas para alterações independentes, nunca force push.

## Estado e instrução para prosseguir
- Status do banco: **aplicado e metadados/índices conferidos**.
- Status do código: **pacote produzido; aguardando diagnóstico, aplicação e V63/V70/TS completos no Termux**. Não chamar de aprovado até a saída do instalador.
- R5+R6: commit publicado, último CI verificado no início desta etapa apresentava falha do contrato V33.1. A outra conversa está responsável.
- Não ativar nova escrita no UI antes de M1 ser homologada e M2 implementar o cutover canônico. Não fechar os buckets legados antes de disponibilizar download autenticado e cache offline.

## Pendências para M2 e M3 (consolidação Gemini + ChatGPT)
- **M2**: todos os novos exames (inclusive avulsos de 1 item) passam a `exam_orders` como autoridade única; legados exclusivamente leitura. Card único para 15 exames; sessões parciais 12+1+2 pendentes; coleta parcial/recoleta; local/data/fuso, validade do pedido, protocolo, jejum/preparo informado; Hoje/Home só compromissos agendados; notificações por sessão, opt-in, namespace int32, Quiet Hours com aviso antecipado/override explícito, cancelamento em remarcação e resultado antecipado. Rotas antigas e `return_to` preservados.
- **M3**: arquivos em `clinical-private` com hash SHA-256, vínculos polimórficos `clinical_asset_links`, PDF único para vários exames, checklist de vínculo em lote, cache Capacitor Filesystem offline, fila de bytes separada de metadados, GC server-side com carência e contagem zero; retorno N:N, Cartão de Retorno, Modo Médico/PDF sem signed URL expirada ou diagnóstico inventado; migração gradual de URLs legadas e políticas do Storage `saude`/`documents`.
- **Segurança ainda pendente**: os buckets `vault-attachments`, `saude`, `documents` permanecem públicos para download até a migração controlada; a M0 endureceu escrita apenas em `vault-attachments`. Revisão adicional das outras políticas de Storage é necessária antes do fechamento definitivo.
- **Qualidade**: `npm run test:release` completo em checkout isolado final e no commit reconciliado se outra frente publicar; CI real obrigatório pós-push; conferir Node local vs CI Node22; homologar Android físico, backup, rollback, dados antigos, RLS e sync offline.

## Critérios de aceite finais de M1
1. Confirmação do SQL e RLS por SELECT em metadados, testes de acesso entre usuários/pessoas no ambiente controlado; banco sem novas gravações clínicas fictícias.
2. Dexie V49 cria somente sete stores novas; preserva registros existentes.
3. `createExamOrderM1` e `scheduleExamSessionM1` gravam local + fila na mesma transação, usando UUID do cliente e escopo verdadeiro.
4. Envio por prioridade e dependências, retry seguro e prevenção de sobrescrita remota.
5. Pull paginado e preservação de alterações locais pendentes.
6. Gates dirigidos e integral (`npm run test:release`) OK, backup e publicador allowlist.
7. Action real, build e APK só podem ser declarados aprovados após verificação externa pós-publicação.

## Próximo relatório
Ao homologar/publicar esta M1, atualizar com HEAD inicial/final, status V63/V70/TS, conflitos, nome do pacote, commit/Action e erros reais do aparelho. Em seguida preparar a macrocirurgia M2 inteira, sem retomar microcirurgias desnecessárias.


## FIX2 — 20/11/2026
Cinco falhas históricas no gate M1 sobre HEAD 8eb28841: V69 (limite textual 260 caracteres) e V33/V34.1/V34.2/V37 (BottomNav condicionado ao editor clínico R6). A cirurgia atualiza V69 e opcionalmente os quatro testes somente se ainda desatualizados; não altera UI nem regrede o comportamento R6. Relatório de falhas ao final e progresso visível em Termux. Gate e Action reais pendentes.
