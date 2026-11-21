-- VAULT 360 / M5 MACRO2 / additive follow-up to vault_m5_reabilitacao_macro1_canonical_core.
-- No clinical history rewrite, public URL, inferred milestone or inferred discharge.
-- Apply on the VERIFIED VAULT project only, after code-contract review.
ALTER TABLE public.rehab_programs_m5
  ADD COLUMN IF NOT EXISTS modality text,
  ADD COLUMN IF NOT EXISTS primary_professional_id uuid,
  ADD COLUMN IF NOT EXISTS primary_facility_id uuid,
  ADD COLUMN IF NOT EXISTS discharged_at date,
  ADD COLUMN IF NOT EXISTS discharge_summary text,
  ADD COLUMN IF NOT EXISTS interruption_reason text;
ALTER TABLE public.rehab_programs_m5 DROP CONSTRAINT IF EXISTS rehab_programs_m5_status_check;
ALTER TABLE public.rehab_programs_m5 ADD CONSTRAINT rehab_programs_m5_status_check
 CHECK(status IN ('planned','active','suspended','completed','interrupted'));
ALTER TABLE public.rehab_programs_m5 ADD CONSTRAINT rehab_programs_m5_modality_check
 CHECK(modality IS NULL OR modality IN ('motor_physiotherapy','occupational_therapy','hydrotherapy','speech_therapy','neurological','cardiopulmonary','other'));
ALTER TABLE public.rehab_programs_m5 ADD CONSTRAINT rehab_programs_m5_primary_professional_fk
 FOREIGN KEY(primary_professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT;
ALTER TABLE public.rehab_programs_m5 ADD CONSTRAINT rehab_programs_m5_primary_facility_fk
 FOREIGN KEY(primary_facility_id,user_id) REFERENCES public.locais(id,user_id) ON DELETE RESTRICT;
ALTER TABLE public.rehab_programs_m5 ADD CONSTRAINT rehab_programs_m5_close_check
 CHECK (
  (status='completed' AND discharged_at IS NOT NULL AND NULLIF(btrim(discharge_summary),'') IS NOT NULL AND interruption_reason IS NULL)
  OR (status='interrupted' AND NULLIF(btrim(interruption_reason),'') IS NOT NULL AND discharged_at IS NULL AND discharge_summary IS NULL)
  OR (status NOT IN ('completed','interrupted') AND discharged_at IS NULL AND discharge_summary IS NULL AND interruption_reason IS NULL)
 );
ALTER TABLE public.rehab_programs_m5 ADD CONSTRAINT rehab_programs_m5_discharge_date_check
 CHECK(discharged_at IS NULL OR start_date IS NULL OR discharged_at >= start_date);

ALTER TABLE public.rehab_sessions_m5
 ADD COLUMN IF NOT EXISTS procedures_notes text,
 ADD COLUMN IF NOT EXISTS functional_notes text,
 ADD COLUMN IF NOT EXISTS pain_before smallint,
 ADD COLUMN IF NOT EXISTS pain_after smallint,
 ADD COLUMN IF NOT EXISTS professional_id uuid,
 ADD COLUMN IF NOT EXISTS reminder_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.rehab_sessions_m5 ADD CONSTRAINT rehab_sessions_m5_pain_before_check CHECK(pain_before IS NULL OR pain_before BETWEEN 0 AND 10);
ALTER TABLE public.rehab_sessions_m5 ADD CONSTRAINT rehab_sessions_m5_pain_after_check CHECK(pain_after IS NULL OR pain_after BETWEEN 0 AND 10);
ALTER TABLE public.rehab_sessions_m5 ADD CONSTRAINT rehab_sessions_m5_professional_fk
 FOREIGN KEY(professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.rehab_milestones_m5 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL,
 person_id uuid NOT NULL,
 program_id uuid NOT NULL,
 session_id uuid,
 kind text NOT NULL CHECK(kind IN ('reassessment','reported_progress','clinical_clearance','exam_referral','functional_discharge')),
 source text NOT NULL CHECK(source IN ('professional_reported','self_reported')),
 recorded_at timestamptz NOT NULL,
 notes text NOT NULL CHECK(length(btrim(notes)) BETWEEN 1 AND 2000),
 professional_id uuid,
 consultation_id uuid,
 exam_order_id uuid,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz,
 CONSTRAINT rehab_milestones_m5_program_fk FOREIGN KEY(program_id,user_id,person_id)
  REFERENCES public.rehab_programs_m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT rehab_milestones_m5_session_fk FOREIGN KEY(session_id,program_id,user_id,person_id)
  REFERENCES public.rehab_sessions_m5(id,program_id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT rehab_milestones_m5_professional_fk FOREIGN KEY(professional_id,user_id)
  REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT rehab_milestones_m5_consultation_fk FOREIGN KEY(consultation_id,user_id,person_id)
  REFERENCES public.consultas(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT rehab_milestones_m5_order_fk FOREIGN KEY(exam_order_id,user_id,person_id)
  REFERENCES public.exam_orders(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT rehab_milestones_m5_attribution_check CHECK(source <> 'self_reported' OR professional_id IS NULL),
 CONSTRAINT rehab_milestones_m5_scope_key UNIQUE(id,user_id,person_id)
);
CREATE INDEX IF NOT EXISTS rehab_milestones_m5_owner_idx ON public.rehab_milestones_m5(user_id,person_id,program_id,recorded_at);
ALTER TABLE public.rehab_milestones_m5 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rehab_milestones_m5 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.rehab_milestones_m5 TO authenticated;
CREATE POLICY m5_milestone_read ON public.rehab_milestones_m5 FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY m5_milestone_add ON public.rehab_milestones_m5 FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE POLICY m5_milestone_edit ON public.rehab_milestones_m5 FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))
 WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
CREATE TRIGGER m5_guard_update BEFORE UPDATE ON public.rehab_milestones_m5
 FOR EACH ROW EXECUTE FUNCTION public.m5_rehab_guard_update();

-- Extend the ONE M3 clinical asset authority, preserving all existing target types.
ALTER TABLE public.clinical_asset_links DROP CONSTRAINT clinical_asset_links_entity_type_check;
ALTER TABLE public.clinical_asset_links ADD CONSTRAINT clinical_asset_links_entity_type_check
 CHECK(entity_type IN ('exam_order','exam_order_item','exam_session','consultation','rehab_program','rehab_session'));
CREATE OR REPLACE FUNCTION public.vault_validate_clinical_asset_link_m1()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
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
  SELECT EXISTS(SELECT 1 FROM public.rehab_sessions_m5 x JOIN public.rehab_programs_m5 p ON p.id=x.program_id AND p.user_id=x.user_id AND p.person_id=x.person_id
   WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL AND p.deleted_at IS NULL) INTO valid_owner;
 ELSE valid_owner:=false;
 END CASE;
 IF NOT valid_owner THEN RAISE EXCEPTION 'Clinical asset target does not exist for this user and person' USING ERRCODE='23503';END IF;
 RETURN NEW;
END;$$;

-- Immutability of source records, role and clinical attribution for all milestones.
CREATE OR REPLACE FUNCTION public.m5_rehab_milestone_protect() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.person_id IS DISTINCT FROM OLD.person_id
 OR NEW.program_id IS DISTINCT FROM OLD.program_id OR NEW.session_id IS DISTINCT FROM OLD.session_id
 OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.source IS DISTINCT FROM OLD.source
 OR NEW.professional_id IS DISTINCT FROM OLD.professional_id OR NEW.consultation_id IS DISTINCT FROM OLD.consultation_id
 OR NEW.exam_order_id IS DISTINCT FROM OLD.exam_order_id OR NEW.recorded_at IS DISTINCT FROM OLD.recorded_at
 OR NEW.notes IS DISTINCT FROM OLD.notes OR NEW.created_at IS DISTINCT FROM OLD.created_at
 THEN RAISE EXCEPTION 'M5: marco factual imutável; crie novo marco para revisão';END IF;
 IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS NULL OR NEW.updated_at<=OLD.updated_at
 THEN RAISE EXCEPTION 'M5: somente tombstone monotônico é permitido';END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER m5_milestone_protect BEFORE UPDATE ON public.rehab_milestones_m5
 FOR EACH ROW EXECUTE FUNCTION public.m5_rehab_milestone_protect();
REVOKE ALL ON FUNCTION public.m5_rehab_milestone_protect() FROM PUBLIC,anon,authenticated;

-- No future milestone may masquerade as a completed clinical fact.
CREATE OR REPLACE FUNCTION public.m5_rehab_milestone_civil_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.recorded_at > now() + interval '5 minutes' THEN
  RAISE EXCEPTION 'M5: marco factual deve ter data real declarada';
 END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER m5_milestone_civil_guard BEFORE INSERT OR UPDATE ON public.rehab_milestones_m5
 FOR EACH ROW EXECUTE FUNCTION public.m5_rehab_milestone_civil_guard();
REVOKE ALL ON FUNCTION public.m5_rehab_milestone_civil_guard() FROM PUBLIC,anon,authenticated;
