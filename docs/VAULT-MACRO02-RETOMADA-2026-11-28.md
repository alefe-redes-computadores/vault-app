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


## Continuidade do segundo turno — 2026-11-28
- O job cumulativo 141071307349 (run 46174912571) terminou SUCCESS: root=0, typescript=0, v63=0, v70super=0, v70final=0, androidexport=0. Artefato 15275885757; SHA256 d01c04ef46ba4aae1420c225a1d69c3158a85a3df1579c7629f0ac8931535854.
- Main lida novamente: 49c3aabde83bf0b2480a84bb5e967922e41975f2; candidata e6ef2cc5506963b5dc6fe9fad40790e79bf3b101 está ahead=2, behind=0, dez arquivos exatamente da allowlist. Fechamento Stability Guardian 9ac387f4cb750611c73e4a66ace8a18c014ca8e6 é ancestral da main (ahead=0, behind=2).
- Revalidação 46175528970 (job 141073209696) falhou: UI de conferência permaneceu presente e epoch local ausente. Não é falso positivo de texto; a conferência rejeitou, ainda sem causa específica demonstrada. Não liberar produto.
- Teste novo multidispositivo 46176018970 (job 141074738972) utiliza dois perfis Chromium independentes e exige A -> B -> A com doses distintas, saldo, aquisição sem quantidade, IDs e ausência de fila clínica após ACK; não há reseed após início do teste.
- Diagnóstico integrado 46176102589 (job 141075028146) conserva as exigências da UI; em caso de falha coleta comparação de tabelas/categorias e erro técnico em uma tentativa separada que NÃO satisfaz o gate.
- Workflow PG17 previamente aprovado teve trigger restringido para não repetir por commits de documentação/harness. Código de produto inalterado, sem publicação ou migração produtiva.
- Ambos os testes novos estavam em execução na última consulta. Verificar os jobs/artefatos exatos, sem considerar status em andamento como sucesso. Se houver falha de produto, corrigir em branch protegida, fixar nova árvore e reexecutar os gates afetados.


### Diagnóstico da conferência de aparelho
- Run 46176102589 / job 141075028146: DEVICE_DIAG_SNAPSHOT_RPC_COUNT=0; comparação posterior sem divergência (equal=3, localOnly=remoteOnly=divergent=missingDependencies=0); DIRECT_VERIFY_SUCCESS_NOT_GATE. A tentativa de UI continua reprovada. Causa exata da rejeição original não foi registrada pelo componente.
- Hipótese concreta de interferência do harness: original anexa bundle com cliente Supabase independente DEPOIS da conferência; revalidação anexava DURANTE a conferência, podendo invalidar os listeners de autenticação do app. Não confundir hipótese com causa comprovada. Teste 46176018970 também falhou no primeiro aparelho com essa instrumentação.
- Commit laboratorial 62d581dd7920caea40caef00a916544022531687; run 46176561974 / job 141076496600 remove a anexação durante a conferência nos dois cenários, exige desaparecimento do cartão, epoch e hashes persistidos, duas leituras de snapshot e Central real. Executa ambos os cenários no mesmo build, com bases descartáveis distintas e coleta independente dos códigos de saída. A tentativa diagnóstica jamais satisfaz o gate. Nenhuma alteração de produto até aqui.
