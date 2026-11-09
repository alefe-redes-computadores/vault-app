# VAULT M99 P2 — Retomada e pausa segura (Android)

## Escopo executado
- Alarmes normais de horário: trocar a pessoa ativa substitui a agenda anterior, conforme V226. Pausas e reforços de atraso continuam separados por pessoa.
- Atrasos: opção local de pausar **apenas reforços repetidos** por 15, 30, 60 ou 120 minutos. O primeiro alarme de dose, o horário prescrito e o DoseLog não são afetados. Pausa expira sem criar estado clínico.
- Retomada: janela em primeiro plano, `pageshow`, `visibilitychange` e `Capacitor App.appStateChange` solicitam reconciliação canônica do horizonte. Não cria um segundo scheduler.
- O acesso ao histórico, à pessoa e à confirmação continuam exigindo autenticação normal do app; nenhuma informação clínica é enviada a serviços externos.

## Limitações de homologação
- Alarmes Android sob Doze/standby/bateria restrita e após reboot só podem ser validados em um APK real no aparelho. O replanejamento após `appStateChange` ocorre **quando o app volta ao primeiro plano**, não é execução de rotina no background.
- A pausa não é uma ação `Adiar dose` na notificação e não afeta o agendamento primário. Adiar apenas o próximo horário é uma etapa futura e exige reconciliação nativa e auditoria de slots.
- Painel diagnóstico mostra agendamentos e permissões, jamais confirma entrega física de um alerta.

## Gates
- O teste novo é totalmente hermético e valida a pausa, a expiração, o isolamento de pessoa e cancelamento ao confirmar tomada, além de sintaxe dos componentes.
- O instalador exige HEAD exato da M99 P1, repositório rastreado limpo, hash do pacote e execução integral de `npm run test:release` (que já inclui TypeScript).
- Backup seletivo/rollback sem `git add -A`; push somente após gates e confirmação de que remoto permanece na base.
