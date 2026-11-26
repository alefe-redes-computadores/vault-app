CREATE TABLE public.persons(id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.medicamentos(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
 nome text,dosagem text,formato text,forma_farmaceutica text,cores text[],catalog_snapshot jsonb,
 estoque_quantidade numeric,estoque_unidade_medida text,estoque_gotas_por_ml numeric,estoque_ml_total numeric,estoque_data_referencia date,estoque_unidade_por_dose numeric,updated_at timestamptz,
 data_receita date,document_id uuid,medico_id uuid,medico text,tipo_aquisicao text,farmacia_id uuid,farmacia text,data_retorno_sus date,proxima_renovacao date,lembrete_receita_modo text NOT NULL DEFAULT 'automatico',lembrete_receita_data date);
CREATE TABLE public.dose_logs(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid REFERENCES persons(id) ON DELETE CASCADE,medicamento_id uuid REFERENCES medicamentos(id) ON DELETE CASCADE,data date NOT NULL,horario text NOT NULL,quantidade numeric,tomado_em timestamptz,ignorado_em timestamptz,dose_kind text,motivo text,created_at timestamptz,updated_at timestamptz);
CREATE TABLE public.documents(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid);
CREATE TABLE public.medicos(id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.farmacias(id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.hospitais(id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.locais(id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.renovacoes(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid,medicamento_id uuid,medicamento_nome text,medicamento_dosagem text,medico_id uuid,farmacia_id uuid,hospital_id uuid,local_id uuid,document_id uuid,a3_location_snapshot jsonb,a3_location_changes jsonb NOT NULL DEFAULT '[]',tipo_aquisicao text,data_proxima_retirada date,data_retorno_sus date,exige_nova_receita boolean,quantidade numeric,preco numeric,lote text,validade_produto date,data date NOT NULL,data_aquisicao date,anexo_url text,observacoes text,created_at timestamptz,updated_at timestamptz);
CREATE TABLE public.retiradas(id uuid PRIMARY KEY,user_id uuid NOT NULL,person_id uuid NOT NULL,medicamento_id uuid NOT NULL,status text NOT NULL,tipo text NOT NULL,renovacao_realizada_id uuid,quantidade_retirada numeric,realizada_em timestamptz,updated_at timestamptz NOT NULL);
DO $$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['persons','medicamentos','dose_logs','documents','medicos','farmacias','hospitais','locais','renovacoes','retiradas'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n); EXECUTE format('CREATE POLICY owner_scope ON public.%I FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid())',n); EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated,service_role',n); END LOOP; END $$;
INSERT INTO public.persons VALUES('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
INSERT INTO public.medicamentos(id,user_id,person_id,estoque_quantidade,estoque_unidade_medida,estoque_data_referencia,updated_at) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',10,'comprimidos','2026-01-01','2026-01-01T00:00:00Z');

UPDATE public.medicamentos SET nome='Cadastro sintético',dosagem='10 mg',formato='comprimido',forma_farmaceutica='comprimido',cores=ARRAY['azul'] WHERE id='30000000-0000-4000-8000-000000000001';

INSERT INTO public.persons VALUES('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003');
INSERT INTO public.medicamentos(id,user_id,person_id,nome,dosagem,estoque_quantidade,estoque_unidade_medida,estoque_data_referencia,updated_at) VALUES
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Conta sintética B','10 mg',10,'comprimidos','2026-01-01','2026-01-01T00:00:00Z'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Conta inativa sintética','10 mg',10,'comprimidos','2026-01-01','2026-01-01T00:00:00Z');
