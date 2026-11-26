-- SQL candidato. Somente banco de testes isolado. NAO PRODUCAO.
BEGIN;
-- RASCUNHO NAO EXECUTAVEL COMO MIGRATION AUTORIZADA. REVISAR COM GUARDIAN.
-- Schema consultado em producao SOMENTE via metadados. Nenhuma DDL executada.
-- A normalizacao/validacao server-side de referencias internas JSON, tombstone,
-- revisao CAS e grant/policies reais deve ser fechada antes de promover este rascunho.
-- Sem BEGIN/COMMIT automatico e fora de supabase/migrations.

create table public.vital_exercises (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  name text not null, kind text not null, region text, equipment text, aliases jsonb not null check (jsonb_typeof(aliases)='array'), favorite boolean not null, active boolean not null,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_exercises enable row level security;
revoke all on public.vital_exercises from public, anon, authenticated;
grant select,insert,update on public.vital_exercises to authenticated;
create policy vital_exercises_read on public.vital_exercises for select to authenticated using ((select auth.uid())=user_id);
create policy vital_exercises_insert on public.vital_exercises for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_exercises_update on public.vital_exercises for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_exercises_scope_idx on public.vital_exercises(user_id,person_id,updated_at);

create table public.vital_foods (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  name text not null, favorite boolean not null, active boolean not null, notes text,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_foods enable row level security;
revoke all on public.vital_foods from public, anon, authenticated;
grant select,insert,update on public.vital_foods to authenticated;
create policy vital_foods_read on public.vital_foods for select to authenticated using ((select auth.uid())=user_id);
create policy vital_foods_insert on public.vital_foods for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_foods_update on public.vital_foods for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_foods_scope_idx on public.vital_foods(user_id,person_id,updated_at);

create table public.vital_nutrition_modalities (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  name text not null, description text, aliases jsonb not null check (jsonb_typeof(aliases)='array'), category text not null check(category in ('pattern','preference','custom')), identity_id text not null, active boolean not null,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_nutrition_modalities enable row level security;
revoke all on public.vital_nutrition_modalities from public, anon, authenticated;
grant select,insert,update on public.vital_nutrition_modalities to authenticated;
create policy vital_nutrition_modalities_read on public.vital_nutrition_modalities for select to authenticated using ((select auth.uid())=user_id);
create policy vital_nutrition_modalities_insert on public.vital_nutrition_modalities for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_nutrition_modalities_update on public.vital_nutrition_modalities for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_nutrition_modalities_scope_idx on public.vital_nutrition_modalities(user_id,person_id,updated_at);

create table public.vital_training_plans (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  name text not null check (length(btrim(name))>0), starts_on date not null, ends_on date, check (ends_on is null or ends_on>=starts_on),
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_training_plans enable row level security;
revoke all on public.vital_training_plans from public, anon, authenticated;
grant select,insert,update on public.vital_training_plans to authenticated;
create policy vital_training_plans_read on public.vital_training_plans for select to authenticated using ((select auth.uid())=user_id);
create policy vital_training_plans_insert on public.vital_training_plans for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_training_plans_update on public.vital_training_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_training_plans_scope_idx on public.vital_training_plans(user_id,person_id,updated_at);

create table public.vital_nutrition_plans (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  name text not null check (length(btrim(name))>0), starts_on date not null, ends_on date, check (ends_on is null or ends_on>=starts_on), professional_id uuid, foreign key(professional_id,user_id) references public.medicos(id,user_id) on delete restrict,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_nutrition_plans enable row level security;
revoke all on public.vital_nutrition_plans from public, anon, authenticated;
grant select,insert,update on public.vital_nutrition_plans to authenticated;
create policy vital_nutrition_plans_read on public.vital_nutrition_plans for select to authenticated using ((select auth.uid())=user_id);
create policy vital_nutrition_plans_insert on public.vital_nutrition_plans for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_nutrition_plans_update on public.vital_nutrition_plans for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_nutrition_plans_scope_idx on public.vital_nutrition_plans(user_id,person_id,updated_at);

create table public.vital_training_plan_versions (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  plan_id uuid not null, version integer not null check(version>0), effective_on date not null, status text not null check(status in ('active','paused','ended')), plan_name text not null, unique (plan_id,user_id,person_id,version), items jsonb not null check (jsonb_typeof(items)='array'), goal text, foreign key (plan_id,user_id,person_id) references public.vital_training_plans(id,user_id,person_id) on delete no action deferrable initially deferred,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_training_plan_versions enable row level security;
revoke all on public.vital_training_plan_versions from public, anon, authenticated;
grant select,insert on public.vital_training_plan_versions to authenticated;
create policy vital_training_plan_versions_read on public.vital_training_plan_versions for select to authenticated using ((select auth.uid())=user_id);
create policy vital_training_plan_versions_insert on public.vital_training_plan_versions for insert to authenticated with check ((select auth.uid())=user_id);
create index vital_training_plan_versions_scope_idx on public.vital_training_plan_versions(user_id,person_id,updated_at);

create table public.vital_nutrition_plan_versions (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  plan_id uuid not null, version integer not null check(version>0), effective_on date not null, status text not null check(status in ('active','paused','ended')), plan_name text not null, unique (plan_id,user_id,person_id,version), professional_id uuid, foreign key(professional_id,user_id) references public.medicos(id,user_id) on delete restrict, modality_ids jsonb not null check (jsonb_typeof(modality_ids)='array'), modalities jsonb not null check (jsonb_typeof(modalities)='array'), custom_modality text, rules jsonb not null check (jsonb_typeof(rules)='array'), targets jsonb not null check (jsonb_typeof(targets)='object'), origin text not null check(origin in ('user','professional')), constraint vital_nutrition_professional_required check(origin <> 'professional' or professional_id is not null), notes text, foreign key (plan_id,user_id,person_id) references public.vital_nutrition_plans(id,user_id,person_id) on delete no action deferrable initially deferred,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_nutrition_plan_versions enable row level security;
revoke all on public.vital_nutrition_plan_versions from public, anon, authenticated;
grant select,insert on public.vital_nutrition_plan_versions to authenticated;
create policy vital_nutrition_plan_versions_read on public.vital_nutrition_plan_versions for select to authenticated using ((select auth.uid())=user_id);
create policy vital_nutrition_plan_versions_insert on public.vital_nutrition_plan_versions for insert to authenticated with check ((select auth.uid())=user_id);
create index vital_nutrition_plan_versions_scope_idx on public.vital_nutrition_plan_versions(user_id,person_id,updated_at);

create table public.vital_workout_sessions (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  day date not null, title text not null, modality text not null, custom_modality text, status text not null check(status in ('planned','in_progress','completed','cancelled','draft')), started_at timestamptz, ended_at timestamptz, duration_seconds integer check(duration_seconds>=0), active_seconds integer check(active_seconds>=0), pause_seconds integer check(pause_seconds>=0), duration_source text check(duration_source in ('declared','measured')), location_id uuid, location_label text, plan_version_id uuid, rehab_program_id uuid, notes text, items jsonb not null check (jsonb_typeof(items)='array'), clock jsonb, foreign key(location_id,user_id) references public.locais(id,user_id) on delete restrict, foreign key (plan_version_id,user_id,person_id) references public.vital_training_plan_versions(id,user_id,person_id) on delete no action deferrable initially deferred, foreign key (rehab_program_id,user_id,person_id) references public.rehab_programs_m5(id,user_id,person_id) on delete restrict, check(ended_at is null or started_at is null or ended_at>=started_at), check(active_seconds is null or duration_seconds is null or active_seconds<=duration_seconds),
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_workout_sessions enable row level security;
revoke all on public.vital_workout_sessions from public, anon, authenticated;
grant select,insert,update on public.vital_workout_sessions to authenticated;
create policy vital_workout_sessions_read on public.vital_workout_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy vital_workout_sessions_insert on public.vital_workout_sessions for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_workout_sessions_update on public.vital_workout_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_workout_sessions_scope_idx on public.vital_workout_sessions(user_id,person_id,updated_at);

create table public.vital_training_checkins (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  day date not null, status text not null check(status in ('trained','rest','absent')), reason text,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_training_checkins enable row level security;
revoke all on public.vital_training_checkins from public, anon, authenticated;
grant select,insert,update on public.vital_training_checkins to authenticated;
create policy vital_training_checkins_read on public.vital_training_checkins for select to authenticated using ((select auth.uid())=user_id);
create policy vital_training_checkins_insert on public.vital_training_checkins for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_training_checkins_update on public.vital_training_checkins for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_training_checkins_scope_idx on public.vital_training_checkins(user_id,person_id,updated_at);

create table public.vital_meals (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  day date not null, time text check(time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), kind text not null check(kind in ('breakfast','lunch','snack','dinner','supper','custom')), custom_label text, plan_version_id uuid, items jsonb not null check (jsonb_typeof(items)='array'), notes text, foreign key (plan_version_id,user_id,person_id) references public.vital_nutrition_plan_versions(id,user_id,person_id) on delete no action deferrable initially deferred,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_meals enable row level security;
revoke all on public.vital_meals from public, anon, authenticated;
grant select,insert,update on public.vital_meals to authenticated;
create policy vital_meals_read on public.vital_meals for select to authenticated using ((select auth.uid())=user_id);
create policy vital_meals_insert on public.vital_meals for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_meals_update on public.vital_meals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_meals_scope_idx on public.vital_meals(user_id,person_id,updated_at);

create table public.vital_nutrition_checkins (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  day date not null, status text check(status in ('followed','partial','outside')), energy text, satiety text, adaptation text, daily_totals jsonb not null default '{}'::jsonb check(jsonb_typeof(daily_totals)='object'), daily_source text check(daily_source in ('declared','label')), check((daily_totals='{}'::jsonb)=(daily_source is null)), check(status is not null or daily_source is not null or nullif(btrim(energy),'') is not null or nullif(btrim(satiety),'') is not null or nullif(btrim(adaptation),'') is not null),
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_nutrition_checkins enable row level security;
revoke all on public.vital_nutrition_checkins from public, anon, authenticated;
grant select,insert,update on public.vital_nutrition_checkins to authenticated;
create policy vital_nutrition_checkins_read on public.vital_nutrition_checkins for select to authenticated using ((select auth.uid())=user_id);
create policy vital_nutrition_checkins_insert on public.vital_nutrition_checkins for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_nutrition_checkins_update on public.vital_nutrition_checkins for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_nutrition_checkins_scope_idx on public.vital_nutrition_checkins(user_id,person_id,updated_at);

create table public.vital_exercise_favorites (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  exercise_id text not null,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_exercise_favorites enable row level security;
revoke all on public.vital_exercise_favorites from public, anon, authenticated;
grant select,insert,update on public.vital_exercise_favorites to authenticated;
create policy vital_exercise_favorites_read on public.vital_exercise_favorites for select to authenticated using ((select auth.uid())=user_id);
create policy vital_exercise_favorites_insert on public.vital_exercise_favorites for insert to authenticated with check ((select auth.uid())=user_id);
create policy vital_exercise_favorites_update on public.vital_exercise_favorites for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index vital_exercise_favorites_scope_idx on public.vital_exercise_favorites(user_id,person_id,updated_at);

create table public.vital_audit (
  id uuid primary key, user_id uuid not null, person_id uuid not null, created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, revision bigint not null check (revision>0),
  target_table text not null, target_id uuid not null, previous_revision bigint not null check(previous_revision>0), reason text not null, previous jsonb not null,
  unique (id,user_id,person_id),
  foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade,
  check(updated_at>=created_at)
);
alter table public.vital_audit enable row level security;
revoke all on public.vital_audit from public, anon, authenticated;
grant select,insert on public.vital_audit to authenticated;
create policy vital_audit_read on public.vital_audit for select to authenticated using ((select auth.uid())=user_id);
create policy vital_audit_insert on public.vital_audit for insert to authenticated with check ((select auth.uid())=user_id);
create index vital_audit_scope_idx on public.vital_audit(user_id,person_id,updated_at);

create unique index vital_training_checkins_live_key on public.vital_training_checkins(user_id,person_id,day) where deleted_at is null;
create unique index vital_nutrition_checkins_live_key on public.vital_nutrition_checkins(user_id,person_id,day) where deleted_at is null;
create unique index vital_exercise_favorites_live_key on public.vital_exercise_favorites(user_id,person_id,exercise_id) where deleted_at is null;


-- Guardas adicionais em VITAL-SERVER-GUARDS.sql.disabled; aplicar somente na mesma transacao da migration final.

-- CANDIDATE ONLY. Run in isolated PostgreSQL before promoting; no production migration applied.
-- Every table already has owner RLS and composite person FK in VITAL-SCHEMA-PREPARACAO.
CREATE FUNCTION public.vital_evo_guard_row() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE j jsonb := to_jsonb(NEW); item jsonb; entry jsonb; ex jsonb; ref_id text; seen text[] := '{}'; prev_date date; prev_version integer; plan_start date; plan_end date; nutrient jsonb; linked boolean; series jsonb; seen_sets text[] := '{}'; field_key text; numeric_value numeric; max_value numeric;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.person_id IS DISTINCT FROM OLD.person_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Vital identity immutable' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME IN ('vital_audit','vital_training_plan_versions','vital_nutrition_plan_versions') THEN RAISE EXCEPTION 'Vital history immutable' USING ERRCODE='23514'; END IF;
  IF OLD.deleted_at IS NOT NULL OR NEW.revision<=OLD.revision OR NEW.updated_at<=OLD.updated_at THEN RAISE EXCEPTION 'Vital revision or tombstone conflict' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.deleted_at IS NOT NULL AND NEW.deleted_at>NEW.updated_at THEN RAISE EXCEPTION 'Vital tombstone timestamp invalid' USING ERRCODE='23514'; END IF;
 IF NEW.revision>9007199254740991 THEN RAISE EXCEPTION 'Vital revision outside safe integer' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME IN ('vital_training_plan_versions','vital_nutrition_plan_versions') THEN
  IF NEW.revision<>1 OR NEW.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Vital version immutable' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='vital_training_plan_versions' THEN
   SELECT starts_on,ends_on INTO plan_start,plan_end FROM public.vital_training_plans WHERE id=NEW.plan_id AND user_id=NEW.user_id AND person_id=NEW.person_id AND deleted_at IS NULL FOR UPDATE;
   SELECT max(version),max(effective_on) INTO prev_version,prev_date FROM public.vital_training_plan_versions WHERE plan_id=NEW.plan_id AND user_id=NEW.user_id AND person_id=NEW.person_id;
  ELSE
   SELECT starts_on,ends_on INTO plan_start,plan_end FROM public.vital_nutrition_plans WHERE id=NEW.plan_id AND user_id=NEW.user_id AND person_id=NEW.person_id AND deleted_at IS NULL FOR UPDATE;
   SELECT max(version),max(effective_on) INTO prev_version,prev_date FROM public.vital_nutrition_plan_versions WHERE plan_id=NEW.plan_id AND user_id=NEW.user_id AND person_id=NEW.person_id;
  END IF;
  IF plan_start IS NULL OR NEW.effective_on<plan_start OR (plan_end IS NOT NULL AND NEW.effective_on>plan_end) OR NEW.version<>coalesce(prev_version,0)+1 OR (prev_date IS NOT NULL AND NEW.effective_on<prev_date) THEN RAISE EXCEPTION 'Vital version sequence or date invalid' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_TABLE_NAME='vital_audit' THEN
  IF NEW.revision<>1 OR NEW.deleted_at IS NOT NULL OR jsonb_typeof(NEW.previous)<>'object' OR nullif(btrim(NEW.reason),'') IS NULL OR NEW.target_table NOT IN ('vital_exercises','vital_foods','vital_workout_sessions','vital_training_checkins','vital_meals','vital_nutrition_checkins','vital_exercise_favorites','vital_nutrition_modalities','vital_training_plans','vital_nutrition_plans') THEN RAISE EXCEPTION 'Vital audit invalid' USING ERRCODE='23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2 AND person_id=$3 AND revision>$4)',NEW.target_table) INTO linked USING NEW.target_id,NEW.user_id,NEW.person_id,NEW.previous_revision;
  IF NOT linked THEN RAISE EXCEPTION 'Vital audit target invalid' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_TABLE_NAME IN ('vital_nutrition_plan_versions','vital_nutrition_checkins') THEN
  nutrient:=CASE WHEN TG_TABLE_NAME='vital_nutrition_plan_versions' THEN j->'targets' ELSE j->'daily_totals' END;
  IF jsonb_typeof(nutrient) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Vital nutrient shape invalid' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(nutrient) n WHERE n.key NOT IN ('energy_kcal','carbohydrate_g','protein_g','fat_g','fiber_g') OR jsonb_typeof(n.value)<>'number') THEN RAISE EXCEPTION 'Vital nutrient shape invalid' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(nutrient) n WHERE (n.value::text)::numeric<0 OR (n.value::text)::numeric>1000000) THEN RAISE EXCEPTION 'Vital nutrient range invalid' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_TABLE_NAME='vital_workout_sessions' THEN
  IF nullif(btrim(NEW.title),'') IS NULL OR (NEW.modality='custom' AND nullif(btrim(NEW.custom_modality),'') IS NULL) OR (NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds>604800) OR (NEW.duration_seconds IS NOT NULL AND NEW.duration_source IS NULL AND NEW.clock IS NULL) THEN RAISE EXCEPTION 'Vital workout fields invalid' USING ERRCODE='23514'; END IF;
  IF NEW.status='planned' AND (NEW.ended_at IS NOT NULL OR NEW.active_seconds IS NOT NULL OR NEW.pause_seconds IS NOT NULL OR NEW.clock IS NOT NULL) THEN RAISE EXCEPTION 'Vital planned session contains actual timing' USING ERRCODE='23514'; END IF;
  IF NEW.status='completed' AND NEW.duration_seconds IS NULL AND jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'Vital completed session empty' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_TABLE_NAME='vital_meals' AND (j->>'kind')='custom' AND nullif(btrim(j->>'custom_label'),'') IS NULL THEN RAISE EXCEPTION 'Vital custom meal name missing' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME IN ('vital_workout_sessions','vital_training_plan_versions','vital_meals') THEN
  IF jsonb_typeof(j->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(j->'items')>200 THEN RAISE EXCEPTION 'Vital items invalid' USING ERRCODE='23514'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(j->'items') LOOP
   IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR coalesce(item->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR lower(item->>'id')=ANY(seen) THEN RAISE EXCEPTION 'Vital item id invalid or duplicate' USING ERRCODE='23514'; END IF;
   seen:=array_append(seen,lower(item->>'id'));
   IF TG_TABLE_NAME='vital_meals' THEN
    IF (item->>'quantity' IS NULL)<>(item->>'unit' IS NULL) OR (item->>'quantity' IS NOT NULL AND (jsonb_typeof(item->'quantity')<>'number' OR (item->>'quantity')::numeric<=0 OR (item->>'quantity')::numeric>1000000 OR nullif(btrim(item->>'unit'),'') IS NULL)) THEN RAISE EXCEPTION 'Vital portion invalid' USING ERRCODE='23514'; END IF;
    IF nullif(btrim(item->>'name'),'') IS NULL THEN RAISE EXCEPTION 'Vital food name missing' USING ERRCODE='23514'; END IF;
    ref_id:=item->>'food_id';
    IF ref_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.vital_foods f WHERE f.id::text=ref_id AND f.user_id=NEW.user_id AND f.person_id=NEW.person_id) THEN RAISE EXCEPTION 'Vital food reference outside scope' USING ERRCODE='23514'; END IF;
    IF jsonb_typeof(item->'nutrients') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Vital nutrients invalid' USING ERRCODE='23514'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_each(item->'nutrients') n WHERE n.key NOT IN ('energy_kcal','carbohydrate_g','protein_g','fat_g','fiber_g') OR jsonb_typeof(n.value)<>'number') THEN RAISE EXCEPTION 'Vital nutrients invalid' USING ERRCODE='23514'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_each(item->'nutrients') n WHERE (n.value::text)::numeric<0 OR (n.value::text)::numeric>1000000) THEN RAISE EXCEPTION 'Vital nutrients range invalid' USING ERRCODE='23514'; END IF;
    IF (item->'nutrients'<>'{}'::jsonb AND coalesce(item->>'nutrient_source','') NOT IN ('declared','label')) OR (item->'nutrients'='{}'::jsonb AND item->>'nutrient_source' IS NOT NULL) THEN RAISE EXCEPTION 'Vital nutrient source missing' USING ERRCODE='23514'; END IF;
   ELSE
    ex:=item->'exercise'; ref_id:=ex->>'id';
    IF jsonb_typeof(ex) IS DISTINCT FROM 'object' OR nullif(btrim(ex->>'name'),'') IS NULL OR ref_id IS NULL THEN RAISE EXCEPTION 'Vital exercise snapshot invalid' USING ERRCODE='23514'; END IF;
    IF ex->>'source'='catalog' THEN
     IF NOT (ref_id=ANY(ARRAY['walk','run','treadmill','stationary-bike','outdoor-bike','elliptical','swim','leg-press','leg-extension','leg-curl','calf-machine','chest-press','pulldown','row-machine','dumbbell-curl','dumbbell-press','squat-body','plank','mobility','rowing-ergometer']::text[])) THEN RAISE EXCEPTION 'Vital exercise catalog id unknown' USING ERRCODE='23514'; END IF;
    ELSIF ex->>'source'='custom' THEN
     IF NOT EXISTS(SELECT 1 FROM public.vital_exercises e WHERE e.id::text=ref_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id) THEN RAISE EXCEPTION 'Vital exercise outside scope' USING ERRCODE='23514'; END IF;
    ELSE RAISE EXCEPTION 'Vital exercise source invalid' USING ERRCODE='23514'; END IF;
    IF coalesce(ex->>'kind','') NOT IN ('machine','free_weights','bodyweight','functional','walk','run','cycle','treadmill','elliptical','swim','other') THEN RAISE EXCEPTION 'Vital exercise kind invalid' USING ERRCODE='23514'; END IF;
    IF TG_TABLE_NAME='vital_workout_sessions' THEN
     IF jsonb_typeof(item->'sets') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'sets')>100 OR coalesce(item->>'laterality','') NOT IN ('left','right','bilateral','not_reported') THEN RAISE EXCEPTION 'Vital exercise fields invalid' USING ERRCODE='23514'; END IF;
     FOREACH field_key IN ARRAY ARRAY['duration_seconds','distance_m','rest_seconds'] LOOP
      IF item->>field_key IS NOT NULL THEN
       IF jsonb_typeof(item->field_key)<>'number' THEN RAISE EXCEPTION 'Vital exercise numeric type invalid' USING ERRCODE='23514'; END IF;
       numeric_value:=(item->>field_key)::numeric;max_value:=CASE WHEN field_key='distance_m' THEN 10000000 ELSE 604800 END;
       IF numeric_value<0 OR numeric_value>max_value OR (field_key='rest_seconds' AND trunc(numeric_value)<>numeric_value) OR (field_key='duration_seconds' AND NEW.status='completed' AND NEW.duration_seconds IS NOT NULL AND numeric_value>NEW.duration_seconds) THEN RAISE EXCEPTION 'Vital exercise numeric range invalid' USING ERRCODE='23514'; END IF;
      END IF;
     END LOOP;
     FOR series IN SELECT value FROM jsonb_array_elements(item->'sets') LOOP
      IF jsonb_typeof(series) IS DISTINCT FROM 'object' OR coalesce(series->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR lower(series->>'id')=ANY(seen_sets) THEN RAISE EXCEPTION 'Vital set identity invalid' USING ERRCODE='23514'; END IF;
      seen_sets:=array_append(seen_sets,lower(series->>'id'));
      IF (series->>'load' IS NULL)<>(series->>'load_unit' IS NULL) OR (series->>'load_unit' IS NOT NULL AND series->>'load_unit' NOT IN ('kg','lb')) OR (series->>'load' IS NULL AND series->>'reps' IS NULL AND series->>'seconds' IS NULL AND series->>'rest_seconds' IS NULL) THEN RAISE EXCEPTION 'Vital set fields invalid' USING ERRCODE='23514'; END IF;
      FOREACH field_key IN ARRAY ARRAY['load','reps','seconds','rest_seconds'] LOOP
       IF series->>field_key IS NOT NULL THEN
        IF jsonb_typeof(series->field_key)<>'number' THEN RAISE EXCEPTION 'Vital set numeric type invalid' USING ERRCODE='23514'; END IF;
        numeric_value:=(series->>field_key)::numeric;max_value:=CASE WHEN field_key='load' THEN 100000 WHEN field_key='reps' THEN 10000 ELSE 86400 END;
        IF numeric_value<0 OR numeric_value>max_value OR (field_key='seconds' AND numeric_value=0) OR (field_key IN ('reps','rest_seconds') AND trunc(numeric_value)<>numeric_value) THEN RAISE EXCEPTION 'Vital set numeric range invalid' USING ERRCODE='23514'; END IF;
       END IF;
      END LOOP;
     END LOOP;
    ELSE
     IF jsonb_typeof(item->'weekday') IS DISTINCT FROM 'number' OR nullif(btrim(item->>'label'),'') IS NULL THEN RAISE EXCEPTION 'Vital plan weekday invalid' USING ERRCODE='23514'; END IF;
     numeric_value:=(item->>'weekday')::numeric;IF numeric_value<0 OR numeric_value>6 OR trunc(numeric_value)<>numeric_value THEN RAISE EXCEPTION 'Vital plan weekday invalid' USING ERRCODE='23514'; END IF;
     IF (item->>'target_load' IS NULL)<>(item->>'target_load_unit' IS NULL) OR (item->>'target_load_unit' IS NOT NULL AND item->>'target_load_unit' NOT IN ('kg','lb')) THEN RAISE EXCEPTION 'Vital plan load invalid' USING ERRCODE='23514'; END IF;
     FOREACH field_key IN ARRAY ARRAY['target_load','target_seconds','target_sets','target_reps'] LOOP
      IF item->>field_key IS NOT NULL THEN
       IF jsonb_typeof(item->field_key)<>'number' THEN RAISE EXCEPTION 'Vital plan numeric type invalid' USING ERRCODE='23514'; END IF;
       numeric_value:=(item->>field_key)::numeric;max_value:=CASE WHEN field_key='target_load' THEN 100000 WHEN field_key='target_seconds' THEN 86400 WHEN field_key='target_sets' THEN 1000 ELSE 10000 END;
       IF numeric_value<0 OR numeric_value>max_value OR (field_key IN ('target_sets','target_reps') AND trunc(numeric_value)<>numeric_value) THEN RAISE EXCEPTION 'Vital plan numeric range invalid' USING ERRCODE='23514'; END IF;
      END IF;
     END LOOP;
    END IF;
   END IF;
  END LOOP;
 END IF;
 IF TG_TABLE_NAME='vital_nutrition_plan_versions' THEN
  IF jsonb_array_length(NEW.modality_ids)<1 OR jsonb_array_length(NEW.modality_ids)>20 OR jsonb_array_length(NEW.modalities)<>jsonb_array_length(NEW.modality_ids) THEN RAISE EXCEPTION 'Vital modalities invalid' USING ERRCODE='23514'; END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(NEW.modality_ids) LOOP
   IF jsonb_typeof(entry)<>'string' THEN RAISE EXCEPTION 'Vital modality id invalid' USING ERRCODE='23514'; END IF;
   ref_id:=entry#>>'{}';
   IF NOT (ref_id=ANY(ARRAY['balanced','ketogenic','low-carb','mediterranean','vegetarian','vegan','ovo-lacto','dash','flexitarian','sports','professional','free','custom']::text[])) AND NOT EXISTS(SELECT 1 FROM public.vital_nutrition_modalities m WHERE m.id::text=ref_id AND m.user_id=NEW.user_id AND m.person_id=NEW.person_id) THEN RAISE EXCEPTION 'Vital modality outside scope' USING ERRCODE='23514'; END IF;
   IF (SELECT count(*) FROM jsonb_array_elements(NEW.modalities) m WHERE m->>'id'=ref_id)<>1 THEN RAISE EXCEPTION 'Vital modality snapshot missing or duplicated' USING ERRCODE='23514'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.vital_evo_guard_row() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER vital_guard_vital_audit BEFORE INSERT OR UPDATE ON public.vital_audit FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_exercises BEFORE INSERT OR UPDATE ON public.vital_exercises FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_foods BEFORE INSERT OR UPDATE ON public.vital_foods FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_workout_sessions BEFORE INSERT OR UPDATE ON public.vital_workout_sessions FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_training_checkins BEFORE INSERT OR UPDATE ON public.vital_training_checkins FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_training_plans BEFORE INSERT OR UPDATE ON public.vital_training_plans FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_training_plan_versions BEFORE INSERT OR UPDATE ON public.vital_training_plan_versions FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_nutrition_plans BEFORE INSERT OR UPDATE ON public.vital_nutrition_plans FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_nutrition_plan_versions BEFORE INSERT OR UPDATE ON public.vital_nutrition_plan_versions FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_nutrition_modalities BEFORE INSERT OR UPDATE ON public.vital_nutrition_modalities FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_meals BEFORE INSERT OR UPDATE ON public.vital_meals FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_nutrition_checkins BEFORE INSERT OR UPDATE ON public.vital_nutrition_checkins FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
CREATE TRIGGER vital_guard_vital_exercise_favorites BEFORE INSERT OR UPDATE ON public.vital_exercise_favorites FOR EACH ROW EXECUTE FUNCTION public.vital_evo_guard_row();
ALTER TABLE public.vital_exercises ADD CONSTRAINT vital_exercise_kind_check CHECK(kind=ANY(ARRAY['machine','free_weights','bodyweight','functional','walk','run','cycle','treadmill','elliptical','swim','other']::text[]));
ALTER TABLE public.vital_workout_sessions ADD CONSTRAINT vital_workout_modality_check CHECK(modality IN ('strength','cardio','mixed','outdoor','free','custom'));
ALTER TABLE public.vital_exercise_favorites ADD CONSTRAINT vital_favorite_catalog_check CHECK(exercise_id=ANY(ARRAY['walk','run','treadmill','stationary-bike','outdoor-bike','elliptical','swim','leg-press','leg-extension','leg-curl','calf-machine','chest-press','pulldown','row-machine','dumbbell-curl','dumbbell-press','squat-body','plank','mobility','rowing-ergometer']::text[]));

ALTER TABLE public.vital_meals ADD CONSTRAINT vital_meal_nonempty_check CHECK(jsonb_array_length(items)>0);
ALTER TABLE public.vital_workout_sessions ADD CONSTRAINT vital_workout_totals_check CHECK((duration_seconds IS NOT NULL OR (active_seconds IS NULL AND pause_seconds IS NULL)) AND (duration_seconds IS NULL OR coalesce(active_seconds,0)+coalesce(pause_seconds,0)<=duration_seconds));


-- Vital: extend the existing realtime publication only; full canonical pull remains authoritative.
DO $$
DECLARE t text;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables) THEN
  FOREACH t IN ARRAY ARRAY['vital_exercises','vital_foods','vital_nutrition_modalities','vital_training_plans','vital_nutrition_plans','vital_training_plan_versions','vital_nutrition_plan_versions','vital_workout_sessions','vital_training_checkins','vital_meals','vital_nutrition_checkins','vital_exercise_favorites','vital_audit']::text[] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END $$;

COMMIT;
