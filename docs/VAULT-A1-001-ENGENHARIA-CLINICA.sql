-- VAULT A1 MACRO2: additive only, no writes to medication stock, withdrawals, or legacy prescriptions.
-- Apply only AFTER installer reports A1_MACRO2_APROVADO_LOCALMENTE.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '55s';

ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS categoria_profissional text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS conselho_tipo text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS conselho_numero text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS conselho_uf text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS a1_identity_revision bigint NOT NULL DEFAULT 0;

DO $guard$
BEGIN
 IF EXISTS(SELECT 1 FROM public.medicos WHERE categoria_profissional IS NOT NULL AND categoria_profissional NOT IN
 ('medicina','fisioterapia','terapia_ocupacional','psicologia','nutricao','enfermagem','fonoaudiologia','odontologia','educacao_fisica','outras'))
 THEN RAISE EXCEPTION 'A1 unexpected professional category'; END IF;
END $guard$;

-- Old APK clients omit the new fields. Preserve identity across their ordinary edits.
CREATE OR REPLACE FUNCTION public.vault_a1_professional_preserve()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $f$
BEGIN
 -- Previous APK versions do not send revision; they must not null the new fields.
 -- New A1 clients increment revision for every intentional edit, including clearing.
 IF TG_OP='UPDATE' AND NEW.a1_identity_revision <= OLD.a1_identity_revision THEN
  NEW.categoria_profissional:=COALESCE(NEW.categoria_profissional,OLD.categoria_profissional);
  NEW.conselho_tipo:=COALESCE(NEW.conselho_tipo,OLD.conselho_tipo);
  NEW.conselho_numero:=COALESCE(NEW.conselho_numero,OLD.conselho_numero);
  NEW.conselho_uf:=COALESCE(NEW.conselho_uf,OLD.conselho_uf);
  NEW.a1_identity_revision:=OLD.a1_identity_revision;
 END IF;
 IF NEW.a1_identity_revision < 0
 THEN RAISE EXCEPTION 'A1 identity revision must be nonnegative' USING ERRCODE='23514'; END IF;
 IF NEW.categoria_profissional IS NOT NULL AND NEW.categoria_profissional NOT IN
 ('medicina','fisioterapia','terapia_ocupacional','psicologia','nutricao','enfermagem','fonoaudiologia','odontologia','educacao_fisica','outras')
 THEN RAISE EXCEPTION 'A1 professional category invalid' USING ERRCODE='23514'; END IF;
 IF NEW.conselho_uf IS NOT NULL AND NEW.conselho_uf<>'' AND NEW.conselho_uf !~ '^[A-Z]{2}$'
 THEN RAISE EXCEPTION 'A1 registration state invalid' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS vault_a1_preserve_professional ON public.medicos;
CREATE TRIGGER vault_a1_preserve_professional BEFORE INSERT OR UPDATE ON public.medicos
FOR EACH ROW EXECUTE FUNCTION public.vault_a1_professional_preserve();

CREATE TABLE IF NOT EXISTS public.a1_treatment_phases (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
 tratamento_id uuid NOT NULL REFERENCES public.tratamentos(id) ON DELETE RESTRICT,
 tipo text NOT NULL CHECK(tipo IN ('inicio','ajuste','pausa','retomada','conclusao')),
 data_efetiva date NOT NULL,
 origem text NOT NULL CHECK(origem IN ('relato_pessoal','orientacao_profissional','documento_revisado')),
 profissional_id uuid REFERENCES public.medicos(id) ON DELETE RESTRICT,
 titulo text NOT NULL CHECK(length(btrim(titulo)) BETWEEN 3 AND 110),
 observacoes text,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz,
 CONSTRAINT a1_treatment_notes_limit CHECK(observacoes IS NULL OR length(observacoes)<=1000)
);
CREATE TABLE IF NOT EXISTS public.a1_prescription_links (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
 medicamento_id uuid NOT NULL REFERENCES public.medicamentos(id) ON DELETE RESTRICT,
 renovacao_anterior_id uuid NOT NULL REFERENCES public.renovacoes(id) ON DELETE RESTRICT,
 renovacao_atual_id uuid NOT NULL REFERENCES public.renovacoes(id) ON DELETE RESTRICT,
 tipo text NOT NULL CHECK(tipo IN ('renovacao','substituicao')),
 origem text NOT NULL CHECK(origem IN ('relato_pessoal','orientacao_profissional','documento_revisado')),
 observacoes text,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz,
 CHECK(renovacao_anterior_id<>renovacao_atual_id),
 CONSTRAINT a1_rx_notes_limit CHECK(observacoes IS NULL OR length(observacoes)<=1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS a1_prescription_current_unique ON public.a1_prescription_links(user_id,person_id,renovacao_atual_id) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS public.a1_supply_locations (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
 fornecimento_id uuid NOT NULL REFERENCES public.fornecimentos(id) ON DELETE RESTRICT,
 farmacia_id uuid REFERENCES public.farmacias(id) ON DELETE RESTRICT,
 local_id uuid REFERENCES public.locais(id) ON DELETE RESTRICT,
 inicio_vigencia date NOT NULL,
 origem text NOT NULL CHECK(origem IN ('relato_pessoal','orientacao_profissional','documento_revisado')),
 observacoes text,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,
 deleted_at timestamptz,
 CHECK ((farmacia_id IS NULL) <> (local_id IS NULL)),
 CONSTRAINT a1_supply_notes_limit CHECK(observacoes IS NULL OR length(observacoes)<=1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS a1_supply_single_date ON public.a1_supply_locations(user_id,person_id,fornecimento_id,inicio_vigencia) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS a1_phases_person_date ON public.a1_treatment_phases(user_id,person_id,data_efetiva DESC);
CREATE INDEX IF NOT EXISTS a1_rx_person_date ON public.a1_prescription_links(user_id,person_id,created_at DESC);
CREATE INDEX IF NOT EXISTS a1_sites_person_date ON public.a1_supply_locations(user_id,person_id,inicio_vigencia DESC);

CREATE OR REPLACE FUNCTION public.vault_a1_guard_references()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $f$
DECLARE valid_owner boolean := false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.persons p WHERE p.id=NEW.person_id AND p.user_id=NEW.user_id)
 THEN RAISE EXCEPTION 'A1 person is not owned by account' USING ERRCODE='23503'; END IF;
 IF TG_OP='UPDATE' THEN
  -- Append-only factual events. Retry may update timestamps; explicit soft-delete reserved for correction workflow.
  IF (to_jsonb(NEW)-'updated_at'-'deleted_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at'-'deleted_at')
  THEN RAISE EXCEPTION 'A1 factual records are immutable; create a new event' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_TABLE_NAME='a1_treatment_phases' THEN
  SELECT EXISTS(SELECT 1 FROM public.tratamentos t WHERE t.id=NEW.tratamento_id AND t.user_id=NEW.user_id AND t.person_id=NEW.person_id) INTO valid_owner;
  IF NOT valid_owner THEN RAISE EXCEPTION 'A1 treatment link not owned by person' USING ERRCODE='23503'; END IF;
  IF NEW.profissional_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.medicos m WHERE m.id=NEW.profissional_id AND m.user_id=NEW.user_id)
  THEN RAISE EXCEPTION 'A1 professional link not owned by account' USING ERRCODE='23503'; END IF;
 ELSIF TG_TABLE_NAME='a1_prescription_links' THEN
  SELECT EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=NEW.medicamento_id AND m.user_id=NEW.user_id AND m.person_id=NEW.person_id) INTO valid_owner;
  IF NOT valid_owner THEN RAISE EXCEPTION 'A1 medication is not owned' USING ERRCODE='23503'; END IF;
  IF NOT EXISTS(
   SELECT 1 FROM public.renovacoes a JOIN public.renovacoes b ON a.id=NEW.renovacao_anterior_id AND b.id=NEW.renovacao_atual_id
   WHERE a.user_id=NEW.user_id AND b.user_id=NEW.user_id AND a.person_id=NEW.person_id AND b.person_id=NEW.person_id
   AND a.medicamento_id=NEW.medicamento_id AND b.medicamento_id=NEW.medicamento_id
   AND a.data<=b.data
   AND NULLIF(btrim(a.tipo_aquisicao),'') IS NULL AND a.data_aquisicao IS NULL AND a.quantidade IS NULL AND a.preco IS NULL
   AND NULLIF(btrim(b.tipo_aquisicao),'') IS NULL AND b.data_aquisicao IS NULL AND b.quantidade IS NULL AND b.preco IS NULL
  ) THEN RAISE EXCEPTION 'A1 prescription versions must reference existing prescription-only events' USING ERRCODE='23503'; END IF;
  -- Same-day prescriptions can form cycles. Preserve an acyclic, historical chain.
  IF TG_OP='INSERT' AND EXISTS (
   WITH RECURSIVE reachable(renovacao_id) AS (
    SELECT NEW.renovacao_atual_id
    UNION
    SELECT l.renovacao_atual_id FROM public.a1_prescription_links l
     JOIN reachable r ON l.renovacao_anterior_id=r.renovacao_id
    WHERE l.user_id=NEW.user_id AND l.person_id=NEW.person_id
      AND l.medicamento_id=NEW.medicamento_id AND l.deleted_at IS NULL
   ) SELECT 1 FROM reachable WHERE renovacao_id=NEW.renovacao_anterior_id
  ) THEN RAISE EXCEPTION 'A1 prescription cycle refused' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='a1_supply_locations' THEN
  SELECT EXISTS(SELECT 1 FROM public.fornecimentos f WHERE f.id=NEW.fornecimento_id AND f.user_id=NEW.user_id AND f.person_id=NEW.person_id) INTO valid_owner;
  IF NOT valid_owner THEN RAISE EXCEPTION 'A1 supply process not owned by person' USING ERRCODE='23503'; END IF;
  IF NEW.farmacia_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.farmacias f WHERE f.id=NEW.farmacia_id AND f.user_id=NEW.user_id)
  THEN RAISE EXCEPTION 'A1 pharmacy not owned by account' USING ERRCODE='23503'; END IF;
  IF NEW.local_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.locais l WHERE l.id=NEW.local_id AND l.user_id=NEW.user_id)
  THEN RAISE EXCEPTION 'A1 location not owned by account' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $f$;
DO $loop$
DECLARE tab text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['a1_treatment_phases','a1_prescription_links','a1_supply_locations'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('DROP POLICY IF EXISTS vault_a1_select ON public.%I',tab);
  EXECUTE format('DROP POLICY IF EXISTS vault_a1_insert ON public.%I',tab);
  EXECUTE format('DROP POLICY IF EXISTS vault_a1_update ON public.%I',tab);
  EXECUTE format('CREATE POLICY vault_a1_select ON public.%I FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))',tab);
  EXECUTE format('CREATE POLICY vault_a1_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))',tab);
  EXECUTE format('CREATE POLICY vault_a1_update ON public.%I FOR UPDATE TO authenticated USING (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid()))) WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))',tab);
  EXECUTE format('DROP TRIGGER IF EXISTS vault_a1_guard ON public.%I',tab);
  EXECUTE format('CREATE TRIGGER vault_a1_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.vault_a1_guard_references()',tab);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated',tab);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',tab);
 END LOOP;
END $loop$;
COMMIT;
