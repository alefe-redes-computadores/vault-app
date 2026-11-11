# M120 — Comando Diário Coerente · navegação com memória

Base GitHub `ae001f4f23a3347d56dd651e22251f5bc782d671` (M119).

- Home = prioridade; Hoje = sequência cronológica e confirmação explícita; Brain = explicação e evidências.
- M120 não cria segundo Brain, CareAction ledger, registro clínico, filtro de autoridade nem banco. A decisão central `careCommand.decision` continua canônica.
- Em Hoje, mudar data preserva filtros de status, período, compromisso e visualização, foco de doses, revisão retroativa e retorno seguro; `action=dose` não destrói o contexto.
- Links de Hoje para retirada, medicamento, lembrete e sugestão carregam `return_to` com dia e filtros atuais.
- URLs aceitam apenas opções enumeradas, data calendárica real e caminhos relativos seguros. Não transportam `user_id`/`person_id` nem valores clínicos.
- O novo aviso compacto só aparece em navegação contextual; fornece explicação do filtro, acesso aos filtros e retorno à origem, sem dizer que uma dose foi confirmada.
- Home recebe pequeno texto de orientação sobre as responsabilidades das telas, sem novos cartões e sem mudar o destaque/CTA existente.
- A projeção de ações e a deduplicação já são da autoridade `care-command.ts`; não são reimplementadas aqui.

## Fora do escopo

- Nenhuma mudança no motor de doses, estoque, notificações, auto-reparação ou tabelas IndexedDB.
- Nenhum `router` de cartões históricos com API Next é substituído por objeto mock.
- QA físico Android de teclado, back, offline, rolagem e telas 320/360 px continua pendente de verificação no aparelho.

## Teste manual

1. Home: tocar Hoje e navegar via cabeçalho sem ação clínica automática.
2. Hoje: aplicar status Pendentes e período Noite; mudar a data; conferir filtros conservados.
3. Em Hoje, abrir uma retirada e voltar pelo botão de retorno; data e filtros devem continuar.
4. Abrir `?focus=doses&status=pendentes&time=23:00`; confirmar foco de horário e botão de filtros.
5. Voltar à origem quando houver `return_to=/...`; links externos, `//` e barra reversa não são aceitos.
6. Alternar pessoa/conta e verificar que somente o loader/hook atual publica o snapshot clínico, nunca o parâmetro da URL.

O instalador nunca publica. O publicador somente aceita hashes pós-gate e staging explícito.
