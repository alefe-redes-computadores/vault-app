-- HISTORICAL DRAFT SUPERSEDED BY VAULT-STB11-R03-CAS-PRODUCTION-REVIEW.sql; DO NOT APPLY.
-- DRAFT ONLY. PostgreSQL integration and Evolution ownership required before generating an official migration.
-- Additive, no backfill, no clinical changes. NULL is legacy/absent; 'unassigned' is an explicit choice.
BEGIN;
ALTER TABLE public.tratamentos ADD COLUMN visual_icon text, ADD COLUMN visual_icon_updated_at timestamptz;
ALTER TABLE public.tratamentos ADD CONSTRAINT tratamentos_visual_identity_r03_ck CHECK (
  (visual_icon IS NULL AND visual_icon_updated_at IS NULL) OR
  (visual_icon IS NOT NULL AND visual_icon_updated_at IS NOT NULL AND isfinite(visual_icon_updated_at)
   AND visual_icon IN ('activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill','unassigned'))
);
CREATE FUNCTION public.guard_tratamento_visual_identity_r03() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Older clients do not know these columns. Omission or the old NULL pair must never erase an explicit choice.
    IF NEW.visual_icon IS NULL AND NEW.visual_icon_updated_at IS NULL THEN
      NEW.visual_icon := OLD.visual_icon;
      NEW.visual_icon_updated_at := OLD.visual_icon_updated_at;
    END IF;
    IF OLD.visual_icon IS NOT NULL AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.person_id IS DISTINCT FROM OLD.person_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
      RAISE EXCEPTION 'visual identity cannot change ownership' USING ERRCODE='23514';
    END IF;
    IF NEW.visual_icon IS NOT DISTINCT FROM OLD.visual_icon AND NEW.visual_icon_updated_at IS NOT DISTINCT FROM OLD.visual_icon_updated_at THEN
      RETURN NEW;
    END IF;
    IF OLD.visual_icon_updated_at IS NOT NULL AND NEW.visual_icon_updated_at <= OLD.visual_icon_updated_at THEN
      IF NEW.visual_icon IS NOT DISTINCT FROM OLD.visual_icon THEN
        NEW.visual_icon_updated_at := OLD.visual_icon_updated_at;
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'visual identity revision conflict' USING ERRCODE='40001';
    END IF;
  END IF;
  IF NEW.visual_icon IS NOT NULL OR NEW.visual_icon_updated_at IS NOT NULL THEN
    IF NEW.person_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.persons p WHERE p.id=NEW.person_id AND p.user_id=NEW.user_id) THEN
      RAISE EXCEPTION 'visual identity outside person scope' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_tratamento_visual_identity_r03() FROM PUBLIC;
CREATE TRIGGER guard_tratamento_visual_identity_r03 BEFORE INSERT OR UPDATE ON public.tratamentos
FOR EACH ROW EXECUTE FUNCTION public.guard_tratamento_visual_identity_r03();
COMMIT;
-- Rollback policy: leave additive fields/values intact, revert clients; old clients preserve explicit values.
-- Destructive dropping of fields is not an authorized rollback. No RLS policy changes or privileges granted.
