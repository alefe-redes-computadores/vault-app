-- VAULT M4 P2. Migração apenas aditiva. NÃO roda ao instalar o ZIP no Termux.
-- Aplicar antes do fluxo online para permitir sync e confirmar via SQL de verificação.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS cirurgias_m4p2_scope_key ON public.cirurgias (id,user_id,person_id);
-- consultas_supply_scope(id,user_id,person_id) já existe e foi auditado.
CREATE TABLE IF NOT EXISTS public.surgery_consultation_links_m4 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 person_id uuid NOT NULL,
 cirurgia_id uuid NOT NULL,
 consulta_id uuid NOT NULL,
 role text NOT NULL CHECK (role IN ('preoperative','postoperative','return_visit','supporting')),
 note text CHECK (note IS NULL OR length(note)<=500),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 CONSTRAINT m4p2_person_fk FOREIGN KEY (person_id,user_id) REFERENCES public.persons(id,user_id) ON DELETE RESTRICT,
 CONSTRAINT m4p2_surgery_fk FOREIGN KEY (cirurgia_id,user_id,person_id) REFERENCES public.cirurgias(id,user_id,person_id) ON DELETE RESTRICT,
 CONSTRAINT m4p2_consultation_fk FOREIGN KEY (consulta_id,user_id,person_id) REFERENCES public.consultas(id,user_id,person_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS m4p2_links_scope_idx ON public.surgery_consultation_links_m4(user_id,person_id,updated_at,id);
CREATE INDEX IF NOT EXISTS m4p2_links_surgery_idx ON public.surgery_consultation_links_m4(user_id,person_id,cirurgia_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS m4p2_links_consultation_idx ON public.surgery_consultation_links_m4(user_id,person_id,consulta_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS m4p2_links_one_live ON public.surgery_consultation_links_m4(user_id,person_id,cirurgia_id,consulta_id,role) WHERE deleted_at IS NULL;
ALTER TABLE public.surgery_consultation_links_m4 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.surgery_consultation_links_m4 FROM anon;
REVOKE ALL ON public.surgery_consultation_links_m4 FROM authenticated;
GRANT SELECT,INSERT,UPDATE ON public.surgery_consultation_links_m4 TO authenticated;
DO $$BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surgery_consultation_links_m4' AND policyname='m4p2_owner_select') THEN
  CREATE POLICY m4p2_owner_select ON public.surgery_consultation_links_m4 FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surgery_consultation_links_m4' AND policyname='m4p2_owner_insert') THEN
  CREATE POLICY m4p2_owner_insert ON public.surgery_consultation_links_m4 FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='surgery_consultation_links_m4' AND policyname='m4p2_owner_update') THEN
  CREATE POLICY m4p2_owner_update ON public.surgery_consultation_links_m4 FOR UPDATE TO authenticated
  USING (user_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())))
  WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id=person_id AND p.user_id=(SELECT auth.uid())));
 END IF;
END$$;
COMMIT;
