begin;
create table if not exists public.health_reminders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text,
  target_type text not null check (length(trim(target_type)) > 0),
  target_route text not null check (target_route like '/%'),
  time time not null,
  frequency text not null check (frequency in ('daily','weekly','custom')),
  weekdays smallint[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists health_reminders_user_person_idx on public.health_reminders(user_id, person_id);
alter table public.health_reminders enable row level security;
drop policy if exists health_reminders_owner_all on public.health_reminders;
create policy health_reminders_owner_all on public.health_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists(select 1 from public.persons p where p.id=person_id and p.user_id=auth.uid()));
commit;
