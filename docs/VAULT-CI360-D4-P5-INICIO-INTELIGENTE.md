# VAULT CI360 D4 P5 — Início inteligente, sem automação clínica

## Autoridade
- `temporary-course.ts`: horários e quantidade exclusivamente planejados pelo usuário; sem adicionar dose compensatória ou alterar duração em dias informada.
- `doseLogsRepository.replaceTemporaryCourse`: escrita canônica e preservação de eventos resolvidos; este pacote não substitui nem copia o repositório.
- `firstPlannedAt` para horários fixos é diferente de `firstDoseAt` existente para intervalos; ambas são datas de planejamento, nunca prova de tomada.
- Notas antigas mantêm formato original; notas novas com `primeiro previsto` são interpretadas por D4 P1/P3 sem inferir eventos ou prescrições.
- `TemporaryCourseRevisionPreviewP5`: comparação somente leitura de pendências mantidas, novas, removidas e histórico preservado da pessoa/medicamento. Cancelamentos no plano exigem reconhecimento explícito antes de salvar.

## Segurança
- O corte de um horário do primeiro dia não estende o tratamento nem altera estoque.
- O editor não confirma uma tomada; apenas o fluxo legítimo de registro de doses pode fazê-lo.
- Eventos antigos resolvidos mantêm a nota original; podem permanecer listados sob uma chave anterior no painel D4; não são reclassificados por esta cirurgia.
- Conflitos de SOS, dose avulsa, duplicação ou data inválida bloqueiam alterações até revisão humana.
- Somente consulta local: sem migração SQL, alterações em notificações Android, receita, suprimentos ou sincronização autônoma.

## Escopo
7 arquivos modificados, 4 adicionados; testes D4 P5 integrados ao V63, V70 e TypeScript global.
Avaliação visual em Android/Capacitor e release de APK requerem homologação separada.

## Proteções de release
Diagnóstico em clone isolado do Termux, 1 bateria completa; reaproveitamento comprovado do mesmo clone na aplicação; 1 bateria completa pós-aplicação no checkout real; publicação separada com stage limitado a 11 arquivos. Backup seletivo, abort e rollback mediante SHA. Nada de reset --hard ou git add -A.

## Teste historico M60
O contrato foi atualizado para produzir DoseSlots reais com data e horario, preservando suas expectativas funcionais. Nao se reduz comportamento valido para satisfazer mocks anteriores.

## R2 FIX1 — Regressões revisadas
- V323: atualização exclusivamente do contrato de texto para conferir a prévia real e a garantia de ausência de tomadas/alterações de estoque. Contagens, duração, eventos resolvidos e autoridade de escrita permanecem testados.
- D4 P5: capitalização da mensagem corrigida na expectativa do contrato; a UI não muda e o teste também reforça que não marca tomadas nem altera estoque.
- Diagnóstico falho original permanece imutável; há prova formal de reuso e dois novos testes no clone equivalente. O pós-gate roda integralmente uma única vez.
