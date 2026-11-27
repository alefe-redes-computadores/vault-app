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
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) TO authenticated;
CREATE FUNCTION public.vault_macro02_read_active_receipts_r7(p_epoch uuid,p_ids uuid[]) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_active_receipts_r7(p_epoch,p_ids) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_active_receipts_r7(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_active_receipts_r7(uuid,uuid[]) TO authenticated;
