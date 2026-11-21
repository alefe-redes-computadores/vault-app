# VAULT 360 — RELATÓRIO MESTRE V26 / A4 MACRO1

**Corte: 21/11/2026 — Frente A, engenharia terapêutica e continuidade de roadmap.**

## 01 — Estado atualizado e verificável

- GitHub `main`: **63a5174cf902f745d6876b379588d5565db8a6b7**, `feat(vault): A3 macro2 receitas versionadas e fornecimento factual 360` (verificado após a publicação solicitada pelo proprietário).
- A3 MACRO2: **PUBLICADA EM CÓDIGO**. Certificação CI/APK, contas/pessoas e sincronização entre aparelhos precisam de evidência própria. SQL da A3 foi anteriormente relatado como aplicado; não reaplicar.
- A4 MACRO1: **PACOTE DE CIRURGIA PREPARADO NESTA ENTREGA — NÃO PUBLICADO, NÃO HOMOLOGADO NO ANDROID**. A validação TypeScript/V63/V70 completa dependerá do Termux, sobre worktree isolada.
- A4 SQL: **PENDENTE DE APLICAÇÃO E VERIFICAÇÃO APÓS GATE LOCAL**. Não publicar cliente A4 antes da coluna `a1_treatment_phases.regime_a4` e guarda de propriedade estarem presentes.
- Frente B: M1–M3 e M4 P1/P2 possuem commits publicados. M5 — Reabilitação é linha a coordenar com A6, sem criar domínios duplicados.
- As decisões de V24 permanecem: cinco raízes Início, Hoje, Saúde, Documentos, Mais. Não introduzir sexta aba.

## 02 — A4 MACRO1: escopo funcional e restrições

- **Autoridade única**: usar `a1_treatment_phases` já existente (A1), nunca criar outra tabela de fases ou outro motor de sync. `tratamentos` continua pai; `medicamentos`, `doseLogs`, `renovacoes`, `retiradas` e estoque não mudam pela inserção de evento.
- **Regime factual versionado**: campos de medicamento por ID, dose informada, frequência, horários `HH:mm`, via, lateralidade, região anatômica, data efetiva, revisão/fim previsto, consulta/documento/profissional relacionados e origem declarada.
- **Eventos de curso**: início, ajuste, pausa, retomada e encerramento são registros explícitos, não operações automáticas sobre tratamento, estoque, doses ou notificações. Ausência de evento não vira conclusão; fim previsto não comprova fim ocorrido.
- **Histórico append-only**: alterações posteriores produzem novo evento. Ordenação por data efetiva, `created_at` e ID, com último registro declarativo — nunca “prescrição vigente” inferida do relógio.
- **UX360**: no detalhe de Tratamentos, bloco Premium de histórico + formulário expansível com HealthRelationPicker, CustomDatePicker, estados reais, pessoas filtradas por conta, sem seletores nativos visíveis, sem trocar cartões Compacto/Conforto existentes.
- **Supabase**: migração aditiva JSONB na A1 e trigger SECURITY INVOKER que valida referências de medicamento, consulta e documento por conta/pessoa. Sem backfill retroativo nem segundo ledger; RLS A1 existente preservada. Exige teste negativo autenticado pós-publicação.
- **Offline**: transação Dexie local e fila A1 preservadas; push genérico de A1/pull existentes aceitam coluna `regime_a4`. Retry não cria registro novo automaticamente; PDF/documentos permanecem em suas autoridades canônicas.

## 03 — Testes e evidências, sem afirmações prematuras

- Teste dedicado A4 com 500 cenários determinísticos, datas civis, horários, IDs, ausência, pessoa/conta, imutabilidade e invariantes estruturais.
- Pré-flight de 18 contratos reais (A3, A1, M4, M3/M2/M1, V112, UX360, consulta, medicamentos) + TypeScript completo + `git diff --check` + sintaxe de scripts.
- V63/V70 integral em worktree depois de corrigir eventuais falhas; testagem dirigida anterior evita repetir gate pesado por tentativas cegas.
- Nenhum teste local de parser equivale a CI verde, autorização negativa com usuários reais, duas instalações Android ou validação visual de 320/360/393/430dp. Essas evidências continuam abertas.

## 04 — Roadmap permanente: módulos faltantes e incompletos (NÃO esquecer)

| ID | Módulo/área | Estado / escopo remanescente |
|---|---|---|
| A0 | Integridade/Storage/paridade | Publicado; RLS 2 contas × 2 pessoas, buckets e migração de links legados sob prova. |
| A1 | Rede Multiprofissional 360 | Publicada; CREFITO/CRP/CRM, equipes, vínculos com sessões/internações, E2E. |
| A2 | UX360 Android | Parcial; Compacto/Conforto, Fênix, Safe Area, 5 abas, 19 listas, Compose, acessibilidade. |
| A3 | Receitas/Fornecimento 360 | A3 MACRO2 publicada `63a5174c`; verificar SQL, aquisição ≠ receita, local histórico, E2E. |
| A4 | Tratamentos Versionados 360 | MACRO1 preparada; ampliar períodos, documentação e integração Brain/Modo Médico/PDF após aceite. |
| A5 | Internações 360 | Faltante: domínio próprio, admissão/alta explícitas, equipe, hospital, documentos e trajetória. |
| A6 / M5 | Reabilitação 360 | Faltante no HEAD verificado: programa, sessões, equipe, remarcação, evolução factual; autoridade única coordenada. |
| A7 / M6 | Jornada Cirúrgica 360 | Parcial M4 P1/P2: completar pré/pós, internamento opcional, exames, retorno e reabilitação. |
| A8 | Vacinas 360 | Faltante: doses reais, lote/comprovante, planos futuros separados; preservar eventos M144. |
| A9 | Procedimentos, terapias, alergias e reações | Descoberta com casos reais; sem promover automaticamente textos do Diário a diagnósticos. |
| A10 / M7 | Projeção longitudinal / Brain / Modo Médico | Parcial: uma autoridade para Home, Hoje, CareFlow, PDFs e Cartão de Retorno. |
| A11 / M8 | Segurança nativa, privacidade e release | Prova completa de alarmes, biometria, arquivos offline, atualização Android, CI e APK físico. |
| B transversal | D4 P4, PharmaLens P4-E, GTIN, processos SUS, FHIR, Health Connect, Plano de Segurança | Auditoria native e curadoria seletiva ainda sob prova; integrações futuras por contrato e opt-in. |

## 05 — Governança interfrentes e próximo ciclo

- Frente B conserva autoridade das entidades de Exames M1–M3, M4 de vínculos e infraestrutura comum de Storage/sync/notificações.
- A6/M5 não podem existir como reabilitações paralelas: uma implementação canônica, equipes/papéis e relações por ID.
- A5 Internações é independente de cirurgia e hospital; A7 não pode inventar internação ou procedimento por proximidade temporal.
- A8 Vacinas distingue dose aplicada, registro relatado e reforço planejado.
- Todas as macros futuras devem reler V19–V26, comparar HEAD/blobs, preservar backups, usar allowlist, executar V63/V70/TS, conferir Action do SHA e homologar APK. Falhas de contratos textuais legados se corrigem por equivalência de comportamento, nunca removendo funcionalidade ou piorando o design.

## 06 — Carteiras antigas que permanecem rastreáveis

- **A-F01–A-F12 (12 blocos históricos):** CareFlow, Hub Saúde, PDF, retorno, exames, medicamentos, Home/Hoje, Fênix, Design System, Android, acessibilidade.
- **B-F01–B-F13 (13 blocos históricos):** cursos temporários e D4, notificações SO, consentimento, PharmaLens e evidência, farmácia/fornecimento SUS, orientação humana, estoque e conversões, FHIR e portabilidade.
- **CF01–CF27 e A01–A25:** achados históricos; reabrir somente se reproduzidos no APK/SHA atual. Não tratar 52 identificadores como 52 defeitos ainda ativos.

## 07 — Próximas macros propostas após A4

**A5 Internações 360** (autoridade nova e independente, depois de validar Storage/documentos), **A6/M5 Reabilitação 360** (contrato único com a outra frente), **A7 Complemento de Jornada Cirúrgica** (pré/pós e dossiê), **A8 Vacinas 360** (real/plano/comprovantes), **A9** (reações, alergias, procedimentos), **A10/A11** (read model e homologação integral). Dependências P0 de privacidade e paridade clínica devem ser conferidas antes de cada publicação.

---

# ANEXO HISTÓRICO — V25 PRELIMINAR (preservado integralmente)

> ATENÇÃO: quaisquer referências no V25 a `73baf6cd` ou “A3 MACRO2 pendente” são históricas e foram atualizadas pelas seções V26 acima. O anexo não sobrescreve o estado V26.

# VAULT 360 — Relatório Mestre de Continuidade e Roadmap Reconciliado

**V25 preliminar — 21/11/2026**

V25 preliminar | 21/11/2026 | Estado de código + carteira completa de desenvolvimento

Finalidade: impedir perda de escopo entre chats e preservar o trabalho das duas frentes. Este documento NÃO autoriza novas migrações ou publicações; será atualizado quando o proprietário enviar o relatório mais recente ou quando houver confirmação de novos gates.

## 01  Fotografia fiel do estado

Último GitHub main consultado: 73baf6cd32e7fa13bc7514036bd9ab3629ff0bc9 — feat(vault): M4 P2 cirurgia consulta and medication form UX. Este é o HEAD remoto verificado; não equivale a versão instalada do APK, aprovação da Action ou estado local Termux.

A3 P1 consta publicada em 6f767184. A3 MACRO2 de Receitas e Fornecimento 360 está na FIX3 reconciliada ao M4 P2, aguardando retorno da instalação/validação no Termux; não há prova de commit/push da MACRO2.

Legenda: PUBLICADO = código em main; PARCIAL = base existente, funcionalidade ou UX incompleta; PROPOSTO = projeto ainda sem implementação comprovada; HOMOLOGAÇÃO = exige provas no Android, banco, CI e/ou multiaparelho.

## 02  Entregas realmente publicadas após os relatórios

| Domínio / marco | Commit | Leitura responsável |

| --- | --- | --- |

| A0 Integridade / paridade | 1817f1df | Código publicado; efetividade SQL/RLS e 2 contas × 2 pessoas exigem evidências próprias. |

| A1 Rede Multiprofissional | 2c8f61ad | Código publicado; manter IDs de médicos, categorias/conselhos e vínculos. |

| M1 Exames canônicos | f8e4cff1 | Fundação Dexie/sync publicada; E2E multiaparelho não comprovado aqui. |

| M2 Pedidos, sessões, agenda | ddedac3a | Ciclo canônico publicado; 15 itens 12+1+2 e alarmes exigem homologação. |

| M3 Laudos / assets privados | 702c3214 | Código publicado; migração legada, GC e segurança física ainda sob prova. |

| M4 P1/P2 Jornada clínica | 475bee24 / 73baf6cd | Projeção e vínculo cirurgia-consulta publicados; jornada cirúrgica integral não encerrada. |

| A3 P1 Continuidade de receita | 6f767184 | Publicado; A3 MACRO2 posterior segue sem aprovação confirmada. |

| Medicamentos UX360 P0 | 5b332029 | Refino publicado; sem aceite pixel/Android físico integral comprovado. |



## 03  Frente A — inventário integral dos módulos A0–A11

| ID / Domínio | Estado | O que falta para chamar de completo |

| --- | --- | --- |

| A0 — Segurança/paridade | PUBLICADO / PROVA PENDENTE | Revalidar políticas Storage, SQL, paridade remoto/local, dados de dois aparelhos e compatibilidade de arquivos antigos. |

| A1 — Profissionais 360 | PUBLICADO / PARCIAL | Cadastros multiprofissionais, funções por episódio, hospital/consulta, CREFITO/CRM, vínculos e RLS em uso real. |

| A2 — UX360 Android | PARCIAL | Compacto/Conforto, Safe Area, 5 abas, + em 19 listas, Compose, Home Viva, Hoje, Fênix, PDF A4 e acessibilidade. |

| A3 — Receitas/Fornecimento | P1 PUBLICADA; MACRO2 PENDENTE | Versões de receitas, sucessoras, localização histórica e fornecimento unificado; preservar aquisições, saldo desconhecido e retiradas. |

| A4 — Tratamentos versionados | PLANEJADO | Fases vigentes, prescrito vs relatado, alteração de dose/horário/via/lateralidade, pausa/retomada/encerramento explícitos, sem reescrever DoseLog. |

| A5 — Internações 360 | PLANEJADO | Internação independente de cirurgia; admissão, transferências, equipe, alta real, documentos, histórico, vínculos bidirecionais. |

| A6 — Reabilitação 360 | PLANEJADO / M5 RELACIONADA | Programa, sessões, objetivos, equipe e progresso documentado; coordenar com eventual M5 da outra frente, sem duas autoridades. |

| A7 — Jornada Cirúrgica 360 | PARCIAL VIA M4 | Planejamento pré/pós, consultas, exames, cirurgias, internacão opcional, alta, reabilitação, retorno e dossiê compartilhado. |

| A8 — Vacinas 360 | PLANEJADO; M144 LEGADO | Série/doses aplicadas, lote, fabricante, comprovante, próxima dose declarada; jamais inferir aplicação ou calendário. |

| A9 — Outras áreas estruturais | DESCOBERTA | Alergias/intolerâncias/reacões adversas, procedimentos não cirúrgicos, terapias recorrentes e planos de alta; só criar entidades após casos reais. |

| A10 — Experiência longitudinal | PARCIAL | Mesma projeção factual em Home, Hoje, Brain, CareFlow, Modo Médico, Cartão de Retorno, PDFs e busca. |

| A11 — Release/privacidade/nativo | NÃO HOMOLOGADO | Biometria contextual sem loop, arquivos offline, performance, notificações verdadeiras, acessibilidade, CI/APK por SHA. |



## 04  Frente B — infraestrutura, exames e continuidade

| Linha | Estado | Escopo pendente |

| --- | --- | --- |

| M1 Exames / sync | PUBLICADA / PROVA | RLS negativa, offline/pull, IDs, FK, edição concorrente e aparelhos antigos. |

| M2 Pedidos / sessões | PUBLICADA / PROVA | 15 itens → sessões 12+1 + 2 sem compromisso; coleta 11/12; reprogramação; jejum apenas informado; alarmes. |

| M3 Documentos privados | PUBLICADA / PROVA | PDF único N links; URL assinada/expiração; cache nativo; supressão correta; legados; auditoria de destinatário no trigger. |

| M4 Jornada relacional | P1/P2 PUBLICADAS | Unificar projeções e ampliar links reais sem criar novas consultas, exames, prescrições ou cirurgias. |

| M5 Reabilitação | CARTEIRA DOCUMENTADA | M3 cita M5 como próxima linha; não há commit M5 identificado no main consultado. Unificar com A6 antes de construir. |

| D4 P4 Auditoria nativa | PENDENTE DE PROVA | Ler LocalNotifications.getPending, comparar agendados reais, sem declarar entrega nem editar a fila. |

| Notificações E2E | PENDENTE DE PROVA | Permissão, Quiet Hours, Doze, reboot, alarme exato/inexato e entrega física, com opt-in. |

| PharmaLens P4-E | PROPOSTO | Curadoria e fontes regulatórias; P4-D revisão offline já existe, mas não autoriza ativação P4-E. |

| Sync multiaparelho | PENDENTE E2E | 2 contas/2 pessoas, restarts, dedupe, conflitos, fila, tombstone, anexos e nenhuma perda silenciosa. |

| Segurança / Storage legado | P0 CONTÍNUO | Privacidade dos buckets, policies, migração de arquivos/URLs, compatibilidade e negação cruzada comprovadas. |

| M6/M7/M8 | NÃO CANONIZADOS PELO V24 | Aparecem como possíveis desdobramentos em resumos de conversa; requerem escopo/autoridade por escrito antes de tratá-los como fases oficiais. |



## 05  Pacotes históricos que continuam rastreados

Os 12 A-F e 13 B-F do V19 são uma CARTEIRA de possibilidades históricas, não 25 defeitos ativos nem 25 cirurgias automaticamente autorizadas. Fazer mapeamento de evidência antes de encerrá-las.

| Carteira | Temas preservados |

| --- | --- |

| A-F01–A-F04 | Homologação atual; CareFlow datas/fatos; Modo Médico e prévia; Hub/atendimentos/dossiê. |

| A-F05–A-F08 | Pedidos/exames; sintomas/pressão; cartões de medicamentos; acesso global, 19 listas, Compose e return_to. |

| A-F09–A-F12 | Home/Hoje/Explorar/Mais; Fênix/estúdio/GPU; Design System; release Android/acessibilidade. |

| B-F01–B-F05 | D4 P1–P5; D4 P4 auditoria; avisos E2E; cancelamento seletivo consentido; sync multiaparelho. |

| B-F06–B-F09 | PharmaLens P4-E; scanner GTIN/QR/validade por bula; PDF clínico seletivo; Brain explicável. |

| B-F10–B-F13 | Orientações médicas registradas; estoque/lote/unidades/fornecimento SUS; privacidade avançada; FHIR/portabilidade opt-in. |



## 06  Módulos e funcionalidades frequentemente esquecidos

- Profissionais de Saúde: médicos, fisioterapeutas, psicólogos, terapeutas ocupacionais, enfermeiros e outros; conselhos profissionais, equipe e local de atuação, sem CRM obrigatório universal.

- Hospital e Rede de Locais: histórico de mudanças, equipe multiprofissional, vínculos por ID, hospital diferente de internação.

- Internações: independente de cirurgia; alta não pode ser inferida.

- Reabilitação: programa e sessão com presença explícita, remarcação, objetivo documentado, lateralidade, profissional e evolução sem melhora presumida.

- Jornada cirúrgica ampliada: pré-operatório, preparo informado pelo profissional, exames, equipe, possível internação, pós-operatório, retorno e fisioterapia.

- Vacinas: separar aplicação, esquema declarado, reforço planejado e comprovante; conservar o registro M144 sem transformar texto em dose.

- Alergias, intolerâncias, reações adversas, curativos, procedimentos não cirúrgicos e terapias recorrentes: descoberta antes de novo CRUD.

- Prescrições, renovação, aquisição, retirada e fornecimento SUS: quatro fatos diferentes; estoque não altera ao cadastrar receita, conversões exigem prova.

- Orientações médicas e planos de alta: armazenar texto atribuído a uma fonte humana registrada; não produzir indicação clínica própria.

- Sinais vitais, sono, água, sintomas, pressão e diário: preservar unidade, data civil, origem e identidade; não converter ausência em zero.

- Brain/PharmaLens: evidência, incerteza, provenance, produto exato, sem diagnóstico ou prazo regulatório inferido.

- Modo Médico / PDF A4: filtros seletivos, data real, confidencialidade, laudos únicos, sem URLs expiráveis no documento.

- Fênix/Avatar: nomenclatura, acessórios, renderização WebGL ou fallback e autonomia em telas pequenas.

- Plano de Segurança/rede de apoio: controle local e opt-in; não há autorização para mensagens automáticas a terceiros.

- Health Connect, scanner GTIN/QR, FHIR/HL7 e referências regulatórias: explorar apenas com contratos e consentimento, nunca dizer integrado sem prova.



## 07  Bloqueios técnicos e segurança — não adiar

| Nível | Risco / prova | Restrição operacional |

| --- | --- | --- |

| P0 | Storage: clinical-private, avatars, saude, documents, vault-attachments. | Não tornar buckets privados abruptamente sem migrar e verificar links e APKs antigos; RLS negativa 2 contas × 2 pessoas. |

| P0 | Paridade: TypeScript → Dexie → Supabase → push → pull → reabertura. | Sem perder tratamento_ids/cid_ids, data_inicio/condicao, medico_ids nem histórico offline. |

| P0 | Sem dupla autoridade para Exames, Receita, Estoque, Reabilitação. | Integrar por IDs e papéis, sem duplicar registros ou motores de decisão. |

| P1 | Notificações e datas civis. | Agendado no SO ≠ entregue; sem doses tomadas, sessões realizadas ou altas inferidas pelo relógio. |

| P1 | PDF compartilhado e arquivos privados. | Desvincular não significa excluir binário; GC real apenas após validação global. |

| P1 | Compatibilidade Android. | Testar 320/360/393/430dp, Safe Area, teclado, retorno, offline, diferentes densidades e acessibilidade. |

| P1 | Release concorrente. | Blobs semânticos, fast-forward compatível, worktree, backup/rollback, V63/V70/TS, CI/APK SHA. Nunca git add -A. |



## 08  Ordem recomendada — após fechamento real da A3

| Passo | Ação | Critério para avançar |

| --- | --- | --- |

| 0 | Receber saída real da FIX3 A3 MACRO2; reconciliar HEAD, SQL e gate; publicar separadamente. | A3_MACRO2_APROVADO_LOCALMENTE, V63/V70/TS, Supabase conferido, CI SHA. |

| 1 | A4 Tratamentos Versionados 360 (Frente A), sobre a identidade A1 e contratos A3. | Sem reescrever prescrição/dose/estoque; fonte, data vigente, versão, pausas, vínculo, sync. |

| 2 | Coordenar M5/A6 Reabilitação, sem duplicar implementação. | Definir proprietário de banco/UX, programa e sessões, documentos e alarmes, offline. |

| 3 | A5 Internações + A7/M4 Jornada Cirúrgica ampliada. | Internação independente, equipe, alta explícita, link multi-consulta e M2/M3. |

| 4 | A8 Vacinas + A9 domínios justificados por casos de uso. | Registro factual de aplicação, processo de migração M144 revisado, audit trail. |

| 5 | A10/A11: síntese longitudinal, Android Premium, segurança e release. | Matriz H01–H20/H25–H30, APK físico, dados antigos e duas contas/pessoas. |



## 09  Próxima cirurgia prevista: A4 (escopo e condicionantes)

A A4 NÃO está sendo executada neste relatório. Pré-requisito: fechamento A3 MACRO2 ou verificação expressa de independência, leitura do HEAD real, revisão da Dexie vigente (M4 P2 informa V51), confirmação do schema A1 e alinhamento com a outra frente.

- Fases de tratamento com effective_from/effective_to e versão explícita; registrar dose, frequência, horário, via, lateralidade/sítio e fonte prescrita ou relatada.

- Mudança de fase não reescreve DoseLogs, documentos, estoque, agendamento de exame nem a identidade do medicamento.

- Pausa, retomada, término e substituição por eventos auditáveis; ausência de data/fato permanece pendente e não concluída.

- UI Premium compacta e detalhada, histórico temporal, contextos clicáveis por ID e ações Novo/Editar/Vincular distintas.

- Migração aditiva, idempotência, fila offline, push/pull, dados antigos preservados, RLS negativa e gate global.



## 10  O que precisamos confirmar com o próximo relatório

- Resultado da A3 MACRO2 FIX3 no Termux, migracão SQL da MACRO2 e HEAD publicado, se houver.

- Se alguma das frentes iniciou ou publicou M5/A6, A4, A5 ou outras macros depois de 73baf6cd.

- Actions e build APK do SHA mais recente; homologação visual, de notificações e de pdfs no aparelho.

- SQL, políticas e migração efetiva dos buckets antigos após A0/M3.

- Lista de defeitos reproduzidos ainda abertos do dossiê CF-01–27 e A01–25; não reabrir os que já foram corrigidos.

- Se o proprietário aprovou fases M6–M8 como nomenclatura oficial; documento V24 não as designa formalmente.



## 11  Matriz de provas que não serão esquecidas

| Grupo de verificação | IDs históricos / prova | Condição de aceite |

| --- | --- | --- |

| Release completo | H01–H02 | V63/V70/TypeScript, Action do SHA novo, build e APK realmente disponíveis. |

| Autorizações / Storage | H03–H05 | RLS negativa, pessoa/conta isoladas, arquivos novos privados e legados acessíveis somente no escopo autorizado. |

| Pedidos de exame e alarmes | H06–H13 | 15 itens, sessões 12+1+2, sem alarmes dos 2 pendentes, preparo informado, coleta/recoleta e cancelamento de aviso antigo. |

| Laudos / vínculos | H14–H15 | Um PDF com N vínculos; desfazer um link não apaga o arquivo. |

| Offline / longitudinal | H16–H18 | Retentativa segura sem duplicação; consultas de retorno e Brain/Modo Médico/PDF coerentes. |

| Android / visual | H19–H20 | Compacto e Conforto comparados à referência V21, incluindo Safe Area e botão + no aparelho. |



O A0 ainda acrescenta H25–H30 para Storage/Paridade em cirurgias, tratamentos e hospitais. São critérios de prova, não alegação de que novos testes foram executados.

## 12  Fontes e graus de certeza

Fontes primárias fornecidas: V19 Integral (47 páginas, 19/11); V21 Integral (63 páginas, 20/11, incorpora V20/V19); V24 Auditoria e Roadmap (22 páginas, 20/11, preserva V23 e referencia V22); relatórios de continuidade versionados no repo A0/A1/M1/M2/M3/M4P2; sequência de commits GitHub consultada em 21/11/2026. O relatório mais recente prometido pelo proprietário ainda não estava anexado nesta rodada.

Certeza: códigos na main = VERIFICADO EM REPOSITÓRIO; funcionalidade SQL e E2E = DOCUMENTADA OU NÃO REVALIDADA; plano sem commit = PROPOSTO. Nenhuma aprovação Termux, CI, banco ou APK foi inventada. Este V25 é preliminar, não uma transcrição literal de relatório ainda não enviado.


---

**Nota de atualização:** reconciliar com o próximo relatório do proprietário antes de anexar a versão definitiva ao pacote da próxima cirurgia.
