# VAULT M127 — Fechamento Definitivo 360

## Base

`main` = `52bacd5fc5509ac0aeed186c70d98386819e9283` (M126).
A cirurgia não altera o armazenamento de doses, as regras clínicas ou a geração de documentos.

## Mudanças reais

1. **Reagendamento de retirada**: campo editável HH:MM, teclado Android, máscara, validação antes de salvar, escolha explícita de deixar vazio, histórico existente preservado. Elimina modal interno atrás da camada de reagendamento.
2. **Receita a partir da retirada**: CTA contextual apenas quando existe pendência de receita, abrindo o formulário de planejamento de receita já existente com a pessoa e medicamento preservados pelo fluxo.
3. **Brain/Home**: preserva reservas para sinais importantes; reserva também sinais importantes/críticos na fila de próxima ação, mesmo quando há domínios diferentes. O recolhimento de 3 sinais na tela de detalhes permanece como estabelecido e testado na M125. Evidências, limitações e fonte seguem auditáveis.
4. **Tratamentos**: distingue explicitamente vínculos confirmados de candidatos/legado; não atualiza medicamentos sem confirmação e não converte CID em vínculo.
5. **Fabricante**: check-ins voluntários D1, D3, D7, D30 vinculados ao mesmo evento de aquisição, preservados no campo histórico `observacoes` sem nova tabela ou dados paralelos. Editar fabricante não apaga relatos; relatos não fazem juízo de superioridade ou causalidade. Sem notificações automáticas.
6. **Lote M126**: sucesso parcial retira itens já concluídos da seleção na mesma sessão e preserva erro claro; após reiniciar, o histórico deve ser conferido antes de tentar novamente. Sem promessa de idempotência transdispositivo; o repositório ainda é a autoridade de estoque.
7. **Relatório mensal**: data ISO dentro de descrições é apresentada como data brasileira, preservando origem e limites.

Home e Hoje já têm suas telas de comando e contexto M120–M126; não recriamos páginas ou atalhos duplicados nesta cirurgia. O relatório clínico M124 permanece governando as seções; não copiamos um segundo gerador. Interrupção real continua sob M125.

## Homologação Android após publicar

- Reagendar retirada com 09:00, verificar data/hora e histórico após fechar e reabrir APK. Testar sem horário definido e entrada inválida.
- Abrir pendência de receita pelo detalhe da retirada, conferir que apenas planeja/solicita e não adiciona estoque.
- Simular três ou mais sinais de segurança na mesma área, conferir ordem e expandir os relacionados.
- Fazer D1/D3 com dados fictícios em evento de teste e garantir que observações históricas e fabricante persistem.
- Testar lote de cadastro fictício com sucesso e falha parcial, evitando duplicidade. Não usar aquisição real para teste.
- Verificar relatório mensal sem ISO cru nas descrições e conferir dados biométricos.

## Gates

Preflight do HEAD, blobs exatos dos arquivos modificados, ausência de stage, backup seletivo, patch com âncoras únicas, `node scripts/test-vault-m127-closure.cjs`, `npx tsc --noEmit`, `npm run test:release`, `npm run check:versions`, `git diff --check` e allowlist. Sem commit, push ou deploy automático. Publicador separado só após homologação.

## R2 — compatibilidade V313

O detalhe de renovação mantém a única consulta reativa do grafo. A gravação de relato passa pelo hook mutation-only `useRenovacaoActions`; não cria assinatura global `useRenovacoes()`. A verificação V313 passa a rodar antes do gate longo.
