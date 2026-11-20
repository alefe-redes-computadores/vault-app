# VAULT 360 — M4 P1 | Jornada Clínica Relacional — auditoria e integração não destrutiva

Data de preparo: 20/11/2026. Base GitHub confirmada: `702c32149bd67b2f64c2ee96c51a3475774d94e1` (M3 publicada; Action/Android ainda não verificados por esta cirurgia). O instalador permite HEAD concorrente apenas quando os quatro blobs modificados continuarem idênticos.

## Auditoria de módulos existentes

- **Consultas**: `consultas` possui agendada/realizada/cancelada, desfecho estruturado, tratamentos, CIDs, médicos, anexos e retorno. **Não criar consulta pré-operatória concorrente**.
- **Cirurgias**: `cirurgias` possui procedimento, data, status agendada/realizada/cancelada, tratamento_ids, cid_ids, document_id, hospital e médico. Não inferir alta ou pós-operatório de `realizada`.
- **Exames**: M1/M2 têm `exam_orders`, `exam_order_items`, `exam_sessions`, `consultation_exam_order_links` por ID, resultado com comprovação, e notificações próprias. Manter tudo canônico.
- **Documentos/Laudos**: `documents` histórico e M3 `clinical_assets`/`clinical_asset_links`; um PDF pode ligar N itens com asset único. Não clonar arquivos.
- **Episódios clínicos**: CareFlow `buildClinicalEpisodeP4` já usa consulta como âncora e não infere fatos. M4 é visão de **múltiplos módulos**, não substituto.
- **Tratamentos**: vínculos explícitos em consulta e cirurgia, estados próprios, sem duplicação de registro.
- **Reabilitação**: não há módulo clínico dedicado; `app/recuperacao` é recuperação de dados. Não tratar fisioterapia como concluída sem cadastro real. M5 exige auditoria dedicada.
- **Dexie**: v50 já pertence à frente A1. Esta M4 P1 não muda schema nem SyncQueue nem Postgres e não disputa versionamento com outras frentes.

## O que esta cirurgia entrega de fato

1. Nova **visão de consulta** `/saude/jornada` (com parâmetro `?consulta=id` ou `?cirurgia=id`), **sem criar novo cadastro**.
2. Ligações comprovadas da cirurgia: `tratamento_ids`, `document_id` ou `documents.entidade_tipo='cirurgia'/entidade_id`. Relações por nome e data são proibidas.
3. Ligações comprovadas da consulta: `tratamento_ids`, `document_id` ou `documents.entidade_tipo='consulta'`, `consultation_exam_order_links`, itens/sessões reais e M3 asset links.
4. Seleção simultânea de consulta/cirurgia gera duas trilhas **separadas** com alerta; a M4 **não afirma** que ambas pertencem ao mesmo episódio cirúrgico.
5. Consultas com tratamento compartilhado aparecem apenas em **Contextos a conferir**, nunca como pré-operatório comprovado.
6. Links de retorno aos módulos escritores originais; HealthRelationPicker nativo VAULT; Layout compacto, seguro e acessível.
7. Isolamento por `user_id` e `person_id` antes de compor qualquer projeção; nenhum `put`/`add`/`enfileirarOperacao` na M4 P1.
8. Integração sutil nos detalhes de Cirurgia, Consulta e no Hub CareFlow, sem remover ou alterar o fluxo anterior.

## Próxima fase dependente de contrato novo (M4 P2)

Para associar uma consulta diretamente a uma cirurgia — inclusive com papel pré-op / retorno / reabilitação — **não basta um tratamento em comum**. Criar uma tabela de relações explícitas requer migração Postgres com RLS e FK por dono+pessoa+destino, Dexie v51 ou superior sujeito à linha A1 vigente, outbox idempotente, pull, tombstone e recuperação offline. **Essa escrita não foi inventada nesta P1.** Após homologar o layout e o gate, podemos executar P2 como cirurgia exclusiva, preservando os autores de cada cadastro.

## Gates e riscos

- 1 contrato adicional `test-vault-m4-clinical-journey.cjs`: valida TSX/TS sintático, 120 cenários estrangeiros, um laudo para vários itens, 12 exames separados, nenhum resultado inventado, vínculos por ID, entrada pelas telas e controle de titulares.
- Pré-voo adaptado da M3 FIX1 (22 verificações dirigidas, gate V63/V70+TS, varredura exaustiva em reprovação; backup/rollback seletivo sem git add -A).
- Sem nova migração, nem SQL, nem binários, nem notificações. Action verde e revisão Android físico continuam obrigatórias.
- `TOTAL` do scanner corresponde ao gate atualizado: M3 + M4 + V70 + TypeScript; números variam conforme evolução do repositório.

## Homologação visual no aparelho

1. Abrir `/saude/jornada` com pessoa ativa; usar seletores próprios do VAULT.
2. Cirurgia agendada deve permanecer agendada, mesmo quando a data está no passado; sem sinal de alta.
3. Consultas com tratamento comum devem estar na área “Contextos a conferir”, sem ligação direta presumida.
4. Consulta com pedido e 12 itens deve mostrar todos os itens e somente resultados recebidos registrados.
5. Troca de conta ou pessoa deve limpar seleção; nenhuma informação da pessoa anterior deve ficar visível.
6. Back e retorno preservados; nenhuma ação da jornada deve gravar ou alterar consultas, cirurgias, tratamentos, exames ou arquivos.

## Sequência

M4 P1 → auditoria de comportamento no APK → M4 P2 vínculos persistentes tipados (quando necessário) → M5 Reabilitação 360 somente após inventário de Tratamentos/Registros/Consultas.

## M4 P1 FIX1 — ajuste de tipagem pós-scanner

O scanner real da M4 P1 executou 533 verificações e apontou somente a fase TypeScript.
`components/saude/ClinicalJourneyM4.tsx` usava um `within` genérico que recebia
apenas a estrutura dos métodos `where/equals/toArray`: o TypeScript perdia o tipo
específico de cada coleção (`Cirurgia`, `Consulta` etc.) e os atributos próprios.
A FIX1 substitui isso por dez consultas Dexie concretamente tipadas, cada uma com
filtragem `owned` genérica dos próprios registros. A projeção, a RLS, a estrutura
local e os dados clínicos não sofreram alteração. O gate completo continua exigido.

Evidências isoladas da FIX1: TypeScript TS5.8 com inferência de 10 retornos
concretos e compatibilidade com `ClinicalJourneyInputM4`; 160 assertivas do
contrato M4; sintaxe TSX; simulador de patch em diretório descartável. O gate
V63/V70/TypeScript do projeto real permanece pendente até execução do usuário.
