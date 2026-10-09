begin;
alter table public.registros_saude add constraint health_record_person_owner foreign key(person_id,user_id) references public.persons(id,user_id) on delete cascade;
alter table public.registros_saude drop constraint health_record_device_owner;
alter table public.registros_saude add constraint health_record_device_owner foreign key(device_id,user_id,person_id) references public.health_devices(id,user_id,person_id) on delete set null (device_id);
commit;
