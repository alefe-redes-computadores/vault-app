-- A7/M6 | Surgical clinical journey. Additive, two canonical tables, no legacy row rewrite.
-- One surgery is still public.cirurgias, one hospitalization is still A5.
create table if not exists public.surgery_journey_events_a7 (
 id uuid primary key,
 user_id uuid not null,
 person_id uuid not null,
 cirurgia_id uuid not null,
 stage text not null check (stage in ('pre','procedure','post','return')),
 kind text not null check (kind in ('preparation_note','procedure_note','recovery_note','return_note','correction')),
 source text not null check (source in ('self_report','professional_document','verified_import')),
 occurred_on date,
 title text not null check (char_length(btrim(title)) between 1 and 170),
 description text not null check (char_length(btrim(description)) between 1 and 4000),
 source_professional_id uuid,
 corrects_event_id uuid,
 created_at timestamptz not null,
 updated_at timestamptz not null,
 deleted_at timestamptz,
 constraint a7_event_revision_time check (updated_at>=created_at),
 constraint a7_event_correction_guard check ((kind='correction')=(corrects_event_id is not null)),
 constraint a7_event_stage_guard check (
  kind='correction' or
  (kind='preparation_note' and stage='pre') or
  (kind='procedure_note' and stage='procedure') or
  (kind='recovery_note' and stage='post') or
  (kind='return_note' and stage='return')
 ),
 constraint a7_event_self_guard check (corrects_event_id is null or corrects_event_id<>id),
 constraint a7_event_surgery foreign key(cirurgia_id,user_id,person_id)
  references public.cirurgias(id,user_id,person_id) on delete restrict,
 constraint a7_event_professional foreign key(source_professional_id,user_id)
  references public.medicos(id,user_id) on delete restrict,
 constraint a7_event_scope_unique unique(id,cirurgia_id,user_id,person_id)
);
alter table public.surgery_journey_events_a7
 add constraint a7_event_correction_scope foreign key(corrects_event_id,cirurgia_id,user_id,person_id)
 references public.surgery_journey_events_a7(id,cirurgia_id,user_id,person_id) on delete restrict;
create index if not exists a7_event_owner_surgery on public.surgery_journey_events_a7(user_id,person_id,cirurgia_id,occurred_on desc);
create index if not exists a7_event_correction on public.surgery_journey_events_a7(corrects_event_id) where corrects_event_id is not null;

create table if not exists public.surgery_team_a7 (
 id uuid primary key,
 user_id uuid not null,
 person_id uuid not null,
 cirurgia_id uuid not null,
 professional_id uuid not null,
 role text not null check (char_length(btrim(role)) between 1 and 120),
 source text not null check (source in ('self_report','professional_document','verified_import')),
 note text check (note is null or char_length(note)<=1200),
 created_at timestamptz not null,
 updated_at timestamptz not null,
 deleted_at timestamptz,
 constraint a7_team_revision_time check (updated_at>=created_at),
 constraint a7_team_delete_time check (deleted_at is null or deleted_at>=created_at),
 constraint a7_team_surgery foreign key(cirurgia_id,user_id,person_id)
  references public.cirurgias(id,user_id,person_id) on delete restrict,
 constraint a7_team_professional foreign key(professional_id,user_id)
  references public.medicos(id,user_id) on delete restrict
);
create unique index if not exists a7_team_live_role on public.surgery_team_a7(user_id,person_id,cirurgia_id,professional_id,lower(btrim(role))) where deleted_at is null;
create index if not exists a7_team_owner_surgery on public.surgery_team_a7(user_id,person_id,cirurgia_id,updated_at desc);

create or replace function public.vault_a7_events_immutable() returns trigger language plpgsql security invoker
set search_path=public as $$begin
 raise exception 'A7: fatos históricos só podem ser corrigidos por novo registro';
end;$$;
drop trigger if exists vault_a7_events_immutable on public.surgery_journey_events_a7;
create trigger vault_a7_events_immutable before update or delete on public.surgery_journey_events_a7
for each row execute function public.vault_a7_events_immutable();

create or replace function public.vault_a7_team_tombstone_only() returns trigger language plpgsql security invoker
set search_path=public as $$begin
 if tg_op='DELETE' then raise exception 'A7: apagar vínculo físico é proibido'; end if;
 if old.deleted_at is not null or new.deleted_at is null or new.updated_at<=old.updated_at or
  (to_jsonb(new)-'updated_at'-'deleted_at') is distinct from (to_jsonb(old)-'updated_at'-'deleted_at')
 then raise exception 'A7: apenas encerramento de vínculo com preservação histórica'; end if;
 return new;
end;$$;
drop trigger if exists vault_a7_team_tombstone_only on public.surgery_team_a7;
create trigger vault_a7_team_tombstone_only before update or delete on public.surgery_team_a7
for each row execute function public.vault_a7_team_tombstone_only();

alter table public.surgery_journey_events_a7 enable row level security;
alter table public.surgery_team_a7 enable row level security;
revoke all on public.surgery_journey_events_a7, public.surgery_team_a7 from anon, authenticated;
grant select, insert on public.surgery_journey_events_a7 to authenticated;
grant select, insert, update on public.surgery_team_a7 to authenticated;

drop policy if exists a7_events_select on public.surgery_journey_events_a7;
create policy a7_events_select on public.surgery_journey_events_a7 for select to authenticated
using (user_id=(select auth.uid()));
drop policy if exists a7_events_insert on public.surgery_journey_events_a7;
create policy a7_events_insert on public.surgery_journey_events_a7 for insert to authenticated
with check (user_id=(select auth.uid()) and deleted_at is null);

drop policy if exists a7_team_select on public.surgery_team_a7;
create policy a7_team_select on public.surgery_team_a7 for select to authenticated
using (user_id=(select auth.uid()));
drop policy if exists a7_team_insert on public.surgery_team_a7;
create policy a7_team_insert on public.surgery_team_a7 for insert to authenticated
with check (user_id=(select auth.uid()) and deleted_at is null);
drop policy if exists a7_team_update on public.surgery_team_a7;
create policy a7_team_update on public.surgery_team_a7 for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
-- Composite FKs enforce same person/owner for surgery, and same owner for professional.
-- No SECURITY DEFINER function, no public bucket/asset writes, no automatic clinical effect.
