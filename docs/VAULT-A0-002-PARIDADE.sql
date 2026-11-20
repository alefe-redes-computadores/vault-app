-- VAULT A0 MACRO1 | Paridade Cirurgias/Tratamentos/Hospitais
-- Estrutura aditiva. Não apaga fatos, registros nem relacionamentos.
-- Antes de publicar código com campos novos, aplicar esta migração.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '45s';

-- Campos clínicos já presentes em types e Dexie, antes órfãos na nuvem.
-- NULL em colunas novas serve para distinguir clientes antigos que omitiram a coluna.
ALTER TABLE public.cirurgias ADD COLUMN IF NOT EXISTS tratamento_ids uuid[];
ALTER TABLE public.cirurgias ADD COLUMN IF NOT EXISTS cid_ids uuid[];
ALTER TABLE public.tratamentos ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE public.tratamentos ADD COLUMN IF NOT EXISTS condicao text;
-- Campo presente no push atual de hospital, mas ausente no servidor.
ALTER TABLE public.hospitais ADD COLUMN IF NOT EXISTS medico_ids uuid[];

CREATE OR REPLACE FUNCTION public.vault_a0_guard_surgery_links()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Upserts de APK legado não podem limpar vínculos que não conhecem.
    NEW.tratamento_ids := COALESCE(NEW.tratamento_ids, OLD.tratamento_ids, '{}'::uuid[]);
    NEW.cid_ids := COALESCE(NEW.cid_ids, OLD.cid_ids, '{}'::uuid[]);
  ELSE
    NEW.tratamento_ids := COALESCE(NEW.tratamento_ids, '{}'::uuid[]);
    NEW.cid_ids := COALESCE(NEW.cid_ids, '{}'::uuid[]);
  END IF;
  IF NEW.person_id IS NULL AND (cardinality(NEW.tratamento_ids) > 0 OR cardinality(NEW.cid_ids) > 0) THEN
    RAISE EXCEPTION 'A0 surgery links require a person' USING ERRCODE='23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.tratamento_ids) target(id)
    LEFT JOIN public.tratamentos t ON t.id=target.id AND t.user_id=NEW.user_id AND t.person_id=NEW.person_id
    WHERE t.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A0 surgery treatment is not owned by the person' USING ERRCODE='23503';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.cid_ids) target(id)
    LEFT JOIN public.cids c ON c.id=target.id AND c.user_id=NEW.user_id AND c.person_id=NEW.person_id
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A0 surgery CID is not owned by the person' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS vault_a0_surgery_links ON public.cirurgias;
CREATE TRIGGER vault_a0_surgery_links BEFORE INSERT OR UPDATE ON public.cirurgias
 FOR EACH ROW EXECUTE FUNCTION public.vault_a0_guard_surgery_links();

CREATE OR REPLACE FUNCTION public.vault_a0_guard_treatment_details()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Protege históricos quando versões antigas do app omitem estes campos em UPSERT.
    -- Limpeza explícita desses campos exigirá um contrato de versão posterior.
    NEW.data_inicio := COALESCE(NEW.data_inicio, OLD.data_inicio);
    NEW.condicao := COALESCE(NEW.condicao, OLD.condicao);
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS vault_a0_treatment_details ON public.tratamentos;
CREATE TRIGGER vault_a0_treatment_details BEFORE INSERT OR UPDATE ON public.tratamentos
 FOR EACH ROW EXECUTE FUNCTION public.vault_a0_guard_treatment_details();

CREATE OR REPLACE FUNCTION public.vault_a0_guard_hospital_staff()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  -- APKs anteriores a A1 serializam medico_ids omitido como [].
  -- Em UPDATE preservamos vinculos existentes se recebermos lista vazia.
  -- Desvinculo total explicito precisara de contrato versionado A1.
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.medico_ids IS NULL OR cardinality(NEW.medico_ids)=0)
       AND COALESCE(cardinality(OLD.medico_ids),0)>0 THEN
      NEW.medico_ids := OLD.medico_ids;
    ELSE
      NEW.medico_ids := COALESCE(NEW.medico_ids, '{}'::uuid[]);
    END IF;
  ELSE
    NEW.medico_ids := COALESCE(NEW.medico_ids, '{}'::uuid[]);
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.medico_ids) target(id)
    LEFT JOIN public.medicos m ON m.id=target.id AND m.user_id=NEW.user_id
    WHERE m.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A0 hospital professional is not owned by the account' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS vault_a0_hospital_staff ON public.hospitais;
CREATE TRIGGER vault_a0_hospital_staff BEFORE INSERT OR UPDATE ON public.hospitais
 FOR EACH ROW EXECUTE FUNCTION public.vault_a0_guard_hospital_staff();
COMMIT;
