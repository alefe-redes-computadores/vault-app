# VAULT D4 P2 R1 — Declaração pessoal de conclusão/interrupção

## Fase e autoridade
- D4 P1 é pré-requisito COMMITADO na main. Ocorre depois de IA 2.0 P1 e P4-D.
- Dados autoritativos de horários/decisões de dose continuam em `doseLogs`; um **relato pessoal** de conclusão ou interrupção **não é** um evento clínico de alta, nova prescrição, suspensão farmacológica ou dedução de adesão.
- Novo array opcional `decisoes_d4` no contexto clínico M1 do medicamento, mesma coluna JSON já sincronizada. Preserva `regimes` e `revisoes`. Sem migration SQL.
- Retificação: nunca reescrever evento; novo registro referencia `substitui_id` do último evento daquele curso, máximo oito versões por curso e 120 eventos por medicamento. IDs de intenção estáveis na tela; D4 não garante resolução de conflitos multi-dispositivo sem E2E.

## Fluxo
- Cada período em detalhes do medicamento tem declaração opcional de "Concluí o período" ou "Interrompi o período"; data real e observação opcional.
- Prévia mostra pendências existentes; confirmação explícita de que esta declaração não encerra agenda, não altera receita, não elimina dose e não muda estoque.
- Bloqueia calendário inválido, identidade de curso divergente, pessoa/conta trocada, horário duplicado e uma segunda decisão que não seja retificação.
- Salva via `medicamentosRepository.update`, que valida conta/pessoa e encaminha o contexto clínico ao sync existente.
- Não altera Home, Hoje, listas do IA 2.0, Explorar, barra inferior, botões +, CareFlow, rotas ou modelos Supabase.

## Escopo
Modificados: `lib/clinical/episode-m1.ts`, `components/saude/TemporaryCourseMedicationCard.tsx`, `scripts/test-vault-m59-medication-journey.cjs` e `scripts/test-v63-release-gate.mjs`.
Novos: `lib/clinical/course-decision-view-d4.ts`, `components/saude/CourseDecisionControlD4.tsx`, `scripts/test-vault-ci360-d4-p2-decisoes.cjs`, esta documentação e Relatório V12.

## Homologação humana
1. Em um medicamento de período conhecido, abra detalhes; observe status P1 e tela nova P2.
2. Tente registrar sem ciência explícita; não deve salvar.
3. Declare conclusão/início da interrupção e revise data; somente declaração pessoal deve ser persistida.
4. Reabra e retifique com novo tipo; evento anterior deve continuar no histórico JSON, sem apagar dose.
5. Observe se notificações e pendências continuam preservadas (P2 não reconcilia alertas).
6. Troque de pessoa: não permitir gravação cruzada. Verifique cópia local/offline e sincronização real em dois dispositivos separadamente.
7. Verifique 25 achados visuais e IA 2.0 em aparelhos pequenos; esta cirurgia não considera a UX global homologada.

## Dependências para fase seguinte
D4 P3: revisar explicitamente com paciente a resolução de horários futuros, reconciliação de notificações nativas e status operacional por curso, **sem apagar dados históricos**. Exige decisão de produto, provas de sync e teste físico; não é implementada nesta entrega.
