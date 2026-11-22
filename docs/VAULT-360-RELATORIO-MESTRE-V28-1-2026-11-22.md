# VAULT 360 — Relatório Mestre V28.1

**Data de consolidação:** 22/11/2026
**Base publicada auditada:** `7e01973cfb1e198b12c21de6f707ca72402cc960`
**Escopo:** fechamento do Teste Guiado, CareFlow, Home/Hoje, pressão arterial, Linha de cuidado, Consultas, Modo Médico 360, PDF e prevenção de regressões transversais.

## 1. Estado congelado

O commit `7e01973` publicou a A7/M6 FIX4 sobre a V28. A comparação com `b15b7cc` confirmou exatamente 25 caminhos: 10 modificados e 15 novos, com 1.390 inserções e 9 remoções. Não houve arquivo estranho no commit.

A FIX4 restaurou no Modo Médico as fases A4, os fatos longitudinais M5 e acrescentou fatos A7 sem remover o parser de pressão, a Home/Hoje, o CareFlow ou os contratos de medicamentos da V28.

## 2. Classificação do Teste Guiado

| Frente | Estado após auditoria | Evidência ou fechamento V28.1 |
| --- | --- | --- |
| Home | Corrigida e preservada | Projeção aguarda hidratação; acompanhamento abre pressão filtrada, consulta por ID e sintoma no formulário correto. |
| Hoje | Corrigida e preservada | Plano de pressão é retirado da lista duplicada; ação canônica do compromisso permanece; testes V28 preservados. |
| CareFlow | Complementada | Grade ímpar não deixa o card final órfão; Safe Area e densidade continuam explícitas. |
| Linha de cuidado | Corrigida e preservada | Sem chips fixos de Humor/Ansiedade/Fadiga; atalhos só aparecem com contexto real; pressão abre filtrada. |
| Pressão arterial | Complementada | Parser 14682 e 14/9 preservado; formulários são mutuamente exclusivos; toast e recolhimento após salvar; título não repete horário; Editar/Encerrar preservados. |
| Consultas/Atendimento | Corrigida e preservada | Lista contínua, especialidade, relações explícitas, sem aba Próximas vazia; consulta recente abre o ID real. |
| Modo Médico 360 | Reconciliado | A4, M5 e A7 presentes; detalhado mantém todos os fatos selecionados; violeta reservado ao Brain; CTA factual em esmeralda. |
| Biblioteca/PDF | Corrigida e preservada | Pluralização, filtro por titular, geração explícita e paridade prévia/PDF permanecem; compartilhamento não é automático. |
| APK físico | Homologação ainda necessária | Teclado, toque, status/navigation bars e renderização 320–430dp exigem aparelho real. Não são declarados homologados por teste estático. |

## 3. Mudanças efetivas da V28.1

1. Abertura de Novo plano recolhe Registrar pressão; abertura de Registrar pressão recolhe Novo plano.
2. Medição salva limpa os campos já existentes, recolhe o formulário e emite toast de sucesso.
3. Plano salvo emite toast; o texto do lembrete não incorpora novamente o horário armazenado no campo `time`.
4. Ação Linha de cuidado abre `?foco=pressao`.
5. Card contextual da Home abre plano de pressão no recorte real, consulta recente por ID e sintoma diretamente no formulário.
6. Último card de uma grade ímpar no CareFlow ocupa a largura disponível em telas a partir de 360px.
7. Sintomas deixam de usar o violeta do Brain; CTAs factuais do Modo Médico usam esmeralda, azul ou âmbar.
8. O contrato V28.1 foi integrado ao V63 sem quebrar a ordem histórica M92 → M93 → M94.

## 4. Autoridades preservadas

| Domínio | Escritor | Leitores/projeções | Regra |
| --- | --- | --- | --- |
| Pressão medida | `saveHealthMeasurement` | Linha de cuidado, CareFlow, Modo Médico e PDF | Plano ou lembrete não comprova medição. |
| Plano de pressão | evento `monitor_plan` | Home, Linha de cuidado e CareFlow | Datas não encerram ou confirmam medições automaticamente. |
| Consulta | repositório/useConsultas | Home, Atendimento, Modo Médico e PDF | Relação depende de ID, nunca de proximidade de data. |
| Tratamento | A4/fases versionadas | Modo Médico e PDF | Fase não altera dose, estoque ou status por inferência. |
| Reabilitação | tabelas M5 | Modo Médico e PDF | Sessão planejada não significa realizada. |
| Cirurgia | cirurgia + fatos A7 | Jornada, CareFlow, Modo Médico e PDF | Tempo não altera status cirúrgico. |
| Brain | ledger do Brain | Cards explicitamente identificados | Violeta é reservado à interpretação do Brain; não é fato clínico bruto. |
| PDF privado | biblioteca local por pessoa | Biblioteca CareFlow | Geração e compartilhamento exigem ação humana. |

Todos os leitores continuam limitados por `user_id` e `person_id`. Nenhuma correção V28.1 cria novo escritor clínico ou coluna de banco.

## 5. Matriz A0–A11

| Módulo | Situação documental segura em 22/11/2026 |
| --- | --- |
| A0 | Integridade 360 já documentada; preservada, sem alteração V28.1. |
| A1 | Engenharia clínica e Macro2 já documentadas; preservadas. |
| A2 | Não reclassificado por esta cirurgia: nenhum artefato A2 novo foi instalado. |
| A3 | Receitas/Fornecimento 360 já documentado; preservado. |
| A4 | Tratamentos publicado; fases restauradas no Modo Médico pela FIX4. |
| A5 | Internações publicada e SQL aplicada; relações continuam explícitas. |
| A6 | Não reclassificado por esta cirurgia: preservar o estado publicado existente. |
| A7 | M6 publicada em `7e01973`; fatos, equipe e jornada presentes. |
| A8 | Vacinação permanece próxima frente planejada, não implementada pela V28.1. |
| A9 | Procedimentos permanece frente posterior, não implementada pela V28.1. |
| A10 | Sem mudança de estado nesta cirurgia; requer artefato próprio antes de classificar. |
| A11 | Sem mudança de estado nesta cirurgia; requer artefato próprio antes de classificar. |

“Não reclassificado” evita transformar ausência de evidência em conclusão. O módulo não é declarado ausente nem concluído sem seu pacote e gate próprios.

## 6. Gates e resultados

- V28.1 dirigido: 18/18 verificações aprovadas.
- V28 Health Macro: aprovado.
- Continuidade A7/V28: 16 contratos aprovados.
- V28 Medicamentos visual: 16 verificações aprovadas.
- TypeScript completo: aprovado com as dependências reais do projeto.
- `git diff --check`: aprovado.
- V63 integral: continua encontrando a falha legada M131 no mesmo ponto da base `7e01973`. Comparação base/candidata confirmou zero regressão nova até o primeiro bloqueio. A publicação deve usar o gate diferencial, não apagar a dívida antiga nem restaurar snapshots anteriores à V28.

## 7. Homologação física obrigatória

Após instalar/publicar, testar no APK em 320, 360, 390, 412 e 430dp:

1. CareFlow sem card órfão, faixa preta morta ou área vazia inferior.
2. Teclado aberto nos formulários de plano e medição sem ocultar Salvar.
3. Alternância entre os dois formulários sem concorrência visual.
4. `14682`, `14/9`, `1500` e `15:00`, confirmando ausência de salto de foco.
5. Toast, limpeza e recolhimento depois de salvar medição.
6. Editar e Encerrar plano, observação persistida e contador atualizado.
7. Home e Hoje sem duplicação, flicker ou FAB cobrindo conteúdo.
8. Modo Médico: A4, M5, A7, pressão manual separada, busca, filtros e PDF equivalente à prévia.
9. Status bar, navigation bar, Safe Area, foco, toque e retorno Android.

## 8. Contratos obrigatórios para as próximas frentes

- uma autoridade de escrita por domínio;
- relação somente por ID explícito;
- o mesmo fato projetado em Home, Hoje, CareFlow, Brain, Modo Médico e PDF;
- Lucide e mapa de cor coerente; violeta somente para Brain;
- CTA principal esmeralda e alvos de toque com pelo menos 44px;
- nenhum FAB cobrindo conteúdo ou Safe Area;
- nenhuma sigla interna, enum cru, data ISO ou plural mecânico;
- estados vazios compactos e sem esconder função;
- links direcionados ao registro correto;
- testes por comportamento, ownership e geometria, sem restaurar snapshots obsoletos.

## 9. Fronteira entre chats

Este pacote modifica somente oito caminhos de produto/teste e parte de `7e01973`. Ele não inclui A8, A9, nova migração, alteração Dexie, Supabase, sync ou escritor clínico. Outro chat deve partir do SHA publicado após a V28.1 e preservar este relatório e o contrato `test-vault-v281-guided-close.cjs`.

## 10. Critério de conclusão

A V28.1 pode ser classificada como **aplicada e aprovada localmente** após o instalador concluir todos os gates. Torna-se **publicada** apenas após o publicador seletivo criar commit e push. Torna-se **homologada no Android** somente depois do checklist físico acima. Esses três estados não são equivalentes.
