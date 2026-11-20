# VAULT 360 | A0 Macro1 — Integridade 360

Esta é **uma macrocirurgia consolidada**, não micro-FIX. Corrige segurança do Storage no Supabase (4 buckets), completa 5 campos clínicos remotos ausentes (2 Cirurgias, 2 Tratamentos, 1 Hospitais), trata upserts antigos, valida vínculos por titularidade e adiciona gate local de paridade.

## Dados e evidências

GitHub baseline em 20/11/2026: HEAD `f8e4cff1b174` (M1, Dexie V49) quando pesquisado. **Não ancora a aplicação num SHA fixo**: opera sobre a última `main` limpa com âncoras semânticas, worktree isolada e check final de remote. Qualquer mudança relevante de M2 bloqueia sem sobrescrita.

Supabase inspecionado: `vault-app`, buckets `avatars` (5 objetos com owner_id e path congruentes), `vault-attachments` (27), `saude` e `documents` (0), `clinical-private` (0). Não transformar bucket público em privado antes de M3 migrar arquivos/cache/URLs.

## Processo seguro

1. No Termux: execute `INSTALAR-VALIDAR.sh`. Não modifica `main` até passarem testes direcionados, TypeScript e gate integral. Após aprovação gera backup, cópia seletiva e log. Não publica.
2. Com a aprovação local, **solicite a aplicação das duas SQL no Supabase**. A automação desta pasta não tem credenciais e NUNCA tenta usar SQL via Termux. O assistente aplica SQL por conector do projeto, verifica a migration e o resultado de `003_verificacao_readonly.sql` sem copiar PII. Depois do retorno `SQL_OK`, o marcador local pode ser criado com `printf 'vault-app A0 SQL aplicado e verificado\n' > ~/storage/downloads/.vault-a0-macro1-sql-confirmado`.
3. Rode `PUBLICAR.sh`. O script exige aprovação + confirmação SQL, faz stage apenas dos 8 arquivos autorizados e bloqueia se outra frente avançou a `main` durante o gate.
4. GitHub Action deve ficar verde no novo SHA. Validar PWA e APK; só então considerar homologação funcional. Gate verde não certifica E2E 2 contas × 2 pessoas.

## Invariantes

- Nenhuma alteração de esquema Dexie V49, do motor M2, de exames/laudos, de dose/estoque/receita, nem delete de dados clínicos.
- O `mapRemote` do pull preserva **valores locais históricos** quando a nova coluna remota ainda é `NULL`, respeitando conta/pessoa e `[]` como remoção explícita. Não afirma que o backfill remoto dos dados já aconteceu; isso exige E2E ou nova edição/sync.
- A SQL `002` usa colunas **aditivas**, valida vínculos e preserva campos quando upserts de APK legado não os conhecem.
- Para Cirurgias e Tratamentos, uma tentativa de limpar deliberadamente um campo novo com `NULL` é preservada pelo trigger como medida de compatibilidade. Remoção de vínculo cirúrgico **explícita** usa `[]`, não `null`; limpeza explícita de `data_inicio/condicao` fica para uma evolução com intenção versionada.
- Não duplicar uma tabela da M1/M2. Arquivos de novos módulos usarão `clinical_assets` e `clinical_asset_links` depois da homologação do M3.
- Este pacote **NÃO** garante que dois aparelhos já tenham sido testados; inclui a matriz para homologação controlada após deploy.

## Retaguarda e rollback

- **Código:** arquivo `VAULT-A0-MACRO1-BACKUP-....tar.gz`; instalador se recusa a sobrescrever alterações rastreadas.
- **SQL:** migração aditiva não deve ter rollback destrutivo. Políticas podem ser ajustadas com migração corretiva, nunca reabrindo escrita pública. Não fazer `DROP COLUMN` porque isso eliminaria vínculos que outros aparelhos sincronizaram.
- Não usar `git add -A`, `git reset --hard`, `force push` ou editáveis `.env` na entrega.

## Verificação externa obrigatória

H25: uploads `clinical-private` próprios (conta/pessoa) e negação cruzada; H26: objetos alheios em `avatars`, `saude`, `documents` não podem ser sobrescritos/removidos. H27: Cirurgia com 2 tratamentos, 2 CIDs, consulta de detalhes após push/pull e reabertura. H28: Tratamentos com data_inicio/condicao reais. H29: Hospital com equipe legítima, rejeição equipe alheia. H30: sem escrever em registros clínicos durante testes de segurança. M2/M3 continuam na outra frente.

## Arquivos

- `sql/001_storage_ownership.sql` — policies, preservação de buckets e propriedade.
- `sql/002_paridade_clinica.sql` — ALTER aditivos + triggers de integridade (nenhuma linha histórica reescrita).
- `sql/003_verificacao_readonly.sql` — verificação pós-migração.
- `scripts/a0-preserve-local-parity.ts` — guarda pura de pull para M1→A0; não grava ou inventa dados.
- `scripts/patch_a0.py` — patch de blocos únicos, idempotente e conservador.
- `scripts/test-vault-a0-integridade360.cjs` — regressão automática da paridade e da sintaxe TS.
- `INSTALAR-VALIDAR.sh`/`PUBLICAR.sh` — orquestração Termux.
