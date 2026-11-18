# D4 P1 — Jornada Terapêutica Observacional

Status: pacote candidato em 18/11/2026. Sem aplicação/commit até usuário executar e validar Termux.

## Arquivos e responsabilidades

Alterados apenas `components/saude/TemporaryCourseMedicationCard.tsx`, `scripts/test-vault-m59-medication-journey.cjs` (mock compatibilidade) e `scripts/test-v63-release-gate.mjs`.
Criados `lib/clinical/temporary-course-journey-d4.ts`, `components/saude/TemporaryCourseJourneyD4.tsx`, `scripts/test-vault-ci360-d4-p1-jornada.cjs`, este relatório e V11.

Não toca navegação da IA 2.0 P1/P2, 5 abas, Explorar 31 áreas, botão +, backstack, CareFlow, doseLogs, Brain V5, banco, RLS, repositórios, prescrições, notificações ou saldo.

## Comportamento

Dia X de N aparece somente com nota canônica parseada e datas calendáricas válidas. `prazo encerrado` não afirma tratamento concluído.
Contam apenas DoseLogs `planned` com mesma conta/pessoa/medicamento/motivo, com confirmação em `tomado_em`, ignorada em `ignorado_em` e demais sem decisão.
Duplicatas, datas impossíveis ou desfechos duplos exigem revisão, mas não são resolvidos automaticamente.
O acompanhamento M1 existente é preservado após cada período e não é interpretado como prescrição nova.

## Dependências e validação

MACRO3 (`8b5530186f9f5f5d41289b6fa4cdf5f03b99f24e`) ancestral; P4-D review registrada no HEAD.
Diagnóstico global real obrigatório via clone Git isolado + V63 + extras + TypeScript + diff check.
Somente após aprovação e revisão do usuário: push do commit isolado. Android/APK ainda precisa de aceite real.

## P2, não implementado

Encerramento explícito por evento canônico, interrupção documentada, rescheduling e reconciliação de notificações/sync.
