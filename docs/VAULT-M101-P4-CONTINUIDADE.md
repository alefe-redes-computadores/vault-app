# VAULT M101 P4 — Qualidade e continuidade da Saúde Conectada

## Finalidade

Distinguir explicitamente cinco estados que antes podiam ser confundidos: acesso Android não verificável; permissão negada; indicador não suportado pelo APK; indicador autorizado sem registros; registro importado, mas antigo. Nenhum deles autoriza concluir que um sensor falhou, que uma pessoa teve um valor fisiológico zero ou que o acompanhamento clínico está completo.

## Segurança

- Continua somente leitura do Health Connect. Sem alteração nas permissões nativas, escrita no Android ou sincronização de novas classes clínicas.
- A projeção M101 P1 já confere `user_id`, `person_id`, `source=health_connect`, origem Samsung e deduplicação. P4 só recebe esse resumo e o vínculo comprovado da mesma conta/pessoa.
- APK antigo pode não declarar suporte a HRV RMSSD; o estado é "Requer APK atualizado", não "Permissão negada". O restante dos indicadores continua sincronizando.
- A verificação de autorização após uma leitura é feita apenas sobre tipos realmente enviados ao plugin, não sobre tipos incompatíveis eliminados antes da leitura.
- Nenhuma criação de zero ou estimativa de dias em branco. "Dias sem registro" significa **ausência documental**, não ausência biológica.
- `last_attempt_at`/`last_synced` são instantes de **tentativa/importação**, não de leitura física do relógio ou anel.

## UX

- Um único disclosure dentro de "Cobertura real das medições"; continua sem consultas extras no Dexie.
- Cada indicador mostra a justificativa de seu estado, 7 e 28 dias observados e a última data documental.
- Última tentativa, última importação e resumo de continuidade são mostrados separadamente, sem dados sensíveis no relatório estático.

## Gates e limitações

Prova hermética do P4 + suites P3/P2/P1/M100/V113/V111/V112 + TypeScript + release gate. Homologação real do APK (Kotlin, Samsung Health, permissões revogadas, passos, HRV, wearables e sincronização móvel) continua necessária. Não afirmar que a integração real foi comprovada pelos testes estáticos.
