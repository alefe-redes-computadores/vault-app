-- FINAL-CLOSURE DELTA FOR GUARDIAN. Pending isolated validation and official migration registration.
-- Derived from the approved isolated CAS design, adapted to existing auth.uid()/RLS.
-- Requires independent verification on the real PostgreSQL 17 schema and Guardian approval.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='public.tratamentos'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='public.persons'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.tratamentos'::regclass AND tgname='vault_a0_treatment_details' AND NOT tgisinternal AND tgenabled<>'D')
 THEN RAISE EXCEPTION 'treatment RLS or historical guard drift'; END IF;
END $$;
ALTER TABLE public.tratamentos
 ADD COLUMN visual_icon text,
 ADD COLUMN visual_icon_revision integer NOT NULL DEFAULT 0,
 ADD COLUMN visual_icon_updated_at timestamptz,
 ADD COLUMN visual_icon_operation_id uuid,
 ADD CONSTRAINT vault_treatment_visual_cas_r03_ck CHECK (
  (visual_icon IS NULL AND visual_icon_revision=0 AND visual_icon_updated_at IS NULL AND visual_icon_operation_id IS NULL)
  OR (visual_icon IS NOT NULL AND visual_icon_revision>0 AND visual_icon_operation_id IS NOT NULL AND visual_icon_updated_at IS NOT NULL AND isfinite(visual_icon_updated_at)
      AND visual_icon IN ('activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill','unassigned'))
 );
CREATE ROLE vault_visual_r03_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
-- Current migration role is postgres in Supabase; ownership transfer requires SET membership.
GRANT vault_visual_r03_worker TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
CREATE SCHEMA vault_visual_r03_private;
REVOKE ALL ON SCHEMA vault_visual_r03_private FROM PUBLIC;
GRANT USAGE ON SCHEMA vault_visual_r03_private TO authenticated,vault_visual_r03_worker;
GRANT USAGE ON SCHEMA public TO vault_visual_r03_worker;
-- Managed postgres can invoke auth.uid(), but has no USAGE GRANT OPTION on auth.
-- This bridge reads only the authenticated request identity, no tables or arguments.
CREATE FUNCTION vault_visual_r03_private.actor_uid() RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() $$;
REVOKE ALL ON FUNCTION vault_visual_r03_private.actor_uid() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION vault_visual_r03_private.actor_uid() TO vault_visual_r03_worker;
GRANT SELECT(id,user_id) ON public.persons TO vault_visual_r03_worker;
GRANT SELECT(id,user_id,person_id,visual_icon,visual_icon_revision,visual_icon_operation_id,visual_icon_updated_at),
 UPDATE(visual_icon,visual_icon_revision,visual_icon_operation_id,visual_icon_updated_at) ON public.tratamentos TO vault_visual_r03_worker;
CREATE POLICY vault_visual_r03_person_read ON public.persons FOR SELECT TO vault_visual_r03_worker USING(vault_visual_r03_private.actor_uid()=user_id);
CREATE POLICY vault_visual_r03_treatment_read ON public.tratamentos FOR SELECT TO vault_visual_r03_worker USING(vault_visual_r03_private.actor_uid()=user_id);
CREATE POLICY vault_visual_r03_treatment_write ON public.tratamentos FOR UPDATE TO vault_visual_r03_worker
 USING(vault_visual_r03_private.actor_uid()=user_id AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=tratamentos.person_id AND p.user_id=vault_visual_r03_private.actor_uid()))
 WITH CHECK(vault_visual_r03_private.actor_uid()=user_id AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=tratamentos.person_id AND p.user_id=vault_visual_r03_private.actor_uid()));
CREATE FUNCTION vault_visual_r03_private.guard_treatment_visual() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.visual_icon IS NOT NULL OR NEW.visual_icon_revision IS DISTINCT FROM 0 OR NEW.visual_icon_operation_id IS NOT NULL OR NEW.visual_icon_updated_at IS NOT NULL
  THEN RAISE EXCEPTION 'visual identity requires CAS RPC' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 -- Existing person transfers need explicit cross-device ownership protocol, not implicit visual borrowing.
 IF OLD.visual_icon_revision>0 AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.person_id IS DISTINCT FROM OLD.person_id)
 THEN RAISE EXCEPTION 'visual identity scope cannot be reassigned implicitly' USING ERRCODE='23514'; END IF;
 IF current_user<>'vault_visual_r03_worker' THEN
  IF NEW.visual_icon IS NULL AND NEW.visual_icon_updated_at IS NULL AND NEW.visual_icon_operation_id IS NULL AND NEW.visual_icon_revision IN (0,OLD.visual_icon_revision) THEN
   NEW.visual_icon:=OLD.visual_icon;NEW.visual_icon_revision:=OLD.visual_icon_revision;NEW.visual_icon_operation_id:=OLD.visual_icon_operation_id;NEW.visual_icon_updated_at:=OLD.visual_icon_updated_at;
   RETURN NEW;
  END IF;
  IF NEW.visual_icon IS DISTINCT FROM OLD.visual_icon OR NEW.visual_icon_revision IS DISTINCT FROM OLD.visual_icon_revision OR NEW.visual_icon_operation_id IS DISTINCT FROM OLD.visual_icon_operation_id OR NEW.visual_icon_updated_at IS DISTINCT FROM OLD.visual_icon_updated_at
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
REVOKE ALL ON FUNCTION vault_visual_r03_private.guard_treatment_visual() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER vault_visual_r03_guard BEFORE INSERT OR UPDATE ON public.tratamentos FOR EACH ROW EXECUTE FUNCTION vault_visual_r03_private.guard_treatment_visual();
-- The internal definer is NOLOGIN/NOBYPASSRLS, not postgres. Public RPC itself is INVOKER.
CREATE FUNCTION vault_visual_r03_private.set_treatment_visual(p_id uuid,p_person uuid,p_base integer,p_choice text,p_operation uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; uid uuid:=vault_visual_r03_private.actor_uid();
BEGIN
 IF uid IS NULL OR p_id IS NULL OR p_person IS NULL OR NOT EXISTS(SELECT 1 FROM public.persons p WHERE p.id=p_person AND p.user_id=uid)
 THEN RAISE EXCEPTION 'visual identity unavailable' USING ERRCODE='42501'; END IF;
 IF p_base IS NULL OR p_base<0 OR p_base>=2147483647 OR p_operation IS NULL OR p_choice IS NULL OR p_choice NOT IN ('activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill','unassigned')
 THEN RAISE EXCEPTION 'invalid visual command' USING ERRCODE='22023'; END IF;
 UPDATE public.tratamentos t SET visual_icon=p_choice,visual_icon_revision=p_base+1,visual_icon_operation_id=p_operation
 WHERE t.id=p_id AND t.user_id=uid AND t.person_id=p_person AND t.visual_icon_revision=p_base AND t.visual_icon_operation_id IS DISTINCT FROM p_operation
 RETURNING pg_catalog.jsonb_build_object('id',t.id,'user_id',t.user_id,'person_id',t.person_id,'visual_icon',t.visual_icon,'visual_icon_revision',t.visual_icon_revision,'visual_icon_updated_at',t.visual_icon_updated_at,'visual_icon_operation_id',t.visual_icon_operation_id) INTO v;
 IF FOUND THEN RETURN pg_catalog.jsonb_build_object('status','ack','row',v); END IF;
 SELECT pg_catalog.jsonb_build_object('id',t.id,'user_id',t.user_id,'person_id',t.person_id,'visual_icon',t.visual_icon,'visual_icon_revision',t.visual_icon_revision,'visual_icon_updated_at',t.visual_icon_updated_at,'visual_icon_operation_id',t.visual_icon_operation_id)
 INTO v FROM public.tratamentos t WHERE t.id=p_id AND t.user_id=uid AND t.person_id=p_person;
 IF NOT FOUND THEN RAISE EXCEPTION 'visual identity unavailable' USING ERRCODE='42501'; END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN (v->>'visual_icon_revision')::integer=p_base+1 AND v->>'visual_icon'=p_choice AND (v->>'visual_icon_operation_id')::uuid=p_operation THEN 'ack' ELSE 'conflict' END,'row',v);
END $$;
REVOKE ALL ON FUNCTION vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
-- Grant while the migrator still owns the function; NOINHERIT is preserved after transfer.
GRANT EXECUTE ON FUNCTION vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid) TO authenticated;
GRANT CREATE ON SCHEMA vault_visual_r03_private TO vault_visual_r03_worker;
ALTER FUNCTION vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid) OWNER TO vault_visual_r03_worker;
REVOKE CREATE ON SCHEMA vault_visual_r03_private FROM vault_visual_r03_worker;
CREATE FUNCTION public.vault_set_treatment_visual_r03(p_id uuid,p_person uuid,p_base integer,p_choice text,p_operation uuid) RETURNS jsonb
 LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_visual_r03_private.set_treatment_visual(p_id,p_person,p_base,p_choice,p_operation) $$;
REVOKE ALL ON FUNCTION public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid) TO authenticated;
DO $closure$
BEGIN
 IF has_function_privilege('anon','vault_visual_r03_private.actor_uid()','EXECUTE')
 OR has_function_privilege('authenticated','vault_visual_r03_private.actor_uid()','EXECUTE')
 OR has_function_privilege('service_role','vault_visual_r03_private.actor_uid()','EXECUTE')
 OR NOT has_function_privilege('vault_visual_r03_worker','vault_visual_r03_private.actor_uid()','EXECUTE')
 OR pg_has_role('authenticated','vault_visual_r03_worker','MEMBER')
 OR pg_has_role('anon','vault_visual_r03_worker','MEMBER')
 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='vault_visual_r03_worker' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles r ON r.oid=p.proowner WHERE p.oid='vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)'::regprocedure AND r.rolname='vault_visual_r03_worker' AND p.prosecdef)
 OR NOT has_function_privilege('authenticated','vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)','EXECUTE')
 OR has_function_privilege('anon','vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)','EXECUTE')
 OR has_function_privilege('service_role','vault_visual_r03_private.set_treatment_visual(uuid,uuid,integer,text,uuid)','EXECUTE')
 OR has_function_privilege('service_role','public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)','EXECUTE')
 OR has_schema_privilege('vault_visual_r03_worker','vault_visual_r03_private','CREATE')
 OR has_function_privilege('anon','public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.vault_set_treatment_visual_r03(uuid,uuid,integer,text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'CAS effective privilege drift'; END IF;
END $closure$;
COMMIT;
