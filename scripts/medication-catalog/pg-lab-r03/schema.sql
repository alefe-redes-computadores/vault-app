-- ISOLATED LAB ONLY: intentionally not a migration and not public schema.
-- Requires a fresh local cluster, a Unix-domain socket and the dedicated laboratory DB.
\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'vault_pharma_lab_r03' OR inet_server_addr() IS NOT NULL THEN RAISE EXCEPTION 'isolated lab database only'; END IF; END $$;
CREATE SCHEMA vault_catalog_lab_r03;
REVOKE ALL ON SCHEMA vault_catalog_lab_r03 FROM PUBLIC;
CREATE ROLE vault_catalog_lab_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE vault_catalog_lab_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE vault_catalog_lab_unprivileged NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
SET search_path=pg_catalog,vault_catalog_lab_r03;
CREATE TABLE vault_catalog_lab_r03.medication_catalog_versions(id uuid PRIMARY KEY,source_key text NOT NULL,source_name text NOT NULL,source_url text,version text NOT NULL,published_at timestamptz,imported_at timestamptz NOT NULL,active boolean NOT NULL,notes text,created_at timestamptz NOT NULL,source_updated_at timestamptz,content_hash text,superseded_at timestamptz,UNIQUE(source_key,version));
CREATE UNIQUE INDEX one_active_per_source ON vault_catalog_lab_r03.medication_catalog_versions(source_key) WHERE active;
CREATE TABLE vault_catalog_lab_r03.medication_products(id uuid PRIMARY KEY,product_name text NOT NULL,product_name_normalized text NOT NULL,product_kind text NOT NULL CHECK(product_kind IN('brand','generic','similar','other')),manufacturer text,registration_number text,source_version_id uuid REFERENCES vault_catalog_lab_r03.medication_catalog_versions(id),external_id text,active boolean NOT NULL,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL);
CREATE TABLE vault_catalog_lab_r03.medication_substances(id uuid PRIMARY KEY,canonical_name text NOT NULL,canonical_name_normalized text NOT NULL UNIQUE,source_version_id uuid REFERENCES vault_catalog_lab_r03.medication_catalog_versions(id),external_id text,active boolean NOT NULL,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL);
CREATE TABLE vault_catalog_lab_r03.medication_product_substances(product_id uuid NOT NULL REFERENCES vault_catalog_lab_r03.medication_products(id),substance_id uuid NOT NULL REFERENCES vault_catalog_lab_r03.medication_substances(id),source_version_id uuid REFERENCES vault_catalog_lab_r03.medication_catalog_versions(id),external_substance_id text,position integer CHECK(position IS NULL OR position>0),is_primary boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),reconciliation_token uuid UNIQUE,PRIMARY KEY(product_id,substance_id));
-- The seven remaining frozen catalog arrays are represented as read-only JSON in this lab.
-- This is NOT a full replica of their productive table constraints or RLS.
CREATE TABLE vault_catalog_lab_r03.other_catalog_snapshot(singleton boolean PRIMARY KEY CHECK(singleton),payload jsonb NOT NULL);
CREATE TABLE vault_catalog_lab_r03.review_authorizations(id uuid PRIMARY KEY,plan jsonb NOT NULL,envelope jsonb NOT NULL,snapshot jsonb NOT NULL,version_id uuid NOT NULL REFERENCES vault_catalog_lab_r03.medication_catalog_versions(id),version_preimage jsonb NOT NULL,mode text NOT NULL CHECK(mode='ISOLATED_LAB_ONLY'));
CREATE TABLE vault_catalog_lab_r03.runs(authorization_id uuid PRIMARY KEY REFERENCES vault_catalog_lab_r03.review_authorizations(id),state text NOT NULL CHECK(state IN('applied','partially_rolled_back','rolled_back')),applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE vault_catalog_lab_r03.receipts(authorization_id uuid NOT NULL REFERENCES vault_catalog_lab_r03.runs(authorization_id),product_id uuid NOT NULL,substance_id uuid NOT NULL,token uuid NOT NULL UNIQUE,postimage jsonb NOT NULL,source_rows jsonb NOT NULL,product_rows jsonb NOT NULL,rolled_back_at timestamptz,PRIMARY KEY(authorization_id,product_id,substance_id));
ALTER TABLE vault_catalog_lab_r03.medication_catalog_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.medication_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.medication_substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.medication_product_substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.other_catalog_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.review_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_catalog_lab_r03.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_read ON vault_catalog_lab_r03.medication_catalog_versions FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY products_read ON vault_catalog_lab_r03.medication_products FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY substances_read ON vault_catalog_lab_r03.medication_substances FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY links_read ON vault_catalog_lab_r03.medication_product_substances FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY links_insert ON vault_catalog_lab_r03.medication_product_substances FOR INSERT TO vault_catalog_lab_worker WITH CHECK(reconciliation_token IS NOT NULL);
CREATE POLICY links_delete ON vault_catalog_lab_r03.medication_product_substances FOR DELETE TO vault_catalog_lab_worker USING(reconciliation_token IS NOT NULL);
CREATE POLICY other_read ON vault_catalog_lab_r03.other_catalog_snapshot FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY auth_read ON vault_catalog_lab_r03.review_authorizations FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY run_read ON vault_catalog_lab_r03.runs FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY run_insert ON vault_catalog_lab_r03.runs FOR INSERT TO vault_catalog_lab_worker WITH CHECK(true);
CREATE POLICY run_update ON vault_catalog_lab_r03.runs FOR UPDATE TO vault_catalog_lab_worker USING(true) WITH CHECK(true);
CREATE POLICY receipt_read ON vault_catalog_lab_r03.receipts FOR SELECT TO vault_catalog_lab_worker USING(true);
CREATE POLICY receipt_insert ON vault_catalog_lab_r03.receipts FOR INSERT TO vault_catalog_lab_worker WITH CHECK(true);
CREATE POLICY receipt_update ON vault_catalog_lab_r03.receipts FOR UPDATE TO vault_catalog_lab_worker USING(true) WITH CHECK(true);
GRANT USAGE ON SCHEMA vault_catalog_lab_r03 TO vault_catalog_lab_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA vault_catalog_lab_r03 TO vault_catalog_lab_worker;
GRANT INSERT,DELETE ON vault_catalog_lab_r03.medication_product_substances TO vault_catalog_lab_worker;
GRANT INSERT,UPDATE ON vault_catalog_lab_r03.runs,vault_catalog_lab_r03.receipts TO vault_catalog_lab_worker;
-- Any subsequent UPDATE invalidates the incarnation token, including a no-op update.
-- A recreated pair cannot inherit its old token. This is distinct from comparing only its values.
CREATE FUNCTION vault_catalog_lab_r03.invalidate_token() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' THEN NEW.reconciliation_token:=NULL;
 ELSIF NEW.reconciliation_token IS NOT NULL AND current_user<>'vault_catalog_lab_worker' THEN RAISE EXCEPTION 'token must originate from lab executor';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invalidate_token BEFORE INSERT OR UPDATE ON vault_catalog_lab_r03.medication_product_substances FOR EACH ROW EXECUTE FUNCTION vault_catalog_lab_r03.invalidate_token();
CREATE FUNCTION vault_catalog_lab_r03.load_fixture(f jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
DECLARE s jsonb:=f->'snapshot'; v jsonb:=f->'version'; e jsonb:=f->'envelope'; p jsonb:=f->'plan';
BEGIN
 IF current_database()<>'vault_pharma_lab_r03' OR inet_server_addr() IS NOT NULL OR f->>'mode'<>'ISOLATED_LAB_ONLY' OR v->>'source_key'<>'lab_only' OR e->>'mode'<>'REVIEW_ONLY' OR e->'officialVersionAuthorization'<>'null'::jsonb OR e->>'publication'<>'LOCKED' OR p->>'integritySHA256' IS DISTINCT FROM e->>'planSeal' THEN RAISE EXCEPTION 'untrusted lab input'; END IF;
 IF EXISTS(SELECT 1 FROM review_authorizations) THEN RAISE EXCEPTION 'fresh lab fixture required'; END IF;
 INSERT INTO medication_catalog_versions SELECT * FROM jsonb_populate_recordset(NULL::medication_catalog_versions,s->'versions');
 INSERT INTO medication_catalog_versions SELECT * FROM jsonb_populate_record(NULL::medication_catalog_versions,v);
 INSERT INTO medication_products SELECT * FROM jsonb_populate_recordset(NULL::medication_products,s->'products');
 INSERT INTO medication_substances SELECT * FROM jsonb_populate_recordset(NULL::medication_substances,s->'substances');
 INSERT INTO medication_product_substances SELECT * FROM jsonb_populate_recordset(NULL::medication_product_substances,s->'links');
 INSERT INTO other_catalog_snapshot VALUES(true,s-ARRAY['products','substances','versions','links']);
 INSERT INTO review_authorizations VALUES((f->>'authorizationId')::uuid,p,e,s,(v->>'id')::uuid,(SELECT to_jsonb(x) FROM jsonb_populate_record(NULL::medication_catalog_versions,v) x),'ISOLATED_LAB_ONLY');
END $$;
CREATE FUNCTION vault_catalog_lab_r03.require_locked_tx() RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
DECLARE t text; required text;
BEGIN
 IF current_user<>'vault_catalog_lab_worker' OR current_database()<>'vault_pharma_lab_r03' OR inet_server_addr() IS NOT NULL OR current_setting('transaction_isolation')<>'serializable' THEN RAISE EXCEPTION 'isolated serializable executor required'; END IF;
 FOREACH t IN ARRAY ARRAY['medication_catalog_versions','medication_products','medication_substances','other_catalog_snapshot','review_authorizations','medication_product_substances','runs','receipts'] LOOP
  required:=CASE WHEN t IN('medication_product_substances','runs','receipts') THEN 'ShareRowExclusiveLock' ELSE 'ShareLock' END;
  IF NOT EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND relation=to_regclass('vault_catalog_lab_r03.'||t) AND mode=required AND granted) THEN RAISE EXCEPTION 'required lock missing: %',t; END IF;
 END LOOP;
END $$;
CREATE FUNCTION vault_catalog_lab_r03.verify_version(a review_authorizations) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
BEGIN
 IF a.mode<>'ISOLATED_LAB_ONLY' OR a.envelope->'officialVersionAuthorization' IS DISTINCT FROM 'null'::jsonb OR a.envelope->>'publication'<>'LOCKED' OR a.plan->>'integritySHA256' IS DISTINCT FROM a.envelope->>'planSeal' THEN RAISE EXCEPTION 'authorization mismatch'; END IF;
 IF (SELECT to_jsonb(v) FROM medication_catalog_versions v WHERE v.id=a.version_id) IS DISTINCT FROM a.version_preimage OR a.version_preimage->>'content_hash' IS DISTINCT FROM a.envelope->>'rawSourceSHA256' OR a.version_preimage->>'source_key'<>'lab_only' OR (a.version_preimage->>'active')::boolean THEN RAISE EXCEPTION 'source version drift'; END IF;
END $$;
CREATE FUNCTION vault_catalog_lab_r03.verify_frozen_snapshot(a review_authorizations) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
BEGIN
 IF (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM medication_products x) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM jsonb_populate_recordset(NULL::medication_products,a.snapshot->'products') x) THEN RAISE EXCEPTION 'product snapshot drift'; END IF;
 IF (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM medication_substances x) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM jsonb_populate_recordset(NULL::medication_substances,a.snapshot->'substances') x) THEN RAISE EXCEPTION 'substance snapshot drift'; END IF;
 IF (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM medication_catalog_versions x WHERE id<>a.version_id) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM jsonb_populate_recordset(NULL::medication_catalog_versions,a.snapshot->'versions') x) THEN RAISE EXCEPTION 'version inventory drift'; END IF;
 IF (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY product_id,substance_id),'[]') FROM medication_product_substances x) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY product_id,substance_id),'[]') FROM jsonb_populate_recordset(NULL::medication_product_substances,a.snapshot->'links') x) THEN RAISE EXCEPTION 'link snapshot drift'; END IF;
 IF (SELECT payload FROM other_catalog_snapshot WHERE singleton) IS DISTINCT FROM a.snapshot-ARRAY['products','substances','versions','links'] THEN RAISE EXCEPTION 'other snapshot drift'; END IF;
END $$;
CREATE FUNCTION vault_catalog_lab_r03.verify_group(a review_authorizations,g jsonb,applied boolean) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
DECLARE pid uuid:=(g->>'productId')::uuid; expected jsonb; actual jsonb; pre jsonb; op jsonb; sid uuid; rec receipts%ROWTYPE;
BEGIN
 IF (SELECT to_jsonb(x) FROM medication_products x WHERE id=pid) IS DISTINCT FROM (SELECT to_jsonb(x) FROM jsonb_populate_record(NULL::medication_products,g->'preProduct') x) THEN RAISE EXCEPTION 'group product preimage drift: %',pid; END IF;
 FOR pre IN SELECT value FROM jsonb_array_elements(g->'preSubstances') LOOP
  IF (SELECT to_jsonb(x) FROM medication_substances x WHERE id=(pre->>'id')::uuid) IS DISTINCT FROM (SELECT to_jsonb(x) FROM jsonb_populate_record(NULL::medication_substances,pre) x) THEN RAISE EXCEPTION 'group substance preimage drift: %',pid; END IF;
 END LOOP;
 IF jsonb_array_length(g->'operations')<1 OR g->'writeContract' IS DISTINCT FROM '{"source_version_id":"REQUIRES_VERIFIED_NEW_SOURCE_VERSION","position":null,"is_primary":false}'::jsonb THEN RAISE EXCEPTION 'incomplete group'; END IF;
 FOR op IN SELECT value FROM jsonb_array_elements(g->'operations') LOOP
  sid:=(op->'row'->>'substance_id')::uuid;
  IF (op->'row'->>'product_id')::uuid IS DISTINCT FROM pid OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(g->'preSubstances') q WHERE (q->>'id')::uuid=sid) OR op->'row'->>'external_substance_id'='25489' OR jsonb_array_length(op->'sourceRows')<1 OR jsonb_array_length(op->'productRows')<1 THEN RAISE EXCEPTION 'invalid group operation'; END IF;
  IF applied THEN
   SELECT * INTO rec FROM receipts WHERE authorization_id=a.id AND product_id=pid AND substance_id=sid;
   IF NOT FOUND OR rec.rolled_back_at IS NOT NULL OR rec.token IS NULL OR (SELECT to_jsonb(x) FROM medication_product_substances x WHERE x.product_id=pid AND x.substance_id=sid AND x.reconciliation_token=rec.token) IS DISTINCT FROM rec.postimage THEN RAISE EXCEPTION 'operation changed or replaced: %/%',pid,sid; END IF;
  END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY substance_id),'[]') INTO actual FROM medication_product_substances x WHERE product_id=pid;
 SELECT coalesce(jsonb_agg(z.row_image ORDER BY z.sid),'[]') INTO expected FROM (
  SELECT x.substance_id sid,to_jsonb(x) AS row_image FROM jsonb_populate_recordset(NULL::medication_product_substances,g->'preLinks') x
  UNION ALL SELECT rr.substance_id,rr.postimage FROM receipts rr WHERE applied AND rr.authorization_id=a.id AND rr.product_id=pid AND rr.rolled_back_at IS NULL
 ) z;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'group membership drift: %',pid; END IF;
END $$;
CREATE FUNCTION vault_catalog_lab_r03.apply_plan(auth_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
DECLARE a review_authorizations%ROWTYPE; g jsonb; op jsonb; row_image medication_product_substances%ROWTYPE; tok uuid; n integer:=0; ng integer:=0; prior text;
BEGIN
 PERFORM require_locked_tx();SELECT * INTO STRICT a FROM review_authorizations WHERE id=auth_id;PERFORM verify_version(a);
 SELECT state INTO prior FROM runs WHERE authorization_id=auth_id;
 IF prior IS NOT NULL THEN
  IF prior<>'applied' THEN RAISE EXCEPTION 'rolled back authorization cannot be replayed'; END IF;
  FOR g IN SELECT value FROM jsonb_array_elements(a.plan->'groups') LOOP PERFORM verify_group(a,g,true); END LOOP;
  RETURN jsonb_build_object('mode','IDEMPOTENT_LAB','inserted',0,'productionWrites',0);
 END IF;
 PERFORM verify_frozen_snapshot(a);
 INSERT INTO runs(authorization_id,state) VALUES(auth_id,'applied');
 FOR g IN SELECT value FROM jsonb_array_elements(a.plan->'groups') LOOP
  PERFORM verify_group(a,g,false);ng:=ng+1;
  FOR op IN SELECT value FROM jsonb_array_elements(g->'operations') LOOP
   tok:=gen_random_uuid();
   INSERT INTO medication_product_substances(product_id,substance_id,source_version_id,external_substance_id,position,is_primary,reconciliation_token)
   VALUES((op->'row'->>'product_id')::uuid,(op->'row'->>'substance_id')::uuid,a.version_id,op->'row'->>'external_substance_id',NULL,false,tok) RETURNING * INTO row_image;
   INSERT INTO receipts(authorization_id,product_id,substance_id,token,postimage,source_rows,product_rows) VALUES(auth_id,row_image.product_id,row_image.substance_id,tok,to_jsonb(row_image),op->'sourceRows',op->'productRows');
   n:=n+1;
  END LOOP;
  PERFORM verify_group(a,g,true);
 END LOOP;
 IF n IS DISTINCT FROM (a.plan->'counts'->>'links')::integer OR ng IS DISTINCT FROM (a.plan->'counts'->>'products')::integer THEN RAISE EXCEPTION 'plan cardinality mismatch'; END IF;
 RETURN jsonb_build_object('mode','APPLIED_ISOLATED_LAB','groups',ng,'inserted',n,'productionWrites',0);
END $$;
CREATE FUNCTION vault_catalog_lab_r03.rollback_groups(auth_id uuid,requested uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vault_catalog_lab_r03,pg_temp AS $$
DECLARE a review_authorizations%ROWTYPE; g jsonb; pid uuid; rec receipts%ROWTYPE; affected int; n int:=0; total int; undone int;
BEGIN
 PERFORM require_locked_tx();SELECT * INTO STRICT a FROM review_authorizations WHERE id=auth_id;PERFORM verify_version(a);
 IF NOT EXISTS(SELECT 1 FROM runs WHERE authorization_id=auth_id) OR coalesce(cardinality(requested),0)=0 OR cardinality(requested)<>(SELECT count(DISTINCT x) FROM unnest(requested) x) THEN RAISE EXCEPTION 'explicit unique rollback groups required'; END IF;
 FOREACH pid IN ARRAY requested LOOP
  SELECT value INTO STRICT g FROM jsonb_array_elements(a.plan->'groups') WHERE (value->>'productId')::uuid=pid;
  IF NOT EXISTS(SELECT 1 FROM receipts WHERE authorization_id=auth_id AND product_id=pid AND rolled_back_at IS NULL) THEN
   -- Already rolled back: verify historic group remained unchanged, no deletion.
   PERFORM verify_group(a,g,false);CONTINUE;
  END IF;
  PERFORM verify_group(a,g,true);
  FOR rec IN SELECT * FROM receipts WHERE authorization_id=auth_id AND product_id=pid AND rolled_back_at IS NULL LOOP
   DELETE FROM medication_product_substances x WHERE x.product_id=rec.product_id AND x.substance_id=rec.substance_id AND x.reconciliation_token=rec.token AND to_jsonb(x)=rec.postimage;
   GET DIAGNOSTICS affected=ROW_COUNT;IF affected<>1 THEN RAISE EXCEPTION 'rollback token/postimage drift'; END IF;
   UPDATE receipts SET rolled_back_at=clock_timestamp() WHERE authorization_id=auth_id AND product_id=rec.product_id AND substance_id=rec.substance_id;n:=n+1;
  END LOOP;
  PERFORM verify_group(a,g,false);
 END LOOP;
 SELECT count(*),count(*) FILTER(WHERE rolled_back_at IS NOT NULL) INTO total,undone FROM receipts WHERE authorization_id=auth_id;
 UPDATE runs SET state=CASE WHEN total=undone THEN 'rolled_back' ELSE 'partially_rolled_back' END WHERE authorization_id=auth_id;
 RETURN jsonb_build_object('mode','ROLLBACK_ISOLATED_LAB','removed',n,'remaining',total-undone,'productionWrites',0);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vault_catalog_lab_r03 FROM PUBLIC;
-- No worker membership, no direct DML or internal helper execution for the caller.
GRANT USAGE ON SCHEMA vault_catalog_lab_r03 TO vault_catalog_lab_executor;
GRANT EXECUTE ON FUNCTION vault_catalog_lab_r03.require_locked_tx(),vault_catalog_lab_r03.verify_version(vault_catalog_lab_r03.review_authorizations),vault_catalog_lab_r03.verify_frozen_snapshot(vault_catalog_lab_r03.review_authorizations),vault_catalog_lab_r03.verify_group(vault_catalog_lab_r03.review_authorizations,jsonb,boolean) TO vault_catalog_lab_worker;
GRANT CREATE ON SCHEMA vault_catalog_lab_r03 TO vault_catalog_lab_worker;
ALTER FUNCTION vault_catalog_lab_r03.apply_plan(uuid) OWNER TO vault_catalog_lab_worker;
ALTER FUNCTION vault_catalog_lab_r03.rollback_groups(uuid,uuid[]) OWNER TO vault_catalog_lab_worker;
REVOKE CREATE ON SCHEMA vault_catalog_lab_r03 FROM vault_catalog_lab_worker;
GRANT EXECUTE ON FUNCTION vault_catalog_lab_r03.apply_plan(uuid),vault_catalog_lab_r03.rollback_groups(uuid,uuid[]) TO vault_catalog_lab_executor;
-- No grants to anon/authenticated/service_role; no production route or auto-migration.
