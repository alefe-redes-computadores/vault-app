-- FINAL-CLOSURE DELTA FOR GUARDIAN. No data mutations; pending validation and registration.
-- Execute only in isolated schema replica; Guardian must approve before any productive migration.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DO $evidence$
DECLARE p text; r text; rel regclass := 'public.medication_use_evidence'::regclass;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid=rel AND relrowsecurity)
 OR has_table_privilege('anon',rel,'SELECT') OR has_any_column_privilege('anon',rel,'SELECT')
 OR NOT has_table_privilege('authenticated',rel,'SELECT')
 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='medication_use_evidence' AND policyname='medication_use_evidence_verified_select' AND cmd='SELECT' AND roles=ARRAY['authenticated']::name[])
 OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='medication_use_evidence' AND policyname<>'medication_use_evidence_verified_select')
 THEN RAISE EXCEPTION 'restricted evidence policy drift'; END IF;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH p IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
   IF has_table_privilege(r,rel,p) THEN RAISE EXCEPTION 'restricted evidence write drift: %/%',r,p; END IF;
  END LOOP;
  IF has_any_column_privilege(r,rel,'INSERT') OR has_any_column_privilege(r,rel,'UPDATE') OR has_any_column_privilege(r,rel,'REFERENCES') THEN RAISE EXCEPTION 'restricted evidence column drift: %',r; END IF;
 END LOOP;
END $evidence$;
DO $check$
DECLARE t text; rel regclass;
BEGIN
 FOREACH t IN ARRAY ARRAY['medication_aliases', 'medication_catalog_versions', 'medication_commercial_identities', 'medication_presentations', 'medication_product_identity_memberships', 'medication_product_substances', 'medication_products', 'medication_regulatory_rule_exceptions', 'medication_regulatory_rules', 'medication_substances'] LOOP
  rel := to_regclass(format('public.%I',t));
  IF rel IS NULL OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=rel AND relrowsecurity) OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='SELECT') OR
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd<>'SELECT') THEN
   RAISE EXCEPTION 'catalog policy drift: %',t;
  END IF;
  IF NOT has_table_privilege('anon',rel,'SELECT') OR NOT has_table_privilege('authenticated',rel,'SELECT') THEN
   RAISE EXCEPTION 'read privilege drift: %',t;
  END IF;
 END LOOP;
END $check$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE
  public.medication_aliases,
  public.medication_catalog_versions,
  public.medication_commercial_identities,
  public.medication_presentations,
  public.medication_product_identity_memberships,
  public.medication_product_substances,
  public.medication_products,
  public.medication_regulatory_rule_exceptions,
  public.medication_regulatory_rules,
  public.medication_substances
FROM anon, authenticated, PUBLIC;
-- User-created candidates are not global. Preserve owner CRUD; remove non-CRUD DDL/maintenance privileges. PG17 MAINTAIN is present in the observed ACL.
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public.medication_catalog_candidates FROM anon, authenticated, PUBLIC;
DO $check$
DECLARE t text; role_name text; priv text; rel regclass;
BEGIN
 FOREACH t IN ARRAY ARRAY['medication_aliases', 'medication_catalog_versions', 'medication_commercial_identities', 'medication_presentations', 'medication_product_identity_memberships', 'medication_product_substances', 'medication_products', 'medication_regulatory_rule_exceptions', 'medication_regulatory_rules', 'medication_substances'] LOOP
  rel := to_regclass(format('public.%I',t));
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF NOT has_table_privilege(role_name,rel,'SELECT') THEN RAISE EXCEPTION 'read lost: %/%',t,role_name; END IF;
   FOREACH priv IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
    IF has_table_privilege(role_name,rel,priv) THEN RAISE EXCEPTION 'inherited grant remains: %/%/%',t,role_name,priv; END IF;
   END LOOP;
   IF has_any_column_privilege(role_name,rel,'INSERT') OR has_any_column_privilege(role_name,rel,'UPDATE') OR has_any_column_privilege(role_name,rel,'REFERENCES') THEN
    RAISE EXCEPTION 'column grant remains: %/%',t,role_name;
   END IF;
  END LOOP;
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH priv IN ARRAY ARRAY['TRUNCATE','TRIGGER','REFERENCES','MAINTAIN'] LOOP
   IF has_table_privilege(role_name,'public.medication_catalog_candidates',priv) THEN RAISE EXCEPTION 'candidate non-CRUD privilege remains: %/%',role_name,priv; END IF;
  END LOOP;
  IF has_any_column_privilege(role_name,'public.medication_catalog_candidates','REFERENCES') THEN RAISE EXCEPTION 'candidate column REFERENCES remains'; END IF;
 END LOOP;
 FOREACH priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
  IF NOT has_table_privilege('authenticated','public.medication_catalog_candidates',priv) THEN RAISE EXCEPTION 'candidate CRUD lost: %',priv; END IF;
 END LOOP;
END $check$;
DO $evidence$
DECLARE p text; r text; rel regclass := 'public.medication_use_evidence'::regclass;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid=rel AND relrowsecurity)
 OR has_table_privilege('anon',rel,'SELECT') OR has_any_column_privilege('anon',rel,'SELECT')
 OR NOT has_table_privilege('authenticated',rel,'SELECT')
 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='medication_use_evidence' AND policyname='medication_use_evidence_verified_select' AND cmd='SELECT' AND roles=ARRAY['authenticated']::name[])
 OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='medication_use_evidence' AND policyname<>'medication_use_evidence_verified_select')
 THEN RAISE EXCEPTION 'restricted evidence policy drift'; END IF;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH p IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
   IF has_table_privilege(r,rel,p) THEN RAISE EXCEPTION 'restricted evidence write drift: %/%',r,p; END IF;
  END LOOP;
  IF has_any_column_privilege(r,rel,'INSERT') OR has_any_column_privilege(r,rel,'UPDATE') OR has_any_column_privilege(r,rel,'REFERENCES') THEN RAISE EXCEPTION 'restricted evidence column drift: %',r; END IF;
 END LOOP;
END $evidence$;
COMMIT;
