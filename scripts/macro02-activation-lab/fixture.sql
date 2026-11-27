-- Synthetic catalog-shaped minimal fixture. Not a replay of production data.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE vault_macro02_worker NOLOGIN NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
CREATE SCHEMA vault_macro02_private;
REVOKE ALL ON SCHEMA vault_macro02_private FROM PUBLIC;
GRANT USAGE ON SCHEMA vault_macro02_private TO authenticated;
CREATE TABLE vault_macro02_private.active_accounts(user_id uuid PRIMARY KEY);
CREATE TABLE vault_macro02_private.dose_commits(user_id uuid NOT NULL,operation_id uuid NOT NULL,PRIMARY KEY(user_id,operation_id));
CREATE FUNCTION vault_macro02_private.dormant_freeze_r1() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'M02_DORMANT_FENCE_LOCKED'; END $$;
CREATE TRIGGER m02_dormant_freeze_r1 BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON vault_macro02_private.active_accounts FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.dormant_freeze_r1();
CREATE TRIGGER m02_dormant_freeze_r1 BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON vault_macro02_private.dose_commits FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.dormant_freeze_r1();
ALTER TABLE vault_macro02_private.active_accounts ENABLE ALWAYS TRIGGER m02_dormant_freeze_r1;
ALTER TABLE vault_macro02_private.dose_commits ENABLE ALWAYS TRIGGER m02_dormant_freeze_r1;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations'] LOOP
 EXECUTE format('CREATE TABLE public.%I(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid, evidence jsonb)',t);
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY own ON public.%I TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid())',t);
 END LOOP;
END $$;
CREATE TABLE public.medicamento_tratamentos(id uuid PRIMARY KEY,medicamento_id uuid NOT NULL REFERENCES public.medicamentos ON DELETE CASCADE,tratamento_id uuid NOT NULL REFERENCES public.tratamentos ON DELETE CASCADE,UNIQUE(medicamento_id,tratamento_id));
ALTER TABLE public.medicamento_tratamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY own ON public.medicamento_tratamentos TO authenticated USING(EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=medicamento_id AND m.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=medicamento_id AND m.user_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.medicamento_tratamentos TO authenticated;
INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
INSERT INTO public.persons(id,user_id) VALUES('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000002');
INSERT INTO public.medicamentos VALUES('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','{"stock":9}'),('00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000022','{"stock":7}');
INSERT INTO public.tratamentos VALUES('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',NULL),('00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000022',NULL);
INSERT INTO public.medicamento_tratamentos VALUES('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000041');
INSERT INTO public.dose_logs VALUES('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','{"dose":1}');
