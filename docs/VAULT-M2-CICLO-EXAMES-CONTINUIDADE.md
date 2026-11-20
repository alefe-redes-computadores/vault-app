# VAULT 360 — M2 Exames 360 | Relatório de continuidade integral
**Corte:** 20/11/2026. **Dependência:** M1 commit `f8e4cff1b17488d90fbdaf83e0f16b75e50cf488`; banco M0/M1 SQL já aplicado anteriormente. **Status da M2:** pacote de cirurgia construído, com testes sintéticos/estáticos locais; **não homologado no checkout final** até aprovação real em Termux e Action GitHub do novo commit. Não reaplicar SQL da M1.

## 1. Objetivo, autoridade e recortes

- Todos os NOVOS pedidos de exames passam a `exam_orders` + `exam_order_items`, incluindo exame avulso de um item. Os dados e eventos `exames`/`careflow_events_m2` históricos permanecem inalterados e consultáveis. Nenhuma migração cega, exclusão física nem dado sintético produzido na conta.
- Origem médica explícita via `consultation_exam_order_links` papel `origin` e retornos por papel `review`, N:N por pessoa/usuário. Não vincular por mera proximidade de datas.
- Um pedido agrupa N itens e sessões diferentes; 15 itens podem ter 12 em sessão A, 1 em B e 2 pendentes, sem 15 notificações ou compromissos fictícios.
- Sessão exige horário confirmado, fuso civil, laboratório/clínica se informado, protocolo e previsão de laudo opcional. Preparo exigirá fonte declarada e texto conferido, jamais jejum presumido; a fonte é guardada como texto legível no campo de instruções da M1, sem alteração destrutiva de schema.
- Máquina de estados factual por item e por vínculo de sessão; coleta parcial, recoleta, ausência, remarcação/cancelamento explícito e resultado manual. Dados originais persistem; nova sessão preserva anterior.
- Um retorno de consulta pode revisar o mesmo pedido sem duplicação do pedido nem de resultados.

## 2. Implementações desta cirurgia

**Novos arquivos:** `lib/clinical-exams-m2/domain.ts` (projeção factual, data civil, lembretes por sessão), `repository.ts` (transações idempotentes/bounds/escopo), `notifications.ts` (Capacitor 6, opt-in, quiet hours, Doze e faixa int32 com detecção de colisões), `components/saude/CanonicalExamOrdersM2.tsx`, `components/saude/ExamAgendaM2.tsx`, `app/saude/exames/pedidos/page.tsx`, teste M2 e este relatório.

**Arquivos alterados seletivamente:** `app/saude/exames/page.tsx`, `app/saude/exames/novo/page.tsx`, `app/saude/careflow/exames/page.tsx`, `components/HealthReminderReconciler.tsx`, `app/page.tsx`, `app/hoje/page.tsx`, `scripts/test-v63-release-gate.mjs`.

- Tela Exames mostra um card por pedido canônico e mantém os registros antigos. CTA principal direciona ao novo fluxo canônico. Rota velha `/saude/exames/novo` redireciona e bloqueia a gravação legada mesmo durante a transição.
- O cadastro CareFlow por foto/OCR local continua acessível em `/saude/careflow/exames?novo=1`; a gravação foi redirecionada ao repositório canônico, com intenção UUID estável em reenvios. A leitura dos eventos históricos CareFlow e o registro de correções desses eventos continuam intactos.
- Novo espaço `/saude/exames/pedidos` permite criar, selecionar os itens confirmados para agendamento, registrar coletas individuais, recoleta, cancelamento, remarcação, resultado textual factual e vínculo a consultas de retorno.
- Home e Hoje usam a mesma projeção das sessões confirmadas; não copiam itens como compromissos fictícios.
- Reconciliador nativo consulta as novas tabelas por conta e pessoa e planeja avisos por sessão/categoria com consentimento individual, sem substituir o reconciliador de medicamentos e eventos legados. IDs reservados na faixa 1.770.000.000–1.869.999.999 e confrontados com notificações existentes antes de agendar. Ao suspender/alterar agendamento, o próximo reconcílio remove alertas obsoletos.
- Permissão de alarmes exatos apenas consultada automaticamente; tela específica permite o usuário entrar nas configurações por gesto expresso. PWA mostra ausência de garantia nativa; horários de silêncio do dispositivo permitem aviso antecipado em vez de distorcer horário clínico.

## 3. Critérios objetivos de aceite (M2-01 a M2-20)

| ID | Prova exigida | Estado da prova |
|---|---|---|
| M2-01 | Cadastro novo vai exclusivamente às tabelas canônicas; dois caminhos de UI, uma autoridade | Implementado; gate Termux pendente |
| M2-02 | Avulso de 1 item e retry com intenção estável | Implementado; E2E pendente |
| M2-03 | 1 pedido 15 itens, sessões 12+1 e 2 pendentes | Teste sintético local passou |
| M2-04 | Pendentes não geram agenda, preparo ou alarmes | Teste sintético local passou |
| M2-05 | Coleta 11/12 e recoleta de um item sem apagar histórico | Implementado; E2E offline pendente |
| M2-06 | Duplo vínculo ativo bloqueado no Dexie e por índice parcial no SQL | M1 preservada; prova negativa real pendente |
| M2-07 | Remarcação com nova sessão, preservação de histórico e cancelamento do aviso antigo | Implementado; físico pendente |
| M2-08 | Cancelamento parcial não altera coletas anteriores | Implementado; E2E pendente |
| M2-09 | Resultado recebido desarma previsão quando não há mais itens aguardando | Teste sintético passou |
| M2-10 | Opt-in separado, padrão desligado, nenhuma instrução de jejum inventada | Implementado; inspeção física pendente |
| M2-11 | Quiet Hours + fuso civil e aviso antecipado, sem mudar compromisso clínico | Implementado; caso no Android pendente |
| M2-12 | Android 14+: sem exatidão, UI informa modo aproximado e configuração sob gesto | API v6 conferida; físico pendente |
| M2-13 | Doze, 1 aviso agrupado para categorias muito próximas e IDs int32 sem colisões conhecidas | Implementado; físico pendente |
| M2-14 | Busca, navegação, pessoa ativa, histórico antigo e viewports 320–430dp | Navegação implementada; inspeção física pendente |
| M2-15 | RLS cruzada entre usuários/pessoas nega SELECT/INSERT/UPDATE | Políticas M1 aplicadas; testes E2E com contas separadas pendentes |
| M2-16 | Offline e multiaparelho: retries, conflito, FK topo, tombstones | Herda M1; dois dispositivos pendentes |
| M2-17 | V63 + V70 + TS + Action Node22/build/APK no SHA publicado | **Ainda não executado neste pacote** |
| M2-18 | Notificação física, modo avião, retomada e reboot | Pendente |
| M2-19 | Consulta de origem e múltiplos retornos N:N sem duplicação | Implementado; E2E pendente |
| M2-20 | Eventos cancelados não ressurgem como compromisso | Teste sintético parcial; físico pendente |

**Importante:** os testes locais pré-pacote foram sintéticos com TypeScript 5.8 e stubs, verificando sintaxe, tipos da interface M1 e a projeção 12+1+2. Isto **não** substitui `npm run test:release` contra o repositório real. O instalador bloqueia antes de aplicar se qualquer contrato/TypeScript falhar. No pós-push conferir a Action e o APK com o SHA exato.

## 4. Proteções da cirurgia

- Diferenças de HEAD permitidas apenas quando todos os blobs dos **sete arquivos modificados** correspondem aos hashes de origem. Conflito real impede cirurgia; não há `git add -A`, `reset --hard` ou force push.
- Pré-voo comprova existência da M1, baixa `origin/main`, compara arquivos e stage; patch acontece em clone isolado e usa allowlist explícita; backup seletivo e rollback antes do commit; publicação é comando separado.
- O diagnóstico rápido reúne os contratos M2, M1 e os 8 contratos legados selecionados, além do TypeScript. A aplicação repete o diagnóstico e executa **o gate oficial integral**; em caso de falha, relatório detalhado e scanner dos contratos restantes. Progresso visível no Termux.
- Nenhuma migração ou acesso remoto ao banco é executado pelo instalador; os dados existentes no aparelho são preservados.

## 5. Notas de engenharia e limitações honestas

- Histórico antigo é apresentado no legado enquanto os novos pedidos usam o card canônico. Não duplicar implicitamente eventos antigos na nova tabela.
- A fonte declarada do preparo foi persistida como texto humano junto à instrução; a M3 pode evoluir para coluna estruturada com migração versionada, se necessário. A M2 não altera SQL.
- Novos anexos/laudos binários, SHA-256, deduplicação, Storage privado e cache Capacitor não são responsabilidade desta cirurgia; integram a M3. A tela orienta que a foto do OCR é apenas conferência temporária, sem upload automático.
- O status factual `collected` não é resultado. `expected_result_at` é só previsão. Nenhum diagnóstico é inferido pelo aplicativo.
- A confirmação de entrega de notificações, de PDF e qualidade visual depende de aparelho Android; não certificar somente com testes de código.
- Algoritmo de horário civil usa fuso do aparelho na entrada; ao agendar em outro fuso, deve ser melhorado com seleção explícita de fuso e teste de DST. Não reinterpretar dados já gravados.

## 6. Próxima M3 e Jornada Clínica Relacional 360

**M3:** 1 PDF compartilhado por vários itens/sessões via `clinical_assets` + `clinical_asset_links`, dedupe SHA-256, Storage privado com URLs assinadas de curta duração, cache offline Capacitor Filesystem, limpeza segura no logout, status de upload, GC server-side após zero referências, resultado factual em documentos, biblioteca, Modo Médico, Brain, Cartão de Retorno e PDF A4 legível, consulta origem/review N:N. Migração de buckets antigos somente após prova de checksum e URLs APK antigas.

**Pós-M3 nesta mesma frente:** jornada clínica transversal de **consulta inicial → indicação de cirurgia → avaliações (cardiologia/anestesia) → exames pré-operatórios → procedimento → internação → alta → medicamentos/receitas → retornos → reabilitação**. Aplicar o mesmo motor de vínculos reais a tratamentos, fornecimento, vacinas e demais áreas. Cada registro tem autoridade única, UUID, user_id/person_id, proveniência (prescrito vs relatado), histórico por fases, links N:N e leituras compartilhadas. Não associar por coincidência de datas. Priorizar Receitas/Fornecimento 360, tratamentos versionados e Cirurgias/Alta/Reabilitação devido à necessidade prevista pelo proprietário; vacina e biometria nativa sem loop na sequência, com antecipação de segurança P0.

**Acervo V22:** preservar 24 provas H01–H24, 27 achados CF-01–CF-27, 25 achados A01–A25 e garantias S01–S14. Documentação da auditoria anterior M2: `VAULT-M2-PLANO-AUDITORIA-CONTINUIDADE.md`. Se a sessão mudar, não declarar H01/H02 aprovadas antes da Action e APK.

## M2 FIX1 — 20/11/2026 (gate legado R6 e pré-voo exaustivo)

O R6 histórico continha uma exigência textual da antiga rota de criação CareFlow, incompatível com o cutover canônico. O teste agora exige a nova rota `/saude/exames/pedidos?novo=1`, o uso de `createExamOrderM1` no destino, o componente `CanonicalExamOrdersM2` e o estado vazio que considera a contagem relacional (`canonicalCountM2===0`). Todas as demais garantias R6 permanecem.

No pré-voo, as 12 verificações dirigidas continuam rodando até o fim e seus resultados são exibidos. Se alguma falhar, o instalador faz automaticamente o gate integral e o scanner dos contratos restantes antes de bloquear, agregando o relatório JSON; há um comando `COPIAR-FALHAS.sh` para montar o log completo em Downloads. O gate integral continua obrigatório mesmo com pré-voo aprovado. Sem aprovação real em Termux, M2 é **NÃO PUBLICADA / NÃO HOMOLOGADA**.


## M2 FIX2 — Auditoria exaustiva 20/11/2026

Relatório do Termux: 531 verificações, 3 falhas específicas. V112 rejeitou inputs
visíveis nativos de data/horário e selects. CareFlow R1 procurava um fragmento
pré-cutover do médico, e R5 procurava a antiga rota de criação. FIX2 troca
os controles da tela nova por CustomDatePicker, HealthTimePicker e
HealthRelationPicker, exige horário confirmado, mantém a leitura de OCR
como incerta até revisão explícita e atualiza somente os dois contratos
legados para fiscalizar a autoridade M1/M2 real.

Pré-voo dirigido agora cobre os contratos V112, CareFlow R1 e R5 antes
do gate V63/V70/TypeScript. Coletor integral mantido. Nenhuma alteração
de SQL, RLS, Supabase ou dados clínicos nesta correção.

Não afirmar gate real aprovado sem execução no Termux; publicação separada.
