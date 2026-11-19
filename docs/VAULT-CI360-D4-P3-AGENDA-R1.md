# VAULT CI360 — D4 P3 R1 | Agenda futura e prévia de lembretes

**Corte:** 19/11/2026. **Autoridade de base requerida:** D4 P2 publicada no commit `5a160ece630c...`, IA 2.0 P2 publicada no commit `bd2be93d4d40...` (ancestral confirmado na preparação; conferir HEAD no Termux).

## Escopo entregue

- Novo motor puro `lib/clinical/course-agenda-preview-d4.ts`: lê exclusivamente DoseLogs canônicos de curso temporário + curso registrado; valida identidade de conta, pessoa, medicamento, origem do período, datas e horários. Lista os 3 próximos horários elegíveis, contagem total até 7 dias e além, atrasos sem decisão, slots já resolvidos. Sinaliza duplicações, conflitos e horários incompatíveis com prescrição registrada em intervalos.
- Novo painel de apresentação `CourseAgendaPreviewD4` embutido **dentro do card de medicamento**, em disclosure recolhível. Não cria rota, hub ou navegação. É **prévia, não prova de agendamento**.
- Lê declarações D4 P2 existentes: se o usuário informou conclusão/interrupção, avisa que possíveis avisos ainda exigem conferência; **não cancela notificações**.
- Integração M59 (loader histórico com mocks fechados) e gate V63 preservando contratos anteriores.

## Não implementado nesta etapa — deliberado

- Não muda `lib/dose-notifications.ts`, `lib/overdue-dose-notifications.ts`, `lib/repositories/doseLogs.ts`, `lib/types.ts`, `lib/db.ts`, tabelas Supabase ou preferências de notificações.
- Não agenda, desagenda, adia nem marca doses. Não supõe que app tem permissão ou alarme exato. Não infere conclusão médica, interrupção prescrita ou adesão.
- Não altera abas, CTA, hubs IA 2.0, Minha Saúde, Hoje, Explorar, Fênix ou PDF.

## Evidência e testes

- `scripts/test-vault-ci360-d4-p3-agenda.cjs` testa seleção por pessoa/conta, data e hora locais, horizonte, limites calendáricos, idempotência de projeção, dose resolvida, conflito, curso por intervalo atravessando meia-noite, histórico D4 P2, UI e gate. Não usa IO clínico real.
- `DIAGNOSTICAR-TUDO.sh` clona o HEAD em pasta descartável, aplica apenas no clone, executa todos contratos V63 individualmente com preloader oficial, extras, `tsc --noEmit` e `git diff --check`, com ZIP de resumo e logs.
- `APLICAR-VALIDAR.sh` exige zero falhas, cria backup seletivo, revalida contratos, aprova localmente sem commit. `PUBLICAR.sh` stage explícito (sem `git add -A`), commit e push normal. Rollback apenas se os hashes coincidirem.

## Homologação real Android pendente

Conferir curso com horários futuros, curso por intervalo cruzando meia-noite, doses tomadas/ignoradas, declaração de interrupção com horários ainda pendentes, troca da pessoa ativa, PWA e APK. Permissão `POST_NOTIFICATIONS` e exatidão de alarmes devem ser auditadas no dispositivo. A prévia **não** confirma pendências reais do Android.

## Próximos passos propostos

D4 P4: homologar agendamentos nativos com `getPending`, checar permissão/categoria, e só então implementar cancelamento seletivo voluntário **de avisos futuros**, preservando DoseLogs e decisões; separar efeitos em dois aparelhos e exigir confirmação explícita.

Referências externas de engenharia: https://developer.android.com/develop/background-work/services/alarms ; https://capacitorjs.com/docs/apis/local-notifications (revalidar contra versão instalada).
