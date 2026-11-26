-- Executar depois da fase B, não antes. Somente metadados e contagens, sem dados clínicos.
SELECT current_setting('server_version'),current_user;
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 12;
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname='vault_macro02_worker';
SELECT n.nspname,p.proname,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vault_macro02_private' OR p.proname LIKE 'vault_macro02_%' ORDER BY n.nspname,p.proname;
SELECT has_table_privilege('authenticated','vault_macro02_private.dose_commits','SELECT') AS authenticated_ledger_read,has_table_privilege('authenticated','vault_macro02_private.active_accounts','INSERT') AS authenticated_activation,has_function_privilege('anon','public.vault_macro02_commit_dose(jsonb)','EXECUTE') AS anon_rpc,has_function_privilege('service_role','public.vault_macro02_commit_dose(jsonb)','EXECUTE') AS service_rpc;
SELECT count(*) AS activated_accounts FROM vault_macro02_private.active_accounts;
SELECT count(*) AS committed_intents FROM vault_macro02_private.dose_commits;
