-- READ ONLY POST-MIGRATION CHECK: 5 medicos fields, 3 tables, 9 policies, 4 triggers.
SELECT jsonb_build_object(
 'medicos_new_columns',(SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='medicos' AND column_name IN ('categoria_profissional','conselho_tipo','conselho_numero','conselho_uf','a1_identity_revision')),
 'a1_tables',(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('a1_treatment_phases','a1_prescription_links','a1_supply_locations')),
 'a1_policies',(SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('a1_treatment_phases','a1_prescription_links','a1_supply_locations') AND policyname LIKE 'vault_a1_%'),
 'a1_triggers',(SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND (tgname='vault_a1_guard' OR tgname='vault_a1_preserve_professional')),
 'rls_on',(SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('a1_treatment_phases','a1_prescription_links','a1_supply_locations') AND relrowsecurity),
 'factual_tables_empty_at_migration',(SELECT jsonb_build_object('phases',(SELECT count(*) FROM public.a1_treatment_phases),'prescriptions',(SELECT count(*) FROM public.a1_prescription_links),'supply_locations',(SELECT count(*) FROM public.a1_supply_locations)))
) AS a1_check;
