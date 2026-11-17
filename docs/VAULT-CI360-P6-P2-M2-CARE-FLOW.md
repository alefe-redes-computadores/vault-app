# VAULT 360 — CI360 P6 P2 / M2

Release: CareFlow 360 e reconciliação canônica de retiradas P0.

## Fonte e segurança

- M1 publicada em `main` antes desta cirurgia. O pacote é ancorado por conteúdo e reconstrói a alteração em `origin/main` no momento da execução. Não reaproveita SHA antigo como pré-condição fixa.
- O Supabase `vault-app` recebeu **antes do pacote** uma tabela independente de eventos imutáveis `public.careflow_events_m2` (RLS + permissão SELECT/INSERT) e campo JSONB opcional `public.health_reminders.careflow_m2`. A migração foi confirmada via SQL. **Não repetir migration**.
- Eventos M2 não são atualização/duplicação de estoque, aquisição, receita, dose nem diagnóstico. Cada fato novo usa UUID próprio, owner e person imutáveis; a fila local faz push idempotente e o pull pagina eventos sem perder histórico.
- A biblioteca de PDFs grava `Blob` no IndexedDB do **aparelho atual**, jamais no Supabase. Exporte arquivo para garantir cópia fora do armazenamento do app.

## Exames

1. Abrir CareFlow > Pedidos e resultados ou acesso em Exames e Laudos.
2. Escolher data, eventualmente médico cadastrado, local e consulta real.
3. Abrir foto local e ampliar para visualizar marcações. OCR nativo experimental `TextDetector` extrai texto quando o navegador oferece o recurso, **não reconhece caixas marcadas de modo certificado**.
4. Adicionar um item por linha. Selecionar explicitamente marcado / desmarcado / duvidoso e atestar visualmente cada item. Não marcados/duvidosos não são gravados como exames solicitados.
5. O pedido e seus exames filhos são eventos independentes. Estado e resultado geram novos eventos que preservam os anteriores. Resultado e referências são transcrição do usuário, não interpretação clínica.
6. Buscar no histórico por termo ou ano; o antigo módulo Exames continua intacto.

## Pressão

1. Abrir CareFlow > Pressão. Planos têm início/fim, horários e observação opcional.
2. Os lembretes novos usam `health_reminders` existente com janela `careflow_m2.start/end`: agenda e scheduler nativo respeitam a janela, mesmo que o app seja aberto no futuro.
3. A medição real é gravada no repositório canônico `healthMeasurements`, nunca como mero agendamento.
4. Se um vínculo de plano falhar após gravar medição, NÃO repetir o registro: o sistema informa que a leitura foi persistida e o vínculo precisa revisão.
5. Gráfico das últimas 60 medições; exportação local de todas as medições disponíveis para um PDF na Biblioteca.

## Sintomas

- Sintomas reais seguem `registros_saude` com fonte do usuário, dia/hora, intensidade e observação, medicamento opcional sem presumir causalidade.
- Consulta opcional é vinculada por novo evento M2 ao registro já salvo, com checagens de conta/pessoa.
- Histórico longitudinal e curva meramente descritiva da intensidade, sem diagnóstico.

## Relatórios

- Central de Relatórios 360 mantém PDF/CSV/JSON atuais. Botão novo **Arquivar PDF neste aparelho** gera uma cópia para biblioteca local, com conferência de escopo (usuário/pessoa) antes de gravar.
- Biblioteca permite importar PDF com confirmação humana, buscar por título/ano/período, exportar/download e remover somente o PDF local sem apagar dado clínico.
- A importação de PDF não faz OCR nem prova validade documental.

## P0 Metadona

- Constatação somente leitura no Supabase em 17/11/2026: uma retirada `realizada` e outra `agendada` para `2026-12-11` no **mesmo ciclo explícito**. O estoque remoto no momento da leitura era 24. Há cinco eventos associados ao medicamento.
- Predicado canônico `conflictingWithdrawalM2` compara **conta + pessoa + medicamento + ciclo não vazio + data**. Marca o compromisso aberto como conflito para conferência se houver evento concluído com exata correspondência.
- Índices de ações, agenda e CTA de listagem/home não oferecem a retirada conflitante como nova operação pronta. O painel de revisão mantém IDs originais acessíveis.
- Datas diferentes, ciclos diferentes, pessoas diferentes ou retirada não realmente concluída não são colapsados. Não há atualização automática, exclusão de eventos, alteração de receitas ou estoque.

## Homologação real

- Instalação usa worktree descartável e única rodada V63/V70, após TypeScript.
- Nenhuma alteração em `main` é feita se âncoras, TypeScript, gates, HEAD, allowlist ou concorrência não passarem. Só no final faz commit e push fast-forward.
- Testar duas contas, duas pessoas, offline, restart, sincronização entre dois aparelhos, data limite dos lembretes, PDF não sincronizado e identificação do conflito em Home/listagem/retiradas.
- Limitações: a visão automática de checkmarks manuscritos não foi implementada; OCR nativo pode estar indisponível. PDF local não recebe backup automático. A M2 não resolve todos os conflitos de campos legados nem insere automaticamente cada exame na tabela antiga `exames`.
