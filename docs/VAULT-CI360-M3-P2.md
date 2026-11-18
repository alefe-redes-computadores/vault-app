# VAULT CI360 — Macro 3 P2 / Notificações Inteligentes & Brain longitudinal

Data de preparação: 17/11/2026. Base mínima publicada: `16ea478a00405164dc9493bf6176ac2e6e0947e4` (M3 P1).

## Autoridade e limites
- Mantém Home/Hoje/Meds/UI360 R3C, M3 P1, Metadona P0, estoque/receitas/documentos, sem escrever nenhum registro clínico a partir de notificações.
- O motor já existente `reconcileVaultNotificationSet` permanece único: deduplica por identidade/fingerprint e faz cancelamento/reagendamento sem disparos extras.
- Dose/medição continuam com seus próprios motores e políticas; não são criados avisos duplicados.
- Configuração `notification_policies_p2` cria apenas intenções explícitas por compromisso, sincronizadas via Dexie, fila offline, Supabase, pull, realtime, RLS de conta+pessoa. Migração SQL é necessária antes de disponibilizar a interface de produção.
- Hora de silêncio é LOCAL a cada aparelho e cada pessoa/conta; NÃO equivale a sincronização da política de compromisso. Eventos silenciados NÃO são remarcados automaticamente nem tidos como executados. Doses têm seus controles independentes.
- Oito famílias operacionais (consultas, cirurgias, exames e retorno, retiradas, aquisições, doses/estoque existente, aferições/lembretes existentes, check-in voluntário), com offsets 7d, 2d, 1d, 3h, 1h, 30m, 15m, no horário; up to 4 por objeto mais instante personalizado.
- Convites pós-consulta D+1/D+3/D+10 apenas opt-in, sem backfill, sem resposta presumida, adiamento voluntário 24h, janela para responder após aviso, limite de 1 convite por pessoa e dia.
- Brain longitudinal: fatos históricos com fonte, conta/pessoa, 7/30/90 dias, sem causalidade automática, diagnóstico, prescrição ou resultados inventados.
- Não garantir notificação em PWA fechado; APK depende de permissão Android, canais e energia. Não afirmar entrega física apenas pelo agendamento.

## Integração física e ordem de deploy — CRÍTICA
1. `APLICAR-VALIDAR.sh` cria worktree isolada e executa todos os contratos em Termux, V70, TypeScript, diff e V63 canônico. Sem commit/push.
2. **Antes de publicar o frontend**: aplicar `supabase/migrations/20261117221000_vault_notification_policies_p2.sql` no projeto **vault-app** correto, conferir RLS/security advisers e tabela/colunas. Alteração aditiva, não remover dados. NÃO aplicar à Finance.
3. `VAULT_M3_P2_SCHEMA_CONFIRMADO=SIM bash PUBLICAR.sh` só após todos os gates e schema remoto verificado (a sessão aprovada mais recente é identificada automaticamente), `main` atual; faz commit/push normal. Se HEAD mudou, candidata é revalidada.
4. Homologar APK/Android em dispositivo real: permission granted/denied, sync offline→online 2 aparelhos/pessoas, cancelamento de notificação por compromisso concluído, silêncio, dedupe, D+1/D+3/D+10, abertura com biometria, telas 320/360/393/430px. Não entregar 100% antes desse teste.

## Guardas clínicos
- Estoque de ~25 comprimidos de Metadona 10mg e retiradas concluídas: nenhuma alteração de dados e nenhum lembrete de retirada concluída; conflitos administrativos mantidos para revisão humana.
- Receita não confirma compra; planejamento não cria movimentação financeira; check-in não confirma consulta nem dose.
- Cada evento possui identificação e proprietário; não cruzar conta/pessoa; dados estrangeiros descartados; nenhuma operação de lote regride dados.
- Não converter ausência de resposta em sintoma, risco ou diagnóstico.

## Cobertura e prova
A bateria `scripts/test-vault-ci360-m3-p2.cjs` cobre políticas determinísticas, isolamento, offsets, silêncio, D+1/D+3/D+10, Brain factual, RLS, integração da fila. O V63 global continua a autoridade de regressão; não alterar testes legados para regredir o produto. O pacote pode bloquear caso o HEAD altere qualquer âncora.

## Próximos passos após a P2
M3 P3: modo profissional Antes/Durante/Depois, dossiê longitudinal completo/A4, anexos originais, revisões de evidência, Fênix Avatar performance e UI Android premium. Depois CI360 P6 P3: homologação real Android, UX, privacidade, offline, PDF e notificações.
