-- VAULT 360 A7/M5: generic pathways, explicit links only, no clinical conclusions or migration of old facts.
-- Requires A7, A5, M5, A9 and the private M3 document authority.
ALTER TABLE public.surgery_journey_events_a7
 ADD COLUMN topic text;
ALTER TABLE public.surgery_journey_events_a7
 ADD CONSTRAINT a7m5_surgery_topic CHECK (
  topic IS NULL OR
  (stage='pre' AND topic IN ('indication','assessment','preparation','other')) OR
  (stage='procedure' AND topic IN ('procedure_performed','findings','intercurrence','other')) OR
  (stage='post' AND topic IN ('wound_care','postoperative_guidance','pain_report','other')) OR
  (stage='return' AND topic IN ('follow_up','assessment','other'))
 );

-- Existing facts stay in their own tables. An intention is neither a surgery nor an appointment.
CREATE UNIQUE INDEX IF NOT EXISTS a7m5_consultation_scope ON public.consultas(id,user_id,person_id);
CREATE UNIQUE INDEX IF NOT EXISTS a7m5_surgery_scope ON public.cirurgias(id,user_id,person_id);
CREATE UNIQUE INDEX IF NOT EXISTS a7m5_exam_order_scope ON public.exam_orders(id,user_id,person_id);
CREATE UNIQUE INDEX IF NOT EXISTS a7m5_medication_scope ON public.medicamentos(id,user_id,person_id);
CREATE UNIQUE INDEX IF NOT EXISTS a7m5_health_record_scope ON public.registros_saude(id,user_id,person_id);

CREATE TABLE public.surgical_intents_a7m5 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 person_id uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 180),
 status text NOT NULL CHECK(status IN ('requested','under_review','scheduled','withdrawn')),
 source text NOT NULL CHECK(source IN ('self_report','professional_document')),
 source_consultation_id uuid,
 source_professional_id uuid,
 linked_surgery_id uuid,
 note text CHECK(note IS NULL OR length(note)<=2500),
 corrects_intent_id uuid,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz CHECK(deleted_at IS NULL),
 CONSTRAINT a7m5_intent_owner UNIQUE(id,user_id,person_id),
 CONSTRAINT a7m5_intent_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_intent_consultation FOREIGN KEY(source_consultation_id,user_id,person_id) REFERENCES public.consultas(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_intent_professional FOREIGN KEY(source_professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_intent_surgery FOREIGN KEY(linked_surgery_id,user_id,person_id) REFERENCES public.cirurgias(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_intent_previous FOREIGN KEY(corrects_intent_id,user_id,person_id) REFERENCES public.surgical_intents_a7m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_intent_not_self CHECK(corrects_intent_id IS NULL OR corrects_intent_id<>id),
 CONSTRAINT a7m5_intent_confirmed CHECK(status<>'scheduled' OR linked_surgery_id IS NOT NULL),
 CONSTRAINT a7m5_intent_timestamps CHECK(updated_at>=created_at)
);
CREATE UNIQUE INDEX a7m5_intent_single_revision ON public.surgical_intents_a7m5(corrects_intent_id) WHERE corrects_intent_id IS NOT NULL;
CREATE INDEX a7m5_intent_person_index ON public.surgical_intents_a7m5(user_id,person_id,created_at DESC,id);
CREATE INDEX a7m5_intent_surgery_index ON public.surgical_intents_a7m5(user_id,person_id,linked_surgery_id) WHERE linked_surgery_id IS NOT NULL;

CREATE TABLE public.surgery_evidence_links_a7m5 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 person_id uuid NOT NULL,
 surgery_id uuid NOT NULL,
 target_type text NOT NULL CHECK(target_type IN ('procedure_event_a9','exam_order','medication','health_record')),
 target_id uuid NOT NULL,
 stage text NOT NULL CHECK(stage IN ('pre','procedure','post','return')),
 source text NOT NULL CHECK(source IN ('self_report','professional_document')),
 note text CHECK(note IS NULL OR length(note)<=1000),
 action text NOT NULL CHECK(action IN ('link','unlink')),
 corrects_link_id uuid,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz CHECK(deleted_at IS NULL),
 CONSTRAINT a7m5_evidence_owner UNIQUE(id,user_id,person_id),
 CONSTRAINT a7m5_evidence_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_evidence_surgery FOREIGN KEY(surgery_id,user_id,person_id) REFERENCES public.cirurgias(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_evidence_prior FOREIGN KEY(corrects_link_id,user_id,person_id) REFERENCES public.surgery_evidence_links_a7m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a7m5_evidence_action CHECK((action='link' AND corrects_link_id IS NULL) OR (action='unlink' AND corrects_link_id IS NOT NULL)),
 CONSTRAINT a7m5_evidence_not_self CHECK(corrects_link_id IS NULL OR corrects_link_id<>id),
 CONSTRAINT a7m5_evidence_time CHECK(updated_at>=created_at)
);
CREATE UNIQUE INDEX a7m5_evidence_one_unlink ON public.surgery_evidence_links_a7m5(corrects_link_id) WHERE corrects_link_id IS NOT NULL;
CREATE INDEX a7m5_evidence_scope ON public.surgery_evidence_links_a7m5(user_id,person_id,surgery_id,created_at DESC);
CREATE INDEX a7m5_evidence_target ON public.surgery_evidence_links_a7m5(user_id,person_id,target_type,target_id);

CREATE FUNCTION public.vault_a7m5_immutable() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'A7/M5: fatos de continuidade são imutáveis; registre nova revisão' USING ERRCODE='23514';END;$$;
CREATE TRIGGER a7m5_intent_immutable BEFORE UPDATE OR DELETE ON public.surgical_intents_a7m5
 FOR EACH ROW EXECUTE FUNCTION public.vault_a7m5_immutable();
CREATE TRIGGER a7m5_evidence_immutable BEFORE UPDATE OR DELETE ON public.surgery_evidence_links_a7m5
 FOR EACH ROW EXECUTE FUNCTION public.vault_a7m5_immutable();

CREATE FUNCTION public.vault_a7m5_guard_evidence() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE valid_target boolean:=false; original public.surgery_evidence_links_a7m5%ROWTYPE;
BEGIN
 CASE NEW.target_type
  WHEN 'procedure_event_a9' THEN
   SELECT EXISTS(SELECT 1 FROM public.procedure_events_a9 x WHERE x.id=NEW.target_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id) INTO valid_target;
  WHEN 'exam_order' THEN
   SELECT EXISTS(SELECT 1 FROM public.exam_orders x WHERE x.id=NEW.target_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_target;
  WHEN 'medication' THEN
   SELECT EXISTS(SELECT 1 FROM public.medicamentos x WHERE x.id=NEW.target_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id) INTO valid_target;
  WHEN 'health_record' THEN
   SELECT EXISTS(SELECT 1 FROM public.registros_saude x WHERE x.id=NEW.target_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id) INTO valid_target;
 END CASE;
 IF NOT valid_target THEN RAISE EXCEPTION 'A7/M5: alvo fora da conta/pessoa ou ausente' USING ERRCODE='23503';END IF;
 IF NEW.action='unlink' THEN
  SELECT * INTO original FROM public.surgery_evidence_links_a7m5 x WHERE x.id=NEW.corrects_link_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id;
  IF NOT FOUND OR original.action<>'link' OR original.surgery_id<>NEW.surgery_id OR original.target_type<>NEW.target_type OR original.target_id<>NEW.target_id OR original.stage<>NEW.stage THEN
   RAISE EXCEPTION 'A7/M5: desvínculo não corresponde ao fato original' USING ERRCODE='23514';END IF;
 END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER a7m5_evidence_guard BEFORE INSERT ON public.surgery_evidence_links_a7m5
 FOR EACH ROW EXECUTE FUNCTION public.vault_a7m5_guard_evidence();

ALTER TABLE public.surgical_intents_a7m5 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgery_evidence_links_a7m5 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_intents_a7m5 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.surgery_evidence_links_a7m5 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.surgical_intents_a7m5,public.surgery_evidence_links_a7m5 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.surgical_intents_a7m5,public.surgery_evidence_links_a7m5 TO authenticated;
CREATE POLICY a7m5_intent_read ON public.surgical_intents_a7m5 FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a7m5_intent_add ON public.surgical_intents_a7m5 FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a7m5_link_read ON public.surgery_evidence_links_a7m5 FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a7m5_link_add ON public.surgery_evidence_links_a7m5 FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));

-- M3 private documentary targets: keep all previous targets, add only scoped A7/M5 objects.
ALTER TABLE public.clinical_asset_links DROP CONSTRAINT clinical_asset_links_entity_type_check;
ALTER TABLE public.clinical_asset_links ADD CONSTRAINT clinical_asset_links_entity_type_check
 CHECK(entity_type IN ('exam_order','exam_order_item','exam_session','consultation',
  'rehab_program','rehab_session','hospitalization','hospitalization_event','hospitalization_discharge',
  'vaccination_event','procedure_event','sensitivity_event','surgery_event','surgical_intent','rehab_milestone'));
-- Trigger function replacement follows below, generated from the existing A9 owner-checker

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
 WHEN 'procedure_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.procedure_events_a9 e WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id) INTO valid_owner;
 WHEN 'sensitivity_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.sensitivity_events_a9 e WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id) INTO valid_owner;
 WHEN 'surgery_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.surgery_journey_events_a7 e WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id AND e.deleted_at IS NULL) INTO valid_owner;
 WHEN 'surgical_intent' THEN
  SELECT EXISTS(SELECT 1 FROM public.surgical_intents_a7m5 e WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id) INTO valid_owner;
 WHEN 'rehab_milestone' THEN
  SELECT EXISTS(SELECT 1 FROM public.rehab_milestones_m5 e WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id AND e.deleted_at IS NULL) INTO valid_owner;
 ELSE valid_owner:=false;
 END CASE;
 IF NOT valid_owner THEN RAISE EXCEPTION 'Clinical asset target does not exist for this user and person' USING ERRCODE='23503';END IF;
 RETURN NEW;
END;$$;

REVOKE ALL ON FUNCTION public.vault_validate_clinical_asset_link_m1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a7m5_immutable() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a7m5_guard_evidence() FROM PUBLIC,anon,authenticated;