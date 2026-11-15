-- VAULT M153 P1 - REVISAO MANUAL. NAO EXECUTAR AUTOMATICAMENTE.
-- Corrige a auto-comparacao q.person_id = q.person_id na policy compilada.
-- NAO insere/atualiza registros clinicos. Revisar e aplicar com autorizacao separada.
begin;
drop policy if exists "brain_active_probe_responses_owner" on public.brain_active_probe_responses;
create policy "brain_active_probe_responses_owner"
on public.brain_active_probe_responses for all to authenticated
using (
  auth.uid() = user_id
  and exists (select 1 from public.persons p where p.id = brain_active_probe_responses.person_id and p.user_id = auth.uid())
  and exists (select 1 from public.brain_active_probes q where q.id = brain_active_probe_responses.probe_id and q.user_id = auth.uid() and q.person_id = brain_active_probe_responses.person_id)
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.persons p where p.id = brain_active_probe_responses.person_id and p.user_id = auth.uid())
  and exists (select 1 from public.brain_active_probes q where q.id = brain_active_probe_responses.probe_id and q.user_id = auth.uid() and q.person_id = brain_active_probe_responses.person_id)
);
commit;
-- Inspecionar pg_policies depois; transacao nao valida comportamento sob JWT de duas pessoas.
