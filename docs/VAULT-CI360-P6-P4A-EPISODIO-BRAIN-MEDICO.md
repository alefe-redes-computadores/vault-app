# VAULT CI360 — P6 P4-A · Episódio de atendimento e Brain relacional

Base exigida: commit GitHub `851b402040e3524d609d8277d36e1af9c59156b1` como **ancestral**, não HEAD fixo. Se a P6 P3-C do outro chat avançar, o instalador reconstrói a candidata em `origin/main` e exige todas as âncoras exatas. Divergência bloqueia sem sobrescrever. **Sem DDL, SQL, contato externo, push automático ou escrita clínica durante a aplicação.**

## O que esta cirurgia adiciona

1. `CareFlow 360 → Episódio de atendimento`: selecionar consulta própria, visualizar desdobramentos **por IDs** e resumo compacto de sintomas, pedidos de exames, itens e medicamentos vinculados diretamente. Nenhum vínculo deduzido por datas, nomes ou proximidade.
2. Linha do tempo com consulta, relatos de sintomas ligados por `monitor_note.related_id`, pedidos e filhos `exam_item` / `exam_status` / `exam_result`, e fotografia atual de medicamentos com `medicamento_ids`. Eventos não vinculados permanecem no módulo original, sem serem falsamente relacionados.
3. PDF A4 **do episódio escolhido**, usando o gerador já existente (`makeMedicalPdfP3`) e biblioteca local `pdfLibraryM2`; prévia, arquivo local e download por ação explícita. Troca de conta/pessoa/consulta invalida exportação; arquivo local criado na troca é revertido seletivamente, não cria histórico clínico.
4. Brain: único cartão de acompanhamento contextual na Home, depois do resumo da rotina; somente se consulta concluída nos últimos 14 dias possuir vínculo comprovado e assunto útil. O cartão é opcional, dispensável na sessão, não altera `Ação Agora`, nem cria alerta, evento, notificação ou tarefa. O aceite persistente futuro deve reutilizar o motor Brain de governança existente, não criar segunda autoridade.
5. Correção pontual na projeção `medical-dossier-p3`: o vínculo `monitor_note → registro de sintoma → consulta` passa a apresentar texto originário da **mesma pessoa**, com intensidade registrada, e o CTA aponta à área de sintomas (não à pressão arterial).
6. Acessibilidade e visual: seletor relacional premium, cards recolhíveis, 44px+, 320px, controles dark premium, tokens atuais, Safe Area, render incremental e zero `<select>` nativo na rota nova.

## Segurança / preservação

- Projeções puras: nenhuma alteração a receitas, consultas, estoque, retiradas, DoseLogs, exames ou medicamentos.
- `user_id + person_id` verificados antes de ler cada entidade; IDs estrangeiros e nomes/data coincidentes são ignorados.
- Relato subjetivo não vira diagnóstico, febre confirmada, etiologia ou inferência de interação medicamentosa.
- Medicamento vinculado mostra o cadastro atual, não retrospectiva de prescrição ou de administração.
- Status `agendada` de consulta permanece como registrado e exige revisão; PDF revela essa lacuna.
- Nenhum PDF compartilhado ou enviado automaticamente. Exportações só após comando e verificação do contexto atual.
- Nenhum novo motor de PDF, banco Supabase, tabela RLS ou pacote de alarmes Android.

## Escopo concorrente recomendado

- **Outro chat P6 P3-C:** lembretes/Quiet Hours/permissões e estabilidade Android, possíveis alterações na Home/notifications.
- **Esta P6 P4-A:** `app/page.tsx` (import + cartão após resumo), `app/saude/careflow/page.tsx` (atalho), `lib/m3/medical-dossier-p3.ts` (projeção factual), `scripts/test-v63-release-gate.mjs` (um contrato); cinco novos arquivos. Se o outro chat tocar os mesmos arquivos, âncoras exatas + gates globais decidem; nunca misturar worktrees ou sobrescrever resultado de outra cirurgia.

## Aceites de lógica

- Consulta da pessoa A não pode mostrar registro B mesmo que `related_id`, nome ou dia coincidam.
- `monitor_note` deve apontar para registro de sintoma real, com nome, data, observação e intensidade informada; duplicações por dois vínculos não duplicam o registro.
- Pedido de exames dentro do episódio só entra quando `exam_order.related_id = consulta.id`. Itens/estados/resultados só entram pela cadeia de `parent_id` validada. Item pendente não vira resultado.
- Medicações somente as explicitamente presentes na consulta, e seus dados exibidos como fotografia do cadastro; não inferir medicamento novo pelo nome da médica.
- PDF A4 do episódio deve repetir exatamente os dados da prévia, sem anexos binários, sem registros de outra pessoa e com limitações.
- Brain aparece em no máximo 1 cartão, com fonte e CTA não coercitivo; sem fatos relevantes retorna `null` e não polui a Home.
- V63 completo, V70 duplo, TypeScript global, diff --check e HEAD remoto; testes no Android/PWA/duas pessoas completam o aceite físico.

## Teste guiado pós-consulta (dados reais, não fabricar)

1. Em `Consultas`, abrir a consulta existente, conferir data, médico, status e o relato que foi realmente informado. Se ela ocorreu mas segue “agendada”, atualizar **após conferência**, sem criar segunda consulta.
2. Em `CareFlow → Sintomas`, escolher “Outro” para relato subjetivo de calor no ouvido (não “febre” sem medição), preencher data/hora real e intensidade, selecionar a consulta de origem. O vínculo deve aparecer no episódio e no Modo Médico.
3. Em `CareFlow → Episódio de atendimento`, selecionar a consulta e conferir o resumo: um sintoma só entra se houver vínculo explícito. Usar a linha do tempo e abrir a origem.
4. Cadastrar o medicamento otológico usando **nome, composição, via, lado, gotas por aplicação, frequência e duração exatamente como prescrito**; selecionar médico manualmente quando necessário, diferenciar prescrito/comprado/iniciado/tomado. Não marcar dose futura ou estoque inexistente.
5. Em `CareFlow → Exames`, cadastrar um pedido como pedido, vincular à consulta e revisar cada item. Não marcar coleta, agendamento ou resultado inexistente. Testar vínculo pedido → itens → situação.
6. Em `CareFlow → Pressão`, somente configurar horários e período **confirmados pelo profissional**; não aceitar horários-padrão por conveniência. Não lançar valores sem medição.
7. Abrir `Episódio` → Resumo/Detalhado → Arquivar PDF local → Baixar; conferir linhas, datas, lacunas e legibilidade no APK. Trocar a pessoa e comprovar isolamento da prévia.
8. Na Home, se houver gatilho real e recente, conferir um cartão opcional com link para a fonte. Sem registros vinculados, **não** fabricar pergunta.
9. Com dois dispositivos, testar ida e volta real da consulta, `monitor_note` e medicamentos. **Nenhum PDF binário é sincronizado** pela biblioteca local.

## Pendente proposital para próximos ciclos

- Prefill da consulta e médico na criação de medicamento/exame requer preservar semântica de prescrição e contexto de retorno; **não implementado automaticamente nesta P4-A**.
- Catálogo Anvisa e verificação de interações exigem fonte/versionamento, revisão de evidências farmacológicas e autorização específica de migração; **não implementados** aqui.
- Aceite persistente de perguntas Brain deve usar política canônica e sincronização por pessoa, não `localStorage` paralelo; nesta P4-A a dispensa é somente na sessão visual.
- Homologação física Android/Quiet Hours/GPU e caso real da Metadona permanecem fora deste pacote e precisam de evidência.

## FIX1 de compatibilidade P6 P3-D1
A `main` avançou para `0b4038d9` com episódio médico e vínculos de sintomas.
Esta P4-A não reescreve `lib/m3/medical-dossier-p3.ts`; reutiliza a autoridade
D1 e acrescenta um resumo contextual na Home, navegação para episódio e uma
visão independente de 1 minuto. Testes exigem as duas funcionalidades compatíveis.
