-- Macro02: complemento de leitura, SEM ATIVACAO. Proposta nao autorizada em producao.
-- Executar apenas em transacao unica, apos R6 01/02; Migration 03 continua LOCKED.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE vault_macro02_private.active_accounts, vault_macro02_private.dose_commits IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'M02_COMPLEMENT_PREFLIGHT'; END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) THEN RAISE EXCEPTION 'M02_COMPLEMENT_NOT_DORMANT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vault_macro02_worker' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper) THEN RAISE EXCEPTION 'M02_COMPLEMENT_WORKER'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='vault_macro02_private.active_accounts'::regclass AND relrowsecurity) OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='vault_macro02_private.dose_commits'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'M02_COMPLEMENT_RLS'; END IF;
END $$;
-- A barreira existe ate parecer separado. Nenhum escritor ou registro clinico e alterado.
CREATE FUNCTION vault_macro02_private.dormant_freeze_r1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'M02_DORMANT_FENCE_LOCKED'; END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.dormant_freeze_r1() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER m02_dormant_freeze_r1 BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON vault_macro02_private.active_accounts FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.dormant_freeze_r1();
CREATE TRIGGER m02_dormant_freeze_r1 BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON vault_macro02_private.dose_commits FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.dormant_freeze_r1();
ALTER TABLE vault_macro02_private.active_accounts ENABLE ALWAYS TRIGGER m02_dormant_freeze_r1;
ALTER TABLE vault_macro02_private.dose_commits ENABLE ALWAYS TRIGGER m02_dormant_freeze_r1;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
CREATE FUNCTION vault_macro02_private.dormant_fence_r1() RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'M02_CAPABILITY_AUTH_REQUIRED'; END IF;
 LOCK TABLE vault_macro02_private.active_accounts, vault_macro02_private.dose_commits IN ACCESS SHARE MODE;
 IF (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid IN ('vault_macro02_private.active_accounts'::regclass,'vault_macro02_private.dose_commits'::regclass) AND tgname='m02_dormant_freeze_r1' AND tgenabled='A' AND tgfoid='vault_macro02_private.dormant_freeze_r1()'::regprocedure)<>2 OR vault_macro02_private.active_for(uid) THEN RAISE EXCEPTION 'M02_CAPABILITY_FENCE_UNAVAILABLE'; END IF;
 RETURN 'm02-dormant-r1:'||uid::text;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.dormant_fence_r1() FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION vault_macro02_private.dormant_fence_r1() OWNER TO vault_macro02_worker;
CREATE FUNCTION vault_macro02_private.read_capability_r1() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); fence text; issued bigint;
BEGIN
 fence:=vault_macro02_private.dormant_fence_r1();
 issued:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 RETURN jsonb_build_object('version',1,'account_id',uid,'writer','legacy','epoch','m02-dormant-r1','fence_id',fence,'issued_at_ms',issued,'expires_at_ms',issued+300000,'minimum_protocol',2);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_capability_r1() FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION vault_macro02_private.read_capability_r1() OWNER TO vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_capability_r1() TO authenticated;
CREATE FUNCTION vault_macro02_private.read_operation_receipts_r1(p_ids uuid[],p_fence_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); fence text; result jsonb;
BEGIN
 fence:=vault_macro02_private.dormant_fence_r1();
 IF p_fence_id IS DISTINCT FROM fence OR p_ids IS NULL OR cardinality(p_ids)>100 OR EXISTS(SELECT 1 FROM unnest(p_ids) AS x(id) WHERE id IS NULL) OR cardinality(p_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_ids) AS x(id)) THEN RAISE EXCEPTION 'M02_RECEIPT_SCOPE'; END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN c.operation_id IS NULL THEN jsonb_build_object('operation_id',x.id,'status','absent_at_fence') ELSE jsonb_build_object('operation_id',x.id,'status','committed','request',c.request,'ack',c.ack) END ORDER BY x.ord),'[]'::jsonb)
 INTO result FROM unnest(p_ids) WITH ORDINALITY AS x(id,ord) LEFT JOIN vault_macro02_private.dose_commits c ON c.user_id=uid AND c.operation_id=x.id;
 RETURN jsonb_build_object('account_id',uid,'fence_id',fence,'complete',true,'rows',result);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_operation_receipts_r1(uuid[],text) FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION vault_macro02_private.read_operation_receipts_r1(uuid[],text) OWNER TO vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_operation_receipts_r1(uuid[],text) TO authenticated;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
CREATE FUNCTION public.vault_macro02_read_capability_r1() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_capability_r1() $$;
CREATE FUNCTION public.vault_macro02_read_operation_receipts_r1(p_ids uuid[],p_fence_id text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_operation_receipts_r1(p_ids,p_fence_id) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_capability_r1(),public.vault_macro02_read_operation_receipts_r1(uuid[],text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_capability_r1(),public.vault_macro02_read_operation_receipts_r1(uuid[],text) TO authenticated;
