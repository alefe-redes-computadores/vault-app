-- VAULT A8 / Vaccination 360. Audited against project gqxqbfkcgfhsqtwjlhvz (22-Nov-2026).
-- Two new authorities only. M144 Diary remains an untouched historical source.
-- Append-only events; course soft-delete only. No client/service secrets or data rewrite.
CREATE TABLE public.vaccination_courses_a8 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 person_id uuid NOT NULL,
 vaccine_name text NOT NULL CHECK (length(btrim(vaccine_name)) BETWEEN 1 AND 160),
 scheme_note text CHECK (scheme_note IS NULL OR length(scheme_note)<=1600),
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz,
 CONSTRAINT a8_course_scope_unique UNIQUE(id,user_id,person_id),
 CONSTRAINT a8_course_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a8_course_time CHECK (updated_at>=created_at),
 CONSTRAINT a8_course_tombstone_time CHECK (deleted_at IS NULL OR deleted_at>=created_at)
);
CREATE INDEX a8_course_owner ON public.vaccination_courses_a8(user_id,person_id,updated_at DESC,id);
CREATE INDEX a8_course_active ON public.vaccination_courses_a8(user_id,person_id,vaccine_name) WHERE deleted_at IS NULL;

CREATE TABLE public.vaccination_events_a8 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 person_id uuid NOT NULL,
 course_id uuid NOT NULL,
 kind text NOT NULL CHECK (kind IN ('plan','dose','amendment','void')),
 effective_kind text NOT NULL CHECK (effective_kind IN ('plan','dose','void')),
 planned_on date,
 administered_on date,
 dose_number integer CHECK (dose_number BETWEEN 1 AND 99),
 manufacturer text CHECK (manufacturer IS NULL OR length(manufacturer)<=160),
 lot text CHECK (lot IS NULL OR length(lot)<=100),
 source text NOT NULL CHECK (source IN ('self_report','professional_document')),
 source_professional_id uuid,
 source_location_id uuid,
 note text CHECK (note IS NULL OR length(note)<=2500),
 corrects_event_id uuid,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz,
 CONSTRAINT a8_event_scope_unique UNIQUE(id,course_id,user_id,person_id),
 CONSTRAINT a8_event_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a8_event_course FOREIGN KEY(course_id,user_id,person_id) REFERENCES public.vaccination_courses_a8(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a8_event_professional FOREIGN KEY(source_professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a8_event_location FOREIGN KEY(source_location_id,user_id) REFERENCES public.locais(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a8_event_correction_scope FOREIGN KEY(corrects_event_id,course_id,user_id,person_id) REFERENCES public.vaccination_events_a8(id,course_id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a8_event_no_self CHECK (corrects_event_id IS NULL OR corrects_event_id<>id),
 CONSTRAINT a8_event_time CHECK (updated_at>=created_at),
 CONSTRAINT a8_event_no_soft_delete CHECK (deleted_at IS NULL),
 CONSTRAINT a8_event_kind_truth CHECK (
   (kind='plan' AND effective_kind='plan' AND corrects_event_id IS NULL AND planned_on IS NOT NULL AND administered_on IS NULL) OR
   (kind='dose' AND effective_kind='dose' AND corrects_event_id IS NULL AND administered_on IS NOT NULL AND planned_on IS NULL) OR
   (kind='amendment' AND corrects_event_id IS NOT NULL AND
      ((effective_kind='plan' AND planned_on IS NOT NULL AND administered_on IS NULL) OR
       (effective_kind='dose' AND administered_on IS NOT NULL AND planned_on IS NULL))) OR
   (kind='void' AND effective_kind='void' AND corrects_event_id IS NOT NULL AND planned_on IS NULL AND administered_on IS NULL)
 )
);
CREATE INDEX a8_events_owner ON public.vaccination_events_a8(user_id,person_id,course_id,created_at DESC,id);
CREATE INDEX a8_events_correction ON public.vaccination_events_a8(corrects_event_id) WHERE corrects_event_id IS NOT NULL;
CREATE INDEX a8_events_planned ON public.vaccination_events_a8(user_id,person_id,planned_on) WHERE planned_on IS NOT NULL;
CREATE INDEX a8_events_administered ON public.vaccination_events_a8(user_id,person_id,administered_on) WHERE administered_on IS NOT NULL;

-- Reject changes of historical facts: amendments and voids create new IDs.
CREATE FUNCTION public.vault_a8_event_immutability() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 RAISE EXCEPTION 'A8: vaccination evidence is append-only; record a correction' USING ERRCODE='23514';
END;$$;
CREATE TRIGGER a8_event_immutable BEFORE UPDATE OR DELETE ON public.vaccination_events_a8
 FOR EACH ROW EXECUTE FUNCTION public.vault_a8_event_immutability();

-- The series identity is immutable; only an explicit monotonic tombstone is accepted.
CREATE FUNCTION public.vault_a8_course_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'A8: physical delete not allowed' USING ERRCODE='23514';END IF;
 IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS NULL OR NEW.updated_at<=OLD.updated_at OR
    (NEW.id,NEW.user_id,NEW.person_id,NEW.vaccine_name,NEW.scheme_note,NEW.created_at)
       IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.person_id,OLD.vaccine_name,OLD.scheme_note,OLD.created_at)
 THEN RAISE EXCEPTION 'A8: series only allows monotonic soft-delete' USING ERRCODE='23514';END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER a8_course_guard BEFORE UPDATE OR DELETE ON public.vaccination_courses_a8
 FOR EACH ROW EXECUTE FUNCTION public.vault_a8_course_guard();

-- A delayed device cannot append to a retired series.
CREATE FUNCTION public.vault_a8_event_active_parent() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vaccination_courses_a8 c WHERE c.id=NEW.course_id
       AND c.user_id=NEW.user_id AND c.person_id=NEW.person_id AND c.deleted_at IS NULL)
 THEN RAISE EXCEPTION 'A8: series missing or retired' USING ERRCODE='23503';END IF;
 IF NEW.corrects_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.vaccination_events_a8 e
    WHERE e.corrects_event_id=NEW.corrects_event_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id)
 THEN RAISE EXCEPTION 'A8: source already amended or cancelled' USING ERRCODE='23505';END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER a8_event_parent BEFORE INSERT ON public.vaccination_events_a8
 FOR EACH ROW EXECUTE FUNCTION public.vault_a8_event_active_parent();
CREATE UNIQUE INDEX a8_event_one_correction ON public.vaccination_events_a8(corrects_event_id)
 WHERE corrects_event_id IS NOT NULL;

ALTER TABLE public.vaccination_courses_a8 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_events_a8 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_courses_a8 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_events_a8 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.vaccination_courses_a8,public.vaccination_events_a8 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.vaccination_courses_a8 TO authenticated;
GRANT SELECT,INSERT ON public.vaccination_events_a8 TO authenticated;
CREATE POLICY a8_course_select ON public.vaccination_courses_a8 FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p
          WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a8_course_insert ON public.vaccination_courses_a8 FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p
          WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a8_course_update ON public.vaccination_courses_a8 FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a8_event_select ON public.vaccination_events_a8 FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a8_event_insert ON public.vaccination_events_a8 FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));

-- M3 extends only its canonical target types. A8 never stores a public URL or copies a PDF binary.
ALTER TABLE public.clinical_asset_links DROP CONSTRAINT clinical_asset_links_entity_type_check;
ALTER TABLE public.clinical_asset_links ADD CONSTRAINT clinical_asset_links_entity_type_check
 CHECK (entity_type IN ('exam_order','exam_order_item','exam_session','consultation',
  'rehab_program','rehab_session','hospitalization','hospitalization_event','hospitalization_discharge','vaccination_event'));
CREATE OR REPLACE FUNCTION public.vault_validate_clinical_asset_link_m1()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE valid_owner boolean;
BEGIN
 IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 CASE NEW.entity_type
 WHEN 'exam_order' THEN
  SELECT EXISTS(SELECT 1 FROM public.exam_orders x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'exam_order_item' THEN
  SELECT EXISTS(SELECT 1 FROM public.exam_order_items x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'exam_session' THEN
  SELECT EXISTS(SELECT 1 FROM public.exam_sessions x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'consultation' THEN
  SELECT EXISTS(SELECT 1 FROM public.consultas x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id) INTO valid_owner;
 WHEN 'rehab_program' THEN
  SELECT EXISTS(SELECT 1 FROM public.rehab_programs_m5 x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'rehab_session' THEN
  SELECT EXISTS(SELECT 1 FROM public.rehab_sessions_m5 x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'hospitalization' THEN
  SELECT EXISTS(SELECT 1 FROM public.hospitalizations_a5 x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'hospitalization_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.hospitalization_events_a5 e JOIN public.hospitalizations_a5 h ON h.id=e.hospitalization_id AND h.user_id=e.user_id AND h.person_id=e.person_id
   WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id AND e.deleted_at IS NULL AND h.deleted_at IS NULL) INTO valid_owner;
 WHEN 'hospitalization_discharge' THEN
  SELECT EXISTS(SELECT 1 FROM public.hospitalization_discharge_a5 d JOIN public.hospitalizations_a5 h ON h.id=d.hospitalization_id AND h.user_id=d.user_id AND h.person_id=d.person_id
   WHERE d.id=NEW.entity_id AND d.user_id=NEW.user_id AND d.person_id=NEW.person_id AND d.deleted_at IS NULL AND h.deleted_at IS NULL) INTO valid_owner;
 WHEN 'vaccination_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.vaccination_events_a8 e JOIN public.vaccination_courses_a8 c
    ON c.id=e.course_id AND c.user_id=e.user_id AND c.person_id=e.person_id
    WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id AND c.deleted_at IS NULL) INTO valid_owner;
 ELSE valid_owner:=false;
 END CASE;
 IF NOT valid_owner THEN RAISE EXCEPTION 'Clinical asset target does not exist for this user and person' USING ERRCODE='23503';END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.vault_validate_clinical_asset_link_m1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a8_event_immutability() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a8_course_guard() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a8_event_active_parent() FROM PUBLIC,anon,authenticated;
