# V204 — inteligência de acesso, lembretes e Avatar

Base operacional: V203 aprovada pelo usuário. Esta cirurgia não altera classificação regulatória, prescrição, dose, estoque ou histórico clínico automaticamente.

## Política única de ação

Lista, detalhe, notificações e Brain/Home passam a compartilhar o mesmo destino contextual:

- receita planejada → fluxo exclusivo de nova receita;
- fornecimento SUS → agendamento de retirada, onde documentos e serviço podem ser conferidos;
- falta de estoque em uso contínuo particular → aquisição;
- falta de estoque em SOS/esporádico particular → revisão de necessidade no detalhe, sem inventar compra urgente;
- aquisição gratuita não é tratada automaticamente como SUS.

Comprar um medicamento sem apresentação de receita não é usado como prova de dispensa regulatória. Exigência documental do serviço público permanece separada da classificação regulatória do produto.

## Experiência e Brain

- O detalhe deixa de mandar “receita” para novo documento e “retirada” para aquisição.
- A Home deixa de rotular toda oportunidade como “Registrar aquisição”.
- Alertas são deduplicados por medicamento e exibem a ação real: Receita, Retirada, Reposição ou Revisar.
- O cálculo de próxima retirada usa a data local do VAULT, sem depender da formatação regional do navegador.

## Lembretes

Retiradas agendadas sem horário passam a gerar lembretes diários às 09:00 locais, mas a interface da notificação não apresenta esse horário como se tivesse sido informado pelo usuário. Reagendar muda a impressão digital do alarme; a reconciliação substitui os alarmes antigos. Retiradas canceladas ou concluídas removem seus alarmes pendentes.

## Avatar

O volume oval redundante do nariz foi substituído por um plano afunilado conectado à ponte nasal. A mudança reduz o aspecto bulboso de frente e diminui geometria esférica, sem criar animação contínua ou novo loop de renderização.

## Verificação

O contrato V204 executa a política real de rotas, reconcilia lembretes sem horário com mocks do runtime nativo, confirma remoção após cancelamento e protege o renderer sob demanda. TypeScript, release gate e `git diff --check` são obrigatórios no instalador.
