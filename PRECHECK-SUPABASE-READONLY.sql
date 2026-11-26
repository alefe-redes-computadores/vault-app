-- Somente leitura. Não contém dados clínicos identificáveis.
SELECT current_database(),current_user,current_setting('server_version');
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 12;
SELECT count(*) AS dose_rows,count(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM public.medicamentos m JOIN public.persons p ON p.id=m.person_id AND p.user_id=m.user_id WHERE m.id=d.medicamento_id AND m.user_id=d.user_id AND m.person_id=d.person_id)) AS invalid_scope FROM public.dose_logs d;
SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('dose_logs','medicamentos','renovacoes','retiradas','persons') ORDER BY table_name,ordinal_position;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('dose_logs','medicamentos','renovacoes','retiradas','persons');
SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('dose_logs','medicamentos','renovacoes','retiradas','persons') AND NOT t.tgisinternal;
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','vault_macro02_worker');
