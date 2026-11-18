# VAULT CI360 — P6/P6 MACRO 3 — Brain Clinical Intelligence 360

**Escopo:** integrar uma revisão clínica factual no Brain V7 existente, sem criar outro Brain ou outro mecanismo de alertas.

## Autoridades reutilizadas

- `BrainV7UniversalConsole` e `projectBrainUniversalV7`: painel e dossiê observacionais originais; não substituir dados.
- `getClinicalStockSnapshot`: única autoridade de estimativa, preservando `unknown`, `empty`, `negative`, `available`. SOS não ganha previsão de autonomia em dias.
- `brain-v5` e ledger de alertas: permanecem a autoridade de estado/soneca/resolução. Nenhum novo alerta ou push foi implementado.
- `historico_dosagens` e `registros_saude`: só comparar séries com três **dias distintos antes** e três depois, na mesma chave, com escala 0–10, sem causalidade.
- `consultas`: consultar somente vínculos por ID; `orientacao_profissional` é **relato registrado** e não comprovação de prescrição ou autorização de dose.
- `dose_logs`: apenas `tomado_em` válido com timezone comprova tomada; conflitos, agendadas e horas ausentes são excluídos e reportados.
- `retiradas`: registros concluídos não geram nova ação nem saldo; análise somente leitura.

## Limites clínicos

Sem ajuste de dose, horário, medicamento, estoque, diagnóstico, avaliação de reação adversa ou recomendação de uso SOS. A associação temporal não permite determinar resposta terapêutica. Informações ausentes permanecem desconhecidas. A camada não substitui uma base auditada de interações medicamentosas.

## Integração

A seção `BrainClinicalReviewMacro3` aparece **na tela Brain V7 original**, usa as queries IndexedDB indexadas por conta+pessoa, amplia o histórico de observação para 70 dias e incorpora ao mesmo dossiê de consulta/PDF local.

## Operação

Worktree isolada, patch por âncoras, backups Git preservados, SHA256, TSC global, testes dirigidos, V63/V70. Sem SQL, sem importação, sem commit automático. Android físico e decisões médicas ainda precisam de homologação; estatísticas são observacionais.
