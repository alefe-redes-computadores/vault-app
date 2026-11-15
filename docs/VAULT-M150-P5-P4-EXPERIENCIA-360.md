# VAULT M150 P5 P4 — Reconstrução da Experiência Premium 360

## Base protegida e fronteira clínica

Base exata: `c48ccfe05c5908c22dde0a38a6ca43bc374862c4` (M150 P5 P3). Sem alterações em receitas, movimentos de estoque, doses, prontuários, banco, sincronização, Supabase ou migrações. Aplicador rejeita outros blobs/HEAD, só usa worktree descartável; backup seletivo, allowlist, gate V63/V70/tsc, branch candidata isolada, GitHub CI obrigatório antes da promoção separada da main. Nenhum push main no instalador.

## Mudanças entregues

- **A39/A40 — Explorar premium:** novo hub em duas colunas, Compass violeta, cards de prioridade diferenciada por domínio, grupos expansíveis reais, pesquisa instantânea e 22 rotas canônicas preservadas. Sem nova barra inferior: Hoje/Documentos continuam no rodapé e acessíveis no hub via busca e agrupamentos. Home continua direcionada à ação; Explorar apenas navega.
- **A34/A35/A36/A37 — Medicamentos:** faixa de conteúdo com altura mínima por densidade, sem cortar informações ou fixar altura máxima; badge visual único com Factory, sem fingir que o laboratório da etiqueta é da aquisição efetiva; princípio ativo abreviado visualmente, mantendo rótulo assistivo; chips separados SUS, Comprado e dose com cores específicas. Origem histórica/híbrida é qualificada; dose exibida é cadastrada, não tomada confirmada.
- **A33 — Retirada/recebimento:** projeções de lista/agenda não tratam retirada `agendada` com `renovacao_realizada_id`/`realizada_em` como aberta. Quando houver aquisição SUS posterior à data de uma retirada que permanece agendada, o CTA da lista de medicamentos passa a pedir `Conferir vínculo` (e mantém acesso ao detalhe original), sem fechar a retirada automaticamente ou inventar compra/recebimento. Caso não haja recibo/vínculo, o compromisso permanece aberto e precisa de inspeção do registro real. É impossível certificar a situação pessoal do caso de produção apenas pelo código.
- **A38 — Home:** evita dois cartões de ação para **o mesmo ID canônico de retirada administrativa**: agenda permanece a superfície operacional; alerta SUS `sus-retirada-{id}` da mesma retirada não repete CTA. Outro medicamento, outro ID, risco clínico, documento, estoque e receita mantêm seus alertas independentes. No hero, acesso a `Ver doses e horários` fica direto; a explicação técnica do contador migra para detalhes sob demanda.
- **A40 — Navegação:** Home `Ver todas` recebe a identidade Compass sem alterar as cinco posições da barra inferior, e sem criar atalhos redundantes na primeira grade Explorar.

## Critérios de aceite no Android

1. Navegar Home → Explorar → Medicamentos e voltar; usar a pesquisa para localizar Hoje, Documentos, Brain e SUS; assegurar 22 rotas canônicas e nenhuma segunda BottomNav.
2. Validar um cartão com fabricante da última aquisição e outro com etiqueta declarada: mesmo ícone, cores preservadas, `aria-label` descreve fonte. Cor do SUS difere de Comprado; dose âmbar e não confundida com tomada.
3. Confirmar que a Home não mostra a mesma retirada canônica em Agenda e trilho SUS, preservando atenção clínica que tenha fenômeno distinto.
4. Inspecionar retirada da metadona no dado real: se existe agendamento residual distinto, **não** encerrar por dedução. Conferir ID, vínculo do recebimento e estado de sincronização, e então regularizar legitimamente na tela de detalhes. Não criar segunda entrada no estoque.
5. Confirmar 4/5 doses de contínuos, agenda de Hoje e doses por período sem misturar denominadores; botão de doses abre Hoje.
6. Testar modo compacto/conforto, viewport pequeno e Safe Area; campos de receita, anexos e SOS não perderam funcionalidade.
7. Validar React #310 em ambiente sintético (dose ignorada por falta de estoque), sem mexer em dados reais; esse bug não é declarado definitivamente resolvido por esta cirurgia.

## Riscos e pendências posteriores

- A33 tem **projeção read-only**, não reconciliação automática de eventos clínicos divergentes; exige auditoria do ID real antes de qualquer correção transacional.
- O layout da Home continua contendo componentes de áreas secundárias mais abaixo; esta cirurgia resolve equivalência forte de retirada e prioriza doses, mas homologação visual Android precisa confirmar ausência de outras redundâncias ou contrastes.
- Fênix/acessórios/câmera e wearables mantêm a P5 P3; sem suposições de leitura de smartwatch/anel.
- M152B active probing permanece governado/off até consentimento, limite de perguntas e migração comprovados.
