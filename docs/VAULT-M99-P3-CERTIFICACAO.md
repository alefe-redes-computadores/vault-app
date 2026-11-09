# M99 P3 — Adiamento individual e certificado de segurança

## Produto
- Ação opt-in **Lembrar em 10 min** no APK para alarmes *individuais* de dose programada, planejada ou atraso legado. Não há botão de adiamento em grupos: ninguém confirma ou adia várias medicações acidentalmente.
- Antes de adiar, verifica sessão atual, dono da pessoa e do medicamento, data e horário reais, validade temporal do slot, estado canônico das doses, permissões e preferência global.
- Um aviso de acompanhamento usa ID estável, sem quantidade, nome de medicamento ou diagnóstico no texto de notificação da tela bloqueada. O app não cria DoseLog, não altera estoque, não altera prescrição e não diz que houve ingestão.
- Adiamento de slot registrado apenas na preferência **local** do dispositivo (10 minutos) para evitar reforços adicionais daquele slot; um grupo que contenha outros medicamentos não é cancelado.
- Próxima reconciliação V91 verifica expiração, mudança de conta/pessoa, remoção de medicamento, desativação das doses e tomada/ignorância canônicas; remove avisos obsoletos sem inventar marcações.
- Diagnóstico Android mostra quantos adiamentos estão agendados e o próximo horário, sem revelar medicamentos.

## Limites importantes
- Os botões de notificação só são entregues no APK, quando o Android e o bridge Capacitor os disponibilizam; não são parte do PWA.
- O Android 14+ pode atrasar alarmes por energia ou permissões; não se afirma precisão exata, toque contínuo ou entrega garantida com tela apagada.
- Uma notificação agrupada pré-existente contendo outros medicamentos não é cancelada pelo adiamento de um slot, por segurança. O próximo rescan recompõe o grupo de acordo com os registros.
- O clique de um aviso antigo, com conta diferente, horário inválido, slot resolvido ou data fora da janela é rejeitado sem registrar tomada.
- **Homologação física pendente:** instalar APK gerado pela GitHub Action, verificar gesto de adiar, reinstalação, bloqueio de tela, permissões, reinício, alteração de fuso, aparelho sem internet e troca de usuário.

## Portões de regressão
- M66, V91, V226, M99 P1/P2/P3 e gate histórico completo + TypeScript; não modifica os testes antigos.
- O instalador aborta em qualquer falha, faz rollback dos caminhos alterados, não usa `git add -A` e só publica após aprovação total.
