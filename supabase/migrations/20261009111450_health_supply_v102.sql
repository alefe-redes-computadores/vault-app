-- V102: expansão aditiva, sem inferir origem ou autorização dos dados legados.
begin;
create unique index if not exists persons_supply_scope on public.persons(id,user_id);
create unique index if not exists medicamentos_supply_scope on public.medicamentos(id,user_id,person_id);
create unique index if not exists documents_supply_scope on public.documents(id,user_id,person_id);
create unique index if not exists medicos_supply_scope on public.medicos(id,user_id);
create unique index if not exists farmacias_supply_scope on public.farmacias(id,user_id);
create unique index if not exists locais_supply_scope on public.locais(id,user_id);
create unique index if not exists retiradas_supply_scope on public.retiradas(id,user_id,person_id);
create table if not exists public.fornecimentos (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null, titulo text not null check(length(trim(titulo))>0),
  origem text not null check(origem in ('comprado','municipal','estadual_ceaf','outro')),
  status text not null check(status in ('ativo','encerrado')),
  farmacia_id uuid, medico_id uuid, local_id uuid, protocolo text,
  renovacao_meses integer check(renovacao_meses between 1 and 24),
  antecedencia_dias integer not null default 30 check(antecedencia_dias between 0 and 180),
  receita_cada_retirada boolean not null default false, observacoes text,
  created_at timestamptz not null, updated_at timestamptz not null,
  unique(id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  foreign key(farmacia_id,user_id) references public.farmacias(id,user_id),
  foreign key(medico_id,user_id) references public.medicos(id,user_id),
  foreign key(local_id,user_id) references public.locais(id,user_id)
);
create table if not exists public.fornecimento_ciclos (
  id uuid primary key, user_id uuid not null, person_id uuid not null, processo_id uuid not null,
  status text not null check(status in ('preparando','protocolado','autorizado','encerrado')),
  inicio date, fim date, protocolado_em timestamptz, autorizado_em timestamptz, observacoes text,
  created_at timestamptz not null, updated_at timestamptz not null,
  unique(id,processo_id,user_id,person_id),
  foreign key(processo_id,user_id,person_id) references public.fornecimentos(id,user_id,person_id) on delete cascade,
  check(fim is null or inicio is null or fim>=inicio),
  check(status<>'autorizado' or (inicio is not null and fim is not null and autorizado_em is not null))
);
create table if not exists public.fornecimento_itens (
  id uuid primary key, user_id uuid not null, person_id uuid not null, processo_id uuid not null,
  ciclo_id uuid not null, medicamento_id uuid not null, dosagem text not null check(length(trim(dosagem))>0),
  quantidade_mensal numeric check(quantidade_mensal>0),
  created_at timestamptz not null, updated_at timestamptz not null,
  unique(ciclo_id,medicamento_id,user_id,person_id),
  foreign key(ciclo_id,processo_id,user_id,person_id) references public.fornecimento_ciclos(id,processo_id,user_id,person_id) on delete cascade,
  foreign key(medicamento_id,user_id,person_id) references public.medicamentos(id,user_id,person_id) on delete cascade
);
create table if not exists public.fornecimento_documentos (
  id uuid primary key, user_id uuid not null, person_id uuid not null, processo_id uuid not null,
  ciclo_id uuid not null, document_id uuid not null, retirada_id uuid,
  tipo text not null check(tipo in ('lme','receita','formulario','comprovante','decisao')),
  estado text not null check(estado in ('preenchido','entregue')), entregue_em timestamptz,
  created_at timestamptz not null, updated_at timestamptz not null,
  foreign key(ciclo_id,processo_id,user_id,person_id) references public.fornecimento_ciclos(id,processo_id,user_id,person_id) on delete cascade,
  foreign key(document_id,user_id,person_id) references public.documents(id,user_id,person_id) on delete cascade,
  foreign key(retirada_id,user_id,person_id) references public.retiradas(id,user_id,person_id) on delete cascade,
  check(estado<>'entregue' or entregue_em is not null)
);
alter table public.retiradas add column if not exists fornecimento_id uuid;
alter table public.retiradas add column if not exists fornecimento_ciclo_id uuid;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='retiradas_supply_cycle_fk' and conrelid='public.retiradas'::regclass) then
    alter table public.retiradas add constraint retiradas_supply_cycle_fk foreign key(fornecimento_ciclo_id,fornecimento_id,user_id,person_id) references public.fornecimento_ciclos(id,processo_id,user_id,person_id);
    alter table public.retiradas add constraint retiradas_supply_item_fk foreign key(fornecimento_ciclo_id,medicamento_id,user_id,person_id) references public.fornecimento_itens(ciclo_id,medicamento_id,user_id,person_id);
    alter table public.retiradas add constraint retiradas_supply_pair check((fornecimento_id is null)=(fornecimento_ciclo_id is null));
  end if;
end $$;
create index if not exists retiradas_supply_process on public.retiradas(fornecimento_id);
create index if not exists fornecimento_itens_med_scope on public.fornecimento_itens(medicamento_id,user_id,person_id);
create index if not exists fornecimento_doc_document on public.fornecimento_documentos(document_id);
create index if not exists fornecimento_doc_ret on public.fornecimento_documentos(retirada_id);
create index if not exists fornecimento_process_farmacia on public.fornecimentos(farmacia_id);
create index if not exists fornecimento_process_medico on public.fornecimentos(medico_id);
create index if not exists fornecimento_process_local on public.fornecimentos(local_id);
do $$ declare t text; begin
  foreach t in array array['fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create index if not exists %I on public.%I(user_id,person_id,updated_at)',t||'_scope_updated',t);
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='supply_owner') then
      execute format('create policy supply_owner on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
    end if;
    if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
create index if not exists fornecimento_ciclo_parent on public.fornecimento_ciclos(processo_id,user_id,person_id);
create index if not exists fornecimento_item_parent on public.fornecimento_itens(ciclo_id,processo_id,user_id,person_id);
create index if not exists fornecimento_doc_parent on public.fornecimento_documentos(ciclo_id,processo_id,user_id,person_id);
commit;
