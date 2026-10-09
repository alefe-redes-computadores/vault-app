begin;
create table public.health_profiles (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null unique, birth_date date, height_cm numeric check(height_cm between 30 and 250),
 skin_tone text not null check(skin_tone in ('#f1c9a5','#dba57a','#bb8159','#905b3a','#613d29','#3d291f')),
 created_at timestamptz not null, updated_at timestamptz not null,
 check(id=person_id), check(birth_date is null or birth_date>='1900-01-01'),
 foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade
);
create table public.health_devices (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,person_id uuid not null,
 kind text not null check(kind in ('watch','ring','pressure','scale','oximeter','other')),
 name text not null check(length(trim(name)) between 1 and 100),
 color text not null check(color in ('#34d399','#a78bfa','#fbbf24','#fb7185','#22d3ee','#e2e8f0')),
 side text not null check(side in ('left','right','none')),capabilities text[] not null default '{}',active boolean not null default true,
 created_at timestamptz not null,updated_at timestamptz not null,
 unique(id,user_id,person_id),
 check(capabilities <@ array['sono','peso','pressao_arterial','frequencia_cardiaca','oxigenacao','caminhada']::text[]),
 foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade
);
create index health_profiles_owner_updated on public.health_profiles(user_id,updated_at);
create index health_devices_owner_updated on public.health_devices(user_id,updated_at);
create index health_devices_person on public.health_devices(person_id);
alter table public.health_profiles enable row level security;
alter table public.health_devices enable row level security;
create policy health_profile_owner on public.health_profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_device_owner on public.health_devices for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.health_profiles,public.health_devices from anon;
grant select,insert,update,delete on public.health_profiles,public.health_devices to authenticated;
alter table public.registros_saude add column device_id uuid,add column source text,add column source_record_id text,add column inicio_em timestamptz,add column fim_em timestamptz;
alter table public.registros_saude add constraint health_record_device_owner foreign key(device_id,user_id,person_id) references public.health_devices(id,user_id,person_id);
alter table public.registros_saude add constraint health_record_device_person check(device_id is null or person_id is not null);
alter table public.registros_saude add constraint health_record_source check(source is null or source in ('manual','samsung_manual','health_connect'));
alter table public.registros_saude add constraint health_record_interval check((inicio_em is null and fim_em is null) or (inicio_em is not null and fim_em is not null and fim_em>inicio_em and fim_em-inicio_em<=interval '24 hours'));
create index health_records_device on public.registros_saude(device_id);
create unique index health_records_external_identity on public.registros_saude(user_id,person_id,source,source_record_id) where source_record_id is not null;
commit;
