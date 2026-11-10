# VAULT M109 — Medicamentos compactos

Base obrigatória: M108 (`a2a1db41ce31fcb4518b041529e02b9ad5e6845a`).

## Resultado

- remove a altura mínima artificial dos cards;
- preserva a classificação regulatória vertical em uma faixa mais fina e acessível;
- mantém a cor regulatória na borda e a identidade pessoal no ícone;
- atualiza princípio ativo e classificação assim que o catálogo local termina de hidratar;
- evita que dados regulatórios já existentes só apareçam depois de recarregar a tela;
- reúne situação de hoje e estoque em uma linha operacional compacta;
- recolhe SOS no panorama comum e o abre quando filtrado;
- limita grupos longos aos três primeiros itens, com mostrar mais e recolher;
- compacta a introdução da lista sem alterar busca, filtros ou destinos;
- preserva dose rápida, retirada, reposição, Brain, estoque e detalhes.

## Limites

Esta cirurgia não altera dose, estoque, tratamento, sincronização, receita ou
autoridade clínica. Home e Hoje ficam para a próxima modularização.

## Validação

- `git diff --check`
- contrato M109 dedicado
- contratos visuais legados migrados para a nova semântica
- TypeScript sem emissão
- gate completo: 396 contratos aprovados
