# V214 — Rede de Cuidado, Avatar e Cérebro

## Cirurgia

- A página Rede agora consome uma única projeção relacional da pessoa ativa.
- Medicamentos, tratamentos, consultas, exames, cirurgias, renovações, registros,
  CIDs e retiradas são isolados uma vez; os prestadores vinculados são derivados
  dos mesmos conjuntos em passagem linear.
- `hospital_id` e `local_id` permanecem relações independentes, inclusive quando
  identificadores iguais ou cruzados aparecem nos cadastros globais.
- Totais ativos e consultas dos próximos 30 dias são calculados pelo mesmo índice,
  mantendo `getDaysUntil` como autoridade temporal.

## Experiência

- O Avatar afunila os planos orbitais sob as sobrancelhas e remove a segunda camada
  de brilho dos olhos, melhorando a leitura do rosto sem animação contínua.
- A geometria afunilada parte de `BoxGeometry`, evitando os trilhos gigantes vistos
  em alguns drivers WebGL Android; dedos ficam atrás da tela e o relógio usa pulseira
  plana em vez de um aro artificial.
- O cérebro deixa azul e ciano genéricos na classificação central: qualidade usa
  rosa de revisão, financeiro usa verde e compras usa laranja.
- Receita isolada ganhou próxima revisão editável, foto/PDF com compensação de upload
  em falha e linguagem explícita de que não altera aquisição ou estoque.
- SOS com saldo positivo deixa de pedir receita automática na listagem. SOS zerado
  oferece “Planejar reposição” e cria compromisso futuro; estoque só entra quando o
  recebimento for confirmado.

## Gate

O contrato V214 cobre isolamento entre pessoas, todos os vínculos da Rede,
separação Hospital/Local, imutabilidade, contagens, integração da página e as
alterações visuais do Avatar e do cérebro.
