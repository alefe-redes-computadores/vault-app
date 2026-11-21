# VAULT A4 MACRO1 — Tratamentos Versionados 360

**Corte:** 21/11/2026, GitHub `main` publicado em `63a5174cf902f745d6876b379588d5565db8a6b7` (A3 MACRO2). Base: V19/V21/V24/V25 e continuação V26 anexada. Esta cirurgia é uma extensão da A1, não reconstrução da A3 nem da autoridade de exames M1–M3.

## O que entrou

- **Uma autoridade:** `a1_treatment_phases` é o ledger existente; não criar `treatment_regimen_phases` paralelo nem inventar status novo em `tratamentos`.
- **Eventos reais:** início/ajuste/pausa/retomada/conclusão declarados, com data efetiva e fonte `relato_pessoal`, `orientacao_profissional`, `documento_revisado`, sem eleger uma fonte automaticamente “médica comprovada”.
- **Regime A4 opcional:** medicamento, dose, frequência, horários (00:00–23:59), via, lateralidade, sítio, revisão/fim previsto, consulta/documento via IDs com conferência de conta/pessoa.
- **Histórico local-first:** transação Dexie da A1 coloca evento+fila; sincronizador genérico `syncClinicalA1Ledger` e pull existente permanecem. PDF/acervo, documentos e notificações não são reimplementados.
- **UX Premium:** `TreatmentRegimenA4` acoplado ao detalhe existente. Registro expansível, Timeline declarativa, contexto de pessoa, `HealthRelationPicker`, `CustomDatePicker`, dados editados sem select nativo visível. Não modifica o visual dos cartões Compacto/Conforto de Medicamentos.
- **Banco:** migração apenas adiciona `regime_a4 jsonb`, constraint e trigger invoker de integridade/imutabilidade/ID real. Não altera dados históricos. Sem novas tabelas/índices Dexie ou rotas clínicas concorrentes.

## Invariantes fundamentais

1. Uma previsão de revisão/fim não encerra tratamento nem prova dose tomada.
2. A fase `conclusao` é um evento declarado; não modifica silenciosamente status do pai, outros tratamentos ou medicamentos.
3. A dose descrita é documental, **não** altera plano de lembretes, `DoseLog`, estoque, receita ou aquisição.
4. A mesma conta/pessoa deve possuir medicamento, consulta e documento vinculados. O banco recusa ID cruzado.
5. Nunca alterar evento anterior; registrar outro evento para corrigir uma declaração. A1 antigo continua legível com `regime_a4=NULL`.
6. Não criar pessoa, tratamento ou medicamentos de demonstração no Supabase real.
7. Após salvar localmente, status informa **sincronização pendente** quando apropriado. Nenhum indicador promete entrega remota concluída sem confirmação.
8. A3 MACRO2 e M4 P2 preservadas por hashes de blobs, gate e controle de concorrência.

## Instruções de validação — Termux

1. Confirme que A3 MACRO2 já está publicada e seu clone local coincide com `origin/main`. Preservar alterações rastreadas de outros chats.
2. Execute `bash VAULT-A4-MACRO1-TRATAMENTOS-VERSIONADOS-360/INSTALAR-VALIDAR.sh`.
3. O script confere SHA256 do pacote e hashes de **4 blobs** base; aplica patch só na worktree, compartilha `node_modules` do projeto e executa A4 dirigido, V112, A0/A1/A3/M1/M2/M3/M4, UX360, TypeScript e V63/V70 integrais. Não alterar código só para satisfazer string de teste obsoleta: comprovar comportamento correto.
4. Apenas se houver `A4_MACRO1_APROVADO_LOCALMENTE` o código novo é copiado com backup local, **sem commit/push**.
5. Aplicar e verificar SQL aditiva `supabase/migrations/20261121_a4_regimen_on_a1_treatment_phases.sql` no projeto Supabase `vault-app` pela ferramenta oficial; **nunca executar via bash Termux sem credencial confirmada**.
6. Verificar remotamente coluna/trigger, RLS existente, negação entre contas e ausência de dados modificados no rollout. O publicador exige marcador de SQL da instância correta; a ferramenta do chat o certificará após verificar.
7. Rode `PUBLICAR.sh` apenas após os itens 4–6; ele revalida HEAD remoto, hashes do patch e allowlist do stage (4 MOD + 7 NEW), faz commit e push sem force.
8. Validar GitHub Actions do SHA publicado e APK físico (320/360/393/430dp, teclado, retorno, modo avião, alternância de pessoa e atualização de sync). Gate local e CI não substituem essas provas.

## O que não foi declarado como encerrado

- Processos SUS, fornecimento e inventário de estoque permanecem nas autoridades existentes da A3.
- Prescrição multimedicação, documentos futuros, revisão por profissional com assinatura, calendário nativo, Brain/Modo Médico/PDF e alertas de curso serão integrados após confirmação da relação A1/A4, sem criar outro registro.
- Reabilitação 360 (`A6/M5`), Internações (`A5`), Jornada Cirúrgica (`A7/M6`), Vacinas (`A8`), Alergias e Procedimentos (`A9`), Android Premium global (`A10/A11`) seguem no V26, incluindo D4 P4, PharmaLens P4-E, Health Connect/portabilidade e E2E Storage/RLS.
- A4 SQL trigger não substitui os testes adversariais com duas identidades autenticas: isso continua obrigatório e só pode ser registrado após executar no Supabase real.

**Protocolo de colisão:** mudanças paralelas nas quatro fontes aprovadas bloqueiam com nome do arquivo, e nenhuma cópia acontece antes do gate. Não usar `git add -A`, `git reset --hard` ou force push.


## FIX1 de reconciliação legítima com M5 publicada (21/11/2026)

A M5 foi publicada em `cee9c07d9ea0a5c3d16d514c37becba5005764cf`.
Somente `scripts/test-v63-release-gate.mjs` colidiu com as quatro modificações da A4: a M5 acrescentou `test-vault-m5-reab-macro1.cjs`. O gate da A4 preserva M5 e A3 e acrescenta seu próprio contrato, sem zerar os demais. Os hashes de `types.ts`, `repository.ts` e detalhes de Tratamentos permanecem os aprovados da base A3.

Esta reconciliação protege o instalador; não é declaração de A4 funcionalmente completa. O relatório V27 e o V26 Final superam o corte V26 original nos estados de M5/SQL. SQL nuclear M5 já aplicada; não reaplicar.
