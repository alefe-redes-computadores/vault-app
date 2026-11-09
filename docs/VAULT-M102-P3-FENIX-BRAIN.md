# M102 P3 — Fênix + Brain rastreáveis, sem sobrepor autoridades

Base: `08c020788df14e62705a513324c1a7118090d8db`.

A nova explicação aparece **somente dentro** de “Contexto e evidências do Avatar” e, lá dentro, em disclosure recolhido. Ela separa a próxima ação operacional projetada pela Fênix do alerta independente do Brain V5. Isso não transforma proximidade visual em relação de causa, prontuário, diagnóstico ou alta prioridade. Alerta do Brain nunca é suprimido por decisão da Fênix. A própria central do Brain conserva suas prioridades e evidências.

**Autoridades explicitadas:** `recorded` = registro operacional existente; `projected` = previsão; `association` = associação sem causalidade; `missing_data` = dado a conferir. O número de evidências é de itens referenciados, não número de exames, doses nem certeza clínica. Os links abrem apenas rotas locais sanitizadas.

**Privacidade:** usa apenas `HealthInsightContext` recebido do motor compartilhado e `BrainV5Alert` já carregado, exige correspondência `userId` com `context.userId` e `personId` com `alert.person_id`. Não faz Dexie, Supabase, fetch, telemetria, gravação ou novas permissões. Nenhuma métrica de saúde altera o rosto nem o estado clínico.

**Revisão voluntária M102 P1:** sua preferência de 24/48h é recalculada ao voltar ao foco, visibilidade e em outra aba. Sem temporizador em background e sem push Android; continua associada à mesma conta, pessoa e episódio, validando o estado de alerta e expiração. O usuário continua podendo cancelar. Não grava sintomas ou decisões clínicas no localStorage.

**Gates:** TypeScript global primeiro; prova comportamental isolada P3; P1/P2, contratos da Fênix, Brain V5 e V112, global `npm run test:release`; `git diff --check`; escopo permitido exato 7 arquivos; backup apenas dos 3 existentes, rollback antes do commit; após commit aprovado, `publicar.sh` valida escopo e base remota para recuperar apenas o push. Não se declara homologação no APK sem teste físico.
