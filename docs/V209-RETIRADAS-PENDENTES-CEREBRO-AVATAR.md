# Vault V209 — retiradas pendentes, Cérebro e Avatar

## Correção operacional

- Retirada `agendada` não desaparece quando a data passa.
- Hoje mostra retiradas vencidas junto aos compromissos atuais, com idade explícita.
- Home mantém o compromisso no topo até conclusão, reagendamento, cancelamento ou marcação como não realizada.
- Datas históricas continuam exatas e não duplicam pendências.

## Integridade e performance

- Leituras de retiradas agora usam o índice composto `[user_id+person_id]`.
- O hook exige simultaneamente conta autenticada e pessoa ativa.
- O Cérebro considera na agenda somente retiradas realmente abertas; registros encerrados não geram ruído tardio.

## Avatar

- A prévia compacta funciona como retrato e permanece de frente.
- Giro continua disponível na inspeção completa, com controles visíveis.
- Não foi adicionado loop contínuo de renderização.
