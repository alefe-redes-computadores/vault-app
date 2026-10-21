# V206 — Hoje contextual e leitura indexada

A tela Hoje passa a consultar somente os dados da conta e da pessoa ativas. Médicos, farmácias, hospitais, tratamentos e renovações usam o índice composto `[user_id+person_id]`; consultas, cirurgias, exames e registros de saúde do dia usam `[user_id+person_id+data]`.

O resultado de cada leitura transporta `userId`, `personId` e, na agenda, a data consultada. A interface só libera os dados quando essas chaves ainda correspondem ao contexto atual. Isso evita que o resultado assíncrono da pessoa anterior apareça brevemente durante uma troca de perfil ou de dia.

O histórico de doses também deixa de consultar apenas por `person_id`: agora usa conta + pessoa e a mesma proteção contra resultados atrasados. O agrupamento por horário, as ações em lote e as regras de dose antecipada, atrasada, SOS e histórica permanecem sob a autoridade existente.

A versão 44 do IndexedDB adiciona somente índices. O contrato V206 abre uma base V43 com registros atuais, de outras pessoas, de outros usuários e legados; migra para V44; confirma que nenhum registro foi perdido; e prova o isolamento das consultas por proprietário e dia.

O release gate executa o contrato V206 antes da suíte histórica e do TypeScript.
