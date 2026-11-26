-- QA only: synthetic rows, catalog-derived constraints and grants. Not a production dump.
-- Preserve original fixture IDs; approximate uuid-ossp defaults with gen_random_uuid().
ALTER TABLE public.persons ADD COLUMN name text NOT NULL DEFAULT 'Pessoa QA', ADD COLUMN email text, ADD COLUMN phone text, ADD COLUMN avatar_url text, ADD COLUMN color text DEFAULT '#60A5FA', ADD COLUMN is_default bool DEFAULT false, ADD COLUMN created_at timestamptz DEFAULT now(), ADD COLUMN updated_at timestamptz DEFAULT now();
ALTER TABLE public.medicamentos ALTER COLUMN person_id DROP NOT NULL, ALTER COLUMN nome SET NOT NULL, ALTER COLUMN dosagem SET NOT NULL, ALTER COLUMN estoque_quantidade SET DEFAULT 0,
 ADD COLUMN hospital_id uuid, ADD COLUMN local_id uuid, ADD COLUMN tipo_receita text DEFAULT 'comum', ADD COLUMN tipo_uso text DEFAULT 'continuo', ADD COLUMN cor_principal text, ADD COLUMN cor_secundaria text, ADD COLUMN status text DEFAULT 'ativo', ADD COLUMN estoque_horarios text[], ADD COLUMN preco numeric, ADD COLUMN motivo_descontinuacao text, ADD COLUMN medico_descontinuacao_id uuid, ADD COLUMN medico_descontinuacao_nome text, ADD COLUMN substituido_por_id uuid, ADD COLUMN data_descontinuacao date, ADD COLUMN historico_dosagens jsonb DEFAULT '[]', ADD COLUMN observacoes text, ADD COLUMN created_at timestamptz DEFAULT now(), ADD COLUMN cid_ids text[], ADD COLUMN tratamento_ids text[], ADD COLUMN contexto_clinico_m1 jsonb;
ALTER TABLE public.dose_logs ADD COLUMN observacoes text, ADD COLUMN synced bool;
ALTER TABLE public.dose_logs ADD CONSTRAINT dose_logs_dose_kind_check CHECK(dose_kind IS NULL OR dose_kind IN ('scheduled','sos','extra','planned'));
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_contexto_clinico_m1_obj_ck CHECK(contexto_clinico_m1 IS NULL OR (jsonb_typeof(contexto_clinico_m1)='object' AND contexto_clinico_m1->>'versao'='1')), ADD CONSTRAINT medicamentos_lembrete_receita_data_check CHECK(lembrete_receita_modo='data_personalizada' OR lembrete_receita_data IS NULL), ADD CONSTRAINT medicamentos_lembrete_receita_modo_check CHECK(lembrete_receita_modo IN ('automatico','7_dias','15_dias','data_personalizada'));
ALTER TABLE public.renovacoes ADD CONSTRAINT renovacoes_person_id_fkey FOREIGN KEY(person_id) REFERENCES persons(id) ON DELETE CASCADE, ADD CONSTRAINT vault_a3_renovacoes_locations_ck CHECK((a3_location_snapshot IS NULL OR jsonb_typeof(a3_location_snapshot)='object') AND jsonb_typeof(a3_location_changes)='array' AND jsonb_array_length(a3_location_changes)<=200) NOT VALID;
ALTER TABLE public.retiradas ADD COLUMN data date NOT NULL DEFAULT '2026-01-01', ADD COLUMN horario time, ADD COLUMN renovacao_origem_id uuid, ADD COLUMN medico_id uuid, ADD COLUMN farmacia_id uuid, ADD COLUMN hospital_id uuid, ADD COLUMN local_id uuid, ADD COLUMN medicamento_nome text, ADD COLUMN medicamento_dosagem text, ADD COLUMN quantidade_prevista numeric, ADD COLUMN exige_nova_receita bool NOT NULL DEFAULT false, ADD COLUMN observacoes text, ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN reagendamentos jsonb NOT NULL DEFAULT '[]', ADD COLUMN fornecimento_id uuid, ADD COLUMN fornecimento_ciclo_id uuid, ADD COLUMN a3_location_snapshot jsonb, ADD COLUMN a3_location_changes jsonb NOT NULL DEFAULT '[]', ALTER COLUMN tipo SET DEFAULT 'sus', ALTER COLUMN status SET DEFAULT 'agendada';
ALTER TABLE public.retiradas ALTER COLUMN data DROP DEFAULT, ADD CONSTRAINT retiradas_qp_check CHECK(quantidade_prevista>=0), ADD CONSTRAINT retiradas_qr_check CHECK(quantidade_retirada>=0), ADD CONSTRAINT retiradas_reagendamentos_array_check CHECK(jsonb_typeof(reagendamentos)='array'), ADD CONSTRAINT retiradas_status_check CHECK(status IN ('agendada','realizada','cancelada','nao_realizada')), ADD CONSTRAINT retiradas_tipo_check CHECK(tipo IN ('sus','farmacia','outro')), ADD CONSTRAINT retiradas_supply_pair CHECK((fornecimento_id IS NULL)=(fornecimento_ciclo_id IS NULL)), ADD CONSTRAINT vault_a3_retiradas_locations_ck CHECK((a3_location_snapshot IS NULL OR jsonb_typeof(a3_location_snapshot)='object') AND jsonb_typeof(a3_location_changes)='array' AND jsonb_array_length(a3_location_changes)<=200) NOT VALID;
-- Mirror supply FK shapes without copying clinical supply tables or rows.
CREATE TABLE public.fornecimento_ciclos(id uuid, processo_id uuid, user_id uuid, person_id uuid, PRIMARY KEY(id,processo_id,user_id,person_id));
CREATE TABLE public.fornecimento_itens(ciclo_id uuid, medicamento_id uuid, user_id uuid, person_id uuid, PRIMARY KEY(ciclo_id,medicamento_id,user_id,person_id));
ALTER TABLE public.retiradas ADD CONSTRAINT retiradas_supply_cycle_fk FOREIGN KEY(fornecimento_ciclo_id,fornecimento_id,user_id,person_id) REFERENCES fornecimento_ciclos(id,processo_id,user_id,person_id), ADD CONSTRAINT retiradas_supply_item_fk FOREIGN KEY(fornecimento_ciclo_id,medicamento_id,user_id,person_id) REFERENCES fornecimento_itens(ciclo_id,medicamento_id,user_id,person_id);
-- Legacy owner policies target PUBLIC (not just authenticated), as observed in production.
DO $$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['persons','medicamentos','dose_logs','documents','medicos','farmacias','hospitais','locais','renovacoes'] LOOP
 EXECUTE format('DROP POLICY owner_scope ON public.%I',n);
 EXECUTE format('CREATE POLICY "Acesso total ao dono" ON public.%I FOR ALL TO public USING (auth.uid()::text=user_id::text)',n);
 EXECUTE format('GRANT ALL ON public.%I TO anon,authenticated,service_role',n);
 END LOOP; END $$;
DROP POLICY owner_scope ON public.retiradas;
CREATE POLICY retiradas_select_own ON public.retiradas FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY retiradas_insert_own ON public.retiradas FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id);
CREATE POLICY retiradas_update_own ON public.retiradas FOR UPDATE TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY retiradas_delete_own ON public.retiradas FOR DELETE TO authenticated USING(auth.uid()=user_id);
GRANT ALL ON public.retiradas TO anon,authenticated,service_role;
-- Existing Stability role/policy simulated without granting Macro02 membership.
CREATE ROLE vault_visual_r03_worker NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
CREATE SCHEMA vault_visual_r03_private;
CREATE FUNCTION vault_visual_r03_private.actor_uid() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() $$;
GRANT USAGE ON SCHEMA vault_visual_r03_private TO vault_visual_r03_worker;
GRANT EXECUTE ON FUNCTION vault_visual_r03_private.actor_uid() TO vault_visual_r03_worker;
GRANT SELECT(id,user_id) ON public.persons TO vault_visual_r03_worker;
CREATE POLICY vault_visual_r03_person_read ON public.persons FOR SELECT TO vault_visual_r03_worker USING(vault_visual_r03_private.actor_uid()=user_id);
ALTER TABLE public.persons ADD CONSTRAINT persons_user_id_fkey FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_user_id_fkey FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dose_logs ADD CONSTRAINT dose_logs_user_id_fkey FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.renovacoes ADD CONSTRAINT renovacoes_user_id_fkey FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
