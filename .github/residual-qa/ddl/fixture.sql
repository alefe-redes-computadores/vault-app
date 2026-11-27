\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO PUBLIC;
CREATE TABLE public.persons(id uuid PRIMARY KEY,user_id uuid NOT NULL, UNIQUE(id,user_id));
CREATE TABLE public.tratamentos(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,nome text NOT NULL,data_inicio date,condicao text,updated_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(person_id,user_id) REFERENCES public.persons(id,user_id));
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY; ALTER TABLE public.tratamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY person_owner ON public.persons FOR ALL TO PUBLIC USING(auth.uid()=user_id);
CREATE POLICY "Acesso total ao dono" ON public.tratamentos FOR ALL TO PUBLIC USING(auth.uid()::text=user_id::text);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.persons,public.tratamentos TO authenticated;
CREATE FUNCTION public.vault_a0_guard_treatment_details() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    NEW.data_inicio:=COALESCE(NEW.data_inicio,OLD.data_inicio);
    NEW.condicao:=COALESCE(NEW.condicao,OLD.condicao);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vault_a0_treatment_details BEFORE INSERT OR UPDATE ON public.tratamentos FOR EACH ROW EXECUTE FUNCTION public.vault_a0_guard_treatment_details();
-- Synthetic owners, no existing user records.
INSERT INTO public.persons VALUES ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000002');
INSERT INTO public.tratamentos(id,user_id,person_id,nome,data_inicio,condicao) VALUES ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','synthetic','2026-01-01','synthetic');
