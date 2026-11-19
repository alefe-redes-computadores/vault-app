# VAULT 360 — RELATÓRIO MESTRE V12 | Continuidade clínica, D4 P2 e coordenação IA 2.0

**Corte técnico:** 18/11/2026. **Fase:** candidato D4 P2 R1, ainda SEM aplicação/commit; V63 real pendente.
**Preservação:** inclui integralmente abaixo o V11, que por sua vez contém os V10/V9/V8/V7. Hierarquia de fatos: repositório -> execução real -> prints -> relatório histórico -> proposta.

## 0. Atualizações verificadas nesta transferência

- A cirurgia **P4-D** foi publicada com commit `be39dd8d4cb5973fc0e568281283abd2f07508b3`.
- A **IA 2.0 P1** foi confirmada publicada no commit `047b45388e26bcf52b07a2659c1945c53f957833`, com hubs e cinco abas.
- O usuário relatou **zero falhas no diagnóstico D4 P1**, e iniciou validação e publicação. **Não presumir commit até conferir GitHub.**
- A **IA 2.0 P2** pertence ao outro chat; decisões recentes: 19 listas com cadastro real recebem CTA contextual no cabeçalho; hubs mantêm menu `+`; paletas unificadas entre criação/Explorar/Saúde; revisar Android Back/rascunhos/ícones e Safe Area. **Não tocar essas telas neste pacote.**
- D4 P2 só executa depois da D4 P1 **COMMITADA e visível na main**. Aceita commits extras da IA P2 se suas âncoras ainda forem compatíveis; nunca sobrepõe sem revisar.
- O relatório V10 do Gemini foi recebido e preservado, incluindo matriz dos 25 achados UX e blueprint IA 2.0.

## 1. NOVA CANDIDATA: D4 P2 R1

**Objetivo:** registrar declarações pessoais explícitas de conclusão ou interrupção de um tratamento por período. A conclusão de calendário nunca é tratada como conclusão clínica. A operação não muda estoque, agenda, notificações, horários pendentes, prescrições ou eventos de doses.

**Modelo:** `CourseDecisionD4` (ID, chave canônica de período, tipo, data declarada, fonte usuário, nota opcional, data de registro, `substitui_id` para retificação). Campo **opcional** `decisoes_d4` anexado ao contexto M1 já existente. A normalização M1 preserva `regimes`, `revisoes` e decisões. No app, a pessoa escolhe a declaração, revisa a data, confirma que não haverá mudanças automáticas, salva via `medicamentosRepository.update` com conta/pessoa validadas, e pode retificar sem apagar eventos.

**Escopo modificado (4):** `lib/clinical/episode-m1.ts`; `components/saude/TemporaryCourseMedicationCard.tsx`; `scripts/test-vault-m59-medication-journey.cjs`; `scripts/test-v63-release-gate.mjs`.

**Escopo novo (5):** `lib/clinical/course-decision-view-d4.ts`; `components/saude/CourseDecisionControlD4.tsx`; `scripts/test-vault-ci360-d4-p2-decisoes.cjs`; `docs/VAULT-CI360-D4-P2-DECISOES-R1.md`; este V12.

**Riscos ainda NÃO homologados:** concorrência real com dois aparelhos e sync Last Write Wins; status observacional x operacional; supressão de lembretes; autoencerramento de medicação; adequação de no máximo 120 eventos M1; UX de retificação e data em telas pequenas. Não tratar esses itens como implementados.

**Gates:** diagnóstico completo em clone Git temp com V63 + V70 + extras, TypeScript e diff --check; falhas agrupadas em ZIP. Só depois validação seletiva e publicação separada. Falha no HEAD/âncora bloqueia sem alterar checkout.

## 2. Matriz operacional dos dois chats

| Frente | Responsável | Pode tocar | Não pode tocar sem coordenação |
|---|---|---|---|
| IA 2.0 P2 | Outro chat | cabeçalhos e CTAs nas 19 listas, hubs, ícones e paletas, retorno/Android Back, Safe Area | autoridade de DoseLogs, M1, decisões D4, estoque |
| D4 P2 | Este chat | contexto clínico M1, card de período, decisão auditável e contratos V63/M59 | Home, Hoje, Explorar, rotas, +, bottom nav, layouts e listas IA 2.0 |
| QA real | Proprietário, com suporte dos dois | vídeo Android, sincronização dois dispositivos, casos clínicos reais | inferir homologação apenas por gates |

## 3. Roadmap e próximos gates

1. Publicar D4 P1 e IA 2.0 P2, ambos com commits reais; evitar HEAD divergente.
2. Diagnosticar D4 P2 em clone isolado e publicar após aprovação.
3. Homologação física de 25 achados UX, consulta/medicamentos/pressão/PharmaLens, e fluxo D4.
4. D4 P3: **somente após contrato clínico explícito** de efeito operacional da interrupção, replanejamento seguro de futuras pendências e reconciliação de alertas. Nada de apagar eventos de dose.
5. P4-E: curadoria/revisão de catálogo com aprovação humana e RLS real; não confundir com P4-D offline.
6. Android 360/QG2/Fênix Studio, notificações anti-fadiga, backup e sync E2E offline multi-dispositivo.

## 4. Regras de retomada sem perda de contexto

Antes de nova cirurgia: inspecionar **GitHub HEAD**, `git status --short`, `git rev-list --left-right --count HEAD...origin/main`, commits D4/IA, arquivos conflitantes, logs de diagnóstico. Não aplicar ZIP de HEAD anterior. Ler primeiro este V12 e a documentação de D4 P2, e depois o V11 integral. Nenhuma cópia parcial dos relatórios antigos é aceitável.

---

# ANEXO INTEGRAL — RELATÓRIO MESTRE V11 (SEM SUPRESSÃO)

# VAULT 360 — RELATÓRIO MESTRE V11
## Continuidade integral de engenharia, cirurgia D4 P1, integração clínica, IA 2.0, Android e roadmap

**Data de corte documental:** 18 de novembro de 2026 (America/Sao_Paulo).  
**Repositório:** `alefe-redes-computadores/vault-app`  
**Ambiente:** Android/Termux (`~/projects/vault-app`), Next.js/TypeScript, PWA Vercel e APK Capacitor.  
**Entregas:** `~/storage/downloads` (ZIP + Base64 TXT).  
**Fontes:** relatório Gemini V10 completo fornecido pelo usuário; relatórios VAULT V7/V8/V9/V10; decisões comunicadas entre chats; leitura de código e commits GitHub; pesquisa oficial W3C, Anvisa, HL7 e Material Design.  
**Natureza:** documento de continuidade, não prova de homologação de funcionalidades no aparelho.

> **REGRA CENTRAL:** `PLANEJADO ≠ IMPLEMENTADO ≠ GATES VERDES ≠ APROVAÇÃO LOCAL ≠ PUSH CONFIRMADO ≠ VERCEL READY ≠ APK ATUALIZADO ≠ HOMOLOGADO NO ANDROID`. A cada retomada verificar `git log -1`, `git status --short`, `git rev-list --left-right --count HEAD...origin/main` e, se houver, execução/log recente.

---

## 1. Resumo executivo, decisões e limites

O VAULT 360 combina prontuário pessoal offline-first, medicamentos e doses, consulta/cuidado relacional, PharmaLens, inteligência observacional, regulatório e Fênix/Avatar em uma experiência Android/PWA premium. A evolução clínica D1–D3, CareFlow P0, UX360 R3 QG1, MACRO 1–3, P4-B e P4-C foi publicada em ondas. A P4-D, auditoria comparativa de catálogo em CSV, recebeu do usuário **zero falhas no diagnóstico isolado** em 18/11; ao início do trabalho D4, sua publicação GitHub ainda não estava verificada. **Atualização posterior:** push da P4-D confirmado na `main` pelo commit `be39dd8d4cb5973fc0e568281283abd2f07508b3`. Isso não comprova Vercel, APK ou homologação Android.

**Divisão entre chats:** O outro chat mantém a IA 2.0 (hubs, cinco abas, Explorar, botão + e retorno); este chat mantém evolução funcional clínica D4 e documentação de continuidade. Não produzir pacotes simultâneos alterando os mesmos arquivos. As alterações D4 P1 ficam intencionalmente fora de layouts de raiz, `app/layout`, `app/saude/*/page.tsx`, hubs, bottom nav, Home e diretório de 31 áreas.

**IA 2.0 P1 decidido no outro chat (informação comunicada, ainda não homologada):** barra inferior de cinco destinos — `Início`, `Hoje`, `Saúde`, `Documentos`, `Mais`; Minha Saúde como hub canônico, seis atalhos principais; Explorar como único catálogo de 31 destinos; Profissionais e locais subordinado à Saúde; ações `+` preservadas contextualmente, não remover acesso antes de garantir todas as ações; preservar IDs, rotas, favoritos e `return_to`/Back Android. A presença/ocultação do menu depende da classe de tela, e não deve atrapalhar formulários/câmera. O vídeo de homologação ainda é necessário.

**D4 P1 (esta candidata):** leitura do período de tratamento a partir de DoseLogs canônicos; informa **Dia X de N** somente para datas verificáveis com horários diários fixos (intervalos corridos recebem legenda própria), diferencia prazo registrado de conclusão efetiva, contabiliza *tomadas confirmadas*, *ignoradas explicitamente* e *horários sem decisão*. Expõe divergência de agenda, calendário inválido, duplicidade ou evento conflitante; não transforma ausência de registro em não adesão. Não há mudança no banco, notificações, Estoque, receitas, consulta, prescrições, retirada, calendário ou autosserviço de finalização. A conclusão/interrupção formal e a governança de alterações de curso serão escopos independentes D4 P2, dependentes de consentimento e autoridade comprovada.

### 1.1 Estado verificado e fila (fotografia após o push P4-D)

| Entrega | Evidência | Situação confiável |
|---|---|---|
| CareFlow P0 R4 | Commit `b0846d7c2afd…` | Publicada na `main`; homologação Android não assumida |
| D1/D2 | Commit `d07f524b7e6e…` | Publicada; curso/episódio já possuem autoridades |
| D3 | Commit `3608f9124284…` | Publicada; Brain do retorno canônico |
| UX360 R3 QG1 | Commit `7742453cdb02…` | Publicada; QG1/31 destinos |
| MACRO 1 Anvisa | Commit `b174d10bf6b0…` | Publicada; SQL de evidências apenas preparado |
| PharmaLens P4-B | Commit `d334d50c02db…` | Publicada |
| MACRO 2 | Commit `a0ca9ce2473f…` | Publicada |
| P4-C | Commit `8008d6740cda…` | Publicada |
| MACRO 3 Brain | Commit `8b5530186f9f…` | Publicada; leitura observacional, não prescrição |
| **P4-D revisão offline** | Commit `be39dd8d4cb5…` + diagnóstico zero relatado | **Publicada na `main`**; Android não homologado |
| **D4 P1** | Pacote desta entrega, gates sintéticos locais | Candidata **NÃO PUBLICADA**; exige P4-D rastreada no HEAD |
| IA 2.0 P1/P2 | Roadmap do outro chat, sem commit comprovado no corte | Planejada; concorrência só em arquivos não sobrepostos |
| Android real/Sync dois dispositivos | Vídeo e protocolos ainda não fornecidos nesta sessão | **Homologação pendente** |

**Regra operacional:** D4 P1 só diagnostica/instala no Termux quando a MACRO 3 é ancestral e `HEAD:docs/VAULT-CI360-P6-P4D-REVIEW-R1.md`, `HEAD:lib/medication-catalog/catalog-release-review-p4d.cjs` e teste P4-D estiverem rastreados no HEAD. Se a IA 2.0 publicar antes, o pacote aceita commits adicionais, mas exige as âncoras intactas; em caso contrário bloqueia sem sobrescrever.

---

## 2. Arquitetura e autoridade de dados — não duplicar

| Domínio | Autoridade/arquivo | Regras |
|---|---|---|
| Plano de tratamento por período | `lib/health-supply/temporary-course.ts` | `temporaryCourseSlots`, `temporaryCourseEnd`, `parseTemporaryCourseNote`; horários/dias declarados pela pessoa; nunca inferir posologia |
| Agendamento de doses e fatos reais | `lib/repositories/doseLogs.ts`, `lib/dose-plan-authority.ts`, `DoseLog` em `lib/types.ts` | `dose_kind=planned`, prefixo do motivo do curso, `tomado_em`, `ignorado_em`, pessoa/conta; não reclassificar SOS e avulsas |
| Hoje/agenda | `lib/today/build-timeline-items.ts` | Projeção, não segunda base; preservar distinção entre temporário/contínuo/avulsa |
| Notificações | `lib/dose-notifications.ts`, `lib/overdue-dose-notifications.ts` | Curso temporário requer DoseLogs explícitos; não gerar recorrência infinita após prazo |
| Revisão humana após curso | `components/saude/CourseReviewM1.tsx`, `lib/clinical/episode-m1.ts` | Observação pessoal registrada explicitamente; não equivale a prescrição de extensão ou alta |
| Cartão existente | `components/saude/TemporaryCourseMedicationCard.tsx` | Mostra períodos e encaminha edição; D4 apenas insere vista observacional dentro dele |
| D4 leitura | `lib/clinical/temporary-course-journey-d4.ts` | Pure function: `buildCourseJourneyD4`, `courseJourneyCaptionD4`; não grava nem agenda |
| D4 UI | `components/saude/TemporaryCourseJourneyD4.tsx` | Card com estado Dia X/N, pendências e ressalva; sem acesso DB, API, Supabase |
| CareFlow/consultas | Episódios e M3 existentes | IDs explícitos, eventos vinculados, evolução factual; não recadastrar nem reescrever prescrição |
| Brain V5 e D3 | Brain canônico + `lib/m3/brain-return-d3.ts` | Uma autoridade, alertas observacionais com limites, sem segundo motor |
| PharmaLens | `PharmaLensWorkspaceV7`, estúdio OCR opcional local | Comparação declarada/exata/extraída; sem OCR duplicado nem upload automático |
| ANVISA | MACRO 1, P4-B/P4-C e catálogo Supabase existente | Identidade de produto exato, versão, hash, fonte confiável; revisão humana e RLS |
| Revisão catálogo P4-D | `.cjs` de comparação CSV e script local | Apenas comparação de arquivos, não SQL/ingestão/importação/promocão |
| UX IA 2.0 | Hub R5, `clinical-directory-m150.ts`, bottom navigation | Pertence ao outro chat; preservar rotas e favoritos, sem alteração na D4 |

**Modelo DoseLog consultado no GitHub:** `id?`, `user_id`, `person_id?`, `medicamento_id`, `data`, `horario`, `tomado_em?`, `ignorado_em?`, `dose_kind?`, `motivo?` etc. Ausência de `person_id` no legado não deve implicar pessoa ativa; o D4 apenas considera registros explicitamente escopados, e não exclui nenhum registro real. Não interpretar contagem de horários como duração ou dose prescrita.

### 2.1 Integridade do curso: matriz de possibilidades

| Estado observado | Exibição correta | É proibido concluir |
|---|---|---|
| Dentro do período, data válida | "Dia X de N do período informado" | Que paciente tomou todas as doses anteriores |
| Agendamentos futuros | Contagem de horários registrados futuros | Que o medicamento já foi adquirido |
| Horário passado em aberto | "De dias anteriores sem decisão" | Que a dose foi ignorada/não aderiu |
| `tomado_em` explícito | Contar tomada confirmada | Que há estoque suficiente |
| `ignorado_em` explícito | Contar ignorada | Que houve falha terapêutica |
| Duração terminada | "Prazo registrado encerrado" | Que o tratamento foi concluído ou deve ser estendido |
| Todos os horários resolvidos | "Nenhum em aberto" | Que houve alta ou encerramento da prescrição |
| Dois registros para mesmo horário | Sinalizar duplicidade | Deduplicar, reescrever ou apagar automaticamente |
| Pessoa/conta diferente | Não exibir no escopo atual | Compartilhar dados entre perfis |
| Nota inválida ou intervalo incoerente | Conferência humana | Corrigir/retroprojetar doses automaticamente |

### 2.2 Limites e riscos conhecidos da D4 P1

1. A chave de curso existente agrupa registros por `medicamentoId + motivo`; se uma agenda foi editada com motivo diferente, o histórico pode aparecer como períodos separados. Isto preserva rastreabilidade e não presume equivalência.
2. Datas contábeis são comparadas sem depender de UTC do aparelho; relógio humano/horário de verão não deve alterar o Dia X/N para sessões locais. A D4 não calcula por conta própria a hora exata da última dose; consulta `temporaryCourseEnd` canônico, cujo último horário pode cair no dia seguinte em intervalos corridos (por exemplo, primeira dose às 08h e ciclos de 8 em 8 horas). Por isso a legenda de intervalo não promete Dia X/N civil.
3. Sem DoseLogs explícitos não há curso D4 a mostrar. A falta de registros não é apagada ou substituída por prescrição inferida.
4. O painel não oferece botão "Concluir". Antes de introduzir essa ação é necessário decidir se a autoridade canônica será um evento de conclusão por curso/pessoa com dedupe e sincronização, e como tratar doses pendentes e notificações sem alterar histórico.
5. M1 já oferece avaliação subjetiva depois do período; D4 não sobrepõe sua coleta nem atribui causalidade à resposta.
6. A publicação da P4-D é dependência técnica; não significa ativação regulatória ou migração SQL.

---

## 3. IA 2.0 — matriz de proteção contra conflito

**Decisões do outro chat, não implementadas pela D4:** cinco abas: `Início`, `Hoje`, `Saúde`, `Documentos`, `Mais`; hub Minha Saúde; 31 destinos em Explorar; Profissionais e locais; preservar Compose (+) até ações contextuais efetivas; menu e botão Android Back conforme tela e pilha; pesquisa e favoritos integrados; máximo uma entrada principal por tarefa; zero jargão de engenharia na UI pública.

**Arquivos que a D4 P1 MODIFICA:**
- `components/saude/TemporaryCourseMedicationCard.tsx` (apenas uma importação e uma chamada dentro do card existente);
- `scripts/test-vault-m59-medication-journey.cjs` (adiciona mock de novo componente ao ambiente hermético, preservando todos os testes existentes);
- `scripts/test-v63-release-gate.mjs` (adiciona 1 contrato).

**Arquivos que a D4 P1 CRIA:**
- `lib/clinical/temporary-course-journey-d4.ts`;
- `components/saude/TemporaryCourseJourneyD4.tsx`;
- `scripts/test-vault-ci360-d4-p1-jornada.cjs`;
- `docs/VAULT-CI360-D4-P1-JORNADA-R1.md`;
- `docs/VAULT-360-RELATORIO-MESTRE-V11-2026-11-18.md`.

**Arquivos explicitamente EXCLUÍDOS:** `app/layout.tsx`, layouts de Saúde, páginas Home/Hoje/Saúde/Documentos/Mais, menu inferior, Explorar, `lib/navigation/clinical-directory-m150.ts`, CareFlow, rotas, sync, Supabase e repositórios clínicos. Não há `git add -A` nem alterações implícitas fora da allowlist. Se outro chat modificar o mesmo card ou V63, pré-voo de âncora/hash bloqueia; rebase humano, nunca overwrite.

### 3.1 O que a IA 2.0 precisa homologar no aparelho

- Barra com cinco destinos de topo em 320, 360, 393, 412 e 430 dp; acessibilidade por teclado e toque.
- Menu persistente em hubs, ocultado em formulários/câmera quando realmente necessário; safe area e gesto Android.
- Navegação de retorno da origem (`return_to`), fechar teclado/modal primeiro, rascunhos protegidos.
- Botão `+` sem perda de ações contextuais, e sem competir com barra.
- Catálogo único em Explorar (31 rotas reais), favoritos sincronizados.
- Minha Rede não compete semanticamente com Minha Saúde; profissionais e locais subordinados.
- Contraste, truncamento, jargões, cards compactos e colunas únicas nos painéis.

---

## 4. Auditoria UI/UX histórica — 25 achados B1–B5

Os 25 achados estão no relatório Gemini V10 integral anexado abaixo, com status de **correções de código reportadas**. O aceite visual em Android REAL continua pendente, não converter "passou gate" em "visual homologado".

**B1 A01–A05: Navegação e semântica** — siglas técnicas e cabeçalhos, seletor de horário, dd/mm/aaaa, ícones Brain, botão Voltar e teclado/modal.

**B2 A06–A10: Sintomas e dossiê** — feedback, limpeza após salvar, vínculo sem duplicação, gráfico por sintoma, evidência relacional.

**B3 A11–A15: Exames, pressão e PDF** — pedidos vinculados, conferência por exame, anexos, pressão isolada, Modo Médico/PDF privado.

**B4 A16–A20: Medicamentos** — compacto/conforto, filtros fixos, PillStudio/apresentações e tarjas, badge +1, cinco abas Gaveta 360.

**B5 A21–A25: UX360** — Home/Próxima Etapa, aba Mais, Explorar 31 áreas, barra no CareFlow, limpeza global de texto técnico.

**Aceite obrigatório:** teste real com consulta registrada, curso temporário (sem inventar primeira dose), pressão real, sintomas, Modo Médico, troca de pessoa e PharmaLens. Nenhuma peça é considerada concluída só porque compilou.

---

## 5. Linha do tempo da engenharia — referências verificadas

| Etapa | SHA de publicação ou referência | Conteúdo e fronteira |
|---|---|---|
| P3B | `851b402040e3` | Retiradas e integração documental, sem E2E dois aparelhos |
| P4A | `1e37a371ac5a` | Episódio e contextualização do Brain |
| D1 | `0b4038d9b8ad` | Consulta como episódio |
| D2 | `d07f524b7e6e` | Prescrição, aquisição e primeira dose separadas |
| P0 R4 | `b0846d7c2afd` | Correções premium CareFlow + Medicamentos |
| D3 | `3608f9124284` | Cartão de retorno e Brain canônico |
| UX360 R3 | `7742453cdb02` | QG1 + limpeza e favoritos 31 áreas |
| MACRO 1 | `b174d10bf6b0` | Evidências por produto exato; SQL não ativado |
| P4-B | `d334d50c02db` | Conferência documental farmacológica |
| MACRO 2 | `a0ca9ce2473f` | Reconciliação de medicamentos/receitas |
| P4-C | `8008d6740cda` | Governança regulatória e histórico de fontes |
| MACRO 3 | `8b5530186f9f` | Brain observacional, publicado |
| P4-D | `be39dd8d4cb5` | Publicada; auditoria offline, sem promoção SQL |
| IA 2.0 | **Planejada** | Outro chat, cinco abas e unificação de hubs |
| D4 P1 | **Candidata neste ZIP** | Painel observacional por período, sem writes |

**NOTA:** a ordem histórica de commits pode divergir da numeração da cirurgia. Usar `git log` e ancestralidade reais, não inferir dependências de nomes. Projeto com chats paralelos exige reconciliar alterações por SHA e por arquivo. A D4 é preparada contra a MACRO 3 e a P4-D, sem pressupor que IA 2.0 já tenha publicado.

---

## 6. Fontes externas verificadas e recomendações próprias

### 6.1 Pesquisa de referência (não confundir com implementação)

1. **Material Design — Bottom navigation:** `https://m1.material.io/components/bottom-navigation.html`. Referência clássica indica 3–5 destinos de nível superior; destinos devem abrir telas reais, não apenas menus; comportamento Back no Android não deve navegar entre abas como pilha arbitrária. Aplicação no VAULT: cinco abas é uma hipótese compatível com diretriz, mas precisa de teste de ergonomia no aparelho.
2. **W3C WCAG 2.2:** `https://www.w3.org/TR/WCAG22/`. Critério AA 2.5.8: alvo mínimo 24×24 CSS px ou exceções de espaçamento; 2.5.5 44×44 CSS px é AAA "Enhanced", não requisito AA universal. A meta interna do VAULT de 44–48dp é mais confortável no Android, mas não deve ser descrita como requisito normativo AA sem qualificação. QG1 deve medir semântica e espaço disponível.
3. **Anvisa (2026) bula digital:** `https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-abre-consultas-dirigidas-para-avaliar-implementacao-da-bula-digital-no-pais`. Consultas 4 e 5/2026 investigam implementação/resultado regulatório do piloto RDC 885/2024; isso **não comprova** API pública estável nem autorização para ingestão automática no VAULT.
4. **Anvisa Bulário Eletrônico:** `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`. Consulta humana oficial; não converter correspondência por nome em identidade exata de apresentação, fabricante, registro e bula.
5. **HL7 FHIR R4 `MedicationStatement`:** `https://hl7.org/fhir/R4/medicationstatement.html`. Diferença entre medicação declarada por paciente/profissional e evento de administração; recomenda-se preservar origem, certeza e timestamps em futura exportação FHIR. Nenhum import/export FHIR implantado nesta D4.

### 6.2 Sugestões do assistente — itens futuros, NÃO aplicados

- **D4 P2: Encerramento com autoridade explícita por período.** Apenas após auditoria de schema/repository, modelar evento de conclusão/interrupção com pessoa, curso, instante, origem, justificativa e idempotência; não usar `med.status=descontinuado` como substituto automático de fim de curso.
- **D4 P3: Reconciliação de notificações e pendências.** Descadastrar alarmes futuros apenas após confirmação da mudança do plano e teste de diferença; preservar logs resolvidos e histórico; evitar “sumir doses” por corte de calendário.
- **D5: Via de compartilhamento clínico seletivo.** PDF A4 permite escolher categorias voluntariamente, com preview e sem incluir dados de outra pessoa, e sem prometer anonimização criptográfica.
- **Android 360 QG2:** testes E2E de backstack, safe area, fonte grande, teclado, notificações, cenário offline, alto contraste; evolução Fênix Studio separada do motor de doses.
- **PharmaLens P4-E:** revisão humana de fontes/produto exato, hashes, quarentena, RLS e promoção eventual em Supabase mediante autorização específica, backup e rollback transacional.
- **Interoperabilidade futura:** FHIR estruturado e reconciliado, opt-in de exportação e auditoria dos campos; não inferir que RNDS consegue importar qualquer JSON gerado pelo VAULT.

---

## 7. Engenharia do pacote D4 P1 — garantias, limites e execução

### 7.1 Entrega concreta

- **3 modificados**: `TemporaryCourseMedicationCard.tsx` (import/render), `test-vault-m59-medication-journey.cjs` (mock de ambiente, sem suprimir assertions) e `scripts/test-v63-release-gate.mjs` (test registration).
- **5 novos**: motor puro TS, UI de leitura, teste direcionado, relatório técnico, este relatório V11.
- **Nenhum SQL, migração, função remota, upload, update Dexie, alteração de `DoseLog`, notificação, prescrição, receita ou estoque.**
- Contrato em `scripts/test-vault-ci360-d4-p1-jornada.cjs`: várias garantias herméticas positivas e negativas; o V63 global do repositório real ainda precisa executar no Termux.
- Patch com âncora única e pré-voo bloqueando se IA 2.0 ou outro chat já alteraram o mesmo local.

### 7.2 Segurança operacional

1. `DIAGNOSTICAR-TUDO.sh`: somente leitura do checkout real; `git clone --shared` TEMP e push remoto bloqueado no clone; patch somente na cópia; executa **todos os contratos registrados reais do V63**, extras e `tsc --noEmit` + `git diff --check`, guarda `RESUMO-FALHAS.txt`, log, JSON e ZIP com todas as falhas; não avança em teste ausente/interrompido.
2. `APLICAR-VALIDAR.sh`: repete diagnóstico em clone antes de alterar o checkout; exige `HEAD=origin/main`, branch main, stage vazio, alterações rastreadas vazias; valida manifesto SHA256, prepara candidata, backup seletivo, testes pós-aplicação, marcador `D4_P1_R1_APROVADA_LOCALMENTE`; rollback em falha sem tocar outros arquivos.
3. `PUBLICAR.sh`: exige marcador e hashes exatos, bloqueia HEAD divergente, usa `git add -- <8 paths>` explicitamente, verifica staged exatamente 8 caminhos, commit e push normal sem force.
4. `ROLLBACK-LOCAL.sh`: apenas da sessão aprovada e ainda não publicada, sem reset hard nem sobrescrever mudanças concorrentes.

### 7.3 Scripts no Termux (somente após P4-D publicada)

```bash
cd ~/storage/downloads && unzip -o VAULT-CI360-D4-P1-JORNADA-R1.zip && bash VAULT-CI360-D4-P1-JORNADA-R1/DIAGNOSTICAR-TUDO.sh
# Exigir FALHAS: 0
cd ~/storage/downloads && bash VAULT-CI360-D4-P1-JORNADA-R1/APLICAR-VALIDAR.sh
# Exigir D4_P1_R1_APROVADA_LOCALMENTE; conferir resultados e visual
cd ~/storage/downloads && bash VAULT-CI360-D4-P1-JORNADA-R1/PUBLICAR.sh
```

**Não executar ainda:** se P4-D não estiver na `origin/main`, ou o outro chat houver modificado o card, a candidata deve abortar com diagnóstico explícito. Nunca alterar âncora no improviso nem forçar publicação.

---

## 8. Roadmap unificado — próximas etapas e donos

| Ordem | Frente | Entrega | Dependência | Observações |
|---|---|---|---|---|
| 0 | Este chat | P4-D | Publicada | Diagnóstico 0 relatado e SHA verificado; acompanhar apenas Android |
| 1 | Este chat | D4 P1 | P4-D HEAD e sem colisão IA | Jornada observacional, sem writes |
| 1 (paralela) | Outro chat | IA 2.0 P1 | Vídeo e HEAD corrente | Cinco abas, hubs, ações contextuais, 31 áreas |
| 2 | Outro chat | IA 2.0 P2 | P1 | Hierarquia, microcopy, ergonomia, WCAG, Android Back |
| 3 | Compartilhada | Homologação Android | P4-D, MACRO 3, IA, D4 | Vídeo de 25 achados e teste clínico real de ponta a ponta |
| 4 | Este chat | D4 P2 | Governança explícita | Encerramento/interrupção real; testes de sincronização |
| 5 | Este chat | D4 P3 + QG2 | D4 P2 | Retirada correta de alertas quando plano muda; sem sumir dados |
| 6 | Este chat | P4-E curadoria catálogo | Auditoria SQL/RLS + consentimento | Sem aprovação automática de fonte, no Supabase |
| 7 | UX e Android | Fênix Studio / APK 360 | UI e QG2 | Performance, gestos, câmera, backstack, notificações |
| contínua | Plataforma | Sync E2E e privacidade | Dois aparelhos, RLS | Conflitos offline e exportações seguras |

**Diretriz de sequenciamento:** não misturar IA 2.0 e D4 no mesmo patch; evitar novas funcionalidades que não solucionam uso real até inspecionar vídeo do Android. Não migrar o Supabase por causa de um documento. Uma cirurgia publicada não significa homologação nativa.

---

## 9. Checklist definitivo de homologação real e retomada

### 9.1 Android / PWA / APK

- `Início` Brain, próxima ação, texto íntegro, visibilidade do menu;
- `Hoje` doses temporárias/contínuas/SOS distinguíveis, sem repetição após último dia;
- `Saúde` / Minha Saúde / CareFlow / Profissionais e locais / Explorar;
- `Documentos` receitas, laudos, PDF A4 privativo e vínculo;
- `Mais` pessoa ativa, backup, aparência, ferramentas;
- D4 em medicamento com 7 dias: ver Dia 2 de 7 com Data local correta; conferir que tomada já registrada continua intacta;
- D4 fora do prazo: mostrar "prazo encerrado" e nunca "tratamento concluído";
- D4 pessoa trocada: painel não mostra dados de outra pessoa;
- D4 nota inválida/duplicação: oferecer revisão sem inventar cronograma;
- histórico/estoque/consulta e M1 antes e depois, sem perda;
- Android Back, teclado, Safe Area, gestos, botões 44–48dp quando possível, textos sem clipping;
- PWA sem notificações nativas, APK real com notificações separadamente, sem equivaler os dois;
- sincronização E2E com conflitos entre dois aparelhos ainda não comprovada.

### 9.2 Instruções de retomada para o próximo chat

1. Ler este V11 inteiro e, se necessário, os **ANEXOS INTEGRAIS** abaixo. Não se guiar apenas por resumo de memória.
2. Conferir o SHA atual de `main` (GitHub e Termux), `status --short`, `rev-list`, árvore do `HEAD` e último log de diagnóstico.
3. Atualizar matriz de estado para P4-D, D4 e IA 2.0 conforme resultados **reais**, sem retroativamente chamar de homologação visual.
4. Se usuário fornecer vídeo, priorizar auditoria quadro a quadro e verificar cada um dos 25 achados antes de mudar outro motor.
5. Conferir em especial `temporary-course.ts`, `doseLogs.ts`, `temporary-course-insights.ts`, `CourseReviewM1`, `TemporaryCourseMedicationCard` e V63 antes de D4 P2.
6. Nunca escrever em Supabase, estoque, doses ou receita sem autorização específica e teste de RLS/idempotência/offline.
7. Se pacote bloquear, pedir `RESUMO-FALHAS.txt` ou ZIP completo, consolidar TODAS as causas e produzir FIX único; não saltar gates.
8. Nunca usar `git add -A`, `reset --hard`, force push ou cópia cega de arquivos de outro HEAD.

---

# ANEXOS DOCUMENTAIS INTEGRAIS

Os anexos abaixo preservam as fontes originais sem reescrever as afirmações históricas. **Alguns status dos relatórios antigos ficaram desatualizados**; a matriz V11 acima tem prioridade, e o HEAD real tem prioridade sobre todos os relatórios.


---

## ANEXO A — Relatório Mestre V10 Gemini (original fornecido pelo usuário)

<!-- início do conteúdo original: VAULT 360 — Relatório Mestre V10 (Engenharia, Arquitetura de Informação, Auditoria UX e Evolução)(1).md -->

# VAULT 360 — RELATÓRIO MESTRE V10 | Engenharia, Inteligência Clínica, Arquitetura de Informação (IA 2.0) e Roadmap Estratégico

**Data de Corte:** 18/11/2026 (America/Sao_Paulo)  
**Repositório Canônico:** `alefe-redes-computadores/vault-app`  
**Ambiente Local (Android/Termux):** `~/projects/vault-app`  
**Diretório de Entregas (ZIP/Base64):** `~/storage/downloads`  
**Versão Consolidada:** V10 (Preserva e expande integralmente os Relatórios Mestres V8 e V9 + Auditoria UI/UX de 25 Achados + Incorporação MACRO 2 e MACRO 3 + Estudo de Pesquisa e Reengenharia de Arquitetura de Informação IA 2.0 + Roadmap Evolutivo 2026–2027).

---

## SUMÁRIO EXECUTIVO

1. **Estado Verificado do Repositório, Matriz de Evidência e Fila de Execução Atual (`P4-B` → `P4-C` → `MACRO 2` → `MACRO 3`)**
2. **Inventário Completo das Entregas de Engenharia (`D1–D3`, `P0 R4`, `UX360 R3 QG1`, `MACRO 1`, `P4-B`, `P4-C`, `MACRO 2`, `MACRO 3`)**
3. **Auditoria Consolidada de UI/UX — Os 25 Achados Históricos e Complementares (Blocos `B1` a `B5`)**
4. **NOVA FRENTE ESTRATÉGICA: Reengenharia de Arquitetura de Informação (IA 2.0), Unificação de Hubs, Hierarquia de Telas e Navegação Global**
   - 4.1. Diagnóstico Crítico dos Conflitos Atuais (*Minha Saúde* vs. *Minha Rede de Saúde* vs. *Sua Saúde / 22–31 Áreas* vs. *CareFlow 360* vs. *Explorar*)
   - 4.2. Pesquisa de Referência (mHealth/PHR, Material Design 3, Carga Cognitiva em Saúde, Apple Health vs. Qualificação de Dados, WCAG 2.2 AA)
   - 4.3. Blueprint da Arquitetura de Informação Alvo (**IA 2.0**): Matriz de Decisão (Manter, Fundir, Renomear, Absorver, Eliminar)
   - 4.4. Taxonomia Definitiva das 31 Áreas Clínicas (Eliminação de Redundâncias e Textos Técnicos)
   - 4.5. Contrato Global da Barra de Navegação Inferior e Pilha de Retorno (`Back Stack`)
   - 4.6. Anatomia e Hierarquia Ideal por Tipo de Tela (O que mostrar, o que ocultar em *Progressive Disclosure* e o que remover)
5. **Sugestões de Evolução Tecnológica, Clínica e Regulatória (Pós-MACRO 3 e Pós-IA 2.0)**
   - 5.1. Anvisa 2026+ e Bula Digital (QR Code / Consultas Dirigidas 4 e 5/2026)
   - 5.2. Evolução do PharmaLens e do Brain Clínico Longitudinal (`D4` e além)
   - 5.3. Interoperabilidade Opcional com Padrão HL7 FHIR e RNDS Brasil
   - 5.4. Blindagem LGPD (Dados Sensíveis de Saúde, Tarjamento e Retenção Legal)
   - 5.5. Android 360, QG2, Notificações Anti-Fadiga, Sync E2E Offline e Fênix Studio
6. **Protocolo de Execução no Termux, Segurança e Convenções de Engenharia**
7. **Roteiro Completo de Homologação Real no Aparelho (Vídeo Global + Consulta `17/11` + Antibiótico Otológico + Pressão Arterial)**
8. **Anexo Técnico Integral Preservado — Relatório Mestre V9 e V8 (Commits, Superfícies, Contratos de Arquivos, Checklist S01–S14 e Política de Dados)**

---

## 1. ESTADO VERIFICADO DO REPOSITÓRIO, MATRIZ DE EVIDÊNCIA E FILA DE EXECUÇÃO

### 1.1. Matriz de Evidência Inegociável
Nenhuma entrega pode pular de estágio no discurso ou na documentação:
> **Planejado $\neq$ Implementado $\neq$ Diagnóstico Zero $\neq$ Aprovado Localmente (Pós-Gates) $\neq$ Commit/Push no GitHub (`main`) $\neq$ Vercel Ready $\neq$ APK Instalado $\neq$ Homologado Visualmente e Funcionalmente em Android Real.**

### 1.2. Fotografia Consolidada do Repositório e Pacotes (Corte 18/11/2026)

| Camada / Entrega | Escopo Principal | Migração SQL | Evidência Verificada / Status |
| :--- | :--- | :--- | :--- |
| **Base `CI360 P6 P3B`** (`851b4020`) | Retiradas operacionais e pull documental (sem comprovação E2E 2 dispositivos) | Não | **Publicada na `main`** |
| **CareFlow `M3` + `P6 P3-A/B`** | Eventos relacionais, Modo Médico, Dossiê, linha do tempo e biblioteca PDF local | Não | **Publicada na `main`** (aceite visual Android contínuo) |
| **`D1` + `D2`** (`d07f524b7`) | Episódio clínico, atalho Consulta → Medicamento, vínculo por ID e cursos temporários (incl. via otológica) | Não | **Publicada na `main`** |
| **`CareFlow P0 + Medicamentos R4`** | Blocos `B1`–`B4` (20 achados do vídeo + ajuste do badge `+1` + 19 mod. / 3 novos) | Não | **Publicada na `main`** (confirmada pelo operador) |
| **`D3 Canônica`** (`3608f9124284bcbf12a9d162f58b89612dfa1e94`) | Brain pós-consulta e Cartão de Retorno por episódio sem segundo motor | Não | **Publicada na `main`** (confirmada no GitHub) |
| **`UX360 R3 + QG1`** | 510/510 verificações, piso tátil `QG1`, 31 rotas no Explorar, Home/Mais/Barra CareFlow | Não | **Arquivos rastreados na `main`** (confirmados no corte V9) |
| **`MACRO 1 — Anvisa Knowledge 360`** (`b174d10bf6b0b7c258ba636b0138d049e736d093`) | Camada de evidências verificadas de bula por produto exato (`match_kind=exact`), hash SHA256 e quarentena | **Preparada (NÃO ativada)** | **Publicada na `main`** em 18/11/2026 |
| **`P6 P4-B — PharmaLens 360`** | Conferência documental por origem, validade calendárica, recibo privado e links Anvisa (`gov.br`) | Não | **Diagnóstico zero local** — pendente validar/publicar na `main` |
| **`P6 P4-C — Catálogo Regulatório 360`** | Trilha de fontes/versões, identidade exata vs. aproximada, cronologia e histórico comercial (2 mod. / 5 novos) | Não | **Candidata em ZIP** (`SHA256: f840b0a9...`) — exige `P4-B` no `HEAD` |
| **`MACRO 2 — PharmaLens Intelligence`** | Reconciliação de receitas por ID, sobreposição de princípios ativos e correlação temporal de sintomas (3 mod. / 7 novos) | Não | **Candidata em ZIP** — exige base anterior publicada |
| **`MACRO 3 — Brain Clínico 360`** | Evolução terapêutica pré/pós-dose, uso real vs. lacunas, autonomia de estoque, PDF/Resumo sob Brain V5 único (2 mod. / 7 novos) | Não | **Candidata em ZIP** — exige `MACRO 2` publicada no `HEAD` |
| **NOVA FRENTE: `IA 2.0 — Unificação de Hubs & Navegação`** | Consolidação de *Minha Saúde*, *Minha Rede*, *Sua Saúde*, *CareFlow* e *Explorar*; limpeza de redundâncias e menu inferior global | Não | **Planejada neste Relatório V10** (aguardando vídeo real do aparelho) |
| **`P4-D` — Ingestão Revisada do Catálogo** | Ativação controlada da migração SQL no Supabase, RLS, auditoria humana e quarentena real de bulas | **Sim (Controlada)** | **Planejada** (somente após homologação física) |

### 1.3. Ordem Obrigatória de Fila no Termux (Sem Pular Dependências)
1. **Validar e Publicar `P4-B`** → confirmar `git status --short`, `git log -1 --oneline` e `git rev-list --left-right --count HEAD...origin/main`.
2. **Diagnosticar, Aplicar/Validar e Publicar `P4-C`** → exige `P4-B` oficialmente no `HEAD`.
3. **Diagnosticar, Aplicar/Validar e Publicar `MACRO 2`** → exige `P4-C` (ou base reconciliada) no `HEAD`.
4. **Diagnosticar, Aplicar/Validar e Publicar `MACRO 3`** → exige explicitamente a `MACRO 2` publicada no `HEAD`.
5. **Homologação Física Real no Aparelho (Vídeo Completo + Caso Real de `17/11`)** → só então abrimos a cirurgia de **Arquitetura de Informação (`IA 2.0`)** e, em paralelo, a ativação controlada do banco (`P4-D`).

---

## 2. INVENTÁRIO CONSOLIDADO DAS ENTREGAS DE ENGENHARIA E INTELIGÊNCIA

### 2.1. Trilha Clínica Base (`D1` › `D2` › `D3`)
* **`D1` (Episódio Clínico):** Transforma a consulta de um evento de agenda em um nó relacional com ID próprio, profissional, especialidade, unidade, queixa e evoluções vinculadas.
* **`D2` (Continuidade Terapêutica):** Atalho direto Consulta → Medicamento (herdando ID da consulta e sugerindo o médico), vínculo bidirecional protegido contra duplicação, separação formal de estados (**Prescrito** $\neq$ **Aquisição** $\neq$ **Iniciado / 1ª dose**) e suporte blindado a **cursos temporários / por período** (incluindo vias anatômicas como a **via otológica** e apresentação em **gotas**, sem inventar doses retroativas nem misturar com remédios contínuos).
* **`D3` (Brain Contextual e Cartão de Retorno):** Aproveita o slot `P4-A` da Home para exibir **uma única sugestão contextual por consulta**, convite voluntário pós-consulta com botões *"Não agora"* e *"Já registrei"* (suprimindo insistência diária) e **Cartão de Retorno em 3 blocos auditáveis** (*Fatos documentados*, *Itens para conferir* e *Perguntas para a próxima consulta*), com compartilhamento estritamente por cópia manual.

### 2.2. Trilha Regulatória e Farmacológica (`MACRO 1` › `P4-B` › `P4-C` › `MACRO 2`)
* **`MACRO 1 — Anvisa Knowledge 360`:** Reutiliza a base existente no Supabase (~42 mil produtos e ~51 mil apresentações) acoplando uma tabela verificável de **evidências de bula** (jejum, alimentação, sonolência, refrigeração, proteção da luz, validade após abertura, vias). Cada registro exige produto exato (`match_kind=exact`, `referenceType=product`, fonte `anvisa`), versão, data de revisão e hash `SHA256`, entrando sempre em **quarentena** até revisão humana.
* **`P6 P4-B — PharmaLens 360`:** Aproveita o `PharmaLensDocumentStudioCI360` sem duplicar OCR. Diferencia dados extraídos de foto, cadastro manual e catálogo; implementa **validade calendárica real** (rejeita `31/02`, reconhece bissextos); evita que substância ativa ou lista genérica de apresentações vire selo de produto exato; oferece **recibo privado** por cópia manual (sem texto bruto OCR nem IDs internos) e atalhos para consulta humana nos dois portais oficiais da Anvisa (`gov.br`).
* **`P6 P4-C — Catálogo Regulatório 360`:** Acrescenta trilha recolhível (*disclosure*) no `PharmaLensWorkspaceV7` sem nova consulta Dexie. Registra histórico de fontes/versões, diferencia identidade exata de correspondência aproximada ou só por princípio ativo, preserva cronologia regulatória (`effectiveFrom`, `effectiveUntil`, exceções) e histórico comercial sem fundir produtos antigos com atuais, e usa janela operacional de 730 dias apenas como **lembrete de revisão humana** (nunca como validade legal do registro sanitário).
* **`MACRO 2 — PharmaLens Intelligence`:** Reconhece receitas existentes por ID (sem recadastro), diferencia na listagem receita vinculada vs. tipo informado vs. classificação oficial, aponta possíveis sobreposições de princípios ativos com referência confiável, correlaciona temporalmente sintomas lançados após início de medicamento (sem cravar reação adversa), incorpora a reconciliação ao resumo médico e prepara a estrutura segura de interações aguardando fontes farmacológicas verificadas.

### 2.3. Consolidação Longitudinal (`MACRO 3 — Brain Clínico 360`)
* **Evolução Terapêutica Documentada:** Compara registros de sintomas anteriores e posteriores a mudanças de dose documentadas, declarando explicitamente quando a amostra ainda é insuficiente.
* **Uso Real vs. Lacunas:** Separa tomadas confirmadas, doses ignoradas, uso SOS/extra e lacunas de registro (jamais tratando ausência de log como não adesão).
* **Estoque Inteligente Canônico:** Reutiliza o motor canônico para estimar autonomia do estoque sem inventar consumo ou movimentação.
* **Dossiê Médico e Governança Única:** Recupera orientações relatadas nas consultas vinculadas, incorpora evidências ao resumo e ao PDF local e mantém **um único Brain V5** governando alertas — **sem sugerir doses de resgate**, **sem atribuir causalidade a sintomas** e **sem declarar interações seguras sem base validada**.

---

## 3. AUDITORIA CONSOLIDADA DE UI/UX — OS 25 ACHADOS (BLOCOS `B1` A `B5`)

### 3.1. Blocos `B1` a `B4` — Os 20 Achados Originais do Vídeo (Aplicados em `CareFlow P0 + Medicamentos R4`)

| Bloco | IDs | Resumo das Correções Estruturais Aplicadas | Critério de Aceite Permanente |
| :--- | :--- | :--- | :--- |
| **`B1` (Navegação e Semântica)** | **A01–A05** | Remoção de kickers técnicos (`CI360`, `P6`, `M3`, `P1`); novo seletor numérico `HH:mm`; padronização brasileira de datas (`DD/MM/AAAA`); ícones contextuais Lucide no Brain; retorno inteligente entre telas (`←` e *Android Back* fechando modais/teclado antes de voltar à origem). | Zero jargão técnico visível; retorno 100% fiel à tela anterior. |
| **`B2` (Sintomas e Dossiê)** | **A06–A10** | Confirmação visual imediata ao salvar (sem duplo clique); limpeza segura pós-envio; reparo de vínculo sem duplicação por ID; gráficos separados por tipo de sintoma; evolução estruturada em Dossiê Relacional. | Cada sintoma em sua curva própria; linha do tempo sem cópias duplicadas. |
| **`B3` (Exames, Pressão e PDF)** | **A11–A15** | Pedidos CareFlow sincronizados e visíveis em `/saude/exames`; múltiplos exames estruturados com edição e conferência item a item; anexos limpos por pedido; organização dedicada de Pressão e planos (isolada de sintomas); acabamento do Modo Médico 360 e PDF A4 privado. | Conferência individual por exame; PDF A4 com nome humano limpo. |
| **`B4` (Medicamentos `R4`)** | **A16–A20** | Calibração dos modos Compacto e Conforto sem espaços mortos; filtros fixos no topo ao rolar; chips enxutos preservando **PillStudio** (ícones discretos por apresentação, incluindo gotas) e tarjas regulatórias; eliminação do badge `+1` órfão (integrado às ações secundárias); destaque nítido nas 5 abas da Gaveta 360 e catálogo legível. | Zero badge órfão; leitura rápida de dose, via e apresentação. |

### 3.2. Bloco `B5` — Os 5 Achados Complementares de Tela (Incorporados na `UX360 R3 + D3`)
* **A21 — Home (`PRÓXIMA ETAPA` e Cards):** Remoção do ícone de pulso duplicado, adoção de ícone Lucide único com cor semântica (ex.: âmbar documental para SUS), eliminação de textos cortados com `...`, alinhamento vertical entre *Medicamentos* e *Minha saúde*, limpeza do título *CareFlow 360* e correção de `"pressão"`.
* **A22 — Aba `Mais`:** Conversão de *Ferramentas avançadas* de 2 colunas espremidas para **coluna única em largura total**, alinhamento do seletor *Pessoa ativa* + botão editar e cabeçalhos uniformes em todas as sanfonas.
* **A23 — Tela `Explorar`:** Favoritos compartilhados com o Hub R5, botões de estrela (`Star`) nos módulos clínicos, recomendações factuais, grupos visíveis (sem esconder recursos em gavetas fechadas) e contagem dinâmica (expandida de 22 para 31 destinos reais).
* **A24 — Barra Inferior no Hub CareFlow:** Restauração da barra inferior visível ao entrar no CareFlow 360 (`/saude/careflow`).
* **A25 — Varredura Global de Kickers e Textos Redundantes:** Remoção de códigos de cirurgia nos cabeçalhos e auditoria contínua de textos técnicos vazados (alvo direto da nova frente **IA 2.0** detalhada na Seção 4).

---

## 4. NOVA FRENTE ESTRATÉGICA: REENGENHARIA DE ARQUITETURA DE INFORMAÇÃO (IA 2.0), UNIFICAÇÃO DE HUBS E NAVEGAÇÃO GLOBAL

> **Motivação:** Com a conclusão das cirurgias de inteligência (`D1`–`D3`, `MACRO 1`–`3`, `P4-B`, `P4-C`), o motor do VAULT 360 atingiu nível clínico profissional. Contudo, o crescimento incremental por cirurgias gerou **sobreposição de portas de entrada**, **fragmentação de hubs de saúde**, **textos/subtítulos redundantes em diretórios longos (ex.: lista de 22–31 áreas)** e **inconsistências de navegação / desaparecimento do menu inferior**. Antes de escalar novas funcionalidades, a próxima grande frente de produto deve consolidar uma **Arquitetura de Informação (IA 2.0) cristalina, intuitiva e sem fricção**.

### 4.1. Diagnóstico Crítico dos Conflitos Atuais de Arquitetura de Informação

Hoje o usuário enfrenta **5 superfícies de "entrada de saúde"** cujas fronteiras se sobrepõem na cabeça de quem usa o app diariamente:

1. **`Minha Saúde` (Hub de Saúde / R5):** Ponto central de atalhos e favoritos clínicos.
2. **`Minha Rede de Saúde`:** Área focada em médicos, clínicas, unidades SUS/farmácias e contatos de cuidado — mas que, pelo nome parecido com *"Minha Saúde"*, gera confusão imediata de propósito e parece um segundo hub paralelo.
3. **`Sua Saúde` / Diretório Completo de Áreas (22 → 31 módulos):** Tela de listagem extensa com dezenas de cards de áreas clínicas que frequentemente repetem descrições técnicas, explicações sobrepostas e atalhos já presentes na Home, no Hub e no CareFlow.
4. **`CareFlow 360`:** Fluxo operacional longitudinal (consultas, pedidos/exames, sintomas, pressão, dossiê, Modo Médico) — excelente motor, mas com nome técnico em inglês que compete com *"Minha Saúde"* como lugar onde o usuário espera registrar sua rotina clínica.
5. **`Explorar o VAULT`:** Catálogo universal de descoberta de todas as áreas do app, agora compartilhando favoritos com o Hub R5 — o que torna qualquer outra tela de "catálogo de 22/31 áreas" estruturalmente redundante.

**Sintomas de UX resultantes dessa fragmentação:**
* **Fadiga de Decisão (Lei de Hick):** O usuário pensa *"Onde eu clico para registrar minha pressão ou ver meu médico? Em Minha Saúde, CareFlow, Minha Rede ou Explorar?"*
* **Ruído Textual e Redundância:** Subtítulos longos tentando explicar o que o módulo faz com jargão arquitetural (*"motor relacional"*, *"eventos integrados"*, *"dossiê longitudinal"*) em vez de linguagem direta ao paciente (*"Consultas, exames e histórico"*).
* **Desorientação de Menu Inferior:** Ao transitar entre hubs intermediários e sub-rotas, a barra inferior some em momentos imprevisíveis ou o botão `←` devolve para um hub diferente do esperado.

---

### 4.2. Base de Pesquisa (Padrões Internacionais de UX para mHealth / PHR e Android)

A reengenharia **IA 2.0** do VAULT 360 fundamenta-se em cinco pilares consolidados de pesquisa em UX de saúde móvel e diretrizes de plataforma:

1. **Material Design 3 (Navigation Bar & Top-Level Destinations):**
   * Uma barra de navegação inferior deve conter entre **3 e 5 destinos de nível superior de igual importância**, fixos e previsíveis em todo o app (nunca mudando de ordem nem desaparecendo arbitrariamente entre hubs).
   * Tocar em um destino da barra inferior leva diretamente àquela visão raiz (nunca abre pop-ups/menus confusos), com contraste nítido, rótulo curto sem truncamento e indicador ativo claro (*pill* em M3).
   * **Ergonomia de Um Polegar (One-Thumb Reach):** Ações e destinos mais frequentes ficam ancorados na zona inferior da tela; o menu inferior só se oculta em **telas focadas de entrada/criação de dados** (formulários com teclado, câmera/OCR, geração/leitura de PDF em tela cheia) ou modais de confirmação.
2. **Design Tolerante ao Estresse e Redução de Carga Cognitiva (Low-Cognitive-Load Healthcare UX):**
   * Pacientes usando aplicativos de saúde frequentemente estão com dor, cansaço, ansiedade, baixa luminosidade ou pressa em um consultório médico.
   * **Carga Cognitiva Extrínseca** (caçar botões, decifrar ícones genéricos, ler parágrafos redundantes ou distinguir 4 telas com nomes quase iguais) é o principal inimigo da adesão clínica.
   * **Divulgação Progressiva (*Progressive Disclosure*):** Mostrar na camada primária **apenas o estado atual e a próxima ação objetiva** (1 linha de resumo + 1 indicador visual claro), movendo auditorias técnicas, metadados de fonte, hashes e históricos extensos para gavetas expansíveis (*disclosures*) — exatamente como `P4-C` e `PharmaLens` começaram a fazer.
   * **Feedback Menor que 100ms:** Confirmação visual instantânea + resposta tátil sutil (*haptics*) em vez de animações longas.
3. **Acessibilidade WCAG 2.1 / 2.2 AA em Saúde Móvel:**
   * Contraste mínimo de **4.5:1** para texto normal e **3:1** para textos grandes e componentes essenciais de UI (crítico em tema escuro sob baixa luz).
   * Alvos táteis mínimos de **44×44pt / 48×48dp** (já auditados no VAULT pelo `QG1` com `min-h-11`), sem confiar apenas em cor verde/vermelha para status (sempre combinar cor + ícone + rótulo explícito).
4. **Lição do Apple Health vs. Diferencial Único do VAULT 360:**
   * O **Apple Health** acertou na taxonomia clara em duas camadas (*Resumo* + *Explorar por Categorias*), mas falha em ser uma fonte confiável de verdade clínica porque mistura dados de sensores sem **camada de qualificação ou procedência** ("lixo organizado").
   * O **VAULT 360** já resolveu o problema mais difícil — **qualificação, procedência e autoridade de dados** (`MACRO 1`, `P4-B`, `P4-C`, `MACRO 2`, `MACRO 3`). Ao combinar essa retaguarda rigorosa com uma **taxonomia limpa de 4–5 pilares** inspirada nas melhores práticas de PHR (*Personal Health Record*), o VAULT supera os apps comerciais tanto em clareza quanto em confiabilidade médica.
5. **Prevenção de Fadiga de Notificações (*Push Fatigue*):**
   * Lembretes e perguntas contextuais devem respeitar orçamento diário, janela de silêncio e supressão imediata quando a ação já foi registrada — exatamente na direção da `D3` e a ser estendida às notificações nativas Android (`QG2`).

---

### 4.3. Blueprint da Arquitetura de Informação Alvo (**IA 2.0**)

#### A. Os 4 Destinos Raiz da Barra Inferior (Permanentes e Inequívocos)

| Aba da Barra Inferior | Papel Arquitetural Único | O que o Usuário Faz Aqui (80% do Uso Diário) |
| :--- | :--- | :--- |
| **1. `Início`** | **Painel Vivo do Dia + Brain Único** | Vê o card contextual único do Brain (`P4-A`), resumo do dia (doses/rotina), próximos compromissos e atalhos rápidos fixados (*Favoritos*). |
| **2. `Saúde`** *(ou `Hoje` / `Cuidado` — a decidir na validação do vídeo)* | **Hub Clínico Unificado** | Casa única de **Medicamentos**, **Consultas**, **Sintomas**, **Exames**, **Pressão/Sinais Vitais**, **Modo Médico 360** e acesso direto a **Profissionais e Locais**. |
| **3. `Documentos`** | **Cofre Documental e SUS** | Receitas, laudos, exames anexados, comprovantes de retirada/SUS, PDFs gerados no Modo Médico e conferência documental. |
| **4. `Mais`** | **Perfil, Explorar e Sistema** | Troca de *Pessoa ativa*, acesso ao **Explorar (Todas as Áreas)**, preferências/lembretes, aparência, backup/exportação, segurança e diagnóstico. |

*(Nota: Caso optemos por manter `Hoje` focado exclusivamente na checklist horária do dia — doses, medições e tarefas do dia — e `Saúde` como o Hub Clínico Unificado, a barra inferior comporta confortavelmente **5 abas limpas** dentro do limite ergonômico do Material Design 3: `Início` · `Hoje` · `Saúde` · `Documentos` · `Mais`. Essa decisão entre 4 ou 5 abas será fechada definitivamente ao assistirmos ao seu vídeo navegando pelo app.)*

#### B. Matriz de Decisão para os Hubs e Telas Conflitantes

| Tela / Nome Atual | Diagnóstico de Conflito | Proposta IA 2.0 (Ação Recomendada) | Novo Nome / Localização Sugerida |
| :--- | :--- | :--- | :--- |
| **`Minha Saúde`** | Concorre com *Sua Saúde* e *CareFlow 360* | **MANTER como Hub Clínico Principal** | **`Minha Saúde`** (ou aba raiz `Saúde`), concentrando o resumo clínico e os módulos essenciais. |
| **`CareFlow 360`** | Nome técnico/inglês sobreposto a *Minha Saúde*; esconde a barra inferior | **ABSORVER / REPOSICIONAR** | Deixa de competir como "outro app". Seus fluxos (Consultas, Sintomas, Exames, Pressão, Modo Médico) viram os **blocos nativos de `Minha Saúde`**, com uma visão dedicada chamada **`Acompanhamento Clínico`** (ou **`Linha do Tempo / Prontuário`**) mantendo a barra inferior visível. |
| **`Minha Rede de Saúde`** | Nome quase idêntico a *Minha Saúde*, causando confusão imediata | **RENOMEAR E ANINHAR** | Renomear para **`Profissionais e Locais`** (ou **`Médicos e Unidades`**) e posicioná-la como seção/cartão de primeiro nível dentro de **`Minha Saúde`**, nunca competindo como hub irmão de nome parecido. |
| **`Sua Saúde` / Lista de 22–31 Áreas** | Duplica o *Explorar*, acumula textos longos e jargões técnicos | **ELIMINAR DUPLICIDADE (FUNDIR NO `EXPLORAR`)** | Toda descoberta completa de módulos vive em **um único lugar (`Explorar`)**, agrupado em no máximo **5 categorias claras**, com busca, favoritos sincronizados e descrições de no máximo **5 a 8 palavras** por item. |
| **`Explorar o VAULT`** | Excelente conceito de catálogo universal, mas antes tinha textos estáticos e gavetas fechadas | **CONSOLIDAR COMO CATÁLOGO ÚNICO** | **`Explorar`** — único diretório completo do app, com *Favoritos Fixados* no topo, busca instantânea e 5 grupos taxonômicos limpos. |
| **`PharmaLens`** | Nome forte e técnico; no dia a dia o paciente pensa em "conferir remédio/bula" | **MANTER NOME COMO MOTOR INTERNO + RÓTULO CLARO** | Exibir como **`Conferência e Bula (PharmaLens)`** acessível diretamente de dentro de cada medicamento (Gaveta 360) e no catálogo de ferramentas farmacológicas. |

---

### 4.4. Taxonomia Limpa para as 31 Áreas Clínicas (Fim do "Muro de Cards" e Textos Redundantes)

Em vez de listas extensas com descrições repetitivas ou misturando rotinas diárias com ferramentas administrativas, todos os módulos do VAULT devem obedecer a **5 grupos mentais naturais para o paciente**:

1. **Rotina e Medicamentos:** Medicamentos Ativos (Contínuos e Temporários), Agenda de Doses / Hoje, Estoque e Retiradas (SUS / Farmácia), PharmaLens (Bula e Conferência Documental).
2. **Acompanhamento Clínico:** Consultas e Retornos (Episódios + Cartão de Retorno), Sintomas e Evolução (Dossiê + Gráficos por tipo), Exames e Pedidos (Conferência item a item), Pressão Arterial e Sinais Vitais.
3. **Prontuário e Compartilhamento:** Modo Médico 360, Biblioteca de PDFs A4, Linha do Tempo Completa, Resumo de Emergência / Alergias / Perfil Clínico.
4. **Profissionais e Locais** *(ex-Minha Rede de Saúde)*: Médicos e Especialistas, Clínicas, Hospitais e Unidades SUS, Farmácias e Postos de Retirada.
5. **Documentos, Família e Cofre:** Documentos e Receitas, Pessoas / Perfis Familiares, Favoritos e Personalização, Segurança, Backup e Diagnóstico.

#### Regra Editorial de Microcopy (Limpeza de Redundância Textual)
Para **todos** os cards de módulos e cabeçalhos do aplicativo:
* **Título do Card:** Máximo **2 a 3 palavras** humanas (ex.: `Pressão arterial`, `Consultas`, `Profissionais e locais`).
* **Subtítulo do Card:** Máximo **1 linha curta (35–48 caracteres)** descrevendo *o que você faz ali*, nunca *como o código funciona*.
  * *Evitar (técnico/redundante):* `"Motor longitudinal relacional com eventos integrados de consultas, pedidos e monitoramentos"`.
  * *Usar (claro/humano):* `"Histórico de consultas, pedidos e retornos"`.
* **Proibição Absoluta na UI Pública:** Zero códigos de sprint/engenharia (`CI360`, `M2`, `M3`, `P0`, `P4-A`, `P4-B`, `P4-C`, `P6`, `R3`, `R4`, `R5`, `QG1`, `V5`, `V7`, `D1–D3`) em cabeçalhos, botões, toasts, etiquetas ou nomes de arquivos PDF exportados.

---

### 4.5. Contrato Global da Barra de Navegação Inferior e Pilha de Retorno (`Back Stack`)

Para acabar definitivamente com o bug de "sumir o menu inferior" ou "voltar para a tela errada":

| Classe de Tela | Exemplos | Barra Inferior | Comportamento do Botão `←` / *Android Back* |
| :--- | :--- | :--- | :--- |
| **Classe 1 — Raiz / Abas Principais** | `Início`, `Hoje`, `Saúde`, `Documentos`, `Mais` | **SEMPRE VISÍVEL** | Em aba diferente de `Início`, volta para `Início`; em `Início`, confirma saída ou minimiza. |
| **Classe 2 — Hubs e Listagens de Navegação** | `Acompanhamento (CareFlow)`, `Explorar`, `Medicamentos`, `Consultas`, `Exames`, `Sintomas`, `Pressão`, `Profissionais e Locais`, `PharmaLens` | **SEMPRE VISÍVEL** | Retorna exatamente à rota de origem na pilha de navegação (sem nunca resetar para a Home se veio de `Saúde` ou `Explorar`). |
| **Classe 3 — Telas Focadas de Tarefa / Formulário / Leitura Plena** | `Nova Consulta`, `Novo Medicamento`, `Registrar Sintoma`, `Medir Pressão`, `Pedido de Exame`, `Estúdio OCR / Câmera`, `Prévia PDF A4`, `Gaveta 360 (Sheet)` | **OCULTA** (evita colisão com teclado Android e maximiza área útil) | 1º fecha teclado/modal/gaveta aberta; 2º se houver rascunho não salvo, protege contra perda acidental; 3º retorna exatamente ao registro ou lista de origem. |

---

### 4.6. Anatomia e Hierarquia Ideal de Conteúdo por Tela

Para eliminar poluição visual e sobrecarga de informação em telas pequenas (360–412dp):
1. **Zona 1 — Cabeçalho Limpo (Altura compacta):** Apenas `←` (se sub-tela) + Título humano + 1 ação primária (ou busca/filtro), sem kickers técnicos acima do título.
2. **Zona 2 — Contexto Imediato (Acima da dobra):** Somente 1 bloco de resumo/estado atual (ex.: próxima ação do Brain na Home, ou filtros fixos em Medicamentos, ou status da consulta no Episódio).
3. **Zona 3 — Conteúdo Principal Escaneável:** Cards com no máximo **3 níveis de informação visível** (1. Nome/Ícone + Status; 2. Dado principal como dose/data/valor; 3. 1 ação clara ou indicador de detalhe).
4. **Zona 4 — Profundidade sob Demanda (*Progressive Disclosure*):** Dados avançados — como conferência documental OCR, histórico regulatório `P4-C`, cronologia comercial, reconciliação de receitas e auditoria de evidências — ficam **sempre em seções recolhíveis (*accordions/disclosures*)** claramente rotuladas, garantindo poder técnico total sem assustar a leitura diária.

---

## 5. SUGESTÕES DE EVOLUÇÃO TECNOLÓGICA, CLÍNICA E REGULATÓRIA (ROADMAP EXPANDIDO)

Além do fechamento da fila atual (`P4-B` → `P4-C` → `MACRO 2` → `MACRO 3`) e da cirurgia de **Arquitetura de Informação (`IA 2.0`)**, aqui estão as evoluções de maior impacto pesquisadas e recomendadas para o próximo ciclo do VAULT 360:

### 5.1. Anvisa 2026+ e Preparação para a Bula Digital (QR Code)
* **Contexto Real (Brasil 2026):** Em junho de 2026, a Anvisa abriu as **Consultas Dirigidas 4/2026 e 5/2026** para estruturar a implementação da **Bula Digital via QR Code nas embalagens** de medicamentos no Brasil.
* **Oportunidade para o VAULT (`P4-D` e evolução do `PharmaLens`):**
  * **Leitor de Código de Barras (EAN/GTIN) e QR Code de Embalagem** no `PharmaLensDocumentStudioCI360` (reaproveitando a câmera local sem upload) para tentar casar diretamente com o produto exato no catálogo (`match_kind=exact`), reduzindo drasticamente erros de digitação e confusão entre marcas e princípios ativos.
  * **Pipeline de Curadoria Assistida (`P4-D`):** Criar uma pequena tela/ferramenta administrativa offline de revisão de quarentena da `MACRO 1`, permitindo aprovar em lote as bulas verificadas dos seus medicamentos reais primeiro (priorização orientada pelo uso real do paciente em vez de tentar curar 42 mil produtos de uma vez).
  * **Cronômetro de "Validade Após Abertura":** Para colírios, gotas otológicas (como o seu antibiótico atual), insulinas e suspensões reconstituídas, ao marcar a **data da 1ª dose / abertura do frasco**, exibir um contador discreto de quantos dias restam para descarte seguro conforme bula verificada.

### 5.2. Evolução Clínica do Brain e da Jornada Terapêutica (`D4` e além)
* **Jornada Completa de Cursos Temporários (`D4`):** Projeção visual clara de *"Dia 2 de 7"* para antibióticos e corticoides por período, com botão de conclusão real do tratamento, registro de atraso/interrupção orientada pelo médico e encerramento automático limpo sem continuar cobrando doses depois do último dia.
* **Comparador de Episódios Semelhantes:** Quando ocorrer um novo episódio semelhante no futuro (ex.: nova dor de ouvido meses depois), permitir consultar em 1 toque o episódio anterior (o que foi prescrito em `17/11`, qual antibiótico funcionou e em quantos dias os sintomas cederam) — apenas como fato histórico documentado.
* **Correlação Visual Pressão $\times$ Rotina (Sem Inferência Causal):** Exibir no Modo Médico 360 um painel combinado mostrando as medições de pressão ao longo da semana lado a lado com marcos factuais (troca de horário de remédio, pico de sintoma ou consulta), facilitando a leitura do cardiologista/clínico em 30 segundos.
* **Plano de Ação em Crise (Definido Exclusivamente pelo Médico):** Campo estruturado na consulta para o paciente transcrever exatamente o que o médico orientou fazer em caso de piora ou sinal de alarme (*"Se febre > 38,5°C após 48h, retornar ao pronto-atendimento"*), exibido com destaque apenas como **orientação registrada do seu médico**, nunca como prescrição gerada pelo app.

### 5.3. Interoperabilidade Opcional — Padrão HL7 FHIR e Alinhamento RNDS Brasil
* A **Rede Nacional de Dados em Saúde (RNDS)** do Ministério da Saúde utiliza o padrão internacional **HL7 FHIR** (recursos JSON estruturados como `Patient`, `Observation`, `MedicationStatement`, `Encounter`, `DiagnosticReport`).
* **Sugestão de Evolução Segura (Sem Quebrar Offline-First):**
  * Adicionar um **Exportador de Prontuário Portátil em JSON Estruturado (Compatível com Recursos FHIR básicos)** junto ao backup atual na aba *Mais*.
  * Isso garante soberania total dos seus dados de saúde no longo prazo (você nunca fica refém de um formato proprietário) e deixa o VAULT arquiteturalmente preparado caso queira importar/exportar registros compatíveis com clínicas e prontuários modernos no futuro.

### 5.4. Blindagem LGPD e Privacidade de Nível Hospitalar
* Pela **LGPD (Art. 5º, II e Art. 11)**, dados de saúde são **dados pessoais sensíveis** sob proteção constitucional (EC 115/2022), exigindo *Privacy by Design* e proteção reforçada, enquanto a **Lei nº 13.787/2018** estabelece guarda mínima de 20 anos para prontuários médicos.
* **Evoluções Recomendadas no VAULT:**
  * **Modo Consulta / Tarjamento Seletivo de PDF (*Redaction*):** Ao gerar um PDF A4 para um especialista específico (ex.: otorrinolaringologista), permitir desmarcar em 1 clique categorias sensíveis não relacionadas (ex.: ocultar medicações psiquiátricas ou exames ginecológicos/urológicos quando o usuário preferir compartilhar apenas o recorte pertinente).
  * **Bloqueio Biométrico Rápido & Proteção de Tela em Segundo Plano:** Bloqueio opcional por biometria do Android (com desfoque automático na tela de apps recentes) para que ninguém veja diagnósticos ou remédios caso pegue seu celular desbloqueado.
  * **Selo de Isolamento por Pessoa:** Reforçar visualmente com cor/avatar fixo no topo sempre que você alternar o perfil de *Pessoa ativa* (evitando registrar uma dose ou sintoma no perfil familiar errado).

### 5.5. Android 360, QG2, Notificações Anti-Fadiga, Sync E2E e Fênix Studio
* **Notificações Nativas Inteligentes (`Android 360 / QG2`):** Agendamento nativo resiliente a reinício do aparelho, respeitando **janela de silêncio**, **opt-in explícito**, ação direta *"Tomei"* / *"Adiar 15 min"* na própria notificação e política anti-fadiga (agrupando lembretes do mesmo horário em uma única notificação limpa).
* **Homologação de Sync Offline / Multi-Dispositivo (E2E):** Protocolo formal de teste com 2 aparelhos/contas simulando modo avião, edição concorrente do mesmo medicamento e resolução transparente de conflitos sem perda silenciosa (Checklist `S03`).
* **Fênix Studio & Ergonomia Android Premium:** Revisão fina de *Safe Area* (recortes de câmera/gestos), desempenho de GPU com fallback WebGL seguro, resposta de teclado em formulários longos e consistência visual em larguras `320 / 360 / 393 / 430px`.

---

## 6. PROTOCOLO DE EXECUÇÃO NO TERMUX, SEGURANÇA E CONVENÇÕES DE ENGENHARIA

### 6.1. Comandos de Verificação de Base Antes de Cada Cirurgia
Antes de aplicar qualquer pacote da fila (`P4-B`, `P4-C`, `MACRO 2`, `MACRO 3`), confira no Termux:
```bash
cd ~/projects/vault-app
git status --short
git log -1 --oneline
git fetch origin main && git rev-list --left-right --count HEAD...origin/main
```
O resultado esperado é: branch `main`, `0	0` em `HEAD...origin/main`, stage vazio e zero arquivos rastreados sujos.

### 6.2. Ciclo Obrigatório em 3 Etapas Separadas (Nunca Pular Etapas)
1. **Diagnóstico Isolado em Clone Temporário:** Executa todos os testes `V63` e extras sem parar na primeira falha; gera resumo, log e ZIP de falhas (`ENVIAR_PARA_ANALISE=...zip`) se houver qualquer erro.
2. **Aplicação e Revalidação Local:** Executada **somente** após diagnóstico com **zero falhas**; roda `git diff --check`, `tsc --noEmit`, testes relevantes e backup com rollback seletivo.
3. **Publicação Separada (`PUBLICAR.sh`):** Executada **somente** após marcador explícito de aprovação local; faz stage exato e push normal (jamais `git add -A`, `git reset --hard` ou `git push --force`).

### 6.3. Comandos da Fila Imediata (`P4-B` → `P4-C` → `MACRO 2` → `MACRO 3`)
```bash
# 1. P4-B (se diagnóstico já passou com zero falhas, avançar para validar e publicar)
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/APLICAR-VALIDAR.sh
# Somente após P4B_R1_APROVADA_LOCALMENTE:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/PUBLICAR.sh

# 2. P4-C (somente após confirmar P4-B no HEAD/origin/main)
# Executar o ciclo completo: DIAGNOSTICAR -> APLICAR-VALIDAR -> PUBLICAR do ZIP P4-C

# 3. MACRO 2 (somente após confirmar P4-C publicada)
# Executar o ciclo completo conforme instruções do pacote MACRO 2

# 4. MACRO 3 (somente após confirmar MACRO 2 publicada)
# Executar o ciclo completo conforme instruções do pacote MACRO 3 (INSTALAR-VALIDAR / PUBLICAR)
```

---

## 7. ROTEIRO COMPLETO DE HOMOLOGAÇÃO REAL NO APARELHO (VÍDEO + TESTE REAL `17/11`)

Assim que a fila estiver publicada na `main` e o app atualizado no celular, execute a validação real em **dois blocos** (gravando a tela para auditoria visual e desenho definitivo da cirurgia **IA 2.0**):

### Bloco A — Vídeo de Auditoria Global de Navegação e Arquitetura (Para fechar a `IA 2.0`)
Navegue pausadamente (2–3 segundos por tela) passando por:
1. **Home (`Início`):** Conferir o card único do Brain (`PRÓXIMA ETAPA` sem ícone duplicado e sem texto cortado), alinhamento dos cards inferiores e ausência de códigos técnicos.
2. **Hubs de Saúde:** Entrar em **Minha Saúde**, **CareFlow 360**, **Minha Rede de Saúde** e **Explorar** — observar onde a barra inferior aparece/some, onde existem títulos/textos redundantes e onde o botão `←` devolve você.
3. **Aba `Mais`:** Conferir *Pessoa ativa* alinhada, *Ferramentas avançadas* em coluna única sem cortes e organização das sanfonas.

### Bloco B — Teste Clínico Real com Seus Dados (Consulta `17/11` + Antibiótico Otológico + Pressão)
1. **Consulta de `17/11` e Pilha de Retorno (`B1` + `D2`):**
   * Abra/edite a consulta de `17/11/2026`. Confira a data em formato brasileiro e a ausência de siglas técnicas no topo.
   * Acione o cadastro de medicamento diretamente a partir dessa consulta e valide se o vínculo e o médico sugerido vêm preenchidos.
2. **Antibiótico Otológico Temporário / Por Período (`B4` + `D2` + `MACRO 1`–`3`):**
   * Cadastre o antibiótico otológico comprado em `18/11` marcando **uso por período (temporário)**, **via otológica** e apresentação **gotas / solução otológica**.
   * Registre a **aquisição** sem marcar doses passadas: valide que o app **não inventou doses retroativas**, mantém separado dos contínuos, exibe o ícone discreto de gotas no **PillStudio** sem badge `+1` órfão e destaca as 5 abas na **Gaveta 360**.
3. **Evolução de Sintomas, Pressão Arterial e Exames (`B2` + `B3` + `D3`):**
   * Registre um sintoma de acompanhamento vinculado à consulta usando o seletor numérico `HH:mm`; confira feedback imediato, limpeza do formulário, ausência de duplicação, separação dos gráficos por sintoma e supressão da cobrança repetida na Home.
   * Abra **Pressão e planos**, lance uma medição real e confirme que ela fica isolada dos gráficos de sintomas.
   * Em **Exames**, verifique se pedidos do CareFlow aparecem com edição/conferência individual item a item.
4. **PharmaLens, Cartão de Retorno e PDF A4 (`P4-B` + `P4-C` + `MACRO 2`–`3`):**
   * Abra o **PharmaLens** em um medicamento: teste a conferência documental (sem upload), confira identidade exata vs. aproximada, links da Anvisa (`gov.br`), histórico de fontes recolhível e cópia manual do recibo (sem texto bruto OCR nem IDs internos).
   * Troque de pessoa/medicamento e descarte uma captura para validar zero vazamento de sessão.
   * Abra o **Cartão de Retorno** da consulta de `17/11` (3 blocos auditáveis + cópia manual) e exporte um **PDF A4** no Modo Médico 360 verificando nome de arquivo limpo e layout legível.

---

## 8. ANEXO TÉCNICO INTEGRAL PRESERVADO — RELATÓRIO MESTRE V9 E V8

> **Regra de Continuidade:** Todo o registro forense, commits verificados, arquivos auditados, políticas de dados e checklist permanente dos Relatórios V8 e V9 estão integralmente preservados abaixo para servir de fonte única em qualquer novo chat de desenvolvimento.

### 8.1. Registro Forense V9 (Estado Verificado no GitHub e Arquivos Auditados na P4-C)
* **Macro 1 (bula por produto exato):** Commit `b174d10bf6b0b7c258ba636b0138d049e736d093`, mensagem `feat(vault): CI360 P6 P4 macro1 conhecimento verificavel de bula`, em 18/11/2026. Proposta de migração SQL **sem ativação automática**.
* **UX360 R3 QG1:** Arquivos rastreados na `main` consultada; aprovação integral **510/510** relatada no Termux antes do push.
* **Arquivos e Contratos Auditados na `P4-C`:**
  * `lib/medication-catalog/use-evidence-macro1.ts`: autoridade para identidade exata, apenas ID de produto com `match_kind=exact`, `regulatoryIdentity.referenceType=product` e fonte `anvisa`.
  * `lib/medication-intelligence/types.ts`: `MedicationReferenceSource` com `id`, autoridade, URL, `version` e `verifiedAt`; regras `effectiveFrom`, `effectiveUntil` e exceções; `commercialIdentity` preserva produtos atuais/históricos sem fusão.
  * `lib/types.ts`: `MedicationCatalogSnapshot` tem `lookup_key`, `catalog_signature`, `resolved_at`, `quality`, `match_kind`, `reference`; **não tem** campo de validade sanitária atual, portanto é proibido inferir essa validade.
  * `PharmaLensWorkspaceV7`: contém estúdio OCR em *disclosure* e análise V7; a `P4-C` acrescenta apenas uma trilha em *disclosure*, sem nova consulta Dexie, upload ou duplicação do estúdio.
  * **Regra Interpretativa:** Falta de fonte, ausência de versão, data inválida/futura, revisão antiga (730 dias), regra condicionada ou conflito são **motivos para conferir**, nunca prova de que o medicamento esteja proibido, vencido ou inadequado.

### 8.2. Superfícies e Autoridades Arquiteturais Que Não Podem Ser Duplicadas (V8)
* `app/saude/pharmalens/page.tsx` delega ao `PharmaLensWorkspaceV7` (Dexie **somente leitura**, consulta por `[user_id+person_id]`, janela de 30 dias; usa `buildPharmaLensReportV7`, `buildPharmaLensObservationsV7` e `makePharmaLensConsultationBriefV7`; proibido atribuir causalidade a fabricantes).
* `PharmaLensGuidedReviewP6`: conferência visual manual de foto e fatos do catálogo, sem OCR automático declarado.
* `PharmaLensDocumentStudioCI360`: OCR opcional com `TextDetector` local, transcrição, extração de candidatos, campos revisáveis e descarte em memória de tela (**não criar OCR paralelo nem uploads automáticos**).
* `pharmalens-document-candidate-ci360.ts` (candidatos + validade calendárica `P4-B`) e `pharmalens-catalog-audit-ci360.ts` (comparação com cadastro/catálogo).
* `knowledge-resolver-m153p4.ts`: resolve fatos por autoridade `declared`, `official_exact`, `official_inferred`, `conflict`, `unknown`.
* `lib/m3/brain-return-d3.ts` e `BrainReturnCardD3.tsx`: autoridade única do retorno pós-consulta (`3608f9124284bcbf12a9d162f58b89612dfa1e94`). `CareFlow M2`, `clinical-episode-p4` e `consultation` existentes são referências; não gravar eventos presumidos.
* `lib/navigation/clinical-directory-m150.ts`: diretório ampliado do Explorar (31 destinos); `R3` reutiliza o Health Hub `R5` existente para favoritos, evitando segunda base.
* `scripts/vault-qg1-touch-contract.cjs` (`QG1`): audita mínimo tátil por semântica, não por string CSS fixa; preservar ao evoluir contratos.
* **Arquivos da `P4-B`:** Modificados (`pharmalens-document-candidate-ci360.ts`, `pharmalens-catalog-audit-ci360.ts`, `PharmaLensDocumentStudioCI360.tsx`, `scripts/test-v63-release-gate.mjs`); Novos (`pharmalens-evidence-p4b.ts`, `PharmaLensEvidenceReviewP4B.tsx`, `test-vault-ci360-p6-p4b-pharmalens.cjs`, doc técnico e V8).

### 8.3. Política Inegociável de Segurança Clínica e Dados
* **Inferências Proibidas:** Jamais inferir que foto = registro sanitário válido; nome comercial = princípio ativo; lote = aquisição; prescrição = compra; compra = dose administrada; ausência de log = não adesão; quantidade atual = histórico completo; descrição da bula = interação clínica individual; correlação temporal = causalidade.
* **Caso Metadona / Retiradas:** Ocorrência histórica de *"Abrir retirada"* após conclusão exige validação por IDs, ciclos e comprovantes; preservar integralmente estoque e histórico sem encerrar o caso por impressão visual.
* **Integridade de Dados:** Nenhuma alteração automática de receitas, estoque, ações de dose, documentos clínicos ou RLS; nenhuma migração SQL antecipada; falhas de leitura remota nunca equivalem a exclusão.
* **Portais Oficiais Verificados para Consulta Humana Externa:**
  * `https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos`
  * `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`
  * *(Não assumir API pública estável ou licença irrestrita de ingestão.)*

### 8.4. Checklist Permanente de Qualidade `S01–S14` (Herdado de V6/V7/V8)
* **S01:** Recibo por desdobramento | **S02:** Prévia de alteração | **S03:** Conflito entre aparelhos | **S04:** Documento indisponível | **S05:** Pendência explicada | **S06:** Mudanças desde a consulta | **S07:** Rascunho escopado | **S08:** Explicação Brain | **S09:** Cobertura de dados | **S10:** Ações compensatórias | **S11:** Orçamento de perguntas | **S12:** Diagnóstico exportável | **S13:** Gate único (`V63`) | **S14:** Revisão de catálogo.

---

**Diretriz de Continuidade para Próximos Chats:** Continuar sempre pela evidência verificada da execução (`git log -1`, `HEAD == origin/main` e logs reais de diagnóstico), nunca apenas pelo número da cirurgia. Não reaplicar `P0`, `D3`, `R3` ou `MACRO 1` já confirmadas na `main`. O próximo marco estratégico após o fechamento da fila `P4-B` → `P4-C` → `MACRO 2` → `MACRO 3` e do vídeo de homologação no aparelho é a cirurgia **IA 2.0 — Unificação de Hubs, Limpeza Textual e Navegação Global**.

<!-- fim do conteúdo original -->


---

## ANEXO B — Relatório Mestre V10 Engenharia de P4-D (original)

<!-- início do conteúdo original: VAULT-360-RELATORIO-MESTRE-V10-2026-11-18.md -->

# VAULT 360 — RELATÓRIO MESTRE V9 | Atualização P4-C (18/11/2026)

**Repositório:** `alefe-redes-computadores/vault-app` · **Termux:** `~/projects/vault-app` · **entregas:** `~/storage/downloads`.

## Estado verificado diretamente no GitHub durante a preparação desta cirurgia

- **Macro 1 (bula por produto exato)** publicada no commit `b174d10bf6b0b7c258ba636b0138d049e736d093`, mensagem `feat(vault): CI360 P6 P4 macro1 conhecimento verificavel de bula`, em 18/11/2026. Implementa seleção de evidências verificadas por produto exato, versão/hash de documento e status com fonte, deixando proposta de migração SQL **sem ativação automática**.
- **UX360 R3 QG1** já presente como arquivos rastreados na `main` consultada; o operador relatou aprovação integral no Termux antes de publicar.
- **P4-B**: operador relatou **diagnóstico com zero falhas**, estando na etapa de validar/publicar. **O commit P4-B ainda não estava visível na `main` durante a verificação inicial**. A P4-C exige P4-B oficialmente presente no HEAD.
- **P4-C**: é apenas *candidata* deste pacote, não aplicada ou publicada. Trilha de fontes/versões cadastradas, cronologia das regras, histórico comercial, verificação humana. Não altera banco nem executa Anvisa em tempo real.
- NÃO confundir diagnóstico zero com `P4B_R1_APROVADA_LOCALMENTE`; este marcador depende da aplicação e dos pós-gates. Tampouco equivale a commit/push, deploy Vercel ou homologação no APK.

## Organização correta do roadmap

1. Validar e publicar **P4-B PharmaLens**. Confirmar `git status --short`, `git log -1 --oneline` e `git rev-list --left-right --count HEAD...origin/main`.
2. **P4-C Governança do Catálogo** — diagnosticar no clone, aplicar/validar, publicar separadamente. Nenhum campo de fonte importada é uma afirmação de situação sanitária atual.
3. **P4-D Atualização revisada do catálogo** — processo de auditoria e aprovação de novos snapshots; planejar migração/ingestão apenas após schema real, origem oficial, RLS, auditoria e ação explícita do operador.
4. **P6 Macro 2** — reconciliação documental pós-consulta e evidência farmacológica de interações quando disponível; não aplicar ajuste de dose sem profissional.
5. **D4 Jornada Terapêutica**, **Fênix Studio**, **Android 360 + QG2**, **sincronização offline/E2E** com provas de aparelho.

## Pontos novos auditados na P4-C

- `lib/medication-catalog/use-evidence-macro1.ts`: autoridade para identidade exata, apenas ID de produto com `match_kind=exact`, `regulatoryIdentity.referenceType=product` e fonte `anvisa`.
- `lib/medication-intelligence/types.ts`: `MedicationReferenceSource` com `id`, autoridade, URL, `version` e `verifiedAt`; regras `effectiveFrom`, `effectiveUntil` e exceções; `commercialIdentity` preserva produtos atuais/históricos sem fusão.
- `lib/types.ts`: `MedicationCatalogSnapshot` tem `lookup_key`, `catalog_signature`, `resolved_at`, `quality`, `match_kind`, `reference`; **não tem** campo de validade sanitária atual, portanto é proibido inferir essa validade.
- `PharmaLensWorkspaceV7` já contém estúdio OCR em disclosure e análise V7; a P4-C acrescenta apenas uma trilha em disclosure, sem nova consulta Dexie, upload ou duplicação do estúdio.
- Falta de fonte, ausência de versão, data inválida/futura, revisão antiga, regra condicionada ou conflito são **motivos para conferir**, não prova de que medicamento esteja proibido, vencido ou inadequado.

## Segurança, gates e nomenclatura

A cada entrega: hashes SHA256, HEAD==origin/main, main sem alterações rastreadas/stage, clones temporários sem push, V63 individual mais extras e TypeScript, backup e rollback seletivo, stage exato e push normal. Ninguém vê códigos `P4C`, `QG1` ou `CI360` em textos públicos. UI com alvos táteis adequados e cor/contraste; homologação real no Android é separada.

---

## Anexo: Relatório Mestre V8, histórico anterior preservado

# VAULT 360 — RELATÓRIO MESTRE V8 | Continuidade de desenvolvimento
**Corte:** 18/11/2026 (America/Sao_Paulo). Repositório `alefe-redes-computadores/vault-app`, Android/Termux `~/projects/vault-app`, entrega em `~/storage/downloads`. Este relatório é a base para retomar o VAULT em outro chat.

## 1. Estado observado e níveis de evidência
**Último commit confirmado diretamente no GitHub durante a preparação P4-B:** `3608f9124284bcbf12a9d162f58b89612dfa1e94`, assunto `feat(vault): CI360 P6 P3 D3 Brain e cartao de retorno por episodio`.

**UX360 R3 QG1:** o operador informou **510/510 verificações aprovadas** e que estava iniciando a publicação. **A publicação de R3 não estava confirmada pelo GitHub na verificação realizada durante a criação do pacote P4-B**. Sua confirmação dependerá do novo commit na `main`. Não confundir aprovação local com push, deploy Vercel, APK instalado ou homologação visual.

A **P6 P4-B** deste ZIP é candidata: gerada e verificada localmente quanto a integridade e sintaxe, mas a bateria global V63 só pode ser executada no Termux sobre o HEAD real com R3 publicada. Nenhum P4-B deve ser chamado de publicado antes de o operador confirmar commit/push.

Matriz de evidência inegociável: **planejado ≠ implementado ≠ teste local ≠ GitHub ≠ Vercel Ready ≠ APK instalado ≠ homologado em Android**.

## 2. Marcos confirmados pela linha de continuidade
- **Base CI360 P6 P3B** (`851b4020` no corte do relatório V7 anterior): refinou retiradas operacionais e pull documental; não é comprovação de sincronização E2E em dois dispositivos.
- **CareFlow M3**: eventos relacionais de consulta, pedidos/exames, monitoramentos e sintomas; Modo Médico, dossiê, linha do tempo, PDF por escolha do usuário. M3 P1/P2/P3 possuem histórico de publicação, mas cada superfície ainda exige aceite visual Android.
- **P6 P3-A/P3-B**: biblioteca de PDFs locais e correções de integridade por pessoa, sem garantir todos os fluxos nativos.
- **CareFlow P0 R4**: pacote publicado, fechamento funcional e navegação do cuidado; regressões P0 reais exigem validação com IDs antes de declarar casos encerrados.
- **D3 canônica**: publicação `3608f912`, Brain pós-consulta e Cartão de Retorno por episódio, sem segundo motor, sem criação automática de pendências/doses.
- **UX360 R1**: diagnóstico bloqueou antes de executar testes porque já existia `scripts/test-vault-ci360-p6-p3-d3.cjs` no HEAD canônico; checkout foi preservado.
- **UX360 R2**: **500/509 aprovados, 9 falhas**; oito ligadas a asserções de alturas antigas nos cards e uma a catálogo expandido de 22 para 31 rotas; nenhuma instalação.
- **UX360 R3 + QG1**: o operador confirmou **510/510**, correções de contratos de altura com piso tátil, 31 destinos distintos, filtros de nomenclatura pública e relatório de estatísticas. **Push ainda em confirmação neste corte**.

## 3. Superfícies e arquitetura que não se podem duplicar
- `app/saude/pharmalens/page.tsx` delega ao `PharmaLensWorkspaceV7`; navegação e seleção de medicamento já existem.
- `PharmaLensWorkspaceV7` usa Dexie **somente leitura**, consulta por `[user_id+person_id]` e leituras dos logs/relatos em janela de até 30 dias; usa `buildPharmaLensReportV7`, `buildPharmaLensObservationsV7` e `makePharmaLensConsultationBriefV7`. Não atribuir causalidade a fabricantes.
- `PharmaLensGuidedReviewP6` é conferência visual manual de foto e fatos do catálogo, sem OCR automático declarado nessa superfície.
- `PharmaLensDocumentStudioCI360` já tem OCR opcional com TextDetector do aparelho quando disponível, transcrição, extração de candidatos, campos revisáveis e descarte, tudo em memória de tela. **Não criar OCR paralelo, nem uploads automáticos.**
- `pharmalens-document-candidate-ci360.ts` apenas reconhece candidatos; `pharmalens-catalog-audit-ci360.ts` faz a comparação com cadastro/catálogo. `knowledge-resolver-m153p4.ts` resolve fatos por autoridade `declared`, `official_exact`, `official_inferred`, `conflict`, `unknown`.
- `lib/m3/brain-return-d3.ts` e `BrainReturnCardD3.tsx` são a autoridade do retorno pós-consulta. `CareFlow M2`, `clinical-episode-p4` e `consultation` existentes são referências; não gravar eventos presumidos.
- `lib/navigation/clinical-directory-m150.ts` é o diretório ampliado do Explorar. R3 utiliza o Health Hub R5 já existente para favoritos, evitando segunda base.
- QG1 (`scripts/vault-qg1-touch-contract.cjs`) audita mínimo tátil por semântica, não por string CSS fixa; preservar ao evoluir contratos antigos.

## 4. P6 P4-B — cirurgia proposta nesta entrega
**Objetivo:** corrigir ambiguidade entre nome comercial, princípio ativo, apresentação e fonte regulatória; acrescentar recibo de conferência documental versionada com revisão manual.

**Arquivos modificados:**
1. `lib/health-intelligence/pharmalens-document-candidate-ci360.ts` — validade calendárica.
2. `lib/health-intelligence/pharmalens-catalog-audit-ci360.ts` — evitar implicar que ingrediente ativo ou lista de apresentações atesta produto e concentração individual.
3. `components/saude/PharmaLensDocumentStudioCI360.tsx` — componente adicional dentro do escopo OCR existente.
4. `scripts/test-v63-release-gate.mjs` — contrato P4-B registrado uma vez, preservando R3 QG1.

**Novos:** módulo puro `pharmalens-evidence-p4b.ts`, `PharmaLensEvidenceReviewP4B.tsx`, teste `test-vault-ci360-p6-p4b-pharmalens.cjs`, documento técnico e este relatório mestre V8. Sem migrations, sem APIs externas, sem novas tabelas e sem alteração clínica.

O componente apresenta links fixos da Anvisa para **consulta humana externa**, sem afirmar que um produto foi verificado. Os fatos do catálogo podem ter origem/versão/data ou explicitamente ausência dessas informações. O recibo só é copiado por ação explícita; a matéria-prima OCR e os IDs privados não entram na saída. O botão de conferência humana da superfície existente mantém escopo de sessão e não muda autoridade regulatória.

## 5. Política de segurança e dados
- Jamais inferir: uma foto = registro sanitário válido; nome comercial = princípio ativo; lote = aquisição; prescrição = compra; compra = dose administrada; ausência de log = não adesão; quantidade atual = histórico completo; descrição da bula = interação clínica individual.
- **Metadona/retiradas:** ocorrência anterior de “Abrir retirada” após conclusão exige validação por IDs, ciclos e comprovantes. Preservar todo o estoque e histórico; não usar assertiva visual para concluir o caso.
- Nenhuma alteração automática de receitas, estoque, ações de dose, documentos clínicos ou RLS; nenhuma migração SQL antecipada. Privacidade por usuário e pessoa; falhas de leitura remota não equivalem a exclusão.
- Fontes regulatórias: `https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos` e `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`, verificadas para navegação pública. **Não assumir API estável ou licença de ingestão**.
- Conformidade: distinguir informação do profissional, relato da pessoa, data aferida, data de cadastro, futuro planejado e evento efetivo. Correlação temporal não demonstra causalidade.

## 6. Roadmap sequenciado (não chamar planejado de entregue)
**Agora:** concluir publicação da R3 QG1, obter SHA/`origin/main`, executar diagnóstico isolado P4-B (expectativa de **511** verificações se o V63 mantiver os 510 anteriores + 1 contrato), aplicar e publicar só após zero falhas, conferir no Android.

**P6 P4-C — catálogo e Anvisa:** delimitar fonte pública, forma de consulta e termos de uso; identificar entidade exata (substância, apresentação, forma/via, empresa, registro, bula) com atualização versionada, hash e revisão humana; auditoria de importação e rollback sem alterar fatos clínicos. Não construir interações personalizadas sem política farmacológica revisada.

**D4 — jornada terapêutica:** início/término real de cursos temporários, projeção de doses dentro de janela, correção/edição/atraso/cancelamento e retorno associado, sem inventar última dose ou aceitar saldo como histórico.

**Fênix Studio / Android premium:** acessórios, anatomia visual, GPU, pausa/retomada, fallback WebGL, Safe Area, cards e scroll, teclado e contraste; usar vídeos reais do aparelho, sem dizer que foram vistos quando só há descrições.

**QG2 / Android 360:** testes de cenário e semântica, inventário de duplicações, rastreabilidade de cobertura; notificações nativas reais, permissões, janela de silêncio, background/restart/opt-in, sem prometer entrega só por simulação. Homologar sync em dois dispositivos/contas e documento offline/E2E.

**Checklist permanente S01–S14 do V6/V7:** recibo por desdobramento; prévia de alteração; conflito entre aparelhos; documento indisponível; pendência explicada; mudanças desde consulta; rascunho escopado; explicação Brain; cobertura de dados; ações compensatórias; orçamento de perguntas; diagnóstico exportável; gate único; revisão de catálogo.

## 7. Convenções de engenharia aprovadas pelo operador
- Android + Termux, PWA/Vercel e APK Capacitor. Evitar build pesado em celular quando não necessário; execução controlada de gates no Termux.
- Macrocirurgia ZIP + alternativa Base64; **diagnóstico isolado primeiro** em clone temporário, executando todos os testes V63 e extras sem parar no primeiro; resumo, log e ZIP de falhas; só depois aplicar e revalidar; publicação **separada**, jamais automática.
- `git diff --check`, `node .../tsc --noEmit`, testes relevantes, backup por arquivo, rollback seletivo que não toca mudanças concorrentes. Nunca `git add -A`, `reset --hard`, force push ou sobrescrita de arquivo sem âncora.
- Preflight exige `main`, `HEAD == origin/main`, stage vazio e ausência de alterações rastreadas prévias; não sobrescrever arquivos novos. Para mudança de HEAD, reconciliar a nova base, não forçar publicação.
- **Nomes internos** Mxxx/Px/Rx/CI360/QG1/D3 ficam só em scripts, commits, documentação e diagnósticos; rótulos, botões, PDFs e cabeçalhos do app devem ser públicos, legíveis, humanos e premium.
- Visual mobile-first escuro premium, Lucide, haptics/toasts quando apropriados, retaguarda privada, campos sem truncamento, retorno seguro e alvos grandes.
- Falha de teste deve ser investigada, não apenas alterada para verde. Consolidar testes duplicados somente com equivalência de cobertura e testes negativos documentados.

## 8. Comandos de entrega P4-B (a executar APÓS confirmar R3 no GitHub)
```bash
cd ~/storage/downloads && unzip -o VAULT-CI360-P6-P4B-PHARMALENS-R1.zip && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/DIAGNOSTICAR-TUDO.sh
# SOMENTE com zero falhas:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/APLICAR-VALIDAR.sh
# SOMENTE com P4B_R1_APROVADA_LOCALMENTE:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/PUBLICAR.sh
```
Caso haja falha, usar o caminho `ENVIAR_PARA_ANALISE=...zip`, enviar o diagnóstico completo e não aplicar nada ao checkout real. Não executar este pacote em paralelo à publicação da R3.

## 9. Testes de aceite no Android
1. Abrir PharmaLens → selecionar medicamento → Conferência documental → selecionar imagem suportada → OCR (se TextDetector existir) ou transcrever manualmente. Confirmar que não há upload.
2. Conferir nome, dosagem, fabricante, lote, validade e registro como **campos capturados** e sua origem; diferenciar coincidência textual de autoridade oficial.
3. Checar validade impossível, fabricante divergente, substância distinta do nome comercial, lista de apresentações com várias dosagens; nada pode virar selo de identidade do produto.
4. Conferir os dois links oficiais e retorno seguro; copiar manualmente e conferir ausência de IDs e texto bruto não exibido; testar clipboard indisponível.
5. Alternar pessoa/medicamento durante captura, cancelar e descartar: nenhum texto ou imagem da pessoa anterior deve aparecer; nenhuma receita, dose, retirada, aquisição ou estoque muda.
6. Validar layout em 320/360/393/430px, fonte grande, teclado, botão min-h-11, bottom bar e orientação.
7. Verificar que Home, Explorar, Mais, CareFlow, Modo Médico, Brain e Cartão de Retorno da R3 continuam presentes e sem códigos de cirurgia ao usuário.

**Fim do relatório:** continuar pela evidência da execução, não pelo número da cirurgia. Se outro chat receber este documento, verificar primeiro o último HEAD e o log do diagnóstico, sem voltar a aplicar a P0/D3/R3 já publicadas.


---

# ATUALIZAÇÃO V10 — 18/11/2026 · P6 P4-D — Revisão OFFLINE do Catálogo

**Esta seção atualiza o relatório mestre V9 preservado acima.** Nenhuma das fases anteriores é declarada publicada sem evidência do SHA real. Esta versão do relatório acompanha a candidata P4-D.

## Evidência operacional mais recente recebida

- O diagnóstico isolado da **P4-C** no checkout `a0ca9ce2473f1805acd63e956b41e173c59e99fc` concluiu **514/514 verificações aprovadas**, zero falhas. Usuário informou que ainda iria executar a aplicação/validação e depois publicar. **O diagnóstico não é publicação.**
- A consulta ao GitHub feita na preparação da P4-D mostrou em `main` o commit `a0ca9ce2473f1805acd63e956b41e173c59e99fc` com mensagem `feat(vault): CI360 P6 P5 macro2 reconciliacao e pharmalens explicavel`. Esse era o HEAD observado, não necessariamente o HEAD final quando a P4-D for instalada.
- A **P4-C exige** como predecessores: UX360 R3 QG1, P4-B PharmaLens, Macro 1 de bula e D3 canônica. A P4-D exige também os arquivos da P4-C no HEAD rastreado.
- Os contratos V63 evoluíram com outras frentes simultâneas. **Não congelar número de contratos nem afirmar 514 ou 515 como garantia para o próximo HEAD**; medir o V63 real em cada diagnóstico.

## Descoberta P4-D: auditor legado incompatível com atualizações futuras

No `scripts/medication-catalog/audit-imported-catalog.js`, o auditor inicial exige números fixos (`medication_substances: 2439`, `medication_products: 42349`, `medication_product_substances: 22104`, `medication_presentations: 51465`), exatamente três versões ativas e zero aliases/regras nesta fase histórica. Esses valores são referências antigas, **não metas clínicas e nem condições universais** para a atualização do catálogo. A P4-D cria um auditor alternativo offline; não altera o script histórico.

## Entrega P4-D / Status de implantação

**Candidata nova, NÃO aplicada, NÃO publicada nem homologada no Android.**

Arquitetura:
- Motor CommonJS de comparação, SHA256, CSV streaming, encoding UTF-8/Windows-1252, chaves compostas explícitas, listas de fontes permitidas.
- CLI que consome somente arquivos locais fornecidos e escreve dossiês offline em diretório novo; não inclui qualquer importador/promotor de tabelas.
- Reprovação de fontes falsas, sha divergente, versões idênticas, datas inválidas, schemas inesperados, colunas-chave ausentes, duplicatas, perdas/revisões fora de limiares.
- Dossiês de inclusões, alterações e remoções, com exemplos apenas em hashes, não dados de pacientes.
- Revisão sempre obrigatória, mesmo quando nenhuma anomalia quantitativa é detectada. A referência baixada não confirma status atual de registro ou bula vigente.
- Sem alteração de doses, estoque, receitas, renovações, alertas, identidade regulatória, histórico comercial, RLS ou esquema SQL.

## Critério para fechamento da P4-D

1. GitHub `origin/main` com P4-C efetivamente publicada.
2. Diagnóstico completo em clone isolado: todos V63 realmente presentes, extras, tsc e diff --check; **zero falhas**.
3. Aplicação com backup, contrato de arquivos, regressões pós-aplicação e marcador local.
4. Publicação separada; validar SHA e homologar uso do CLI com um par de arquivos não clínicos, em máquina apropriada.
5. Fluxo de homologação/produção do catálogo permanece **fora do escopo**: exigirá outra autorização, auditoria de banco vivo, backup, relações e migração idempotente.

## Roadmap depois desta candidata

- **P4-E — Processo de importação homologada e promoção controlada (se autorizado):** transação, versionamento real em Supabase, read-only preliminar, rollback SQL com backup, verificação de RLS e estabilidade dos IDs. Não fazer sem evidência de esquema real e revisão humana.
- **D4 — Jornada terapêutica:** medicamentos temporários, fins e renovações, acompanhamento observado vs planejado e ações não inferidas.
- **Fênix Studio 360:** acessórios, malha, desempenho Android e usabilidade visual por telas.
- **Android 360 e QG2:** PWA/APK, notificações nativas, offline e sincronização entre duas sessões, testes de interação e acessibilidade mobile.

## Regras permanentes preservadas

Nunca expor `P4-D`, `V63`, `QG1` em textos do app; não usar `git add -A`, `reset --hard`, `force push`, migrations não autorizadas ou importador global autoexecutável. Não substituir dados de saúde por OCR/texto do catálogo. Produto, apresentação, fabricante, registro e vigência são autoridades distintas.


<!-- fim do conteúdo original -->


---

## ANEXO C — Relatório Mestre V9 (original)

<!-- início do conteúdo original: VAULT-360-RELATORIO-MESTRE-V9-2026-11-18.md -->

# VAULT 360 — RELATÓRIO MESTRE V9 | Atualização P4-C (18/11/2026)

**Repositório:** `alefe-redes-computadores/vault-app` · **Termux:** `~/projects/vault-app` · **entregas:** `~/storage/downloads`.

## Estado verificado diretamente no GitHub durante a preparação desta cirurgia

- **Macro 1 (bula por produto exato)** publicada no commit `b174d10bf6b0b7c258ba636b0138d049e736d093`, mensagem `feat(vault): CI360 P6 P4 macro1 conhecimento verificavel de bula`, em 18/11/2026. Implementa seleção de evidências verificadas por produto exato, versão/hash de documento e status com fonte, deixando proposta de migração SQL **sem ativação automática**.
- **UX360 R3 QG1** já presente como arquivos rastreados na `main` consultada; o operador relatou aprovação integral no Termux antes de publicar.
- **P4-B**: operador relatou **diagnóstico com zero falhas**, estando na etapa de validar/publicar. **O commit P4-B ainda não estava visível na `main` durante a verificação inicial**. A P4-C exige P4-B oficialmente presente no HEAD.
- **P4-C**: é apenas *candidata* deste pacote, não aplicada ou publicada. Trilha de fontes/versões cadastradas, cronologia das regras, histórico comercial, verificação humana. Não altera banco nem executa Anvisa em tempo real.
- NÃO confundir diagnóstico zero com `P4B_R1_APROVADA_LOCALMENTE`; este marcador depende da aplicação e dos pós-gates. Tampouco equivale a commit/push, deploy Vercel ou homologação no APK.

## Organização correta do roadmap

1. Validar e publicar **P4-B PharmaLens**. Confirmar `git status --short`, `git log -1 --oneline` e `git rev-list --left-right --count HEAD...origin/main`.
2. **P4-C Governança do Catálogo** — diagnosticar no clone, aplicar/validar, publicar separadamente. Nenhum campo de fonte importada é uma afirmação de situação sanitária atual.
3. **P4-D Atualização revisada do catálogo** — processo de auditoria e aprovação de novos snapshots; planejar migração/ingestão apenas após schema real, origem oficial, RLS, auditoria e ação explícita do operador.
4. **P6 Macro 2** — reconciliação documental pós-consulta e evidência farmacológica de interações quando disponível; não aplicar ajuste de dose sem profissional.
5. **D4 Jornada Terapêutica**, **Fênix Studio**, **Android 360 + QG2**, **sincronização offline/E2E** com provas de aparelho.

## Pontos novos auditados na P4-C

- `lib/medication-catalog/use-evidence-macro1.ts`: autoridade para identidade exata, apenas ID de produto com `match_kind=exact`, `regulatoryIdentity.referenceType=product` e fonte `anvisa`.
- `lib/medication-intelligence/types.ts`: `MedicationReferenceSource` com `id`, autoridade, URL, `version` e `verifiedAt`; regras `effectiveFrom`, `effectiveUntil` e exceções; `commercialIdentity` preserva produtos atuais/históricos sem fusão.
- `lib/types.ts`: `MedicationCatalogSnapshot` tem `lookup_key`, `catalog_signature`, `resolved_at`, `quality`, `match_kind`, `reference`; **não tem** campo de validade sanitária atual, portanto é proibido inferir essa validade.
- `PharmaLensWorkspaceV7` já contém estúdio OCR em disclosure e análise V7; a P4-C acrescenta apenas uma trilha em disclosure, sem nova consulta Dexie, upload ou duplicação do estúdio.
- Falta de fonte, ausência de versão, data inválida/futura, revisão antiga, regra condicionada ou conflito são **motivos para conferir**, não prova de que medicamento esteja proibido, vencido ou inadequado.

## Segurança, gates e nomenclatura

A cada entrega: hashes SHA256, HEAD==origin/main, main sem alterações rastreadas/stage, clones temporários sem push, V63 individual mais extras e TypeScript, backup e rollback seletivo, stage exato e push normal. Ninguém vê códigos `P4C`, `QG1` ou `CI360` em textos públicos. UI com alvos táteis adequados e cor/contraste; homologação real no Android é separada.

---

## Anexo: Relatório Mestre V8, histórico anterior preservado

# VAULT 360 — RELATÓRIO MESTRE V8 | Continuidade de desenvolvimento
**Corte:** 18/11/2026 (America/Sao_Paulo). Repositório `alefe-redes-computadores/vault-app`, Android/Termux `~/projects/vault-app`, entrega em `~/storage/downloads`. Este relatório é a base para retomar o VAULT em outro chat.

## 1. Estado observado e níveis de evidência
**Último commit confirmado diretamente no GitHub durante a preparação P4-B:** `3608f9124284bcbf12a9d162f58b89612dfa1e94`, assunto `feat(vault): CI360 P6 P3 D3 Brain e cartao de retorno por episodio`.

**UX360 R3 QG1:** o operador informou **510/510 verificações aprovadas** e que estava iniciando a publicação. **A publicação de R3 não estava confirmada pelo GitHub na verificação realizada durante a criação do pacote P4-B**. Sua confirmação dependerá do novo commit na `main`. Não confundir aprovação local com push, deploy Vercel, APK instalado ou homologação visual.

A **P6 P4-B** deste ZIP é candidata: gerada e verificada localmente quanto a integridade e sintaxe, mas a bateria global V63 só pode ser executada no Termux sobre o HEAD real com R3 publicada. Nenhum P4-B deve ser chamado de publicado antes de o operador confirmar commit/push.

Matriz de evidência inegociável: **planejado ≠ implementado ≠ teste local ≠ GitHub ≠ Vercel Ready ≠ APK instalado ≠ homologado em Android**.

## 2. Marcos confirmados pela linha de continuidade
- **Base CI360 P6 P3B** (`851b4020` no corte do relatório V7 anterior): refinou retiradas operacionais e pull documental; não é comprovação de sincronização E2E em dois dispositivos.
- **CareFlow M3**: eventos relacionais de consulta, pedidos/exames, monitoramentos e sintomas; Modo Médico, dossiê, linha do tempo, PDF por escolha do usuário. M3 P1/P2/P3 possuem histórico de publicação, mas cada superfície ainda exige aceite visual Android.
- **P6 P3-A/P3-B**: biblioteca de PDFs locais e correções de integridade por pessoa, sem garantir todos os fluxos nativos.
- **CareFlow P0 R4**: pacote publicado, fechamento funcional e navegação do cuidado; regressões P0 reais exigem validação com IDs antes de declarar casos encerrados.
- **D3 canônica**: publicação `3608f912`, Brain pós-consulta e Cartão de Retorno por episódio, sem segundo motor, sem criação automática de pendências/doses.
- **UX360 R1**: diagnóstico bloqueou antes de executar testes porque já existia `scripts/test-vault-ci360-p6-p3-d3.cjs` no HEAD canônico; checkout foi preservado.
- **UX360 R2**: **500/509 aprovados, 9 falhas**; oito ligadas a asserções de alturas antigas nos cards e uma a catálogo expandido de 22 para 31 rotas; nenhuma instalação.
- **UX360 R3 + QG1**: o operador confirmou **510/510**, correções de contratos de altura com piso tátil, 31 destinos distintos, filtros de nomenclatura pública e relatório de estatísticas. **Push ainda em confirmação neste corte**.

## 3. Superfícies e arquitetura que não se podem duplicar
- `app/saude/pharmalens/page.tsx` delega ao `PharmaLensWorkspaceV7`; navegação e seleção de medicamento já existem.
- `PharmaLensWorkspaceV7` usa Dexie **somente leitura**, consulta por `[user_id+person_id]` e leituras dos logs/relatos em janela de até 30 dias; usa `buildPharmaLensReportV7`, `buildPharmaLensObservationsV7` e `makePharmaLensConsultationBriefV7`. Não atribuir causalidade a fabricantes.
- `PharmaLensGuidedReviewP6` é conferência visual manual de foto e fatos do catálogo, sem OCR automático declarado nessa superfície.
- `PharmaLensDocumentStudioCI360` já tem OCR opcional com TextDetector do aparelho quando disponível, transcrição, extração de candidatos, campos revisáveis e descarte, tudo em memória de tela. **Não criar OCR paralelo, nem uploads automáticos.**
- `pharmalens-document-candidate-ci360.ts` apenas reconhece candidatos; `pharmalens-catalog-audit-ci360.ts` faz a comparação com cadastro/catálogo. `knowledge-resolver-m153p4.ts` resolve fatos por autoridade `declared`, `official_exact`, `official_inferred`, `conflict`, `unknown`.
- `lib/m3/brain-return-d3.ts` e `BrainReturnCardD3.tsx` são a autoridade do retorno pós-consulta. `CareFlow M2`, `clinical-episode-p4` e `consultation` existentes são referências; não gravar eventos presumidos.
- `lib/navigation/clinical-directory-m150.ts` é o diretório ampliado do Explorar. R3 utiliza o Health Hub R5 já existente para favoritos, evitando segunda base.
- QG1 (`scripts/vault-qg1-touch-contract.cjs`) audita mínimo tátil por semântica, não por string CSS fixa; preservar ao evoluir contratos antigos.

## 4. P6 P4-B — cirurgia proposta nesta entrega
**Objetivo:** corrigir ambiguidade entre nome comercial, princípio ativo, apresentação e fonte regulatória; acrescentar recibo de conferência documental versionada com revisão manual.

**Arquivos modificados:**
1. `lib/health-intelligence/pharmalens-document-candidate-ci360.ts` — validade calendárica.
2. `lib/health-intelligence/pharmalens-catalog-audit-ci360.ts` — evitar implicar que ingrediente ativo ou lista de apresentações atesta produto e concentração individual.
3. `components/saude/PharmaLensDocumentStudioCI360.tsx` — componente adicional dentro do escopo OCR existente.
4. `scripts/test-v63-release-gate.mjs` — contrato P4-B registrado uma vez, preservando R3 QG1.

**Novos:** módulo puro `pharmalens-evidence-p4b.ts`, `PharmaLensEvidenceReviewP4B.tsx`, teste `test-vault-ci360-p6-p4b-pharmalens.cjs`, documento técnico e este relatório mestre V8. Sem migrations, sem APIs externas, sem novas tabelas e sem alteração clínica.

O componente apresenta links fixos da Anvisa para **consulta humana externa**, sem afirmar que um produto foi verificado. Os fatos do catálogo podem ter origem/versão/data ou explicitamente ausência dessas informações. O recibo só é copiado por ação explícita; a matéria-prima OCR e os IDs privados não entram na saída. O botão de conferência humana da superfície existente mantém escopo de sessão e não muda autoridade regulatória.

## 5. Política de segurança e dados
- Jamais inferir: uma foto = registro sanitário válido; nome comercial = princípio ativo; lote = aquisição; prescrição = compra; compra = dose administrada; ausência de log = não adesão; quantidade atual = histórico completo; descrição da bula = interação clínica individual.
- **Metadona/retiradas:** ocorrência anterior de “Abrir retirada” após conclusão exige validação por IDs, ciclos e comprovantes. Preservar todo o estoque e histórico; não usar assertiva visual para concluir o caso.
- Nenhuma alteração automática de receitas, estoque, ações de dose, documentos clínicos ou RLS; nenhuma migração SQL antecipada. Privacidade por usuário e pessoa; falhas de leitura remota não equivalem a exclusão.
- Fontes regulatórias: `https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos` e `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`, verificadas para navegação pública. **Não assumir API estável ou licença de ingestão**.
- Conformidade: distinguir informação do profissional, relato da pessoa, data aferida, data de cadastro, futuro planejado e evento efetivo. Correlação temporal não demonstra causalidade.

## 6. Roadmap sequenciado (não chamar planejado de entregue)
**Agora:** concluir publicação da R3 QG1, obter SHA/`origin/main`, executar diagnóstico isolado P4-B (expectativa de **511** verificações se o V63 mantiver os 510 anteriores + 1 contrato), aplicar e publicar só após zero falhas, conferir no Android.

**P6 P4-C — catálogo e Anvisa:** delimitar fonte pública, forma de consulta e termos de uso; identificar entidade exata (substância, apresentação, forma/via, empresa, registro, bula) com atualização versionada, hash e revisão humana; auditoria de importação e rollback sem alterar fatos clínicos. Não construir interações personalizadas sem política farmacológica revisada.

**D4 — jornada terapêutica:** início/término real de cursos temporários, projeção de doses dentro de janela, correção/edição/atraso/cancelamento e retorno associado, sem inventar última dose ou aceitar saldo como histórico.

**Fênix Studio / Android premium:** acessórios, anatomia visual, GPU, pausa/retomada, fallback WebGL, Safe Area, cards e scroll, teclado e contraste; usar vídeos reais do aparelho, sem dizer que foram vistos quando só há descrições.

**QG2 / Android 360:** testes de cenário e semântica, inventário de duplicações, rastreabilidade de cobertura; notificações nativas reais, permissões, janela de silêncio, background/restart/opt-in, sem prometer entrega só por simulação. Homologar sync em dois dispositivos/contas e documento offline/E2E.

**Checklist permanente S01–S14 do V6/V7:** recibo por desdobramento; prévia de alteração; conflito entre aparelhos; documento indisponível; pendência explicada; mudanças desde consulta; rascunho escopado; explicação Brain; cobertura de dados; ações compensatórias; orçamento de perguntas; diagnóstico exportável; gate único; revisão de catálogo.

## 7. Convenções de engenharia aprovadas pelo operador
- Android + Termux, PWA/Vercel e APK Capacitor. Evitar build pesado em celular quando não necessário; execução controlada de gates no Termux.
- Macrocirurgia ZIP + alternativa Base64; **diagnóstico isolado primeiro** em clone temporário, executando todos os testes V63 e extras sem parar no primeiro; resumo, log e ZIP de falhas; só depois aplicar e revalidar; publicação **separada**, jamais automática.
- `git diff --check`, `node .../tsc --noEmit`, testes relevantes, backup por arquivo, rollback seletivo que não toca mudanças concorrentes. Nunca `git add -A`, `reset --hard`, force push ou sobrescrita de arquivo sem âncora.
- Preflight exige `main`, `HEAD == origin/main`, stage vazio e ausência de alterações rastreadas prévias; não sobrescrever arquivos novos. Para mudança de HEAD, reconciliar a nova base, não forçar publicação.
- **Nomes internos** Mxxx/Px/Rx/CI360/QG1/D3 ficam só em scripts, commits, documentação e diagnósticos; rótulos, botões, PDFs e cabeçalhos do app devem ser públicos, legíveis, humanos e premium.
- Visual mobile-first escuro premium, Lucide, haptics/toasts quando apropriados, retaguarda privada, campos sem truncamento, retorno seguro e alvos grandes.
- Falha de teste deve ser investigada, não apenas alterada para verde. Consolidar testes duplicados somente com equivalência de cobertura e testes negativos documentados.

## 8. Comandos de entrega P4-B (a executar APÓS confirmar R3 no GitHub)
```bash
cd ~/storage/downloads && unzip -o VAULT-CI360-P6-P4B-PHARMALENS-R1.zip && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/DIAGNOSTICAR-TUDO.sh
# SOMENTE com zero falhas:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/APLICAR-VALIDAR.sh
# SOMENTE com P4B_R1_APROVADA_LOCALMENTE:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/PUBLICAR.sh
```
Caso haja falha, usar o caminho `ENVIAR_PARA_ANALISE=...zip`, enviar o diagnóstico completo e não aplicar nada ao checkout real. Não executar este pacote em paralelo à publicação da R3.

## 9. Testes de aceite no Android
1. Abrir PharmaLens → selecionar medicamento → Conferência documental → selecionar imagem suportada → OCR (se TextDetector existir) ou transcrever manualmente. Confirmar que não há upload.
2. Conferir nome, dosagem, fabricante, lote, validade e registro como **campos capturados** e sua origem; diferenciar coincidência textual de autoridade oficial.
3. Checar validade impossível, fabricante divergente, substância distinta do nome comercial, lista de apresentações com várias dosagens; nada pode virar selo de identidade do produto.
4. Conferir os dois links oficiais e retorno seguro; copiar manualmente e conferir ausência de IDs e texto bruto não exibido; testar clipboard indisponível.
5. Alternar pessoa/medicamento durante captura, cancelar e descartar: nenhum texto ou imagem da pessoa anterior deve aparecer; nenhuma receita, dose, retirada, aquisição ou estoque muda.
6. Validar layout em 320/360/393/430px, fonte grande, teclado, botão min-h-11, bottom bar e orientação.
7. Verificar que Home, Explorar, Mais, CareFlow, Modo Médico, Brain e Cartão de Retorno da R3 continuam presentes e sem códigos de cirurgia ao usuário.

**Fim do relatório:** continuar pela evidência da execução, não pelo número da cirurgia. Se outro chat receber este documento, verificar primeiro o último HEAD e o log do diagnóstico, sem voltar a aplicar a P0/D3/R3 já publicadas.


<!-- fim do conteúdo original -->


---

## ANEXO D — Relatório Mestre V8 (original)

<!-- início do conteúdo original: VAULT-360-RELATORIO-MESTRE-V8-2026-11-18.md -->

# VAULT 360 — RELATÓRIO MESTRE V8 | Continuidade de desenvolvimento
**Corte:** 18/11/2026 (America/Sao_Paulo). Repositório `alefe-redes-computadores/vault-app`, Android/Termux `~/projects/vault-app`, entrega em `~/storage/downloads`. Este relatório é a base para retomar o VAULT em outro chat.

## 1. Estado observado e níveis de evidência
**Último commit confirmado diretamente no GitHub durante a preparação P4-B:** `3608f9124284bcbf12a9d162f58b89612dfa1e94`, assunto `feat(vault): CI360 P6 P3 D3 Brain e cartao de retorno por episodio`.

**UX360 R3 QG1:** o operador informou **510/510 verificações aprovadas** e que estava iniciando a publicação. **A publicação de R3 não estava confirmada pelo GitHub na verificação realizada durante a criação do pacote P4-B**. Sua confirmação dependerá do novo commit na `main`. Não confundir aprovação local com push, deploy Vercel, APK instalado ou homologação visual.

A **P6 P4-B** deste ZIP é candidata: gerada e verificada localmente quanto a integridade e sintaxe, mas a bateria global V63 só pode ser executada no Termux sobre o HEAD real com R3 publicada. Nenhum P4-B deve ser chamado de publicado antes de o operador confirmar commit/push.

Matriz de evidência inegociável: **planejado ≠ implementado ≠ teste local ≠ GitHub ≠ Vercel Ready ≠ APK instalado ≠ homologado em Android**.

## 2. Marcos confirmados pela linha de continuidade
- **Base CI360 P6 P3B** (`851b4020` no corte do relatório V7 anterior): refinou retiradas operacionais e pull documental; não é comprovação de sincronização E2E em dois dispositivos.
- **CareFlow M3**: eventos relacionais de consulta, pedidos/exames, monitoramentos e sintomas; Modo Médico, dossiê, linha do tempo, PDF por escolha do usuário. M3 P1/P2/P3 possuem histórico de publicação, mas cada superfície ainda exige aceite visual Android.
- **P6 P3-A/P3-B**: biblioteca de PDFs locais e correções de integridade por pessoa, sem garantir todos os fluxos nativos.
- **CareFlow P0 R4**: pacote publicado, fechamento funcional e navegação do cuidado; regressões P0 reais exigem validação com IDs antes de declarar casos encerrados.
- **D3 canônica**: publicação `3608f912`, Brain pós-consulta e Cartão de Retorno por episódio, sem segundo motor, sem criação automática de pendências/doses.
- **UX360 R1**: diagnóstico bloqueou antes de executar testes porque já existia `scripts/test-vault-ci360-p6-p3-d3.cjs` no HEAD canônico; checkout foi preservado.
- **UX360 R2**: **500/509 aprovados, 9 falhas**; oito ligadas a asserções de alturas antigas nos cards e uma a catálogo expandido de 22 para 31 rotas; nenhuma instalação.
- **UX360 R3 + QG1**: o operador confirmou **510/510**, correções de contratos de altura com piso tátil, 31 destinos distintos, filtros de nomenclatura pública e relatório de estatísticas. **Push ainda em confirmação neste corte**.

## 3. Superfícies e arquitetura que não se podem duplicar
- `app/saude/pharmalens/page.tsx` delega ao `PharmaLensWorkspaceV7`; navegação e seleção de medicamento já existem.
- `PharmaLensWorkspaceV7` usa Dexie **somente leitura**, consulta por `[user_id+person_id]` e leituras dos logs/relatos em janela de até 30 dias; usa `buildPharmaLensReportV7`, `buildPharmaLensObservationsV7` e `makePharmaLensConsultationBriefV7`. Não atribuir causalidade a fabricantes.
- `PharmaLensGuidedReviewP6` é conferência visual manual de foto e fatos do catálogo, sem OCR automático declarado nessa superfície.
- `PharmaLensDocumentStudioCI360` já tem OCR opcional com TextDetector do aparelho quando disponível, transcrição, extração de candidatos, campos revisáveis e descarte, tudo em memória de tela. **Não criar OCR paralelo, nem uploads automáticos.**
- `pharmalens-document-candidate-ci360.ts` apenas reconhece candidatos; `pharmalens-catalog-audit-ci360.ts` faz a comparação com cadastro/catálogo. `knowledge-resolver-m153p4.ts` resolve fatos por autoridade `declared`, `official_exact`, `official_inferred`, `conflict`, `unknown`.
- `lib/m3/brain-return-d3.ts` e `BrainReturnCardD3.tsx` são a autoridade do retorno pós-consulta. `CareFlow M2`, `clinical-episode-p4` e `consultation` existentes são referências; não gravar eventos presumidos.
- `lib/navigation/clinical-directory-m150.ts` é o diretório ampliado do Explorar. R3 utiliza o Health Hub R5 já existente para favoritos, evitando segunda base.
- QG1 (`scripts/vault-qg1-touch-contract.cjs`) audita mínimo tátil por semântica, não por string CSS fixa; preservar ao evoluir contratos antigos.

## 4. P6 P4-B — cirurgia proposta nesta entrega
**Objetivo:** corrigir ambiguidade entre nome comercial, princípio ativo, apresentação e fonte regulatória; acrescentar recibo de conferência documental versionada com revisão manual.

**Arquivos modificados:**
1. `lib/health-intelligence/pharmalens-document-candidate-ci360.ts` — validade calendárica.
2. `lib/health-intelligence/pharmalens-catalog-audit-ci360.ts` — evitar implicar que ingrediente ativo ou lista de apresentações atesta produto e concentração individual.
3. `components/saude/PharmaLensDocumentStudioCI360.tsx` — componente adicional dentro do escopo OCR existente.
4. `scripts/test-v63-release-gate.mjs` — contrato P4-B registrado uma vez, preservando R3 QG1.

**Novos:** módulo puro `pharmalens-evidence-p4b.ts`, `PharmaLensEvidenceReviewP4B.tsx`, teste `test-vault-ci360-p6-p4b-pharmalens.cjs`, documento técnico e este relatório mestre V8. Sem migrations, sem APIs externas, sem novas tabelas e sem alteração clínica.

O componente apresenta links fixos da Anvisa para **consulta humana externa**, sem afirmar que um produto foi verificado. Os fatos do catálogo podem ter origem/versão/data ou explicitamente ausência dessas informações. O recibo só é copiado por ação explícita; a matéria-prima OCR e os IDs privados não entram na saída. O botão de conferência humana da superfície existente mantém escopo de sessão e não muda autoridade regulatória.

## 5. Política de segurança e dados
- Jamais inferir: uma foto = registro sanitário válido; nome comercial = princípio ativo; lote = aquisição; prescrição = compra; compra = dose administrada; ausência de log = não adesão; quantidade atual = histórico completo; descrição da bula = interação clínica individual.
- **Metadona/retiradas:** ocorrência anterior de “Abrir retirada” após conclusão exige validação por IDs, ciclos e comprovantes. Preservar todo o estoque e histórico; não usar assertiva visual para concluir o caso.
- Nenhuma alteração automática de receitas, estoque, ações de dose, documentos clínicos ou RLS; nenhuma migração SQL antecipada. Privacidade por usuário e pessoa; falhas de leitura remota não equivalem a exclusão.
- Fontes regulatórias: `https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos` e `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`, verificadas para navegação pública. **Não assumir API estável ou licença de ingestão**.
- Conformidade: distinguir informação do profissional, relato da pessoa, data aferida, data de cadastro, futuro planejado e evento efetivo. Correlação temporal não demonstra causalidade.

## 6. Roadmap sequenciado (não chamar planejado de entregue)
**Agora:** concluir publicação da R3 QG1, obter SHA/`origin/main`, executar diagnóstico isolado P4-B (expectativa de **511** verificações se o V63 mantiver os 510 anteriores + 1 contrato), aplicar e publicar só após zero falhas, conferir no Android.

**P6 P4-C — catálogo e Anvisa:** delimitar fonte pública, forma de consulta e termos de uso; identificar entidade exata (substância, apresentação, forma/via, empresa, registro, bula) com atualização versionada, hash e revisão humana; auditoria de importação e rollback sem alterar fatos clínicos. Não construir interações personalizadas sem política farmacológica revisada.

**D4 — jornada terapêutica:** início/término real de cursos temporários, projeção de doses dentro de janela, correção/edição/atraso/cancelamento e retorno associado, sem inventar última dose ou aceitar saldo como histórico.

**Fênix Studio / Android premium:** acessórios, anatomia visual, GPU, pausa/retomada, fallback WebGL, Safe Area, cards e scroll, teclado e contraste; usar vídeos reais do aparelho, sem dizer que foram vistos quando só há descrições.

**QG2 / Android 360:** testes de cenário e semântica, inventário de duplicações, rastreabilidade de cobertura; notificações nativas reais, permissões, janela de silêncio, background/restart/opt-in, sem prometer entrega só por simulação. Homologar sync em dois dispositivos/contas e documento offline/E2E.

**Checklist permanente S01–S14 do V6/V7:** recibo por desdobramento; prévia de alteração; conflito entre aparelhos; documento indisponível; pendência explicada; mudanças desde consulta; rascunho escopado; explicação Brain; cobertura de dados; ações compensatórias; orçamento de perguntas; diagnóstico exportável; gate único; revisão de catálogo.

## 7. Convenções de engenharia aprovadas pelo operador
- Android + Termux, PWA/Vercel e APK Capacitor. Evitar build pesado em celular quando não necessário; execução controlada de gates no Termux.
- Macrocirurgia ZIP + alternativa Base64; **diagnóstico isolado primeiro** em clone temporário, executando todos os testes V63 e extras sem parar no primeiro; resumo, log e ZIP de falhas; só depois aplicar e revalidar; publicação **separada**, jamais automática.
- `git diff --check`, `node .../tsc --noEmit`, testes relevantes, backup por arquivo, rollback seletivo que não toca mudanças concorrentes. Nunca `git add -A`, `reset --hard`, force push ou sobrescrita de arquivo sem âncora.
- Preflight exige `main`, `HEAD == origin/main`, stage vazio e ausência de alterações rastreadas prévias; não sobrescrever arquivos novos. Para mudança de HEAD, reconciliar a nova base, não forçar publicação.
- **Nomes internos** Mxxx/Px/Rx/CI360/QG1/D3 ficam só em scripts, commits, documentação e diagnósticos; rótulos, botões, PDFs e cabeçalhos do app devem ser públicos, legíveis, humanos e premium.
- Visual mobile-first escuro premium, Lucide, haptics/toasts quando apropriados, retaguarda privada, campos sem truncamento, retorno seguro e alvos grandes.
- Falha de teste deve ser investigada, não apenas alterada para verde. Consolidar testes duplicados somente com equivalência de cobertura e testes negativos documentados.

## 8. Comandos de entrega P4-B (a executar APÓS confirmar R3 no GitHub)
```bash
cd ~/storage/downloads && unzip -o VAULT-CI360-P6-P4B-PHARMALENS-R1.zip && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/DIAGNOSTICAR-TUDO.sh
# SOMENTE com zero falhas:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/APLICAR-VALIDAR.sh
# SOMENTE com P4B_R1_APROVADA_LOCALMENTE:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/PUBLICAR.sh
```
Caso haja falha, usar o caminho `ENVIAR_PARA_ANALISE=...zip`, enviar o diagnóstico completo e não aplicar nada ao checkout real. Não executar este pacote em paralelo à publicação da R3.

## 9. Testes de aceite no Android
1. Abrir PharmaLens → selecionar medicamento → Conferência documental → selecionar imagem suportada → OCR (se TextDetector existir) ou transcrever manualmente. Confirmar que não há upload.
2. Conferir nome, dosagem, fabricante, lote, validade e registro como **campos capturados** e sua origem; diferenciar coincidência textual de autoridade oficial.
3. Checar validade impossível, fabricante divergente, substância distinta do nome comercial, lista de apresentações com várias dosagens; nada pode virar selo de identidade do produto.
4. Conferir os dois links oficiais e retorno seguro; copiar manualmente e conferir ausência de IDs e texto bruto não exibido; testar clipboard indisponível.
5. Alternar pessoa/medicamento durante captura, cancelar e descartar: nenhum texto ou imagem da pessoa anterior deve aparecer; nenhuma receita, dose, retirada, aquisição ou estoque muda.
6. Validar layout em 320/360/393/430px, fonte grande, teclado, botão min-h-11, bottom bar e orientação.
7. Verificar que Home, Explorar, Mais, CareFlow, Modo Médico, Brain e Cartão de Retorno da R3 continuam presentes e sem códigos de cirurgia ao usuário.

**Fim do relatório:** continuar pela evidência da execução, não pelo número da cirurgia. Se outro chat receber este documento, verificar primeiro o último HEAD e o log do diagnóstico, sem voltar a aplicar a P0/D3/R3 já publicadas.


<!-- fim do conteúdo original -->


---

## ANEXO E — Relatório Mestre V7 Pós-Consulta (original)

<!-- início do conteúdo original: VAULT-360-RELATORIO-MESTRE-V7-POS-CONSULTA-2026-11-18.md -->

# VAULT 360 — RELATÓRIO MESTRE V7 | Pós-consulta e CI360 P6 P3-C
**Data de corte:** 18/11/2026 (America/Sao_Paulo)  
**Repositório:** `alefe-redes-computadores/vault-app`  
**Base verificada em GitHub:** `851b402040e3524d609d8277d36e1af9c59156b1` — `fix(vault): CI360 P6 P3B retiradas operacionais e pull documental`.  
**Objetivo:** reunir o relatório novo fornecido pelo operador, o roadmap histórico V5/V6, as decisões deste chat e a auditoria de código da `main`, sem confundir proposta, implementação, publicação e homologação Android.

## 1. Decisões executivas

1. **CI360 P6 P3-C permanece em PLANEJAMENTO até autorização explícita após este relatório.** Nenhum novo ZIP, migração SQL ou push é autorizado por este documento.
2. **O fluxo real pós-consulta passa a ser caso de aceitação nº 1.** A consulta existente de **17/11/2026** precisa ser a âncora da evolução de sintomas, pedido de exames, pressão, medicamento prescrito e eventual retorno.
3. **Dois usos diferentes da IA:** (a) Brain apresenta fatos, tendências e perguntas breves com origem e consentimento; (b) decisões terapêuticas e avaliação de sintomas ficam com a pessoa e o profissional. Não produzir diagnóstico automático, prescrição ou interação personalizada não verificada.
4. **O Modo Médico vira uma visão de atendimento reutilizável no próprio celular:** pronto para mostrar à médica na próxima consulta, com resumo legível, documento/PDF opcional, períodos e fontes auditáveis. A sessão não deve exigir conexão em tempo real quando os dados relevantes já estiverem disponíveis offline.
5. **Catálogo Anvisa é uma trilha própria**, com etapas de identificação da apresentação, versionamento de fonte, revisão humana, consistência de dados e avaliação de fontes farmacológicas específicas. Não executar uma importação indiscriminada na P3-C.
6. **Dados clínicos preservados:** retirada da Metadona, estoque ~25 comprimidos conforme relato histórico, prescrições, eventos de dose, histórico de fornecimento, vínculos documentais e plano de segurança. Não confirmar resolução dos P0 apenas por gates verdes.

## 2. Reconciliação — o que já existe e o que não se pode afirmar

| Módulo/marco | Situação comprovada neste corte | Aceite pendente |
|---|---|---|
| UI360 R4/R5 | Publicado anteriormente: Home, Health Hub, Rede de Saúde, refinamentos de identidade | Aparência e acessibilidade no APK atualizado em telas pequenas |
| CI360 M3 P1/P2 | Código publicado: eventos CareFlow, check-ins/políticas, Brain longitudinal; tabela `notification_policies_p2` aplicada e RLS verificada anteriormente | Agendamento nativo/Quiet Hours, reinício e entrega real em Android |
| CI360 M3 P3 | GitHub publicado (`c22e2343`): Modo Médico, dossiê, PDF A4, privacidade, melhorias Fênix | PDF e navegação no aparelho, integridade de todos os vínculos reais |
| P6 P3-A | GitHub publicado (`ec21d6a0`): biblioteca PDF local e integridade por pessoa | Seleção de arquivos, exclusão, compartilhamento e exportação Android |
| P6 P3-B FIX1 | **GitHub `main` publicado:** `851b4020`; gates locais relatados aprovados antes da publicação | Verificação independente Vercel/APK/casos E2E; melhoria de status não altera histórico |
| Metadona 10 mg | Existem projeções conservadoras de retirada concluída e conflito. P3-B refina filtros/contadores | **Não homologada** a ocorrência real de “Abrir retirada” com IDs de ciclo e registros, sem mexer no estoque |
| Documentos e sync | P3-B corrige false-positive de leitura remota parcial; Sync P0 anterior tem lógica de dependência | Teste com documento indisponível ≠ excluído, duas sessões/dispositivos, falha RLS/rede, upload/download real |
| Fênix/Avatar | 3D e descarte GPU existentes, refinamento de pausa em segundo plano | Teste físico de memória/viewport/fallback/controles/aparelho |
| Catálogo regulatório | Supabase `vault-app`: `medication_catalog_versions` e `medication_catalog_candidates` existentes; PharmaLens já faz conferência de candidatos | Bulas e interações estruturadas, pipeline oficial versionado e revisão farmacológica ainda **não certificados** |

**Regra de evidência:** `PLANEJADO ≠ CODIFICADO ≠ TESTADO LOCAL ≠ GITHUB ≠ VERCEL READY ≠ APK INSTALADO ≠ HOMOLOGADO`.

## 3. Cenário clínico real de homologação — 17 e 18 de novembro

- **17/11/2026 — consulta:** a médica perguntou sobre febre; o usuário respondeu que não havia apresentado febre **naquele momento**. Houve prescrição de gotas otológicas/medicamento para ouvido e solicitação de exames/monitoramento de pressão conforme relato. Nome, substâncias, posologia, lateralidade, data exata de início/duração e números dos exames **não foram fornecidos para esta auditoria**.
- **18/11/2026 — evolução informada:** dor no ouvido referida como aproximadamente duas vezes mais forte e ouvido muito quente, descrito subjetivamente como “sensação de pré-febre”. **Não registrar febre aferida ou temperatura inventada.**
- **Medicação:** foi prescrita, e o usuário pretende obter e começar hoje; **compra, primeiro uso e horário não são fatos confirmados nesta conversa**.
- **Pressão arterial:** acompanhamento ainda não iniciado; nenhuma medida real deve ser criada.
- **Exames:** pedido existente relatado, mas agendamentos e resultados ainda não realizados/confirmados.

**Orientação de segurança fora do produto:** pelo agravamento importante da dor e calor referido, procurar reavaliação/orientação da médica ainda hoje, em vez de aguardar o teste do VAULT; se houver secreção, alteração auditiva, febre alta, inchaço ao redor/atrás da orelha, tontura intensa ou agravamento importante do estado geral, buscar atendimento urgente. Não inserir objetos no ouvido nem trocar a prescrição por sugestão do aplicativo. Fontes: NHS Earache (`https://www.nhs.uk/symptoms/earache/`), NHS Ear infections (`https://www.nhs.uk/conditions/ear-infections/`).

## 4. Achados novos de código diretamente verificados

### A. Sintoma → consulta → Modo Médico não está inteiramente resolvido
- A tela `/saude/careflow/sintomas` permite o tipo **Outro** (texto próprio), intensidade, data, hora, observação e vínculo opcional com consulta/medicamento. O registro clínico é salvo no repositório real de registros de saúde.
- Ao selecionar consulta, salva também um `monitor_note` com `parent_id=consulta` e `related_id=registro de sintoma`, mas o payload desse evento não inclui necessariamente título, texto e intensidade do relato.
- Em `lib/m3/medical-dossier-p3.ts`, os nomes relacionais da `careflow` são resolvidos principalmente por outros eventos CareFlow e consultas; o ID do registro de sintoma não é transformado em título clínico claro nessa relação. A navegação de `monitor_note` na projeção do Modo Médico aponta por padrão para `/saude/careflow/pressao`, em vez de Sintomas. **Lacuna comprovada.**
- Prioridade P0 funcional: melhorar **read-model relacional** sem duplicar fatos e sem criar segunda autoridade; exibir texto, intensidade, hora, fonte e consulta correspondente, incluindo resolução reversa do `related_id`; clicar deve abrir o registro correto.

### B. Cadastro a partir da consulta ainda não herda médico de forma demonstrada
- `/saude/consultas/editar` permite registrar `medicamento_ids`, relatos do paciente, orientação profissional e próximos passos.
- `/saude/medicamentos/novo` possui `medico_id`, tratamento temporário e planejamento de curso, mas **não usa `searchParams`/parâmetro de consulta** no arquivo auditado para preencher automaticamente `medico_id` e contexto.
- A P3-C deve propor CTA contextual: **“Adicionar medicamento desta consulta”**, passar `consulta_id`, preencher *sugestão revisável* de médico, validar titular/pessoa/ID e, após criação, vincular medicamento à consulta de modo idempotente. Não copiar automaticamente doses, diagnóstico ou início de uso.

### C. Home: Brain presente, check-in pós-consulta ainda não demonstrado
- A Home possui `HomeActionNowCardP7R3`, comandos e projeções Brain, mas não foi comprovado no código da Home um fluxo específico de perguntas discretas ligadas ao sintoma evolutivo de ouvido ou ao início da medicação.
- Implementar no motor canônico um **convite voluntário**, contextual, com cooldown global, consentimento, botão “Não agora”, estado “Já registrei” e explicação “Por que aparece?”. Sem alertas incessantes nem sensação de diagnóstico.

### D. Pressão e exames já dispõem de caminhos concretos
- `/saude/careflow/pressao` permite plano finito de início/fim e horários configuráveis, registro de valores medidos reais e vínculo ao plano. O formulário começa com **horários sugeridos 08:00/14:00/20:00**, que **NÃO devem ser interpretados como recomendação médica**.
- `/saude/careflow/exames` cria pedido com vários itens, permite vínculo à consulta e médico/local, confirmação item a item e eventos de status/resultado individual.
- A P3-C deve priorizar pequenos reparos funcionais identificados no teste, em vez de criar novos cadastros paralelos.

## 5. Próxima macrocirurgia proposta — P6 P3-C, integrada

**P0 — continuidade e segurança clínica:**
1. Reprojetar `monitor_note` como elo real entre sintoma e consulta no Modo Médico, timeline e PDF; fonte, data clínica e data de lançamento separadas; botão abre o destino certo.
2. Registrar percepção/condição de **incerteza** sem transformar “sensação de febre” em temperatura aferida, diagnóstico ou agravamento inventado. Guardar o relato original (incluindo contexto de antes/depois da consulta e antes/depois do início real do medicamento).
3. Melhorar fluxo contextual consulta → medicamento temporário, vinculando médico apenas se confirmado e preservando a separação **prescrito → adquirido → iniciado → dose efetivamente administrada**.
4. Contrato estrito de fim de curso: fuso e horário local, última dose prevista, edição, atraso e cancelamento; nenhuma dose real alterada, nenhum lembrete no dia seguinte à janela válida. Quando datas forem desconhecidas, pedir revisão, não programar duração fictícia.
5. Validar por ID o cenário de retirada da Metadona, sincronização documental/retorno da fila, contas e pessoas diferentes, com testes reais não destrutivos. Corrigir **somente** causa canônica comprovada.

**P1 — acompanhamento inteligente e experiência de atendimento:**
6. Brain mostra no máximo um convite contextual relevante em “Em foco agora”/Minha Saúde, explicável, acionável e dispensável. Perguntas simples sobre evolução, obtenção e início real do medicamento; sem diagnosticar nem pressionar o usuário.
7. “Desde a última consulta”: painel factual **Antes / Consulta / Depois**, com fatos datados, lacunas e fontes. Mostrar sintomas que surgiram, medidas efetivas, exame pendente e status do tratamento.
8. **Modo Médico Em Atendimento**: layout otimizado para exibir no celular, fonte grande, dados mínimos por padrão, documentos selecionáveis, volta segura e resumo em poucas telas; PDF manual. Evitar mostrar inadvertidamente dados íntimos fora das seções escolhidas.
9. Home, Hoje, sintomas, Modo Médico e CareFlow: linguagem e cartões premium uniformes, sem campos nativos destoantes, truncamentos ou excesso de painéis.

**P2 — técnica e evidência física:**
10. Notifications E2E Android: criar/editar/remarcar/cancelar/encerrar, reiniciar o app, alternar pessoa, offline, dedupe, Quiet Hours e permissões, comprovando IDs nativos, sem transformar aviso em evento.
11. GPU, Safe Area, teclado, 320/360/393/430px, acessibilidade e fallback do Avatar; distinguir PWA, APK instalado e device timing real.
12. Auditoria e evidências comparáveis do PDF, Sync e semântica de catálogo; logs sem dados clínicos por padrão.

**Exclusões do escopo P3-C:** diagnóstico clínico autônomo; cálculo de interação personalizada sem medicamento identificado e fonte revisada; scraper em massa da Anvisa; migração SQL por antecipação; reconstrução da Fênix sem falha medida; mudança de estoque por botão visual; publicação automática.

## 6. Trilha seguinte: Anvisa + PharmaLens — P6 P4 / Catálogo 360

**Verificação atual:** tabelas `medication_catalog_versions` (fonte, URL, versão, timestamps, content hash, ativo) e `medication_catalog_candidates` (escopo pessoal, tipo, evidência, status, conteúdo candidato e versão oficial) já existem no Supabase. Não há, por esse fato isolado, prova de base completa de bulas ou grafo de interações.

**Arquitetura recomendada:**
- Aquisição **autorizada e verificável** de informação pública oficial, respeitando o formato, atualizações e condições de uso da Anvisa. Referências: Bulário Eletrônico `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`; Sistema de Consultas `https://www.gov.br/anvisa/pt-br/sistemas/sistema-de-consultas`.
- Separar **substância** de **produto/presentação registrada** (concentração, forma, via, composição), empresa, número de registro e documento da bula/versão.
- Guardar URL oficial, responsável pelo registro, `source_updated_at`, `imported_at`, hash, origem das seções, status de revisão e rollback. Dados extraídos da bula são **candidatos** até validadores específicos.
- Interações: não presumir que a Anvisa oferece API estruturada completa de interações; exigir fontes especializadas de alta qualidade, regras farmacológicas revisadas, grau de evidência, verificação de via/exposição e alerta de incerteza. Uma interação descrita em texto de bula **não determina automaticamente risco individual**.
- Catálogo é **conhecimento sobre produtos**, não muda prescrição pessoal, dose, estoque ou decisão de tratamento. Não promover OCR pessoal ao catálogo global sem validação.
- **Pendência de identidade clínica:** o relatório Gemini cita “metilfenidato”, enquanto históricos mencionam outros fármacos para TDAH. Não pressupor substância atual: validar na lista real do VAULT quando for realizar qualquer comparação.

## 7. Ideias novas do assistente — além do relatório recebido

| Código | Ideia | Valor / regra de segurança | Prioridade |
|---|---|---|---|
| N01 | “Cartão de retorno” com 3 blocos: fatos novos / pendências / perguntas | Leitura rápida da médica; somente dados confirmados ou rotulados | P1 |
| N02 | Trilha de estados do medicamento (prescrito, obtido, iniciado, administração) | Não confundir agendamento com dose nem compra com início | P0 |
| N03 | Registro “Hoje está diferente” sem copiar diagnóstico | Evolução de intensidade por relato, com data do fato e do lançamento | P0 |
| N04 | Provador de relações: mostrar por que um sintoma está ligado à consulta | ID explícito, fonte visível e opção de desvincular sem apagar registro | P1 |
| N05 | Orçamento de interrupções do Brain (1 pergunta relevante por janela) | Evita notificação invasiva e fadiga de check-ins | P1 |
| N06 | Preparação offline do Modo Médico com selo “dados atualizados até...” | Útil em consultório sem rede, deixa lacunas claras | P1 |
| N07 | “Ação pendente sem data” para exames ainda não agendados | Não colocar eventos fictícios no calendário | P1 |
| N08 | Cenários E2E pós-consulta gerados de registros de teste sintéticos e auditáveis | Provar roundtrip sem usar dados privados no CI | P0 |

## 8. Teste guiado com os dados reais — pode começar agora, sem instalar cirurgia nova

**Pré-condições:** abrir a versão mais recente do VAULT; selecionar a pessoa correta; conferir a consulta existente **17/11/2026**; usar o nome e a posologia reais da prescrição, nunca exemplos inventados; fazer backup antes de alterações relevantes. Se houver dúvida clínica, perguntar à médica ou farmacêutico, não interpretar a tela como prescrição.

**Etapa 1 — consulta de ontem:** `Saúde → Consultas → consulta de 17/11 → Detalhes → Editar`. Conferir data, médico, local e status. Se ocorreu, marcar **Realizada**. Em “Percepção do paciente”, registrar somente a informação verídica de ontem, por exemplo: “Na consulta relatei ausência de febre naquele momento”. Em orientação profissional e próximos passos, transcrever apenas o que estiver na receita/nota ou for lembrado explicitamente como relato, distinguindo “prescrito” de “discutido”. Salvar uma vez e conferir detalhes. Não criar segunda consulta.

**Etapa 2 — evolução do ouvido de hoje:** `Saúde → CareFlow 360 → Sintomas e evolução → Novo sintoma observado`. Escolher **Outro** e escrever “Sensação de calor no ouvido” ou o relato literal equivalente; adicionar observação “Sensação subjetiva de pré-febre; temperatura não aferida” **apenas se isso refletir exatamente o ocorrido**. Escolher a data **18/11/2026**, hora real/mais aproximada conhecida e intensidade que o usuário efetivamente avalia, em vez de aceitar o padrão 5/10. Selecionar a consulta de 17/11 no campo “Consulta relacionada” e salvar. Para dor, registrar evolução da **dor no ouvido** com intensidade relatada e descrição “piorou em relação a ontem”; não duplicar um evento já existente. Se aparecer “registro salvo, vínculo falhou”, não cadastrar novamente: verificar a correção do vínculo.

**Etapa 3 — medicação otológica:** `Saúde → Medicamentos → Novo medicamento`. Primeiro conferir se não existe; caso já exista, editar. Usar **nome da embalagem/receita**, concentração, forma, via otológica, lado do ouvido se prescrito, dose em gotas, frequência e **duração apenas conforme documento/orientação**. Selecionar o médico cadastrado manualmente, pois não foi demonstrado autopreenchimento a partir da consulta. Se é curso finito, selecionar o modo **Temporário** e informar início/fim somente quando confirmados. Distinguir “prescrito”, “comprei” e “primeira dose realmente aplicada”; **não confirmar dose futura, não lançar estoque fictício**. Depois retornar à consulta e vincular o novo medicamento no seletor explícito de medicamentos; salvar e confirmar a relação nos dois sentidos.

**Etapa 4 — exames solicitados, ainda sem agendamento:** `Saúde → CareFlow 360 → Pedidos e resultados`. Procurar o pedido existente antes de criar outro. Se não estiver cadastrado, criar **um pedido datado e vinculado à consulta de 17/11**, usar itens selecionados da solicitação real (foto/OCR somente com revisão humana, ou transcrição manual) e confirmar um a um. Como ainda não há agendamento/coleta/laudo, manter esses estados **pendentes**, sem inventar datas/resultados. O histórico V6 fala de um pedido amplo com **16 grupos**: isso é checklist documental, não 16 resultados e nem prova de que o pedido atual ainda seja idêntico.

**Etapa 5 — pressão:** `Saúde → CareFlow 360 → Pressão arterial`. Criar **plano finito** somente após verificar as datas e horários indicados/decididos; os horários pré-preenchidos 08:00, 14:00 e 20:00 são padrões visuais da tela, **não prescrição**. Até medir de fato, nenhum valor sistólico/diastólico. Na primeira aferição real, registrar os números, hora, contexto e associar ao plano. Verificar depois os lembretes e o encerramento do plano no Android.

**Etapa 6 — preparar retorno com o celular:** `Saúde → CareFlow 360 → Modo Médico 360`. Selecionar período que inclua **17 e 18/11/2026**, e habilitar **Consultas, CareFlow, Sintomas/humor, Medicamentos** e, se cabível, **Exames, Medições e Brain**. Conferir se aparecem a consulta, a descrição literal do ouvido, o status do remédio e as pendências verdadeiras. Gerar PDF somente após revisar as seções; se houver relação ilegível ou link para Pressão em observação de sintoma, anotar como falha da P3-C, não duplicar dados para disfarçar.

**Etapa 7 — aceite guiado após P3-C:** acompanhar com Gemini/ChatGPT/código real cada passo, comparar prints/descrições antes e depois, confirmar 2 dispositivos e offline; registrar `OK`, `FALHOU`, `NÃO TESTADO`, `NÃO SE APLICA` para: vínculo bidirecional, data factual, status do curso, fim dos lembretes, PDF, Safe Area, Fênix e sync. Não concluir homologação apenas porque o teste automatizado passou.

## 9. Engenharia, release e critérios

**P6 P3-C proposta:** um único ZIP + Base64 com allowlist, commit-base `851b4020` (ou HEAD novo validado), backup/rollback seletivo, instalação em worktree isolado, teste de todas as âncoras antes de escrever, `git diff --check`, TypeScript global, V63, V70, testes comportamentais e diagnósticos consolidados. Nunca `git add -A`, `git clean`, reset destrutivo ou push forçado. Publicação **somente após aprovação do operador**, em comando separado.

**Critérios mínimos de saída:** (i) histórico da consulta continua íntegro; (ii) sintoma relato/consulta aparece no Modo Médico com fonte e links certos; (iii) medicação temporária com cronologia separada e curso finito; (iv) perguntas contextuais não disparam sem consentimento nem depois de dispensar; (v) nenhuma dose/estoque/resultado fictício; (vi) permissões/RLS/conta/pessoa protegidas; (vii) eventos e notificações nativas verificados no aparelho; (viii) 320px sem clipping; (ix) paciente decide o conteúdo exibido à médica; (x) GitHub, Vercel, APK e Android reportados separadamente.

## 10. Decisões e dependências de autorização

- **Autorizado neste ciclo:** análise e relatório; nenhuma implementação ou SQL.
- **Ainda precisa de aprovação posterior:** início da implementação P6 P3-C, eventual migração de schema justificada, publicação, instalação/homologação.
- **Riscos que continuam abertos:** Metadona P0 E2E; sincronização documental em falha/concorrência; temporários no Android e cancelamento nativo; Brain invasivo/duplicado; fonte e revisão de interações medicamentosas; UI em aparelhos compactos.
- **Reutilizar as 14 propostas S01–S14 da V6** (recibo por desdobramento, prévia de alteração, conflitos entre aparelhos, documento indisponível, pendência explicada, mudanças desde consulta, rascunhos escopados, explicação Brain, cobertura de dados, ações compensatórias, orçamento de perguntas, diagnóstico exportável, gate único e revisão de catálogo), sem substituí-las por esta lista N01–N08.

### Fontes técnicas consultadas
- GitHub `main` em 18/11/2026: commit `851b402040e3524d609d8277d36e1af9c59156b1`.
- Arquivos: `app/saude/careflow/sintomas/page.tsx`, `app/saude/careflow/pressao/page.tsx`, `app/saude/careflow/exames/page.tsx`, `app/saude/careflow/modo-medico/page.tsx`, `app/saude/consultas/editar/page.tsx`, `app/saude/medicamentos/novo/page.tsx`, `lib/m3/medical-dossier-p3.ts`.
- Supabase `vault-app`, **somente leitura** das tabelas e colunas de catálogo; nenhuma migração nesta revisão.
- Relatórios históricos V5/V6 do projeto e texto novo Gemini fornecido nesta conversa.
- Anvisa Bulário Eletrônico e Sistema de Consultas; NHS Earache/Ear infections (orientação de procurar cuidado diante de piora).

**Status:** RELATÓRIO PARA APROVAÇÃO · P6 P3-C AINDA NÃO INICIADA.


<!-- fim do conteúdo original -->
