-- VAULT A9: fact-recording only. No diagnoses inferred, no existing A7/A5/M5/M144 data rewritten.
-- Both authorities append facts and revisions; migration expects A8 applied and links to M3 private assets.
CREATE TABLE public.procedure_events_a9 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 person_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('entry','amendment','void')),
 effective_status text NOT NULL CHECK(effective_status IN ('planned','performed','not_performed','void')),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 180),
 category text NOT NULL CHECK(category IN ('ambulatory','dressing','other')),
 planned_on date,
 performed_on date,
 source text NOT NULL CHECK(source IN ('self_report','professional_document')),
 professional_id uuid,
 location_id uuid,
 consultation_id uuid,
 rehab_session_id uuid,
 note text CHECK(note IS NULL OR length(note)<=3000),
 corrects_event_id uuid,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz CHECK(deleted_at IS NULL),
 CONSTRAINT a9_procedure_unique_owner UNIQUE(id,user_id,person_id),
 CONSTRAINT a9_procedure_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a9_procedure_professional FOREIGN KEY(professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a9_procedure_place FOREIGN KEY(location_id,user_id) REFERENCES public.locais(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a9_procedure_consultation FOREIGN KEY(consultation_id) REFERENCES public.consultas(id) ON DELETE RESTRICT,
 CONSTRAINT a9_procedure_rehab FOREIGN KEY(rehab_session_id,user_id,person_id) REFERENCES public.rehab_sessions_m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a9_procedure_correction FOREIGN KEY(corrects_event_id,user_id,person_id) REFERENCES public.procedure_events_a9(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a9_procedure_no_self CHECK(corrects_event_id IS NULL OR corrects_event_id<>id),
 CONSTRAINT a9_procedure_time CHECK(updated_at>=created_at),
 CONSTRAINT a9_procedure_truth CHECK (
  (kind='entry' AND corrects_event_id IS NULL AND effective_status<>'void') OR
  (kind='amendment' AND corrects_event_id IS NOT NULL AND effective_status<>'void') OR
  (kind='void' AND corrects_event_id IS NOT NULL AND effective_status='void')
 ),
 CONSTRAINT a9_procedure_dates CHECK (
  (effective_status='planned' AND planned_on IS NOT NULL AND performed_on IS NULL) OR
  (effective_status IN ('performed','not_performed') AND planned_on IS NULL AND performed_on IS NOT NULL) OR
  (effective_status='void' AND planned_on IS NULL AND performed_on IS NULL)
 )
);
CREATE INDEX a9_procedure_scope ON public.procedure_events_a9(user_id,person_id,created_at DESC,id);
CREATE INDEX a9_procedure_prof_scope ON public.procedure_events_a9(user_id,professional_id,person_id);
CREATE INDEX a9_procedure_place_scope ON public.procedure_events_a9(user_id,location_id,person_id);
CREATE UNIQUE INDEX a9_procedure_one_amendment ON public.procedure_events_a9(corrects_event_id) WHERE corrects_event_id IS NOT NULL;

CREATE TABLE public.sensitivity_events_a9 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 person_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('entry','amendment','void')),
 sensitivity_type text NOT NULL CHECK(sensitivity_type IN ('allergy','intolerance','reaction')),
 agent_label text NOT NULL CHECK(length(btrim(agent_label)) BETWEEN 1 AND 180),
 certainty text NOT NULL CHECK(certainty IN ('suspected','documented_by_professional')),
 severity text NOT NULL CHECK(severity IN ('unknown','mild','moderate','severe')),
 reported_on date NOT NULL,
 related_type text CHECK(related_type IN ('medication','vaccination_event','procedure_event')),
 related_id uuid,
 professional_id uuid,
 source text NOT NULL CHECK(source IN ('self_report','professional_document')),
 note text CHECK(note IS NULL OR length(note)<=3000),
 corrects_event_id uuid,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz CHECK(deleted_at IS NULL),
 CONSTRAINT a9_sensitivity_scope_unique UNIQUE(id,user_id,person_id),
 CONSTRAINT a9_sensitivity_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a9_sensitivity_prof FOREIGN KEY(professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT a9_sensitivity_correction FOREIGN KEY(corrects_event_id,user_id,person_id) REFERENCES public.sensitivity_events_a9(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT a9_sensitivity_no_self CHECK(corrects_event_id IS NULL OR corrects_event_id<>id),
 CONSTRAINT a9_sensitivity_time CHECK(updated_at>=created_at),
 CONSTRAINT a9_sensitivity_pair CHECK((related_type IS NULL)=(related_id IS NULL)),
 CONSTRAINT a9_sensitivity_status CHECK((kind='entry' AND corrects_event_id IS NULL) OR (kind IN ('amendment','void') AND corrects_event_id IS NOT NULL)),
 CONSTRAINT a9_sensitivity_source CHECK(certainty<>'documented_by_professional' OR source='professional_document')
);
CREATE INDEX a9_sensitivity_owner ON public.sensitivity_events_a9(user_id,person_id,reported_on DESC,id);
CREATE INDEX a9_sensitivity_related ON public.sensitivity_events_a9(user_id,person_id,related_type,related_id) WHERE related_id IS NOT NULL;
CREATE UNIQUE INDEX a9_sensitivity_one_amendment ON public.sensitivity_events_a9(corrects_event_id) WHERE corrects_event_id IS NOT NULL;

-- Every fact is append-only, including notes and retractions.
CREATE FUNCTION public.vault_a9_immutable() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'A9: fatos são imutáveis; retifique com novo evento' USING ERRCODE='23514';END;$$;
CREATE TRIGGER a9_procedure_immutable BEFORE UPDATE OR DELETE ON public.procedure_events_a9 FOR EACH ROW EXECUTE FUNCTION public.vault_a9_immutable();
CREATE TRIGGER a9_sensitivity_immutable BEFORE UPDATE OR DELETE ON public.sensitivity_events_a9 FOR EACH ROW EXECUTE FUNCTION public.vault_a9_immutable();

CREATE FUNCTION public.vault_a9_guard_procedure() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.consultation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.consultas c WHERE c.id=NEW.consultation_id AND c.user_id=NEW.user_id AND c.person_id=NEW.person_id) THEN
  RAISE EXCEPTION 'A9: consulta não pertence à mesma pessoa' USING ERRCODE='23503';END IF;
 IF NEW.corrects_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.procedure_events_a9 p WHERE p.id=NEW.corrects_event_id AND p.kind='void') THEN
  RAISE EXCEPTION 'A9: registro cancelado não admite nova edição' USING ERRCODE='23514';END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER a9_procedure_insert_guard BEFORE INSERT ON public.procedure_events_a9 FOR EACH ROW EXECUTE FUNCTION public.vault_a9_guard_procedure();

CREATE FUNCTION public.vault_a9_guard_sensitivity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE valid_owner boolean:=false;
BEGIN
 IF NEW.related_type='medication' THEN
  SELECT EXISTS(SELECT 1 FROM public.medicamentos e WHERE e.id=NEW.related_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id) INTO valid_owner;
 ELSIF NEW.related_type='vaccination_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.vaccination_events_a8 e JOIN public.vaccination_courses_a8 c ON c.id=e.course_id AND c.user_id=e.user_id AND c.person_id=e.person_id WHERE e.id=NEW.related_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id AND c.deleted_at IS NULL) INTO valid_owner;
 ELSIF NEW.related_type='procedure_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.procedure_events_a9 e WHERE e.id=NEW.related_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id) INTO valid_owner;
 END IF;
 IF NEW.related_id IS NOT NULL AND NOT valid_owner THEN RAISE EXCEPTION 'A9: vínculo fora do escopo da pessoa' USING ERRCODE='23503';END IF;
 IF NEW.corrects_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.sensitivity_events_a9 e WHERE e.id=NEW.corrects_event_id AND e.kind='void') THEN
  RAISE EXCEPTION 'A9: relato cancelado não admite nova edição' USING ERRCODE='23514';END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER a9_sensitivity_insert_guard BEFORE INSERT ON public.sensitivity_events_a9 FOR EACH ROW EXECUTE FUNCTION public.vault_a9_guard_sensitivity();

ALTER TABLE public.procedure_events_a9 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitivity_events_a9 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_events_a9 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sensitivity_events_a9 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.procedure_events_a9,public.sensitivity_events_a9 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.procedure_events_a9,public.sensitivity_events_a9 TO authenticated;
CREATE POLICY a9_procedure_select ON public.procedure_events_a9 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a9_procedure_insert ON public.procedure_events_a9 FOR INSERT TO authenticated WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a9_sensitivity_select ON public.sensitivity_events_a9 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY a9_sensitivity_insert ON public.sensitivity_events_a9 FOR INSERT TO authenticated WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));

-- Private M3 links: extend target types while keeping all previous A8/legacy targets.
ALTER TABLE public.clinical_asset_links DROP CONSTRAINT clinical_asset_links_entity_type_check;
ALTER TABLE public.clinical_asset_links ADD CONSTRAINT clinical_asset_links_entity_type_check
 CHECK (entity_type IN ('exam_order','exam_order_item','exam_session','consultation',
  'rehab_program','rehab_session','hospitalization','hospitalization_event','hospitalization_discharge','vaccination_event','procedure_event','sensitivity_event'));
-- M3 trigger body replaced below with the original A8 implementation plus two new cases.
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
 ELSE valid_owner:=false;
 END CASE;
 IF NOT valid_owner THEN RAISE EXCEPTION 'Clinical asset target does not exist for this user and person' USING ERRCODE='23503';END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.vault_validate_clinical_asset_link_m1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a9_immutable() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a9_guard_procedure() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vault_a9_guard_sensitivity() FROM PUBLIC,anon,authenticated;
