-- CI360 P6 P2 R2 — migração aditiva de rejeições por consulta.
-- Executar UMA vez no projeto vault-app, por ferramenta de migração auditada.
-- Não modifica registros, doses, tratamentos, estoque, receitas nem documentos.
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS revisao_vinculos_rejeitados uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.vault_ci360_p6_p2r2_validate_rejected_links()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public, pg_temp AS $$
DECLARE
  n int;
BEGIN
  n := cardinality(NEW.revisao_vinculos_rejeitados);
  IF n>64 THEN RAISE EXCEPTION 'CI360: limite de revisões excedido'; END IF;
  IF n<>cardinality(ARRAY(SELECT DISTINCT v.id FROM unnest(NEW.revisao_vinculos_rejeitados) AS v(id))) THEN
    RAISE EXCEPTION 'CI360: IDs rejeitados duplicados';
  END IF;
  IF NEW.person_id IS NULL AND n>0 THEN
    RAISE EXCEPTION 'CI360: pessoa obrigatória para revisar vínculos';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.revisao_vinculos_rejeitados) AS r(id)
     WHERE r.id IS NULL OR r.id=ANY(coalesce(NEW.medicamento_ids,'{}'::uuid[]))
     OR NOT EXISTS (SELECT 1 FROM public.medicamentos m WHERE m.id=r.id
                   AND m.user_id=NEW.user_id AND m.person_id=NEW.person_id)) THEN
    RAISE EXCEPTION 'CI360: vínculo rejeitado inválido, já aceito ou de outro titular';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS vault_ci360_p6_p2r2_rejected_links ON public.consultas;
CREATE TRIGGER vault_ci360_p6_p2r2_rejected_links
BEFORE INSERT OR UPDATE OF revisao_vinculos_rejeitados,medicamento_ids,person_id,user_id
ON public.consultas FOR EACH ROW
EXECUTE FUNCTION public.vault_ci360_p6_p2r2_validate_rejected_links();
REVOKE ALL ON FUNCTION public.vault_ci360_p6_p2r2_validate_rejected_links() FROM PUBLIC,anon,authenticated;
