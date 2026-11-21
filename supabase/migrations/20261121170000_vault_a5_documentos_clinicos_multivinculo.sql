-- A5 / M3: ONLY extend the canonical clinical_asset_links authority.
-- This migration is additive on top of the already-applied 20261121135709/35803/35903 A5 foundations.
-- No changes to clinical_assets bucket, files, doses or prescriptions.
ALTER TABLE public.clinical_asset_links DROP CONSTRAINT IF EXISTS clinical_asset_links_entity_type_check;
ALTER TABLE public.clinical_asset_links ADD CONSTRAINT clinical_asset_links_entity_type_check
 CHECK(entity_type IN ('exam_order','exam_order_item','exam_session','consultation',
                       'rehab_program','rehab_session','hospitalization','hospitalization_event','hospitalization_discharge'));
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
 WHEN 'hospitalization' THEN
  SELECT EXISTS(SELECT 1 FROM public.hospitalizations_a5 x WHERE x.id=NEW.entity_id AND x.user_id=NEW.user_id AND x.person_id=NEW.person_id AND x.deleted_at IS NULL) INTO valid_owner;
 WHEN 'hospitalization_event' THEN
  SELECT EXISTS(SELECT 1 FROM public.hospitalization_events_a5 e JOIN public.hospitalizations_a5 h ON h.id=e.hospitalization_id AND h.user_id=e.user_id AND h.person_id=e.person_id
   WHERE e.id=NEW.entity_id AND e.user_id=NEW.user_id AND e.person_id=NEW.person_id AND e.deleted_at IS NULL AND h.deleted_at IS NULL) INTO valid_owner;
 WHEN 'hospitalization_discharge' THEN
  SELECT EXISTS(SELECT 1 FROM public.hospitalization_discharge_a5 d JOIN public.hospitalizations_a5 h ON h.id=d.hospitalization_id AND h.user_id=d.user_id AND h.person_id=d.person_id
   WHERE d.id=NEW.entity_id AND d.user_id=NEW.user_id AND d.person_id=NEW.person_id AND d.deleted_at IS NULL AND h.deleted_at IS NULL) INTO valid_owner;
 ELSE valid_owner:=false;
 END CASE;
 IF NOT valid_owner THEN RAISE EXCEPTION 'Clinical asset target does not exist for this user and person' USING ERRCODE='23503';END IF;
 RETURN NEW;
END;$$;
