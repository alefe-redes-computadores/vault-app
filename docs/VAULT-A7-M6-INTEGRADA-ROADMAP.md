# VAULT 360 — A7/M6 Jornada Cirúrgica: entrega definitiva após A5 + V28

## Bases auditadas
- GitHub base obrigatória: `ef0966e10888f3ab1f6f1e8faeda5c6f440d8f58`, publicação A5 Internações + V28. Todas as 10 fontes compartilhadas são verificadas por hash de blob antes do patch; se alteradas, abortar e reconciliar em vez de sobrescrever.
- Migração Supabase A7 `20261121180631` aplicada via ferramenta autenticada ao projeto oficial: `surgery_journey_events_a7`, `surgery_team_a7`, triggers de imutabilidade/tombstones, FK por conta+pessoa+cirurgia e RLS. A migração está versionada no ZIP com o mesmo nome para histórico local.
- Cirurgias legadas `cirurgias` são a fonte de identidade, data, procedimento e estado. Não existe duplicação de cirurgia.
- Consultas M4 por `surgery_consultation_links_m4`: preparação/pós/retorno por função explicitamente salva. Pedidos de exame somente via IDs vinculados às consultas.
- Reabilitação M5 por `rehab_origin_links_m5`, sem criar uma segunda sessão ou deduzir recuperação.
- Internações A5 por `hospitalization_relations_a5` (`entity_type=cirurgia`, ID exato) + seus eventos, equipe, permanências e alta. **Equipe da internação NÃO é equipe cirúrgica. Alta hospitalar NÃO comprova recuperação cirúrgica.**
- M3 arquivos privados: `vault_validate_clinical_asset_link_m1()` NÃO admite arquivo anexado diretamente a cirurgia. A7 só agrega arquivo M3 de consulta M4 explicitamente ligada ou episódio/evento/alta A5 explicitamente ligado, e abre a origem no módulo canônico; não há URL pública nem upload paralelo.

## Funcionalidade realmente entregue
- Página responsiva `/saude/cirurgias/jornada?id=<id>` com estado atual original, preparação, ato cirúrgico, pós-operatório, retornos, vínculos hospitalares, reabilitação, tratamentos, exames e documentos; consulta a todos os registros sob conta+pessoa.
- **NOVO:** autoria de fatos da jornada com tipos preparação, procedimento, evolução pós-operatória, retorno e retificação imutável do original; data opcional, texto descritivo, procedência e profissional vinculado opcionalmente. Salvar não modifica o estado da cirurgia nem gera alta, dose, prescrição ou evento clínico de outros módulos.
- **NOVO:** equipe específica da cirurgia, profissional da conta, função declarada, origem, observação; desassociação com confirmação inline e exclusão lógica, sem apagar o profissional.
- Dexie local-first v55, `SyncQueueItem`, fila/outbox existente, ordenação de dependências, push idempotente com CAS e pull com proteção de pendências. SQL remoto independente de outros dados clínicos.
- Modo Médico resumo/detalhado e PDF a partir dos mesmos registros A7, sob filtros de pessoa/conta e datas. Brain longitudinal recebe um digest observacional de leitura apenas; o Brain não cria nem altera fatos.
- Jornada Clínica M4 inteira preservada e conectada à nova página por acesso complementar. Exibição de todos os eventos sem esconder registros: expansão, filtros e renderização incremental de 40 em 40.
- Feedback em toast, campos premium de seleção e data, CTA esmeralda, ícones Lucide, áreas acessíveis, Safe Area, sem diálogo nativo. Retificações criam novos fatos sem reescrever o histórico.

## Garantias e não-regressão V26/V27/V28/V29
- **Não presumir liberação cirúrgica, prescrição, coleta, realização de exame, alta, diagnóstico ou melhora.** Estados `agendada` / `realizada` / `cancelada` continuam os da fonte canônica Cirurgias.
- Datas de fatos em dia civil, DD/MM/AAAA. Data opcional não vira `data de hoje` fictícia; se ausente, relatório marca data do fato não informada e separa registro temporal técnico quando necessário.
- Sem roxo fora do Brain; componentes com ícones Lucide, estados vazios e nenhum `<details>` dentro de `<Link>`.
- Nada de correção cosmética para satisfazer contratos estáticos desatualizados; reparo só por causa real e novas asserções negativas.
- Não altera bibliotecas globais de horário que o Work pode estar alterando, nem qualquer tabela de Internações A5. Sem nova dependência externa.

## Testes e estado de homologação
- Na entrega: 61 testes antigos de projeção + 67 testes A5/M3 + 57 testes de escrita/sync e controles negativos = **185 verificações dirigidas**; TypeScript strict do motor, sintaxe JSX/TS pelo parser, sintaxe Python/Bash, SQL aplicado/verificado no Supabase; simulações de patch/git isolado.
- **AINDA PENDENTE NO CHECKOUT REAL:** `tsc --noEmit` de todo o repo, V63/V70 real, CI Actions do commit e APK/Android físico. O instalador acumula falhas de pré-gate, bloqueia publicação em caso de qualquer erro, e executa varredura V63/V70 completa somente após o pré-gate.
- Publicação seletiva: exatamente 10 modificados + 14 novos. Não usa `git add -A`, `reset --hard` nem `push --force`.
- Se a outra frente publicar novas alterações nos 10 arquivos, **bloquear e reconciliar**. Se só adicionar commits descendentes sem alterar arquivos protegidos, instalar com origem atual sincronizada.

## Limites honestos
- Autoria de fatos de recuperação é factual, não acompanhamento médico automático nem orientações clínicas geradas. Alertas pós-operatórios automáticos, integrações externas, workflows de validação médica e homologação Android físico são trabalho futuro e não devem ser anunciados como aprovados.
- Vacinação A8, Procedimentos A9, PharmaLens e refinamentos transversais continuam no roadmap, sem mudar a autoridade dos seus módulos nesta cirurgia.

## Reconciliação FIX1 — V28 Work (b15b7cc)
- Preservadas todas as mudanças de Home, Hoje, Pressão, Consultas, Relatórios e TimePicker do Work.
- Restauradas as projeções A4 e M5 no Modo Médico/PDF sem remover o parser de pressão arterial da V28.
- Exigidos testes V28 no pré-gate e integridade das três fontes A4/M5/A7.
- A M6 alternativa não está publicada e não deve ser executada junto a este pacote.
