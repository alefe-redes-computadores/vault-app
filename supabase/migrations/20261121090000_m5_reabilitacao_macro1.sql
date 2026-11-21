-- M5 REAB MACRO1: additive, no modification of existing clinical records.
-- Requires application migration v52 and strict ownership in public schema.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS m5_person_owner_ref ON public.persons(id,user_id);
CREATE UNIQUE INDEX IF NOT EXISTS m5_medico_owner_ref ON public.medicos(id,user_id);
CREATE UNIQUE INDEX IF NOT EXISTS m5_local_owner_ref ON public.locais(id,user_id);
CREATE UNIQUE INDEX IF NOT EXISTS m5_hospital_owner_ref ON public.hospitais(id,user_id);
CREATE UNIQUE INDEX IF NOT EXISTS m5_consulta_person_ref ON public.consultas(id,user_id,person_id);
CREATE UNIQUE INDEX IF NOT EXISTS m5_cirurgia_person_ref ON public.cirurgias(id,user_id,person_id);
CREATE UNIQUE INDEX IF NOT EXISTS m5_tratamento_person_ref ON public.tratamentos(id,user_id,person_id);

CREATE TABLE IF NOT EXISTS public.rehab_programs_m5 (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, person_id uuid NOT NULL,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120), specialty text,
 functional_goal text, body_region text, laterality text CHECK (laterality IN ('right','left','bilateral','not_reported')),
 status text NOT NULL CHECK(status IN ('planned','active','suspended','completed')),
 start_date date, expected_end_date date,created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL,deleted_at timestamptz,
 CONSTRAINT m5_program_person FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT m5_program_dates CHECK (expected_end_date IS NULL OR start_date IS NULL OR expected_end_date >= start_date),
 UNIQUE(id,user_id,person_id)
);
CREATE TABLE IF NOT EXISTS public.rehab_program_team_m5 (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,
 program_id uuid NOT NULL,professional_id uuid NOT NULL,role text NOT NULL CHECK(length(trim(role)) BETWEEN 1 AND 80),
 start_date date,end_date date,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,deleted_at timestamptz,
 CONSTRAINT m5_team_program FOREIGN KEY(program_id,user_id,person_id) REFERENCES public.rehab_programs_m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT m5_team_professional FOREIGN KEY(professional_id,user_id) REFERENCES public.medicos(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT m5_team_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
 UNIQUE(id,user_id,person_id), UNIQUE(id,program_id,user_id,person_id)
);
CREATE TABLE IF NOT EXISTS public.rehab_sessions_m5 (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,program_id uuid NOT NULL,
 scheduled_at timestamptz NOT NULL,timezone text NOT NULL,
 status text NOT NULL CHECK(status IN ('scheduled','confirmed','performed','cancelled','missed')),
 mode text NOT NULL CHECK(mode IN ('home','clinic','hospital','other')),
 local_id uuid,hospital_id uuid,place_note text,notes text,
 created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,deleted_at timestamptz,
 CONSTRAINT m5_session_program FOREIGN KEY(program_id,user_id,person_id) REFERENCES public.rehab_programs_m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT m5_session_local FOREIGN KEY(local_id,user_id) REFERENCES public.locais(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT m5_session_hospital FOREIGN KEY(hospital_id,user_id) REFERENCES public.hospitais(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT m5_session_location CHECK (NOT(local_id IS NOT NULL AND hospital_id IS NOT NULL) AND NOT (mode='home' AND (local_id IS NOT NULL OR hospital_id IS NOT NULL))),
 UNIQUE(id,user_id,person_id),UNIQUE(id,program_id,user_id,person_id)
);
CREATE TABLE IF NOT EXISTS public.rehab_session_team_m5 (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,
 session_id uuid NOT NULL,program_team_id uuid NOT NULL,
 created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,deleted_at timestamptz,
 CONSTRAINT m5_session_team_session FOREIGN KEY(session_id,user_id,person_id) REFERENCES public.rehab_sessions_m5(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT m5_session_team_team FOREIGN KEY(program_team_id,user_id,person_id) REFERENCES public.rehab_program_team_m5(id,user_id,person_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS public.rehab_origin_links_m5 (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,program_id uuid NOT NULL,
 origin_type text NOT NULL CHECK(origin_type IN ('consulta','cirurgia','tratamento')),
 origin_id uuid NOT NULL,note text,
 created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,deleted_at timestamptz,
 CONSTRAINT m5_origin_program FOREIGN KEY(program_id,user_id,person_id) REFERENCES public.rehab_programs_m5(id,user_id,person_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS public.rehab_session_events_m5 (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,session_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('scheduled','rescheduled','status_changed')),
 from_at timestamptz,to_at timestamptz,from_status text,to_status text,note text,
 created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,deleted_at timestamptz,
 CONSTRAINT m5_event_session FOREIGN KEY(session_id,user_id,person_id) REFERENCES public.rehab_sessions_m5(id,user_id,person_id) ON DELETE RESTRICT
);
-- Explicit target FK via typed trigger: a polymorphic ID alone is not ownership proof.
CREATE OR REPLACE FUNCTION public.m5_rehab_validate_origin() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.origin_type='consulta' AND NOT EXISTS(SELECT 1 FROM public.consultas WHERE id=NEW.origin_id AND user_id=NEW.user_id AND person_id=NEW.person_id)
 OR NEW.origin_type='cirurgia' AND NOT EXISTS(SELECT 1 FROM public.cirurgias WHERE id=NEW.origin_id AND user_id=NEW.user_id AND person_id=NEW.person_id)
 OR NEW.origin_type='tratamento' AND NOT EXISTS(SELECT 1 FROM public.tratamentos WHERE id=NEW.origin_id AND user_id=NEW.user_id AND person_id=NEW.person_id)
 THEN RAISE EXCEPTION 'M5: origem fora da pessoa/conta';END IF;
 RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS m5_origin_check ON public.rehab_origin_links_m5;
CREATE TRIGGER m5_origin_check BEFORE INSERT OR UPDATE OF program_id,user_id,person_id,origin_type,origin_id ON public.rehab_origin_links_m5 FOR EACH ROW EXECUTE FUNCTION public.m5_rehab_validate_origin();
-- Session team must belong to the same program (not merely same person).
CREATE OR REPLACE FUNCTION public.m5_rehab_validate_session_team() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.rehab_sessions_m5 s JOIN public.rehab_program_team_m5 t ON t.program_id=s.program_id
 WHERE s.id=NEW.session_id AND t.id=NEW.program_team_id AND s.user_id=NEW.user_id AND s.person_id=NEW.person_id
 AND t.user_id=NEW.user_id AND t.person_id=NEW.person_id AND s.deleted_at IS NULL AND t.deleted_at IS NULL)
 THEN RAISE EXCEPTION 'M5: equipe/sessão fora do mesmo programa';END IF;
 RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS m5_session_team_check ON public.rehab_session_team_m5;
CREATE TRIGGER m5_session_team_check BEFORE INSERT OR UPDATE OF session_id,program_team_id,user_id,person_id ON public.rehab_session_team_m5 FOR EACH ROW EXECUTE FUNCTION public.m5_rehab_validate_session_team();
-- Atomic integrity on active links, preserving tombstones across devices.
CREATE UNIQUE INDEX IF NOT EXISTS m5_one_team_live ON public.rehab_program_team_m5(program_id,professional_id,role) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS m5_one_session_prof_live ON public.rehab_session_team_m5(session_id,program_team_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS m5_one_origin_live ON public.rehab_origin_links_m5(program_id,origin_type,origin_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS m5_program_owner ON public.rehab_programs_m5(user_id,person_id,deleted_at);
CREATE INDEX IF NOT EXISTS m5_sessions_owner ON public.rehab_sessions_m5(user_id,person_id,program_id,scheduled_at);
CREATE INDEX IF NOT EXISTS m5_events_by_session ON public.rehab_session_events_m5(session_id,created_at);

DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['rehab_programs_m5','rehab_program_team_m5','rehab_sessions_m5','rehab_session_team_m5','rehab_origin_links_m5','rehab_session_events_m5'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS m5_owner_read ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS m5_owner_add ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS m5_owner_edit ON public.%I',t);
  EXECUTE format('CREATE POLICY m5_owner_read ON public.%I FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))',t);
  EXECUTE format('CREATE POLICY m5_owner_add ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))',t);
  EXECUTE format('CREATE POLICY m5_owner_edit ON public.%I FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid()))) WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))',t);
 END LOOP;
END$$;
-- Immutable identity, scope and chronological facts after insertion.
CREATE OR REPLACE FUNCTION public.m5_rehab_guard_update() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.person_id IS DISTINCT FROM OLD.person_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
 THEN RAISE EXCEPTION 'M5: identidade e titularidade imutáveis'; END IF;
 IF TG_TABLE_NAME='rehab_program_team_m5' AND (NEW.program_id IS DISTINCT FROM OLD.program_id OR NEW.professional_id IS DISTINCT FROM OLD.professional_id)
 OR TG_TABLE_NAME='rehab_sessions_m5' AND NEW.program_id IS DISTINCT FROM OLD.program_id
 OR TG_TABLE_NAME='rehab_session_team_m5' AND (NEW.session_id IS DISTINCT FROM OLD.session_id OR NEW.program_team_id IS DISTINCT FROM OLD.program_team_id)
 OR TG_TABLE_NAME='rehab_origin_links_m5' AND (NEW.program_id IS DISTINCT FROM OLD.program_id OR NEW.origin_id IS DISTINCT FROM OLD.origin_id OR NEW.origin_type IS DISTINCT FROM OLD.origin_type)
 THEN RAISE EXCEPTION 'M5: vínculo de origem imutável'; END IF;
 IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN RAISE EXCEPTION 'M5: tombstone não pode ressuscitar'; END IF;
 IF NEW.updated_at <= OLD.updated_at THEN RAISE EXCEPTION 'M5: versão não avançou'; END IF;
 RETURN NEW;
END;$$;
DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['rehab_programs_m5','rehab_program_team_m5','rehab_sessions_m5','rehab_session_team_m5','rehab_origin_links_m5'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS m5_guard_update ON public.%I',t);
  EXECUTE format('CREATE TRIGGER m5_guard_update BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.m5_rehab_guard_update()',t);
 END LOOP;
END$$;
-- A session event is append-only; never grant update to the authenticated role.
REVOKE UPDATE ON public.rehab_session_events_m5 FROM authenticated;
DROP POLICY IF EXISTS m5_owner_edit ON public.rehab_session_events_m5;
-- Explicit low-privilege API access to validation trigger funcs is not required.
REVOKE ALL ON FUNCTION public.m5_rehab_validate_origin() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.m5_rehab_validate_session_team() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.m5_rehab_guard_update() FROM PUBLIC,anon,authenticated;
COMMIT;
