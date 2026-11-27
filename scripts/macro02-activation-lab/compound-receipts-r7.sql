-- Full parent receipts only. A single transaction locks the active account;
-- absence is point-in-time evidence, never permission to replay or restore.
CREATE FUNCTION vault_macro02_private.read_active_receipts_r7(p_epoch uuid,p_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); result jsonb;
BEGIN
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,p_epoch);
 IF p_ids IS NULL OR cardinality(p_ids)>512 OR EXISTS(SELECT 1 FROM unnest(p_ids) x(id) WHERE id IS NULL) OR cardinality(p_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_ids) x(id)) THEN RAISE EXCEPTION 'M02_R7_RECEIPT_SCOPE';END IF;
 WITH ledger AS (
  SELECT operation_id,request,ack FROM vault_macro02_private.compound_commits_r6 WHERE user_id=uid AND epoch=p_epoch AND operation_id=ANY(p_ids)
  UNION ALL SELECT operation_id,request,ack FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=uid AND epoch=p_epoch AND operation_id=ANY(p_ids)
  UNION ALL SELECT operation_id,request,ack FROM vault_macro02_private.dose_commits WHERE user_id=uid AND epoch=p_epoch AND operation_id=ANY(p_ids)
 ) SELECT coalesce(jsonb_agg(CASE WHEN c.operation_id IS NULL THEN jsonb_build_object('operation_id',x.id,'status','absent_at_fence') ELSE jsonb_build_object('operation_id',x.id,'status','committed','request',c.request,'ack',c.ack) END ORDER BY x.ord),'[]'::jsonb) INTO result FROM unnest(p_ids) WITH ORDINALITY x(id,ord) LEFT JOIN ledger c ON c.operation_id=x.id;
 IF jsonb_array_length(result)<>cardinality(p_ids) THEN RAISE EXCEPTION 'M02_R7_RECEIPT_COLLISION';END IF;
 RETURN jsonb_build_object('account_id',uid,'fence_id','m02-active-receipts-r7:'||uid::text||':'||p_epoch::text,'complete',true,'rows',result);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
SET LOCAL ROLE vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) TO authenticated;
RESET ROLE;
CREATE FUNCTION public.vault_macro02_read_active_receipts_r7(p_epoch uuid,p_ids uuid[]) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_active_receipts_r7(p_epoch,p_ids) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_active_receipts_r7(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_active_receipts_r7(uuid,uuid[]) TO authenticated;

-- Fail the entire migration if old entrypoints remain callable, or if the
-- new entrypoints are not owned by the restricted worker with exact access.
DO $$ DECLARE f regprocedure; r text; BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'M02_R8_ROLE_NOT_RESET'; END IF;
 FOREACH f IN ARRAY ARRAY['vault_macro02_private.commit_dose(jsonb)'::regprocedure,'vault_macro02_private.commit_stock(jsonb)'::regprocedure,'public.vault_macro02_commit_dose(jsonb)'::regprocedure,'public.vault_macro02_commit_stock(jsonb)'::regprocedure] LOOP
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(r,f,'EXECUTE') THEN RAISE EXCEPTION 'M02_R8_LEGACY_ACL % %',f,r; END IF;
  END LOOP;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['vault_macro02_private.commit_atomic_r5(uuid,jsonb)'::regprocedure,'vault_macro02_private.commit_metadata_r5(jsonb)'::regprocedure,'vault_macro02_private.read_atomic_receipts_r5(uuid,uuid[])'::regprocedure,'vault_macro02_private.commit_compound_r6(jsonb)'::regprocedure,'vault_macro02_private.read_active_receipts_r7(uuid,uuid[])'::regprocedure] LOOP
  IF (SELECT proowner FROM pg_proc WHERE oid=f) <> 'vault_macro02_worker'::regrole OR NOT has_function_privilege('authenticated',f,'EXECUTE') OR has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'M02_R8_WRITER_ACL %',f; END IF;
 END LOOP;
 IF has_schema_privilege('vault_macro02_worker','vault_macro02_private','CREATE') OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vault_macro02_worker' AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcanlogin)) THEN RAISE EXCEPTION 'M02_R8_WORKER_ESCALATION'; END IF;
END $$;
