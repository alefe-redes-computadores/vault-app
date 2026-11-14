begin;
create table if not exists public.brain_active_probes (
 id text primary key, schema_version integer not null default 1, user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.persons(id) on delete restrict,
 medication_id uuid null references public.medicamentos(id) on delete set null,
 acquisition_id uuid null references public.renovacoes(id) on delete set null,
 event_date date not null, trigger_id text not null, trigger_type text not null,
 question_key text not null, question_version integer not null default 1,
 due_at timestamptz not null, expires_at timestamptz not null, status text not null,
 idempotency_key text not null unique, consent_version integer not null default 1,
 snoozed_until timestamptz null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint brain_active_probe_status check(status in('scheduled','eligible','shown','answered','dismissed','snoozed','expired','cancelled')),
 constraint brain_active_probe_trigger check(trigger_type in('manufacturer_lot_started','confirmed_sos_use','temporary_course_ended','axis_shift_eligible'))
);
create table if not exists public.brain_active_probe_responses (
 id text primary key, probe_id text not null unique references public.brain_active_probes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.persons(id) on delete restrict,
 option_key text not null, note text null check(char_length(note)<=500), answered_at timestamptz not null,
 source text not null default 'user' check(source='user'), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists brain_active_probes_owner_due_idx on public.brain_active_probes(user_id,person_id,status,due_at);
create index if not exists brain_active_probe_responses_owner_idx on public.brain_active_probe_responses(user_id,person_id,answered_at desc);
alter table public.brain_active_probes enable row level security;
alter table public.brain_active_probe_responses enable row level security;
drop policy if exists "brain_active_probes_owner" on public.brain_active_probes;
create policy "brain_active_probes_owner" on public.brain_active_probes for all using(auth.uid()=user_id) with check(auth.uid()=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=auth.uid()));
drop policy if exists "brain_active_probe_responses_owner" on public.brain_active_probe_responses;
create policy "brain_active_probe_responses_owner" on public.brain_active_probe_responses for all using(auth.uid()=user_id) with check(auth.uid()=user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=auth.uid()) and exists(select 1 from public.brain_active_probes q where q.id=probe_id and q.user_id=auth.uid() and q.person_id=person_id));
grant select,insert,update,delete on public.brain_active_probes to authenticated;
grant select,insert,update,delete on public.brain_active_probe_responses to authenticated;
commit;
