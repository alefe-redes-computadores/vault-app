-- supabase/migrations/20260909_create_retiradas.sql

create table if not exists public.retiradas (
  id uuid primary key,
  user_id uuid not null,
  person_id uuid not null,
  medicamento_id uuid not null,
  renovacao_origem_id uuid null,
  renovacao_realizada_id uuid null,
  medico_id uuid null,
  farmacia_id uuid null,
  hospital_id uuid null,
  local_id uuid null,
  medicamento_nome text null,
  medicamento_dosagem text null,
  data date not null,
  horario time null,
  tipo text not null default 'sus',
  status text not null default 'agendada',
  quantidade_prevista numeric null,
  quantidade_retirada numeric null,
  exige_nova_receita boolean not null default false,
  observacoes text null,
  realizada_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retiradas_tipo_check check(tipo in('sus','farmacia','outro')),
  constraint retiradas_status_check check(status in('agendada','realizada','cancelada','nao_realizada')),
  constraint retiradas_qp_check check(quantidade_prevista is null or quantidade_prevista>=0),
  constraint retiradas_qr_check check(quantidade_retirada is null or quantidade_retirada>=0)
);

create index if not exists retiradas_user_idx on public.retiradas(user_id);
create index if not exists retiradas_person_data_idx on public.retiradas(person_id,data);
create index if not exists retiradas_medicamento_idx on public.retiradas(medicamento_id);

create unique index if not exists retiradas_origem_unique_idx
  on public.retiradas(renovacao_origem_id)
  where renovacao_origem_id is not null;

alter table public.retiradas enable row level security;

drop policy if exists retiradas_select_own on public.retiradas;
create policy retiradas_select_own
  on public.retiradas
  for select
  to authenticated
  using(auth.uid()=user_id);

drop policy if exists retiradas_insert_own on public.retiradas;
create policy retiradas_insert_own
  on public.retiradas
  for insert
  to authenticated
  with check(auth.uid()=user_id);

drop policy if exists retiradas_update_own on public.retiradas;
create policy retiradas_update_own
  on public.retiradas
  for update
  to authenticated
  using(auth.uid()=user_id)
  with check(auth.uid()=user_id);

drop policy if exists retiradas_delete_own on public.retiradas;
create policy retiradas_delete_own
  on public.retiradas
  for delete
  to authenticated
  using(auth.uid()=user_id);

insert into public.retiradas(
  id,
  user_id,
  person_id,
  medicamento_id,
  medicamento_nome,
  medicamento_dosagem,
  medico_id,
  farmacia_id,
  hospital_id,
  local_id,
  data,
  tipo,
  status
)
select
  gen_random_uuid(),
  m.user_id,
  m.person_id,
  m.id,
  m.nome,
  m.dosagem,
  m.medico_id,
  m.farmacia_id,
  m.hospital_id,
  m.local_id,
  m.data_retorno_sus::date,
  'sus',
  'agendada'
from public.medicamentos m
where m.person_id is not null
  and m.data_retorno_sus is not null
  and not exists(
    select 1
    from public.retiradas r
    where r.person_id=m.person_id
      and r.medicamento_id=m.id
      and r.data=m.data_retorno_sus::date
      and r.status='agendada'
  );

comment on table public.retiradas is
  'Compromissos de retirada/obtenção de medicamentos, separados do histórico de renovação/aquisição.';
