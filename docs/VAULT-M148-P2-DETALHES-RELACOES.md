# VAULT M148 P2 — Detalhes relacionais de medicamentos e contexto auditável

**Base de publicação:** M148 P1 `c5c423b9b9cc0317d76e3f51bae632094358d286`, GitHub `main`.
**Natureza:** cirurgia de apresentação e navegação. Nenhuma migração de banco, alteração de doses, prescrições, movimentação de estoque, sincronização, cronologia, algoritmo de risco ou dados clínicos.

## Mudanças incluídas nesta P2

1. **Três portas de entrada nos Detalhes:** Tratamento, Fornecimento e Receitas/Contexto. Cada uma abre sua seção já existente por hash/scroll e mantém a autoridade dos módulos atuais. Os links respeitam se existe rotina/estoque e o `ClinicalDisclosure` abre sob demanda.
2. **Mapa completo preservado:** `MedicationDetailNavigation` continua funcional e com os mesmos destinos, mas fica recolhível para não ocupar a primeira dobra.
3. **Tratamento suspenso e SOS:** a área operacional V94.1 continua disponível para fatos, mas a ação se torna visualmente secundária, com o texto **Registrar uso já ocorrido** e uma ressalva explícita. Não há outro handler de dose nem sugestão de nova administração.
4. **Fornecimento sem confundir eventos:** retiradas agendadas abertas, atrasos de agendamento, aquisições futuras e saldo informado são distintos. Aquisição planejada não comprova compra, recebimento ou entrada no estoque.
5. **Fabricantes contextualizados:** a `Etiqueta declarada` e o fabricante associado à **última aquisição realizada** aparecem separados. Só usa fabricante registrado no evento da própria aquisição; se o último evento não informar fabricante, não preenche automaticamente com um evento mais antigo. Mantém acesso ao PharmaLens V7 e aos relatos M127/M129.
6. **Central de Ocorrências M144:** retira o botão solto no rodapé da tela de detalhes e incorpora o acesso discreto ao mapa, preservando `return_to`. A entrada principal continua em Minha Saúde conforme M148 P1.
7. **Navegação:** `window.location.hash` abre os disclosures existentes, incluindo reabertura do mesmo destino; nenhuma rota clínica é renomeada e nenhuma nova autoridade de negócio é criada.

## Proteções dos contratos antigos

- **M109:** não introduz altura artificial nos cards da listagem.
- **M136:** não altera a tarja regulatória vertical fina, original e clicável.
- **P9:** preserva o resumo operacional compacto com `min-h-10`.
- **M147 P0/P1:** mantém proveniência temporal, ocorrência retroativa e SOS suspenso. A nova mudança no detalhe alinha o botão principal ao estado suspenso.
- **M148 P1:** mantém pílulas SVG e campos de identidade visual.
- **V92.3/V299/V319/V328/V343:** navegação direta, componentes clínicos, disclosures e ações originais protegidos.
- **M143, M144, M145, M146, Brain V7 e SS7:** suites de regressão direcionadas e gate global V63/V70.

## Gates

- Pré-voo dirigido: **26 suítes**, nesta ordem: M148 P2, P9, M109, M136, M148 P1, M147 P0/P1, V343, V94.1, V94, V320, V300, P15 R6/R7, V319, V92.3, V328, V299, M129, M128, M144, M145, M146, M143 P3, Brain V7 e Supply Shield SS7.
- Gate global real: **uma execução** de `npm run test:release` no Termux; inclui V63, V70 e `tsc --noEmit`. Logs e backups ficam no dispositivo.
- `sha256sum -c SHA256SUMS`, comparação exata do commit de origem, worktree detached isolado, arquivos originais preservados, `git diff --check`, allowlist explícita, SHA das fontes antes/depois dos testes.
- `git add --` de seis caminhos explícitos; sem `git add -A`, `git reset --hard`, stash, clean, push forçado ou alterações no checkout original.
- Se alguma âncora ou contrato falhar, **não publica**. Push automático somente após os gates e confirmação de HEAD remoto estável.
- Não é homologação visual real em PWA/APK: avaliar no celular depois que a Vercel estiver READY.

## Roadmap preservado para continuidade

**Primeiro, homologar a M148 P2 no aparelho:** identificação, ações de tratamento, links de fornecimento/receitas, fábricas, retorno após ocorrência, diagnóstico de SOS e estados sem dados. Checar que nenhum card foi deslocado ou perdeu a tarja regulatória.

**Após a M148 P2, backlog ainda aberto (sem inventar numeração oficial):**

- Home/Hoje: validar no aparelho o agrupamento de Clonazepam e demais medicamentos, a separação de fatos diferentes, retrospectivos vs futuros e a densidade das retiradas. M147 P1 foi publicada; aprovação por testes não substitui a verificação visual.
- Central de Ocorrências: Meu Saúde é a entrada principal (M148 P1); revisar UX de contingências, ciclos curtos, vacinas, procedimentos, relatos e proveniência. Evento retroativo mantém a data do fato; hora de lançamento não vira hora da ocorrência.
- Estoque e Supply Shield: entrada por caixas/frascos/cartelas com unidade e conversão **explicitamente confirmadas**; revisão guiada de saldo desconhecido; compras futuras e retiradas agendadas não geram estoque; preservação de idempotência/offline/SUS.
- Receitas: checklist e prazos regulatórios configuráveis, aceitação físico/eletrônico SNCR conforme documentação atual, com alertas não vinculantes e sem presunção de aceitação universal.
- PharmaLens: linha do tempo de fabricantes, mudanças concomitantes, relatos D1/D3/D7/D30, comparação apenas observacional e resumo para consulta sem inferir causalidade.
- Brain V7 / M119 / M122: evidências, fontes, horários reais, lacunas, períodos de cobertura, risco relacionado a SOS, Chrono-Overlap prudente e segurança; jamais bloquear registro factual ou inferir dose recomendada.
- Fênix Studio: enquadramento e geometria dos acessórios, tênis/boné/óculos, wearables somente vinculados e sincronização real com fonte/última importação, custo de GPU e acessibilidade no Android.
- PillStudio / identidade visual: preservar SVG fiel a apresentação configurada, cores, forma farmacêutica, tarja regulatória, tipografia legível, touch targets e responsividade.
- Navegação e Mobile: contratos de voltar à origem, Safe Area, PWA/APK em larguras distintas, sem `select` nativo novo, haptics e toasts onde fizer sentido.

**R1–R7 do catálogo Brain V7 anterior são frentes de planejamento, não commits oficiais.** O roteiro será reavaliado no HEAD posterior à P2 para não reaplicar o que já foi implementado. Não transformar relatos pessoais em decisão clínica ou inferir causalidade.

## Homologação sugerida

PWA atualizado: abrir medicamento de uso contínuo, temporário, SOS ativo e SOS suspenso. Abrir Tratamento, Fornecimento e Receitas, voltar de uma aquisição e da Central de Ocorrências, comparar fabricante declarado com histórico registrado; validar casos sem estoque, sem receita, sem aquisições e com retirada agendada após a data.

**Resultado esperado:** `M148_P2_PUBLICADA_GITHUB=<sha>`; isso confirma GitHub, não Vercel READY ou APK atualizado.


## M148 P2 FIX1 — Compatibilidade SOS V94.1

O pré-voo original bloqueou em `scripts/test-v94-1-sos-runtime-contract.mjs` porque a expressão antiga esperava a divisão `continuo ? extra : sos`. A produção já emprega outra lógica correta, `sos`/`esporadico` → `sos`, demais registros avulsos → `extra`. Esta FIX1 substitui a asserção lexical por verificação da expressão **extraída do AST real do `QuickDoseModal.tsx`**, exercitando SOS, esporádico, contínuo e temporário. Também exige que o repositório persista `dose_kind` e preserva todas as demais verificações do V94.1 e os demais testes do gate. Nenhuma linha de código de registro de dose, estoque ou prescrição é alterada por esse conserto.

### Backlog reservado — M148 P3, padronização de badges

- Unificar **estética de etiquetas de fabricante, laboratório declarado e farmácia**, mantendo a origem semântica separada (`etiqueta cadastral` ≠ `fabricante da última aquisição` ≠ `farmácia da compra` ≠ `origem SUS`).
- Badge premium reutilizável com Lucide, tipografia/tamanho/borda/coerência dark e cor determinística para qualquer nome, inclusive não cadastrado. Conhecidos podem ter paletas mapeadas; **não apresentar cores de fallback como identidade oficial da marca**.
- Normalizar aliases (acentos, espaços, caixa e grafias alternativas) antes de escolher cor e rótulo, sem reescrever histórico nem fundir empresas distintas.
- Exigir consistência na lista, detalhes, histórico de aquisições, PharmaLens, fornecimento e cards de farmácias, com testes de nomes desconhecidos e contraste/a11y no Android.
- Esta P3 está **planejada, não executada**; depende da publicação e homologação da P2 e auditoria da UI de farmácias.


## M148 P2 FIX2 — Navegação de detalhes V92.3

O contrato V92.3, originalmente escrito antes da extração de módulos, procurava as quatro URLs de Médico/Hospital/Local/Farmácia **somente** em `app/saude/medicamentos/detalhes/page.tsx`. Hoje as rotas são corretamente montadas no componente `MedicationCareNetworkDetails.tsx` e a página passa `onNavigate={href=>router.push(href)}`. Além disso, o link real de aquisição usa `encodeURIComponent(renovacao.id)` com retorno contextual.

A FIX2 não altera nenhuma dessas rotas de produção. Ela atualiza V92.3 para conferir os cinco caminhos por **comportamento semântico**: vínculo real com o App Router, autorização de tipos, ID presente, montagem da rota real extraída de código, codificação de caracteres especiais e retorno. Os demais checks de aquisição, receita, reload proibido, fechamento do menu, rotas diretas e contrato transversal continuam. V92.3 foi antecipado para o começo do pré-voo, evitando perder o ciclo inteiro antes da verificação.

**M148 P3:** continua pendente e prioritária após publicação da P2: padronização de badges de laboratório, fabricante e farmácia para conhecidos e desconhecidos, cores determinísticas, aliases e ícones Lucide, sem misturar as fontes dos registros nem atribuir cor oficial a uma paleta gerada.
