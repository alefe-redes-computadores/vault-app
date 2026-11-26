-- MACRO02 A: expansão aditiva; NÃO ativa o escritor nem altera fatos anteriores.
-- Requer aceite Guardian do SHA exato, backup e homologação PG17. Executar em transação única.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
 IF current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'MACRO02_REQUIRES_PG17'; END IF;
 IF to_regclass('public.dose_logs') IS NULL OR to_regclass('public.medicamentos') IS NULL THEN RAISE EXCEPTION 'MACRO02_SCHEMA_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='dose_logs' AND column_name IN ('unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot')) OR (table_name='medicamentos' AND column_name IN ('estoque_ciclo_id','macro02_stock_managed')))) THEN RAISE EXCEPTION 'MACRO02_SCHEMA_ALREADY_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM public.dose_logs d WHERE NOT EXISTS(SELECT 1 FROM public.medicamentos m JOIN public.persons p ON p.id=m.person_id AND p.user_id=m.user_id WHERE m.id=d.medicamento_id AND m.user_id=d.user_id AND m.person_id=d.person_id)) THEN RAISE EXCEPTION 'MACRO02_SCOPE_REVIEW_REQUIRED'; END IF;
END $$;
ALTER TABLE public.dose_logs
  ADD COLUMN unidade_dose text,
  ADD COLUMN unidade_dose_rotulo text,
  ADD COLUMN fonte_unidade text,
  ADD COLUMN estoque_movimento jsonb,
  ADD COLUMN farmaco_snapshot jsonb;
ALTER TABLE public.medicamentos ADD COLUMN estoque_ciclo_id uuid, ADD COLUMN macro02_stock_managed boolean NOT NULL DEFAULT false;
ALTER TABLE public.dose_logs ADD CONSTRAINT dose_logs_macro02_pharma_scope CHECK (farmaco_snapshot IS NULL OR coalesce(jsonb_typeof(farmaco_snapshot)='object' AND farmaco_snapshot->>'user_id'=user_id::text AND farmaco_snapshot->>'person_id'=person_id::text AND farmaco_snapshot->>'medicamento_id'=medicamento_id::text,false));
ALTER TABLE public.dose_logs ADD CONSTRAINT dose_logs_macro02_unit_check CHECK (
  (unidade_dose IS NULL AND unidade_dose_rotulo IS NULL AND fonte_unidade IS NULL)
  OR (
    unidade_dose IS NOT NULL AND fonte_unidade IS NOT NULL
    AND fonte_unidade IN ('declared','documented')
    AND ((unidade_dose IN ('tablet','capsule','drop','ml','application','inhalation','unit','mg','mcg','g','iu','spray','patch','sachet') AND unidade_dose_rotulo IS NULL)
      OR (unidade_dose = 'custom' AND unidade_dose_rotulo IS NOT NULL AND char_length(unidade_dose_rotulo) BETWEEN 1 AND 50 AND btrim(unidade_dose_rotulo)=unidade_dose_rotulo AND unidade_dose_rotulo !~ '[[:cntrl:]]'))
  )
);
-- During expand, no client (including an old APK) can introduce unverified new facts.
-- Only newly introduced fields are frozen; existing DML, RLS and legacy stock remain unchanged.
CREATE FUNCTION public.vault_macro02_expand_guard_dose() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.unidade_dose IS NOT NULL OR NEW.unidade_dose_rotulo IS NOT NULL OR NEW.fonte_unidade IS NOT NULL OR NEW.estoque_movimento IS NOT NULL OR NEW.farmaco_snapshot IS NOT NULL THEN RAISE EXCEPTION 'MACRO02_EXPAND_NOT_ACTIVE'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.vault_macro02_expand_guard_stock() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.estoque_ciclo_id IS NOT NULL OR NEW.macro02_stock_managed IS DISTINCT FROM false THEN RAISE EXCEPTION 'MACRO02_EXPAND_NOT_ACTIVE'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.vault_macro02_expand_guard_dose(),public.vault_macro02_expand_guard_stock() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER macro02_expand_guard_dose BEFORE INSERT OR UPDATE ON public.dose_logs FOR EACH ROW EXECUTE FUNCTION public.vault_macro02_expand_guard_dose();
CREATE TRIGGER macro02_expand_guard_stock BEFORE INSERT OR UPDATE ON public.medicamentos FOR EACH ROW EXECUTE FUNCTION public.vault_macro02_expand_guard_stock();
