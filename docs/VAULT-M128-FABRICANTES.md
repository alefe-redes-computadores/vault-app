# VAULT M128 — Fabricantes: edição segura e visão por medicamento

Base canônica: M127 `605628864f427254d1914e9a998332f30754580c`.

## Objetivos
- Editar o fabricante real de um evento de aquisição, sem alterar estoque, receita ou unidade.
- Separar observações humanas de `[VAULT:PRODUTO]` e `[VAULT:RELATO-FABRICANTE]`.
- Preservar relatos existentes D1/D3/D7/D30, mesmo se o laboratório identificado num registro histórico for corrigido; a origem do relato não é reatribuída.
- Tornar visível em Editar medicamento → Estoque, Compra & SUS o fabricante da aquisição mais recente, o histórico e um atalho para o evento.
- Permitir preferência pessoal **somente neste dispositivo**, explicitamente não sincronizada, em chave isolada por conta, pessoa e medicamento. Não alegar persistência cross-device.

## Autoridades
- `Renovacao` (aquisição real) é a verdade do fabricante da caixa/frasco.
- `Medicamento` não recebe fabricante automaticamente e não perde seu identificador canônico.
- Não há modificação de estoque, dose, prescrição, data de aquisição, ciclo de fornecimento ou notificação.
- A alteração de fabricante não reinterpreta relatos anteriores como relatos de outro fabricante.
- Nenhum banco remoto, schema ou variável de ambiente é alterado.

## Homologação Android
1. Editar aquisição com fabricante preexistente; trocar observação e conferir que metadados permanecem invisíveis no formulário e visíveis em Detalhes.
2. Limpar observação sem apagar fabricante e relatos D1/D3/D7/D30.
3. Corrigir fabricante em aquisição antiga e conferir que relatos antigos continuam atribuídos ao laboratório histórico.
4. Abrir Editar medicamento → Estoque, Compra & SUS; conferir a última aquisição e os fabricantes do histórico autorizado.
5. Salvar preferência local, sair/voltar, confirmar persistência no mesmo aparelho. Em outro dispositivo, não alegar sincronização.
6. Verificar prescrição pura, contas/pessoas diferentes, fluxo SUS, anexos e estoque sem regressão.

## Publicação
Apenas após aprovação no Termux e homologação funcional. Instalador sem commit/push/deploy. Publicador separado com manifesto SHA-256.
