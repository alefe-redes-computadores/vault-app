VAULT M103 P2 — Ações Android de doses seguras e isolamento dos diagnósticos
Base GitHub obrigatória: 5612502fc9380eb029e8a08a801f1eda38a3eef8

Mudanças:
- Ações rápidas TOMEI/IGNORAR exigem data exata e horário válido, dentro de janela local (-10min/+48h).
- Notificação legada pode abrir a página Hoje, mas NÃO grava horário calculado sem evidência.
- Repositório canônico rejeita tentativa de regravar dose tomada/ignorada (onlyIfPending), sem tocar no motor.
- Consultas nativas de permissão/agendamento são protegidas contra resposta fora de ordem quando a pessoa muda.
- Interface de diagnóstico esclarece que agendamento não comprova entrega.
- Nenhuma alteração de banco, Supabase, alarmes persistentes, Sync, notificações criadas ou políticas de dose.

Gates: TypeScript, testes M103 P2, V51, V43.2, M99 P3, V277, V287, V284, M103 P1,
gate global npm run test:release, allowlist 7 arquivos, diff check, commit+push somente aprovados.
Homologar em APK real ações de notificações, troca rápida de pessoa e alarmes exatos.
