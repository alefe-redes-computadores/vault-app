# VAULT M99 — Alarmes Android e continuidade do roadmap 360

Base verificada: M98, commit `47da21bdd745b39574180753f5fcc97a9e9b668d`.
Caderno anterior: `docs/VAULT-360-PESQUISA-2026-11-08.md`.

## M99 P1 — esta cirurgia

- Modos **Suave** (1 aviso), **Reforçado** (até 2) e **Persistente** (até 4) para doses pendentes.
- Configuração local *por pessoa*, desligada do sincronismo clínico. O padrão **Suave** reproduz o número de tentativas anterior. O modo persistente NÃO é toque sonoro indefinido, NÃO contorna silêncio/Doze e não garante disparo exato.
- Reusa `lib/overdue-dose-notifications.ts` e os identificadores canônicos de slot (pessoa, medicamento, data, horário), sem criar dose, excluir log ou alterar estoque.
- Não cancela avisos pendentes de outra pessoa durante a reconciliação da ativa.
- Mantém teto de 80 lembretes por pessoa neste reconciliador, com prioridade aos disparos mais próximos.
- A central existente mostra a permissão para notificar, a permissão especial de alarmes exatos, a quantidade de lembretes futuros e um ensaio explícito para 15 segundos. Esse ensaio não escreve no histórico clínico. Contar alarmes pendentes não comprova que tocaram.
- A compilação Android gerada em CI passa a declarar apenas `SCHEDULE_EXACT_ALARM` (permite solicitação especial ao usuário). Não habilita full-screen intents nem `USE_EXACT_ALARM` automaticamente.

## Gate de aceite que NÃO pode ser afirmado por teste hermético

1. Compilar e instalar APK atualizado e conferir assinatura preservada.
2. Com a pessoa correta ativa: verificar permissões de notificações, acesso especial a alarmes exatos e canal do Vault.
3. Enviar aviso de teste, bloquear a tela, comparar hora prevista x hora real, testar bateria otimizada e modo silencioso.
4. Testar aparelho reiniciado, mudança de fuso, data manual, restauração das preferências e retorno ao app.
5. Com medicação agendada e doses reais de teste não clínicas: conferir que o modo Suave mantém 1 aviso, Reforçado até 2, Persistente até 4; registrar tomada/ignorada e conferir remoção dos futuros, com segunda pessoa isolada.
6. Confirmar que o PWA não se apresenta como confiável com o navegador fechado.
7. Não publicar promessa de 'alarme persistente garantido' sem prova real no dispositivo.

## Limites conhecidos e próximo avanço

- O P1 reforça **aviso de dose pendente**, não o toque/tempo exato nativo, não implementa tela cheia, não oferece novo botão 'Adiar' e ainda não possui regra por medicamento.
- Próxima etapa M99 P2: adiar sem marcar tomada, ações atômicas com ownership/slot e garantias de segurança, diagnóstico de reboot/timezone/canal e testes Android físico.
- M100: UX de familiares/dependentes + ampliação opcional Health Connect (com isolamento/consentimento, sem compartilhar dados remotamente por padrão).
- M101/M102: Avatar Fênix, Brain e acompanhamento longitudinal; M103: auditoria global, LGPD, comercial e estabilidade.

**Proteções invariantes:** ausência de registro não prova esquecimento; abrir notificação não confirma tomada; 'Ignorar' é diferente de 'Tomar'; nenhum dado de saúde é enviado a terceiros automaticamente; ações de outro perfil são recusadas; nenhum alerta crítico fica atrás de paywall.
