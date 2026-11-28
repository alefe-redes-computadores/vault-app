# VAULT Macro02 — retomada preservada / manifesto de evidências

Corte: 2026-11-28. Laboratório somente; não é autorização de publicação.

## Identidade imutável
- Main reconciliada na leitura: 49c3aabde83bf0b2480a84bb5e967922e41975f2.
- Candidata recuperada: e6ef2cc5506963b5dc6fe9fad40790e79bf3b101; tree 18575a1b5da20acb21a11e531aa6403793b72922.
- Checkpoint ancestral protegido: 0e718c5fa18510d9a89d2d1a8285e668f3817c6a.
- Nenhum código de produto foi reconstruído nesta retomada; workflows novos validam exatamente a árvore acima.
- Esta branch contém isolamento Vercel e workflows de laboratório. NÃO fazer merge da branch inteira na main. Usar somente a árvore candidata/allowlist abaixo, reconciliar novamente a main, testar o resultado e obter Guardian independente.

## Allowlist da diferença candidata/main original (2 commits, 10 arquivos)
- components/saude/Macro02PreparationR6.tsx
- lib/dose-premium/auto-preparation.ts
- lib/dose-premium/cutover-fence-read.ts
- lib/dose-premium/cutover-preflight-diagnostic.ts
- lib/dose-premium/cutover-projection-lab.ts
- lib/dose-premium/cutover-recovery.ts
- lib/sync/macro02-auto-preparation.ts
- lib/sync/macro02-preflight.ts
- scripts/macro02-cause-root-contracts.cjs
- scripts/test-vault-macro02-operational-recovery.cjs

## Evidências verificadas
- 46174058405: recuperação PostgreSQL R3 e Chromium/IndexedDB/WebCrypto aprovados; operação ativa falhou por ausência de pré-requisito CAS R04 no laboratório.
- 46174755851 e 46174912537: operação ativa PG17.6 aprovada com CAS R03/R04 originais, ajuste/aquisição quantificada e não quantificada/prescrição, recibos, CAS, rollback e concorrência.
- 46175240042: LEGACY_PRIVATE_BACKUP_SEVEN_DETACHED_PERSISTENCE_PASS, REAL_CLIENT_HASH_RECEIPT_LOST_RESPONSE_IDEMPOTENCE_PASS, ACTUAL_RECEIPT_ACTIVATION_SEVEN_HISTORY_ROWS_PASS. Artefato 15275382049, SHA256 d975c6d9ce938ddf11139fbed2b23f75a31c1220f28060abf4618cf8eaee0e83.
- 46175443012: repete as provas e exige NON_JSON_EXACT_ADD_ONLY_RECOVERY_PASS, restaura um registro ausente na cópia descartável com propriedade undefined, confere SHA idêntico, simula perda da confirmação após commit, reusa operação e ativa via recibo efetivamente calculado. Artefato 15274649601.
- 46174912571: web export/contratos herdados aprovados no job integrado; teste antigo de UI falhou por esperar mensagem obsoleta após sucesso de conferência. Log mostra epoch local correto e fila clínica vazia. Artefato 15275720166 preserva diagnóstico. Gate cumulativo paralelo sem conclusão no corte.
- 46175528970: novo teste exige epoch persistido, desaparecimento do cartão de verificação e acesso efetivo à Central Premium, antes dos testes reais de dose/offline/reconexão. Sem conclusão no corte.

## Limites e preservação
Dados exclusivamente sintéticos; PG17.6 descartável; transporte/autenticação emulado no laboratório. Ajuste da FK de renovacoes.medicamento_id somente na fixture descartável para reproduzir a ausência de FK verificada no catálogo produtivo. Nenhuma SQL produtiva, freeze produtivo, ativação de conta, APK ou publicação nesta retomada. Migration03 20261127205009 e CAS R04 20261127152804 já registradas, não reaplicar. A prova das sete referências históricas é reprodução compatível, não diagnóstico confirmado do aparelho real. Não criar medicamentos/doses/recibos fictícios na produção, não apagar histórico e não enfraquecer a validação.

## Bloqueios de entrega
Concluir V63/V70/TS/export Android, novo teste browser integrado e qualquer regressão detectada; reconciliar HEAD atualizado e obter Guardian independente antes de merge/produção. A homologação física e a ativação da conta do proprietário continuam não realizadas. Nenhum teste do proprietário é solicitado nesta etapa. Os resultados dos Actions devem ser lidos na execução correspondente, não inferidos deste manifesto.
