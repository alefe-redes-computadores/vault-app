# VAULT M102 P4 — Revisões voluntárias do Brain, sem perdas entre episódios

**Base exata:** `26590e41f20c7c33519963d8e936d405b1dedd44` (M102 P3).

## Problema corrigido

A M102 P1 guardava somente uma revisão de 24/48h para cada conta/pessoa. Quando o Brain passava a mostrar outro alerta principal, a preferência antiga deixava de ser acessível e um novo agendamento podia substituir seu único slot.

## Contrato da P4

- **Fila local v2:** no máximo oito preferências voluntárias, distintas por fingerprint do alerta + episódio. Não guarda sintomas, título, nome do medicamento nem o ID externo do insight em claro. Fingerprint legado FNV não é encriptação nem controle de acesso.
- **Migração progressiva v1:** somente preferências válidas de alertas presentes no ledger da pessoa atual são recuperadas; sem reescrever ou apagar a preferência v1 durante a simples leitura.
- **Inbox:** apenas episódios não resolvidos, com acesso às evidências já existentes, data da revisão, estado programado/vencido e cancelamento individual. Sem leitura nova do Dexie: reaproveita `brainPulse.records` já carregado na página.
- **Isolamento:** conta autenticada e conta do snapshot `HealthInsightContext` devem coincidir; pessoa deve corresponder ao alerta; collisions de fingerprint não são associadas ao acaso.
- **Sem automação escondida:** revisões são exibidas ao abrir/retomar o VAULT; não há timers, notificações Android, agendamento no servidor, prompt de IA ou mutação de `DoseLog`/estoque/receita.
- **Compatibilidade:** preserva a interface v1 ao lado da fila v2, sem destruir preferências em leituras e sem interferir em Brain V5, Fênix, M102 P1–P3 ou Avatar 3D.

## Limitações

A lista fica apenas no armazenamento deste navegador/APK, não é compartilhada em nuvem. Reinstalar, apagar dados locais ou usar outro dispositivo pode não trazer as revisões. O Brain pode resolver/arquivar um alerta; nesse caso, a revisão antiga não é apresentada como pendência, ainda que o pequeno metadado local permaneça até expirar.

## Gates obrigatórios

`tsc --noEmit` → teste M102 P4 → M102 P3, P2 e P1 → Fênix/Avatar, Brain V5, M4/V173 → `npm run test:release` → `git diff --check` → stage allowlist de oito arquivos → commit/push. No Termux, testes falhos disparam rollback somente destes oito arquivos; rede após commit não desfaz commit aprovado. **Testes isolados não significam homologação funcional no aparelho.**
