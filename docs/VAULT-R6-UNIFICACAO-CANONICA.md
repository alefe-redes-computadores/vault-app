# VAULT R6 — Histórico clínico unificado (sobre R5 aprovada)

## Problema corrigido

O CareFlow apresentava pedidos, sintomas e pressão como históricos independentes da área de Saúde, embora sintomas e aferições já utilizassem os dados canônicos. A R5 preparou a identidade relacional e a criação contextual; a R6 consolida a **leitura e navegação das listas**.

## Resultado

- **Exames e Laudos:** exames de `useExames` e pedidos `projectExamOrdersM2` entram na mesma lista de leitura, ordenada por data. Identificador e tipo discriminam cada linha; pesquisa por pedido inclui seus itens e não cria relacionamento falso por nome. **Um pedido com 15 exames é UM card expansível, com contador, estado resumido e 15 linhas internas (não 15 cards).** A listagem conserva cartões separados apenas para exames realmente cadastrados como entidades individuais.
- **Pedidos:** a área CareFlow mantém criação detalhada, conferência manual de OCR e deep links antigos por ID. A entrada genérica para visualizar pedidos leva à lista única de Exames; salvar retorna à lista principal.
- **Sintomas:** a Linha de cuidado é a lista principal filtrável. A rota CareFlow serve ao registro enriquecido e aos links diretos por ID, usando `createRegistro` já existente.
- **Pressão:** aferições e planos passam a ser encontrados na Linha de cuidado sob um único foco, com botões para criar plano/registrar aferição. Medições continuam no repositório de saúde; planos permanecem eventos `monitor_plan`, sem virarem medições.
- **Compatibilidade:** URLs com hash histórico continuam abrindo o registro relacionado; telas antigas sem ID passam para a lista principal. BottomNav, Safe Area R4 e apresentação do Brain R5 são preservados.

## Limites deliberados

Não há migração, `INSERT`, `UPDATE` ou `DELETE` de dados clínicos nesta cirurgia. `useExames` e `careflow_events_m2` permanecem repositórios de entidades diferentes. Uma solicitação NÃO é um exame realizado, um plano NÃO é uma aferição, e dois exames com o mesmo nome NÃO são vinculados automaticamente. Uma futura migração estrutural só deveria ocorrer com relação explícita e provas E2E, nunca para apenas unificar a interface.

## Gates

Gates de R1, R2, R3, R4, R5 e R6 (inclusive pedido de 15 exames = 1 card), TypeScript global, `git diff --check`, SHA-256 de estado anterior/aplicado. V63 integral e APK na Action do commit conjunto; homologação visual física separada.

## Publicação conjunta

**Não rode `PUBLICAR.sh` da R5 após aplicar R6.** O pacote R6 possui um publicador conjunto que confere a aprovação da R5, a aprovação da R6, os hashes finais de todos os arquivos, o HEAD local/remoto, o stage vazio e a allowlist exata antes de fazer um único commit/push normal. Se falhar, não faz reset nem force push. Todos os backups ficam privados no Termux.

## Compatibilidade e Modo Médico — R6

- Histórico anterior permanece nas tabelas originais, sem migração nem cópia. Leitura unificada por origem/ID; gravação nova só na autoridade de cada tipo de entidade.
- Rotas antigas não são removidas; seus IDs e `return_to` são preservados. Formulários de entrada são focados, com BottomNav ocultada apenas no editor.
- `medical-dossier-p3.ts` continua sendo o modelo comum da prévia e do PDF A4; eventos de pedido, item, status, resultado, plano e aferição apontam para a origem exata quando o parentesco e a pessoa ativa permitem. `monitor_reading` não repete uma aferição já exibida em Medições.
- O episódio clínico também abre pedidos e itens pelo ID. Vínculos por nome semelhante ou mesma data não são inferidos.
- A R6 continua sem alterar sincronização, esquema do banco, eventos legados, estoque ou protocolos médicos.
