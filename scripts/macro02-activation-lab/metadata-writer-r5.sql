-- Candidate server writer. Requires the certified R4 predicates and the R3
-- preparation tables. Do not apply this file independently to production.
-- The activation migration must provide the account/epoch lock below and
-- install the complete fence in the same transaction.
CREATE TABLE vault_macro02_private.metadata_commits_r5 (
 user_id uuid NOT NULL, epoch uuid NOT NULL, operation_id uuid NOT NULL,
 request jsonb NOT NULL, ack jsonb NOT NULL,
 committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,operation_id)
);
ALTER TABLE vault_macro02_private.metadata_commits_r5 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.metadata_commits_r5 FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT SELECT,INSERT ON vault_macro02_private.metadata_commits_r5 TO vault_macro02_worker;
CREATE POLICY m02_metadata_select_r5 ON vault_macro02_private.metadata_commits_r5 FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY m02_metadata_insert_r5 ON vault_macro02_private.metadata_commits_r5 FOR INSERT TO vault_macro02_worker WITH CHECK(user_id=vault_macro02_private.actor_uid());

-- Keep reference checks in a private routine. Its only result is success or
-- failure, and it cannot resolve a different account's clinical records.
CREATE FUNCTION vault_macro02_private.metadata_reference_r5(t text,r jsonb,p_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; rel text; val text; pid uuid; mid uuid; owns boolean;
BEGIN
 IF p_uid IS NULL OR auth.uid() IS DISTINCT FROM p_uid OR r->>'user_id' IS DISTINCT FROM p_uid::text THEN RAISE EXCEPTION 'M02_R5_REFERENCE_SCOPE'; END IF;
 pid:=(r->>'person_id')::uuid;
 IF pid IS NULL OR NOT EXISTS(SELECT 1 FROM public.persons WHERE id=pid AND user_id=p_uid) THEN RAISE EXCEPTION 'M02_R5_PERSON'; END IF;
 mid:=CASE WHEN t='medicamentos' THEN (r->>'id')::uuid ELSE (r->>'medicamento_id')::uuid END;
 IF t<>'medicamentos' AND NOT EXISTS(SELECT 1 FROM public.medicamentos WHERE id=mid AND user_id=p_uid AND person_id=pid) THEN RAISE EXCEPTION 'M02_R5_MEDICATION'; END IF;
 FOR k,rel IN SELECT * FROM (VALUES('medico_id','medicos'),('medico_descontinuacao_id','medicos'),('farmacia_id','farmacias'),('hospital_id','hospitais'),('local_id','locais')) AS m(key,relname) LOOP
  IF r->>k IS NOT NULL THEN
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2)',rel) INTO owns USING (r->>k)::uuid,p_uid;
   IF NOT owns THEN RAISE EXCEPTION 'M02_R5_REFERENCE'; END IF;
  END IF;
 END LOOP;
 IF r->>'document_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documents WHERE id=(r->>'document_id')::uuid AND user_id=p_uid AND person_id=pid) THEN RAISE EXCEPTION 'M02_R5_DOCUMENT'; END IF;
 IF r->>'substituido_por_id' IS NOT NULL AND ((r->>'substituido_por_id')::uuid=mid OR NOT EXISTS(SELECT 1 FROM public.medicamentos WHERE id=(r->>'substituido_por_id')::uuid AND user_id=p_uid AND person_id=pid)) THEN RAISE EXCEPTION 'M02_R5_SUBSTITUTE'; END IF;
 FOR k,rel IN SELECT * FROM (VALUES('cid_ids','cids'),('tratamento_ids','tratamentos')) AS m(key,relname) LOOP
  IF r ? k AND r->k<>'null'::jsonb THEN
   IF jsonb_typeof(r->k)<>'array' OR jsonb_array_length(r->k)>512 OR (SELECT count(DISTINCT x) FROM jsonb_array_elements(r->k) x)<>jsonb_array_length(r->k) THEN RAISE EXCEPTION 'M02_R5_REFERENCE_LIST'; END IF;
   FOR val IN SELECT jsonb_array_elements_text(r->k) LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2 AND person_id=$3)',rel) INTO owns USING val::uuid,p_uid,pid;
    IF NOT owns THEN RAISE EXCEPTION 'M02_R5_REFERENCE_LIST_SCOPE'; END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF t='retiradas' THEN
  FOREACH k IN ARRAY ARRAY['renovacao_origem_id','renovacao_realizada_id'] LOOP
   IF r->>k IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.renovacoes WHERE id=(r->>k)::uuid AND user_id=p_uid AND person_id=pid AND medicamento_id=mid) THEN RAISE EXCEPTION 'M02_R5_RX_REFERENCE'; END IF;
  END LOOP;
  IF (r->>'fornecimento_id' IS NULL)<>(r->>'fornecimento_ciclo_id' IS NULL) THEN RAISE EXCEPTION 'M02_R5_SUPPLY_PAIR'; END IF;
  IF r->>'fornecimento_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.fornecimento_ciclos c JOIN public.fornecimento_itens i ON i.ciclo_id=c.id AND i.user_id=c.user_id AND i.person_id=c.person_id WHERE c.id=(r->>'fornecimento_ciclo_id')::uuid AND c.processo_id=(r->>'fornecimento_id')::uuid AND c.user_id=p_uid AND c.person_id=pid AND i.medicamento_id=mid) THEN RAISE EXCEPTION 'M02_R5_SUPPLY_SCOPE'; END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.metadata_reference_r5(text,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.metadata_reference_r5(text,jsonb,uuid) TO vault_macro02_worker;

-- A metadata deletion may not cascade into another clinical fact. The target
-- row is already locked FOR UPDATE by the worker, excluding new FK references.
-- Every declared inbound FK is inspected; unknown schemas fail closed.
CREATE FUNCTION vault_macro02_private.metadata_assert_no_dependents_r5(t regclass,p_id uuid,p_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f record; predicate text; blocked boolean;
BEGIN
 IF auth.uid() IS DISTINCT FROM p_uid OR p_uid IS NULL OR t NOT IN ('public.dose_logs'::regclass,'public.renovacoes'::regclass,'public.retiradas'::regclass) THEN RAISE EXCEPTION 'M02_R5_DELETE_SCOPE'; END IF;
 FOR f IN SELECT c.conrelid,c.confrelid,c.conkey,c.confkey,n.nspname,cl.relname FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE c.contype='f' AND c.confrelid=t LOOP
  SELECT string_agg(format('child.%I=parent.%I',a.attname,b.attname),' AND ' ORDER BY x.ord) INTO predicate
  FROM unnest(f.conkey,f.confkey) WITH ORDINALITY x(childkey,parentkey,ord)
  JOIN pg_attribute a ON a.attrelid=f.conrelid AND a.attnum=x.childkey
  JOIN pg_attribute b ON b.attrelid=f.confrelid AND b.attnum=x.parentkey;
  IF predicate IS NULL THEN RAISE EXCEPTION 'M02_R5_FK_CATALOG'; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I child JOIN %s parent ON %s WHERE parent.id=$1 AND parent.user_id=$2)',f.nspname,f.relname,t,predicate) INTO blocked USING p_id,p_uid;
  IF blocked THEN RAISE EXCEPTION 'M02_R5_DEPENDENT_HISTORY'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.metadata_assert_no_dependents_r5(regclass,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.metadata_assert_no_dependents_r5(regclass,uuid,uuid) TO vault_macro02_worker;

-- All metadata writes are serialized by the same per-account lock as dose
-- and stock writes. Exact typed preimages, not timestamps alone, are CAS inputs.
-- No generic upsert. A conflict aborts the complete batch and receipt.
CREATE FUNCTION vault_macro02_private.commit_metadata_r5(p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); ep uuid; op uuid; old vault_macro02_private.metadata_commits_r5%ROWTYPE;
 c jsonb; a jsonb; b jsonb; r jsonb; actual jsonb; expected jsonb; saved jsonb; tbl text; rel regclass; rid uuid; pid uuid; mid uuid; fields text[]; columns text; values_sql text; update_sql text; ack jsonb; n integer; tid uuid; receipt jsonb;
BEGIN
 IF uid IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'M02_R5_AUTH'; END IF;
 ep:=(p_intent->>'epoch')::uuid;op:=(p_intent->>'operation_id')::uuid;
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,ep);
 IF vault_macro02_private.metadata_intent_policy_r4(p_intent,uid,ep) IS DISTINCT FROM true THEN RAISE EXCEPTION 'M02_R5_POLICY'; END IF;
 SELECT * INTO old FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=uid AND operation_id=op;
 IF FOUND THEN IF old.epoch IS DISTINCT FROM ep OR old.request IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'M02_R5_REPLAY_CHANGED'; END IF;RETURN old.ack;END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits WHERE user_id=uid AND operation_id=op) THEN RAISE EXCEPTION 'M02_R5_OPERATION_COLLISION'; END IF;
 -- Dependency order: delete children first; create parents first. Ordinary
 -- updates follow the same parent order; metadata policy forbids ambiguous routes.
 FOR c IN SELECT value FROM jsonb_array_elements(p_intent->'changes') WITH ORDINALITY x(value,ord)
  ORDER BY CASE WHEN value->'after'='null'::jsonb THEN 0 ELSE 1 END,
   CASE WHEN value->'after'='null'::jsonb THEN CASE value->>'table' WHEN 'retiradas' THEN 0 WHEN 'doseLogs' THEN 1 WHEN 'renovacoes' THEN 2 ELSE 3 END
   ELSE CASE value->>'table' WHEN 'medicamentos' THEN 0 WHEN 'renovacoes' THEN 1 WHEN 'retiradas' THEN 2 ELSE 3 END END,ord
 LOOP
  tbl:=c->>'table';rel:=CASE tbl WHEN 'doseLogs' THEN 'public.dose_logs'::regclass WHEN 'medicamentos' THEN 'public.medicamentos'::regclass WHEN 'renovacoes' THEN 'public.renovacoes'::regclass WHEN 'retiradas' THEN 'public.retiradas'::regclass ELSE NULL END;
  a:=nullif(c->'before','null'::jsonb);b:=nullif(c->'after','null'::jsonb);r:=coalesce(b,a);rid:=(r->>'id')::uuid;pid:=(r->>'person_id')::uuid;mid:=CASE WHEN tbl='medicamentos' THEN rid ELSE (r->>'medicamento_id')::uuid END;
  fields:=vault_macro02_private.metadata_columns_r4(tbl);
  -- A typed cast normalizes timestamptz and time representations but not data.
  EXECUTE format('SELECT to_jsonb(x)-%L FROM %s x WHERE id=$1 AND user_id=$2 AND person_id=$3 FOR UPDATE','synced',rel) INTO actual USING rid,uid,pid;
  IF a IS NULL THEN IF actual IS NOT NULL THEN RAISE EXCEPTION 'M02_R5_CREATE_CAS';END IF;
  ELSE
   EXECUTE format('SELECT to_jsonb(jsonb_populate_record(NULL::%s,$1))-%L',rel,'synced') INTO expected USING a;
   IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_R5_PREIMAGE_CAS'; END IF;
  END IF;
  IF b IS NOT NULL THEN
   IF (b->>'updated_at')::timestamptz>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'M02_R5_FUTURE_REVISION'; END IF;
   PERFORM vault_macro02_private.metadata_reference_r5(tbl,b,uid);
  END IF;
  IF c->>'kind'='withdrawal-link-receipt' THEN
   SELECT to_jsonb(x) INTO receipt FROM public.renovacoes x WHERE id=(c->'receipt'->>'id')::uuid AND user_id=uid AND person_id=pid AND medicamento_id=mid FOR UPDATE;
   SELECT to_jsonb(jsonb_populate_record(NULL::public.renovacoes,c->'receipt')) INTO expected;
   IF receipt IS DISTINCT FROM expected OR EXISTS(SELECT 1 FROM public.retiradas WHERE renovacao_realizada_id=(c->'receipt'->>'id')::uuid AND id<>rid) THEN RAISE EXCEPTION 'M02_R5_RECEIPT_CAS'; END IF;
  END IF;
  IF tbl='doseLogs' AND b IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.dose_logs WHERE user_id=uid AND person_id=pid AND medicamento_id=mid AND data=(b->>'data')::date AND left(horario,5)=b->>'horario' AND id<>rid AND (dose_kind IS NULL OR dose_kind IN ('planned','scheduled'))) THEN RAISE EXCEPTION 'M02_R5_DUPLICATE_SLOT'; END IF;
  END IF;
  IF b IS NULL THEN
   PERFORM vault_macro02_private.metadata_assert_no_dependents_r5(rel,rid,uid);
   EXECUTE format('DELETE FROM %s WHERE id=$1 AND user_id=$2 AND person_id=$3',rel) USING rid,uid,pid;
   GET DIAGNOSTICS n=ROW_COUNT;IF n<>1 THEN RAISE EXCEPTION 'M02_R5_DELETE_COUNT'; END IF;
  ELSE
   SELECT string_agg(format('%I',k),',' ORDER BY ord),string_agg(format('x.%I',k),',' ORDER BY ord),string_agg(format('%I=x.%I',k,k),',' ORDER BY ord) FILTER(WHERE k NOT IN('id','user_id','person_id','created_at')) INTO columns,values_sql,update_sql FROM unnest(fields) WITH ORDINALITY f(k,ord);
   IF a IS NULL THEN EXECUTE format('INSERT INTO %s(%s) SELECT %s FROM jsonb_populate_record(NULL::%s,$1) x',rel,columns,values_sql,rel) USING b;
   ELSE EXECUTE format('UPDATE %s target SET %s FROM jsonb_populate_record(NULL::%s,$1) x WHERE target.id=$2 AND target.user_id=$3 AND target.person_id=$4',rel,update_sql,rel) USING b,rid,uid,pid;
   END IF;
   GET DIAGNOSTICS n=ROW_COUNT;IF n<>1 THEN RAISE EXCEPTION 'M02_R5_WRITE_COUNT';END IF;
   EXECUTE format('SELECT to_jsonb(x)-%L FROM %s x WHERE id=$1 AND user_id=$2 AND person_id=$3','synced',rel) INTO saved USING rid,uid,pid;
   EXECUTE format('SELECT to_jsonb(jsonb_populate_record(NULL::%s,$1))-%L',rel,'synced') INTO expected USING b;
   IF saved IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_R5_POSTIMAGE'; END IF;
   IF tbl='medicamentos' AND (a IS NULL OR a->'tratamento_ids' IS DISTINCT FROM b->'tratamento_ids') THEN
    -- Preserve IDs of existing relations; only explicit differences are written.
    DELETE FROM public.medicamento_tratamentos j WHERE j.medicamento_id=rid AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(nullif(b->'tratamento_ids','null'::jsonb),'[]'::jsonb)) x(id) WHERE x.id::uuid=j.tratamento_id);
    FOR tid IN SELECT x.id::uuid FROM jsonb_array_elements_text(coalesce(nullif(b->'tratamento_ids','null'::jsonb),'[]'::jsonb)) x(id) LOOP
     IF NOT EXISTS(SELECT 1 FROM public.medicamento_tratamentos WHERE medicamento_id=rid AND tratamento_id=tid) THEN INSERT INTO public.medicamento_tratamentos(id,medicamento_id,tratamento_id) VALUES(gen_random_uuid(),rid,tid);END IF;
    END LOOP;
   END IF;
  END IF;
 END LOOP;
 ack:=jsonb_build_object('format','macro02-metadata-ack-r5','account_id',uid,'epoch',ep,'operation_id',op,'request',p_intent,'committed',true);
 INSERT INTO vault_macro02_private.metadata_commits_r5(user_id,epoch,operation_id,request,ack) VALUES(uid,ep,op,p_intent,ack);
 RETURN ack;
END $$;
-- Ownership and grants are installed by the activation candidate after all
-- RLS checks, column contracts and fence roles have been established.
REVOKE ALL ON FUNCTION vault_macro02_private.commit_metadata_r5(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
