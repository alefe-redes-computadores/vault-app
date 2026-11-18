# VAULT CI360 — P6 P3-B | Retiradas e documentação: estado operacional

Base exigida: CI360 P6 P3-A publicada `ec21d6a0443e3d2d755fe70eacd47397028ca6d2`.

## Fatos identificados no código publicado

1. O painel Retiradas contava e filtrava `status === 'agendada'`, mesmo com `realizada_em`/`renovacao_realizada_id` vinculados, ou com um evento concluído de mesmo titular, medicamento, ciclo **e** dia. Essas linhas apareciam indevidamente como atrasadas e podiam entrar no planejador de reagendamento. A autoridade `isOpenWithdrawal` já evita usar o status antigo como conclusão canônica; a P3-B consolida uma **projeção de leitura**, sem escrever no banco.
2. O pull de documentos registrava falha da API, mas reempacotava a resposta com `error: null`, deixando o diagnóstico da tabela indicar sucesso. O processador genérico não apaga documentos se a lista remota vier vazia; a falha comprovada era **falso sucesso e importação parcial**, não exclusão. A P3-B corrige a classificação do erro e bloqueia reconciliação parcial nessa rodada.

## Proteções

- Nunca muda `retiradas.status`, `realizada_em`, `renovacao_realizada_id`, `fornecimento_ciclo_id`, registros de receitas ou estoque.
- Não assume que saldo físico 25 confirma ou encerra retirada de Metadona 10 mg; caso real ainda depende dos IDs e provas no dispositivo.
- Uma retirada futura de outro ciclo ou data continua aberta, ainda que exista outra realizada.
- Conflito de mesmo ciclo/dia aparece como **Conferir vínculo**, permanece no histórico, não vira saída de estoque nem entra no reagendamento em lote.
- Retirada `agendada` com evidência própria de conclusão recebe rótulo **Concluída (vínculo)** para não falsificar o status armazenado. Outras inconsistências ficam em **Conferir vínculo**.
- Uma falha de consulta `documents` não pode virar `error:null`; é reportada como leitura incompleta. RLS/offline/ausência de documento devem ser investigados separadamente.
- Nenhum banco/migração novo, nenhum Supabase alterado, nenhuma publicação automática, nenhum push sem gates.

## Aceite

V63 completo + V70 + TypeScript + diff; testes puros de estado por ciclo, data, pessoa e titular, cancelamento, confirmação, lote, falha da leitura parcial/ausente e truncamento. Homologação Android / dois dispositivos ainda necessária. O relatório mestre C01–C20 continua em aberto onde não existe prova real.
