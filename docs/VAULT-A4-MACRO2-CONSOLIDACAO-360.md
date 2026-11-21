# VAULT A4 — MACRO2 | Consolidação longitudinal factual 360

**Base confirmada:** `89716d5d5f9ba597c21128c1e0258e8ad9623d77` (A4 MACRO1 FIX2 publicada, M5 Premium preservada).

## Objetivo

Completar as superfícies de leitura do registro A4 sem inventar diagnóstico ou alterar suas autoridades.

### Autoridade única

- Fonte de fatos: **`a1_treatment_phases`**, da A1/A4. A tabela `tratamentos` preserva o cadastro atual, não substitui a cronologia.
- O JSON `regime_a4` foi adicionado na SQL da A4 MACRO1; esta MACRO2 não cria tabelas, colunas, triggers, workers ou arquivos privados duplicados.
- `renovacoes` e `a1_prescription_links` continuam autoridades das versões de receita (A3); `retiradas` continua autoridade da retirada e `doseLogs` das doses realmente registradas.
- Projeções são somente leitura, sem mudar `medicamentos`, estoque, horários do prescritor, fatos de terceiros ou avisos.

### Integrações concretas

1. **Tratamentos:** detalhe A4 preservado com link direto para o medicamento efetivamente vinculado. Previsão de revisão pode abrir a área existente de Lembretes, **sem criar um alarme automático**.
2. **Medicamentos:** jornada original preservada e pequeno histórico A4 filtrado pelo ID do medicamento + pessoa, sem supor prescrições ou tomar valores da farmácia como dose.
3. **Home:** até dois eventos recentes na superfície compacta; não ocupa espaço algum se não houver fato A4 real.
4. **Hoje:** o mesmo componente compacto apenas no dia atual, fora do modo de revisão retroativa. Não entra nas métricas de dose.
5. **CareFlow / Brain longitudinal:** inclusão cronológica das fases A4, por data efetiva real, com link de origem exata. `kind=tratamento_fase`, sem duplicar um registro existente.
6. **Brain V7:** widget somente leitura e bloco de fatos no texto do dossiê; o PDF solicitado pelo usuário passa a incluir as mesmas fases, sem autointerpretação.
7. **Modo Médico / PDF A4:** `treatmentPhases` capturado da Dexie indexada por conta + pessoa e projetado como `treatmentFacts` na camada de interface, sem imports executáveis no motor puro do dossiê; os fatos são passados à autoridade existente, sem montar um PDF paralelo. A seção Tratamentos torna-se selecionada por padrão em novos acessos (o usuário ainda pode desmarcá-la); fatos têm ID, data civil, tipo, origem e vínculos comprovados. Modo episódio só inclui fatos vinculados por consulta_id ou tratamento_ids explícitos.
8. **Layout:** mantém cards compactos, CSS Premium, Lucide, Safe Area, links acessíveis e campos relacionais. Nenhum `input type=date`, `datetime-local` ou `select` nativo novo; nenhum card vazio ou contador de progresso inferido.

### Limites clínicos e de privacidade

- Uma fase não comprova uso de dose, efeito adverso, descontinuação da prescrição nem evolução médica.
- Informações de profissional só podem vir de profissional da conta. Medicamento é resolvido apenas por conta + pessoa. Tratamento deve existir na mesma pessoa.
- Eventos `deleted_at` não entram em superfícies. Duplicação de ID é desconsiderada. As datas `YYYY-MM-DD` permanecem civis, sem conversão UTC para mudar o dia.
- Data planejada `fim_previsto` **não agenda notificação automaticamente**; o usuário escolhe se e como criar lembretes no módulo existente. Sem novo canal Android e sem agendamento silencioso.
- O PDF privado depende de gesto explícito e do fluxo de exportação/arquivo já existente. A atualização de pessoa/escopo entre montagem e download continua protegida pelo verificador existente.
- Sem novos campos livres que espelhem seletores, sem duas abas fictícias de cadastro/histórico.

### Verificações

- Teste próprio `test-vault-a4-macro2.cjs` integra o V63, incluindo 1.200+ casos de isolamento e cronologia, AST e checagens de ligação das superfícies.
- Pré-gates: teste A4 MACRO2, A4 MACRO1, V112, M5, Brain V7, Modo Médico PDF, TypeScript, `git diff --check`.
- V63 inteiro e ambos V70 executados **uma vez** sobre a worktree candidata; log mostra todos os testes e falhas acumuladas.
- Instalação bloqueia hashes divergentes; cópia somente após gates, backup seletivo com rollback; publicação por lista positiva, sem `git add -A`, sem force push.
- Android físico, experiência com duas contas/pessoas, tela estreita e pipeline do GitHub Actions devem ser conferidos após publicação. Testes herméticos não substituem esses testes reais.

### Fronteiras

Reabilitação M5/A6 recebe suas melhorias funcionais completas na frente responsável; A5 Internações, A7/M6 Jornada Cirúrgica e Vacinas A8 são domínios seguintes. Não duplicar essas autoridades na A4.


## FIX1 — reconciliação M5 MACRO2 (21/11/2026)
- Base publicada obrigatória: 957934184d7135b8e754194f3320484137a77977.
- Seis arquivos rastreados alterados pela M5 MACRO2 reconciliados via hashes novos:
  Home, Hoje, linha do tempo CareFlow, Modo Médico, projeção do dossiê, V63.
- Modo Médico reaproveita os imports db/useLiveQuery já inseridos pela M5;
  o predicado ready exige tanto o contexto de reabilitação quando selecionado
  como as fases A4 da pessoa ativa.
- Relatórios e busca detalhada preservam os dados de reabilitação da M5.
- O pré-gate agora roda a M5 MACRO2 e os modelos M3/P6 antes de V63, sem
  remover nenhum teste legado nem substituir interfaces premium.
- Não altera migrações, sync, 7 tabelas M5 ou a autoridade A1.

## FIX2 — correção de falso negativo do pré-gate

O teste `scripts/test-vault-a4-macro2.cjs` verificava integração do dossiê
por strings destinadas às interfaces. Como o read-model puro recebe
`treatmentFacts` por argumento (sem import de runtime A4), o teste retornava
falso negativo em `bridge aplicado em medical`. A verificação agora exige
o contrato tipado e a projeção real de fatos com isolamento owner/pessoa,
fonte `a4_treatment_phase` e seção Tratamentos. Sem mudanças de lógica
clínica, sem supressão de testes e sem sobrescrever M5.


## FIX3: auditoria do teste de efeito colateral
O preflight FIX2 reprovava indevidamente `seen.add(p.id)` como potencial escrita persistente.
Essa operacao grava somente no `Set` local para nao projetar eventos A4 repetidos.
FIX3 audita AST e bloqueia mutacoes de banco, agendamento e rede; preserva todas as interfaces reais.
