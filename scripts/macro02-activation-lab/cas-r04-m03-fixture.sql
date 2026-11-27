-- Synthetic fixture only: replace its four placeholder columns with the
-- original certified CAS migration; reconstruct the existing A0 trigger.
ALTER TABLE public.tratamentos DROP COLUMN visual_icon,DROP COLUMN visual_icon_revision,DROP COLUMN visual_icon_updated_at,DROP COLUMN visual_icon_operation_id;
CREATE FUNCTION public.vault_a0_guard_treatment_details() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $function$
BEGIN
  IF TG_OP='UPDATE' THEN
    NEW.data_inicio:=COALESCE(NEW.data_inicio,OLD.data_inicio);
    NEW.condicao:=COALESCE(NEW.condicao,OLD.condicao);
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER vault_a0_treatment_details BEFORE INSERT OR UPDATE ON public.tratamentos FOR EACH ROW EXECUTE FUNCTION public.vault_a0_guard_treatment_details();
