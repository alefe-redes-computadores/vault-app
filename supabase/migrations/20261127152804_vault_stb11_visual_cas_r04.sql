-- REVIEW ONLY. Execute on disposable PostgreSQL 17 first. No production authorization.
-- Production registration only after Guardian's separate GO; use supabase migration new.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $pre$
BEGIN
 IF md5(pg_get_functiondef('vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)'::regprocedure))<>'04569237ad42c8f6192ec96578588888'
 OR md5(pg_get_functiondef('public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)'::regprocedure))<>'379fa35c6f89731a85b82eeb5128db5c'
 OR md5(pg_get_functiondef('vault_visual_r03_private.guard_treatment_visual()'::regprocedure))<>'39d56105cea9c750045e299b7b182cb2'
 THEN RAISE EXCEPTION 'CAS R03 definition drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.tratamentos'::regclass AND conname='vault_treatment_visual_cas_r03_ck' AND convalidated)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.tratamentos'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.persons'::regclass AND relrowsecurity)
 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.tratamentos'::regclass AND tgname IN ('vault_visual_r03_guard','vault_a0_treatment_details') AND NOT tgisinternal AND tgenabled<>'D')<>2
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vault_visual_r03_worker' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)'::regprocedure AND prosecdef AND pg_get_userbyid(proowner)='vault_visual_r03_worker' AND proconfig=ARRAY['search_path=""'])
 OR has_schema_privilege('vault_visual_r03_worker','vault_visual_r03_private','CREATE')
 OR has_table_privilege('vault_visual_r03_worker','public.tratamentos','UPDATE')
 OR pg_has_role('authenticated','vault_visual_r03_worker','MEMBER') OR pg_has_role('anon','vault_visual_r03_worker','MEMBER')
 THEN RAISE EXCEPTION 'CAS R03 authority drift'; END IF;
END $pre$;
-- Keep old constraint and every old wire key. Expanded metadata has no clinical semantics.
ALTER TABLE public.tratamentos ADD COLUMN visual_icon_expanded text;
ALTER TABLE public.tratamentos ADD CONSTRAINT vault_treatment_visual_expanded_r04_ck CHECK (
 visual_icon_expanded IS NULL OR (
  visual_icon IS NOT NULL AND visual_icon='unassigned' AND visual_icon_revision>0 AND
  visual_icon_expanded IN ('brain-circuit','waves','moon','moon-star','bed-double','cloud-moon','bone','accessibility','hand','shield-plus','eye','ear','wind','droplet','person-standing','footprints','timer','book-heart','smile','focus','sparkles','folder-heart')
 )
);
GRANT SELECT(visual_icon_expanded),UPDATE(visual_icon_expanded) ON public.tratamentos TO vault_visual_r03_worker;
-- Keep original trigger identity, ownership and ACL. No old clinical push may erase visual metadata.
CREATE OR REPLACE FUNCTION vault_visual_r03_private.guard_treatment_visual() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.visual_icon IS NOT NULL OR NEW.visual_icon_revision IS DISTINCT FROM 0 OR NEW.visual_icon_operation_id IS NOT NULL OR NEW.visual_icon_updated_at IS NOT NULL OR NEW.visual_icon_expanded IS NOT NULL
  THEN RAISE EXCEPTION 'visual identity requires CAS RPC' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.visual_icon_revision>0 AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.person_id IS DISTINCT FROM OLD.person_id)
 THEN RAISE EXCEPTION 'visual identity scope cannot be reassigned implicitly' USING ERRCODE='23514'; END IF;
 IF current_user<>'vault_visual_r03_worker' THEN
  IF NEW.visual_icon IS NULL AND NEW.visual_icon_updated_at IS NULL AND NEW.visual_icon_operation_id IS NULL AND NEW.visual_icon_revision IN (0,OLD.visual_icon_revision)
    AND (NEW.visual_icon_expanded IS NULL OR NEW.visual_icon_expanded IS NOT DISTINCT FROM OLD.visual_icon_expanded) THEN
   NEW.visual_icon:=OLD.visual_icon;NEW.visual_icon_revision:=OLD.visual_icon_revision;NEW.visual_icon_operation_id:=OLD.visual_icon_operation_id;NEW.visual_icon_updated_at:=OLD.visual_icon_updated_at;NEW.visual_icon_expanded:=OLD.visual_icon_expanded;
   RETURN NEW;
  END IF;
  IF NEW.visual_icon IS DISTINCT FROM OLD.visual_icon OR NEW.visual_icon_revision IS DISTINCT FROM OLD.visual_icon_revision OR NEW.visual_icon_operation_id IS DISTINCT FROM OLD.visual_icon_operation_id OR NEW.visual_icon_updated_at IS DISTINCT FROM OLD.visual_icon_updated_at OR NEW.visual_icon_expanded IS DISTINCT FROM OLD.visual_icon_expanded
  THEN RAISE EXCEPTION 'visual identity requires CAS RPC' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 IF vault_visual_r03_private.actor_uid() IS NULL OR NEW.user_id IS DISTINCT FROM vault_visual_r03_private.actor_uid() OR NEW.person_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.persons p WHERE p.id=NEW.person_id AND p.user_id=NEW.user_id)
 THEN RAISE EXCEPTION 'visual identity outside person scope' USING ERRCODE='42501'; END IF;
 IF OLD.visual_icon_revision>=2147483647 OR NEW.visual_icon_revision IS DISTINCT FROM OLD.visual_icon_revision+1 OR NEW.visual_icon_operation_id IS NULL OR NEW.visual_icon_operation_id IS NOT DISTINCT FROM OLD.visual_icon_operation_id
 THEN RAISE EXCEPTION 'visual revision conflict' USING ERRCODE='40001'; END IF;
 NEW.visual_icon_updated_at:=pg_catalog.clock_timestamp();
 RETURN NEW;
END $$;
-- Managed postgres is a SET member, not an inherited worker; make changes as worker.
GRANT CREATE ON SCHEMA vault_visual_r03_private TO vault_visual_r03_worker;
SET LOCAL ROLE vault_visual_r03_worker;
CREATE FUNCTION vault_visual_r03_private.set_treatment_visual_r04(p_id uuid,p_person uuid,p_base integer,p_choice text,p_operation uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; uid uuid:=vault_visual_r03_private.actor_uid(); expanded text; legacy text;
BEGIN
 IF uid IS NULL OR p_id IS NULL OR p_person IS NULL OR NOT EXISTS(SELECT 1 FROM public.persons p WHERE p.id=p_person AND p.user_id=uid)
 THEN RAISE EXCEPTION 'visual identity unavailable' USING ERRCODE='42501'; END IF;
 IF p_base IS NULL OR p_base<0 OR p_base>=2147483647 OR p_operation IS NULL OR p_choice IS NULL
 THEN RAISE EXCEPTION 'invalid visual command' USING ERRCODE='22023'; END IF;
 IF p_choice IN ('activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill','unassigned') THEN legacy:=p_choice; expanded:=NULL;
 ELSIF p_choice IN ('brain-circuit','waves','moon','moon-star','bed-double','cloud-moon','bone','accessibility','hand','shield-plus','eye','ear','wind','droplet','person-standing','footprints','timer','book-heart','smile','focus','sparkles','folder-heart') THEN legacy:='unassigned'; expanded:=p_choice;
 ELSE RAISE EXCEPTION 'invalid visual command' USING ERRCODE='22023'; END IF;
 UPDATE public.tratamentos t SET visual_icon=legacy,visual_icon_expanded=expanded,visual_icon_revision=p_base+1,visual_icon_operation_id=p_operation
 WHERE t.id=p_id AND t.user_id=uid AND t.person_id=p_person AND t.visual_icon_revision=p_base AND t.visual_icon_operation_id IS DISTINCT FROM p_operation
 RETURNING pg_catalog.jsonb_build_object('id',t.id,'user_id',t.user_id,'person_id',t.person_id,'visual_icon',t.visual_icon,'visual_icon_expanded',t.visual_icon_expanded,'visual_icon_revision',t.visual_icon_revision,'visual_icon_updated_at',t.visual_icon_updated_at,'visual_icon_operation_id',t.visual_icon_operation_id) INTO v;
 IF FOUND THEN RETURN pg_catalog.jsonb_build_object('status','ack','row',v); END IF;
 SELECT pg_catalog.jsonb_build_object('id',t.id,'user_id',t.user_id,'person_id',t.person_id,'visual_icon',t.visual_icon,'visual_icon_expanded',t.visual_icon_expanded,'visual_icon_revision',t.visual_icon_revision,'visual_icon_updated_at',t.visual_icon_updated_at,'visual_icon_operation_id',t.visual_icon_operation_id)
 INTO v FROM public.tratamentos t WHERE t.id=p_id AND t.user_id=uid AND t.person_id=p_person;
 IF NOT FOUND THEN RAISE EXCEPTION 'visual identity unavailable' USING ERRCODE='42501'; END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN (v->>'visual_icon_revision')::integer=p_base+1 AND COALESCE(v->>'visual_icon_expanded',v->>'visual_icon')=p_choice AND (v->>'visual_icon_operation_id')::uuid=p_operation THEN 'ack' ELSE 'conflict' END,'row',v);
END $$;
REVOKE ALL ON FUNCTION vault_visual_r03_private.set_treatment_visual_r04(uuid,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION vault_visual_r03_private.set_treatment_visual_r04(uuid,uuid,integer,text,uuid) TO authenticated;
-- The R03 interface cannot write expanded keys and never receives a new key in visual_icon.
-- An explicit old-client selection clears the expansion through CAS, not through ordinary sync.
CREATE OR REPLACE FUNCTION vault_visual_r03_private.set_treatment_visual(p_id uuid,p_person uuid,p_base integer,p_choice text,p_operation uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF p_choice IS NULL OR p_choice NOT IN ('activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill','unassigned')
 THEN RAISE EXCEPTION 'invalid visual command' USING ERRCODE='22023'; END IF;
 v:=vault_visual_r03_private.set_treatment_visual_r04(p_id,p_person,p_base,p_choice,p_operation);
 RETURN pg_catalog.jsonb_set(v,'{row}',(v->'row')-'visual_icon_expanded');
END $$;
RESET ROLE;
REVOKE CREATE ON SCHEMA vault_visual_r03_private FROM vault_visual_r03_worker;
CREATE FUNCTION public.vault_set_treatment_visual_r04(p_id uuid,p_person uuid,p_base integer,p_choice text,p_operation uuid) RETURNS jsonb
 LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_visual_r03_private.set_treatment_visual_r04(p_id,p_person,p_base,p_choice,p_operation) $$;
REVOKE ALL ON FUNCTION public.vault_set_treatment_visual_r04(uuid,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.vault_set_treatment_visual_r04(uuid,uuid,integer,text,uuid) TO authenticated;
DO $post$
DECLARE f regprocedure; r text;
BEGIN
 FOREACH f IN ARRAY ARRAY['public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)'::regprocedure,'public.vault_set_treatment_visual_r04(uuid,uuid,integer,text,uuid)'::regprocedure,'vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)'::regprocedure,'vault_visual_r03_private.set_treatment_visual_r04(uuid,uuid,integer,text,uuid)'::regprocedure] LOOP
  IF NOT has_function_privilege('authenticated',f,'EXECUTE') OR has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'CAS RPC privilege drift: %',f; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_proc WHERE oid IN ('public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)'::regprocedure,'public.vault_set_treatment_visual_r04(uuid,uuid,integer,text,uuid)'::regprocedure) AND (prosecdef OR proconfig IS DISTINCT FROM ARRAY['search_path=""']))
 OR EXISTS(SELECT 1 FROM pg_proc WHERE oid IN ('vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)'::regprocedure,'vault_visual_r03_private.set_treatment_visual_r04(uuid,uuid,integer,text,uuid)'::regprocedure) AND (NOT prosecdef OR pg_get_userbyid(proowner)<>'vault_visual_r03_worker' OR proconfig IS DISTINCT FROM ARRAY['search_path=""']))
 OR has_schema_privilege('vault_visual_r03_worker','vault_visual_r03_private','CREATE')
 OR has_table_privilege('vault_visual_r03_worker','public.tratamentos','UPDATE')
 OR has_column_privilege('vault_visual_r03_worker','public.tratamentos','nome','UPDATE')
 OR NOT has_column_privilege('vault_visual_r03_worker','public.tratamentos','visual_icon_expanded','UPDATE')
 OR has_function_privilege('authenticated','vault_visual_r03_private.actor_uid()','EXECUTE')
 OR has_function_privilege('anon','vault_visual_r03_private.actor_uid()','EXECUTE')
 OR pg_has_role('authenticated','vault_visual_r03_worker','MEMBER') OR pg_has_role('anon','vault_visual_r03_worker','MEMBER')
 OR md5(pg_get_functiondef('public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)'::regprocedure))<>'379fa35c6f89731a85b82eeb5128db5c'
 THEN RAISE EXCEPTION 'CAS effective authority drift'; END IF;
END $post$;
-- Only isolated lab may execute this file now. Future production SQL requires separate approval.
COMMIT;
