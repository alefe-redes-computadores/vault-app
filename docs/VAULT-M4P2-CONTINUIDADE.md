# VAULT 360 — M4 P2 / Engenharia Clínica + Formulários de Medicamentos

**Corte:** 20/11/2026. **Base GitHub auditada:** `6f767184140f071548f88e32f5aecd3d8e787c79` (A3 P1). A compatibilidade deve ser reconfirmada pelo runner contra `origin/main` no momento do uso.

## Histórico consultado

- Documento Mestre Integral V22 (20/11): autoridade clínica única, rollback e filtros de ownership por conta/pessoa, preservar UX móvel e não inferir fatos clínicos. O HEAD e status M1 daquele documento são históricos; rechecados no GitHub atual.
- Relatório M4 P1 FIX1: 533 testes no aparelho, com falha corrigida de inferência genérica Dexie; cirurgia M4 P1 foi depois aprovada pelo proprietário.
- M1/M2/M3/M4 P1 no GitHub atual: confirmação por código de schema Dexie V50, `clinical-private`, consulta/cirurgia canônicas, journey M4 e contratos V63.

## Objetivos da P2

1. Persistir relações humanas de Cirurgia ↔ Consulta em tabela **nova de junção**, sem duplicar os cadastros ou preencher relações por data. Papéis declarados: preparação, pós-operatório, retorno e acompanhamento.
2. Preservar criação offline, fila, cancelamento via tombstone, comparador de versão, identificação da mesma pessoa e RLS servidor.
3. Corrigir horário em Criar/Editar Medicamento sem máscara agressiva. `10` -> `10:00`, `22` -> `22:00`, `1030` -> `10:30`; inválidos não são salvos.
4. Harmonizar ícones dos formatos adicionais no botão **Mais formatos**, na miniatura compartilhada e na prévia do Studio. Suspensão não vira comprimido.
5. Refinar paleta de cor sem mexer na autoridade `toggleMedicationIdentityColor`, preservando limite de uma cor ou duas em cápsulas e dados legados.

## Arquitetura

- SQL: `surgery_consultation_links_m4`, chaves compostas com `cirurgias`, `consultas`, `persons`, índice vivo único e RLS; `GRANT` limitado, sem DELETE.
- Dexie: versão 51 aditiva, tabela `db.surgery_consultation_links_m4`, nunca remove versões anteriores.
- Repo: `linkSurgeryConsultationM4P2`, `unlinkSurgeryConsultationM4P2`, transações atômicas com `syncQueue` e exigência de conta/pessoa.
- Sync: `syncSurgeryConsultationLinkM4P2` recusa `delete` físico, compara payload e versão, atualiza com CAS; dependências consulta/cirurgia evitam envio órfão; pull respeita pendências locais e versão. Tombstone propagado sem apagar ficha.
- UI: `SurgeryConsultationLinksM4P2` em detalhes da cirurgia, consulta e jornada com texto que distingue ligação confirmada de proximidade temporal.
- Medicamentos: `MedicationStableTimeInputM4P2` com rascunho local; Preview e picker de formato usam o mesmo catálogo; identidade de cor conserva a regra original.

## Evidências locais e limites

- 15 arquivos existentes modificados e 8 novos, incluindo SQL e teste. Zero bibliotecas adicionadas.
- Inspeção read-only GitHub: âncoras obrigatórias presentes no HEAD auditado (uma ocorrência por ponto, corrigida a âncora de jornada).
- Patch testado em ambiente sintético: 15/15 caminhos processados, sem simplificação nem substituição integral de telas.
- Parser de horário: TypeScript `strict` sem erro; 2.886 casos executados (24 × 60 em dois formatos, 6 exemplos dirigidos). Componentes novos parseados como TS/TSX.
- **Não afirmamos:** que `npm run test:release` ou `tsc --noEmit` do repositório inteiro já passaram, nem aprovação Android física; esses gates são executados por `DIAGNOSTICAR-RAPIDO.sh` e `APLICAR-VALIDAR.sh` no Termux.
- SQL: migração aditiva já aplicada no Supabase conectado nesta sessão e auditada: tabela, FKs compostas, RLS e políticas. Uma segunda migração restringiu grants a SELECT/INSERT/UPDATE (sem DELETE/TRUNCATE). O instalador ainda exige verificação do ambiente alvo, pois o bash não aplica migração.

## Instalação / validação

Baixar o `BASE64.txt`, então:

```bash
cd ~/storage/downloads || exit 1
BASE64_FILE=$(find "$HOME/storage/downloads" /sdcard/Download -maxdepth 2 -type f -iname '*M4P2*BASE64*.txt' -print -quit 2>/dev/null)
[ -n "$BASE64_FILE" ] || { echo 'BASE64 NAO ENCONTRADO'; exit 1; }
base64 -d "$BASE64_FILE" > VAULT-M4P2-CLINICA-MEDICAMENTOS-360.zip && \
unzip -t VAULT-M4P2-CLINICA-MEDICAMENTOS-360.zip && \
unzip -o VAULT-M4P2-CLINICA-MEDICAMENTOS-360.zip && \
bash VAULT-M4P2-CLINICA-MEDICAMENTOS-360/DIAGNOSTICAR-RAPIDO.sh && \
bash VAULT-M4P2-CLINICA-MEDICAMENTOS-360/APLICAR-VALIDAR.sh
```

**A migração SQL foi aplicada e verificada na instância Supabase conectada; conferir que o ambiente alvo é a mesma instância antes de publicar.** Depois do `M4P2_APROVADA_LOCALMENTE | V63_V70_TS_OK` e verificação real do Supabase:

```bash
M4P2_SQL_VERIFICADO=1 bash ~/storage/downloads/VAULT-M4P2-CLINICA-MEDICAMENTOS-360/PUBLICAR.sh
```

Se falhar: `bash ~/storage/downloads/VAULT-M4P2-CLINICA-MEDICAMENTOS-360/COPIAR-FALHAS.sh`. Nenhum commit/push se falhar. Rollback local: `ROLLBACK-LOCAL.sh`, que **não apaga** tabela SQL criada (aditiva e vazia se a UI ainda não usada). Nunca usar `git add -A`.

## Validação servidor (read-only)

```sql
select table_name from information_schema.tables where table_schema='public' and table_name='surgery_consultation_links_m4';
select policyname,cmd,roles from pg_policies where schemaname='public' and tablename='surgery_consultation_links_m4';
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.surgery_consultation_links_m4'::regclass and contype='f';
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='surgery_consultation_links_m4';
```

## Riscos e recomendações seguintes

- Relações novas não dão automaticamente prova de autorização para procedimento, prescrição ou consentimento médico. Metadados de fonte e documento devem ser conferidos posteriormente.
- A sincronia entre aparelhos deve ser homologada com internet desligada, dois aparelhos e mudança de pessoa. Não inferir que o botão salvo significa que a nuvem concluiu.
- Testar horas com teclado Android, paste, seleção do texto, inicial preexistente e Enter, no APK e na PWA.
- Testar todos os formatos extras nas miniaturas da listagem, formulários e Studio com cor preta e branca.
- Próxima linha de evolução: Reabilitação 360 auditando Tratamentos, Registros de Saúde e Cirurgias, sem criar duplicatas; continuidade dos achados A3, V22 e relatórios mais recentes.
