# VAULT M105 — Vínculos e primeira dobra de Medicamentos

- Base: M104 `ef8a08f4d8bb8c8b2f822f0c633abd544721478c`.
- Corrige o risco do último vínculo remoto não refletido: preserva o snapshot local enquanto a relação é consultada e, se o primeiro resultado não contém a associação, realiza uma segunda leitura seletiva antes de projetar a remoção.
- A projeção é isolada por `user_id` e `person_id`; não toca medicamentos sem pessoa, não sobrescreve itens `synced:false` ou com operação pendente e revalida a fila numa transação Dexie.
- Uma exclusão observada em duas consultas sucessivas ainda NÃO é prova de ausência de concorrência remota: sincronização multiaparelho continua sujeita à janela não atômica de delete/insert. A solução definitiva depende de transação RPC/migração coordenada de backend, com homologação real.
- Erros de leitura de relações aparecem nas métricas locais de falha, sem apagar dados.
- Medicamentos: progresso sobe antes dos filtros, ganha maior destaque; ação de registro vem antes da ação contextual; SOS, temporários e sinais de estoque preservados.
- Mais: estado visual de sincronização deixa de chamar uma fila vazia de 'Sincronizado' automaticamente.
- Nenhuma migração, alteração de dados clínicos em massa, alteração no motor de estoque ou no significado das doses.
- Após publicação, validar dois aparelhos: vincular, desconectar, remover último vínculo, voltar offline e sincronizar sem mistura de pessoas. Verificar med list e ações no APK novo.
- O teste hermético não simula Supabase e dois aparelhos reais. Gate completo e Android continuam necessários.
