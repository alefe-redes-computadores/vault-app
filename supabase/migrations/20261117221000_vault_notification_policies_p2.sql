-- CI360 M3 P2: owner+person scoped preference records, not clinical events.
-- Apply only after local gates and confirm migration in the right VAULT project.
begin;
create table if not exists public.notification_policies_p2 (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete cascade,
  event_kind text not null check (event_kind in ('consulta','cirurgia','exame','retirada','compra','retorno','checkin')),
  event_id text not null check (length(trim(event_id)) between 1 and 180),
  enabled boolean not null default true,
  offsets integer[] null,
  custom_at text null,
  consent_at timestamptz null,
  checkin_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_policies_p2_unique unique(user_id,person_id,event_kind,event_id),
  constraint notification_policies_p2_offsets check (offsets is null or (
    cardinality(offsets)<=4 and array_position(offsets,null) is null and offsets <@ array[10080,2880,1440,180,60,30,15,0]::integer[])),
  constraint notification_policies_p2_checkin_answers check (jsonb_typeof(checkin_answers)='object')
);
create index if not exists notification_policies_p2_user_person on public.notification_policies_p2(user_id,person_id);
alter table public.notification_policies_p2 enable row level security;
revoke all on public.notification_policies_p2 from anon, authenticated;
grant select,insert,update,delete on public.notification_policies_p2 to authenticated;
drop policy if exists notification_policies_p2_read on public.notification_policies_p2;
create policy notification_policies_p2_read on public.notification_policies_p2 for select to authenticated
 using ((select auth.uid())=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=(select auth.uid())));
drop policy if exists notification_policies_p2_insert on public.notification_policies_p2;
create policy notification_policies_p2_insert on public.notification_policies_p2 for insert to authenticated
 with check ((select auth.uid())=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=(select auth.uid())));
drop policy if exists notification_policies_p2_update on public.notification_policies_p2;
create policy notification_policies_p2_update on public.notification_policies_p2 for update to authenticated
 using ((select auth.uid())=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=(select auth.uid())))
 with check ((select auth.uid())=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=(select auth.uid())));
drop policy if exists notification_policies_p2_delete on public.notification_policies_p2;
create policy notification_policies_p2_delete on public.notification_policies_p2 for delete to authenticated
 using ((select auth.uid())=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=(select auth.uid())));
commit;
