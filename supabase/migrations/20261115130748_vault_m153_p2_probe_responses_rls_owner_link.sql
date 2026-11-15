-- M153 P2 - HISTORICO CANONICO: versao 20261115130748.
-- Aplicada no Supabase de producao via migracao controlada em 15/11/2026.
-- Nao executar manualmente de novo. Sem insercao, alteracao ou exclusao de dados clinicos.
-- Bloqueia se o ambiente nao tiver a policy antiga exata.
do $precheck$
begin
 if not exists (
   select 1 from pg_policies
   where schemaname='public'
     and tablename='brain_active_probe_responses'
     and policyname='brain_active_probe_responses_owner'
     and with_check like '%q.person_id = q.person_id%'
 ) then raise exception 'M153 P2 blocked: expected legacy RLS predicate was not found';
 end if;
 if exists (
   select 1 from public.brain_active_probe_responses r
   join public.brain_active_probes q on q.id=r.probe_id
   where r.person_id is distinct from q.person_id
      or r.user_id is distinct from q.user_id
 ) then raise exception 'M153 P2 blocked: mismatched response ownership in existing data';
 end if;
 if not exists (
   select 1 from pg_class c join pg_namespace n on c.relnamespace=n.oid
   where n.nspname='public' and c.relname='brain_active_probe_responses' and c.relrowsecurity
 ) then raise exception 'M153 P2 blocked: RLS not enabled';
 end if;
end
$precheck$;

drop policy "brain_active_probe_responses_owner" on public.brain_active_probe_responses;
create policy "brain_active_probe_responses_owner"
on public.brain_active_probe_responses
for all to authenticated
using (
 (select auth.uid()) = user_id
 and exists (
  select 1 from public.persons p
  where p.id = brain_active_probe_responses.person_id
    and p.user_id = (select auth.uid())
 )
 and exists (
  select 1 from public.brain_active_probes q
  where q.id = brain_active_probe_responses.probe_id
    and q.user_id = (select auth.uid())
    and q.person_id = brain_active_probe_responses.person_id
 )
)
with check (
 (select auth.uid()) = user_id
 and exists (
  select 1 from public.persons p
  where p.id = brain_active_probe_responses.person_id
    and p.user_id = (select auth.uid())
 )
 and exists (
  select 1 from public.brain_active_probes q
  where q.id = brain_active_probe_responses.probe_id
    and q.user_id = (select auth.uid())
    and q.person_id = brain_active_probe_responses.person_id
 )
);
