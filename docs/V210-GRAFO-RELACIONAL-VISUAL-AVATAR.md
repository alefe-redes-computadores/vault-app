# V210 — grafo relacional, visual e Avatar

## Cirurgia

- O comando de fornecimento passa a montar uma única projeção relacional por conta e pessoa.
- Processos indexam itens, ciclos, documentos e retiradas nos dois sentidos necessários à tela.
- Relações órfãs ou pertencentes a outra conta/pessoa não entram no grafo.
- Medicamentos, documentos, farmácias e locais usam mapas de acesso constante durante o render.
- As cores agora comunicam função: compra em rosa, SUS em verde, documento em violeta e atenção em âmbar.
- O Avatar ganha pupilas ligadas à expressão e substitui cinzas fixos pelos tokens do tema.

## Garantias

- Processo encerrado continua no histórico, mas não bloqueia um novo fornecimento do medicamento.
- Processo ativo continua bloqueando duplicação.
- Nenhuma relação dependente atravessa conta, pessoa ou processo pai.
- O refinamento facial não cria loop de animação nem novos recursos remotos.

## Gate

O contrato `test-v210-supply-relationship-visual-avatar.cjs` valida isolamento, órfãos, índices bidirecionais, mapas globais por conta, paleta sem azul/ciano nessa área e expressão do Avatar. Ele integra o release gate geral.
