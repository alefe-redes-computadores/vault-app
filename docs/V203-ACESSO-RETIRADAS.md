# V203 — acesso contextual e reagendamento

Base: V202 1fa9153. V201/V202 preservadas. O Avatar representa a pessoa ativa; cosméticos não alteram dados clínicos. Melhorias visuais incrementais devem acompanhar as cirurgias gerais.

## Entregue

- Ação da listagem distingue Receita, Retirada e Reposição. Estoque e SUS abrem o contexto do medicamento, onde aquisição e fornecimento permanecem separados.
- SOS com estoque, sem tratamento vinculado e lembrete automático não gera renovação recorrente apenas pela data antiga. Planejamento explícito de lembrete e contexto de tratamento são preservados. Retirada SUS próxima continua visível.
- Nenhuma classificação regulatória foi alterada. Comprar sem apresentação de receita não comprova dispensa legal; documentos do SUS são exigências do serviço, separadas da classificação regulatória.
- Reagendamento centralizado no repositório: histórico cumulativo, proteção contra edição concorrente, atualização da data espelhada somente quando ela corresponde à retirada alterada, transação com fila de sincronização. Nenhuma movimentação de estoque.
- Reconciliação de aquisição não ressuscita retiradas encerradas nem desfaz reagendamento explícito.
- Motivos rápidos no detalhe da retirada. Solicitação de receita não é automaticamente a data de retirada.
- Avisos de estoque respeitam SOS e origem pública; diagnóstico usa índice user_id quando disponível, com fallback restrito ao usuário.
- Tênis do Avatar: suavização de cabedal e calcanhar sem novas malhas ou loops.
- Testes V201/V202 registrados no gate; V203 testa repositório real com IndexedDB simulado, rollback, isolamento e política contextual.

## Limites e validação manual

Não houve validação visual em APK/Android nesta execução. Conferir lista em 320 px, motivos de reagendamento, enquadramentos Corpo/Rosto/Tênis, fallback de ilustração e entrega de lembretes após reagendar. A cobertura automatizada não comprova entrega nativa.

Reagendamento em lote disponível na listagem, respeitando filtros e pessoa ativa: seleção explícita, prévia de cada data, motivo, confirmação única e transação atômica. Alteração concorrente ou item de outra pessoa bloqueia todo o lote. Horários são preservados e reenvio para a mesma data não duplica histórico. Não foi criado calendário separado de solicitação de receita. A data original da aquisição permanece histórica.

Não foi alterada a autoridade de estoque, dose logs, schemas remotos ou classificação regulatória. O instalador não executa commit, push ou deploy.
