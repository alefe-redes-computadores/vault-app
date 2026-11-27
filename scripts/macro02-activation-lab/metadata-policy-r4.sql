-- Lab only: independent server-side envelope policy. No DML, no activation,
-- no grants to client roles. CAS/ownership/FK/receipt persistence must still
-- be enforced by the future worker; this function is not write permission.
BEGIN;
CREATE FUNCTION vault_macro02_private.metadata_columns_r4(t text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE t
 WHEN 'doseLogs' THEN ARRAY['id','user_id','person_id','medicamento_id','data','horario','tomado_em','ignorado_em','quantidade','created_at','updated_at','observacoes','dose_kind','motivo','unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot']::text[]
 WHEN 'medicamentos' THEN ARRAY['id','user_id','person_id','document_id','medico_id','farmacia_id','hospital_id','local_id','nome','dosagem','medico','farmacia','data_receita','proxima_renovacao','tipo_receita','tipo_uso','forma_farmaceutica','cor_principal','cor_secundaria','status','estoque_quantidade','estoque_data_referencia','estoque_horarios','estoque_unidade_por_dose','estoque_unidade_medida','estoque_ml_total','estoque_gotas_por_ml','formato','cores','preco','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','data_descontinuacao','historico_dosagens','observacoes','created_at','updated_at','cid_ids','tratamento_ids','tipo_aquisicao','data_retorno_sus','lembrete_receita_modo','lembrete_receita_data','catalog_snapshot','contexto_clinico_m1','estoque_ciclo_id','macro02_stock_managed']::text[]
 WHEN 'renovacoes' THEN ARRAY['id','user_id','person_id','document_id','medicamento_id','medico_id','farmacia_id','hospital_id','local_id','quantidade','preco','lote','validade_produto','data','anexo_url','observacoes','created_at','updated_at','tipo_aquisicao','data_retorno_sus','data_proxima_retirada','exige_nova_receita','data_aquisicao','medicamento_nome','medicamento_dosagem','a3_location_snapshot','a3_location_changes']::text[]
 WHEN 'retiradas' THEN ARRAY['id','user_id','person_id','medicamento_id','renovacao_origem_id','renovacao_realizada_id','medico_id','farmacia_id','hospital_id','local_id','medicamento_nome','medicamento_dosagem','data','horario','tipo','status','quantidade_prevista','quantidade_retirada','exige_nova_receita','observacoes','realizada_em','created_at','updated_at','reagendamentos','fornecimento_id','fornecimento_ciclo_id','a3_location_snapshot','a3_location_changes']::text[]
 ELSE NULL END $$;
CREATE FUNCTION vault_macro02_private.metadata_uuid_r4(v jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_typeof(v)='string' AND (v#>>'{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
$$;
CREATE FUNCTION vault_macro02_private.metadata_day_r4(v jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE s text:=v#>>'{}';
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR left(s,4)='0000' THEN RETURN false; END IF;
 RETURN to_char(s::date,'YYYY-MM-DD')=s;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN false;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_instant_r4(v jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE s text:=v#>>'{}';
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$' OR NOT vault_macro02_private.metadata_day_r4(to_jsonb(left(s,10))) THEN RETURN false; END IF;
 RETURN isfinite(s::timestamptz);
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format OR invalid_parameter_value THEN RETURN false;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_hour_r4(v jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT coalesce(jsonb_typeof(v)='string' AND (v#>>'{}') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false) $$;
CREATE FUNCTION vault_macro02_private.metadata_missing_r4(r jsonb,keys text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT NOT EXISTS(SELECT 1 FROM unnest(keys) k WHERE r->k IS DISTINCT FROM 'null'::jsonb) $$;
CREATE FUNCTION vault_macro02_private.metadata_quantity_r4(v jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN v='null'::jsonb THEN true WHEN jsonb_typeof(v)='number' THEN (v#>>'{}')::numeric>0 ELSE false END $$;
CREATE FUNCTION vault_macro02_private.metadata_prefix_r4(a jsonb,b jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE i integer;
BEGIN
 IF a='null'::jsonb THEN a:='[]'; END IF; IF b='null'::jsonb THEN b:='[]'; END IF;
 IF jsonb_typeof(a) IS DISTINCT FROM 'array' OR jsonb_typeof(b) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(a)>jsonb_array_length(b) THEN RETURN false; END IF;
 FOR i IN 0..jsonb_array_length(a)-1 LOOP IF a->i IS DISTINCT FROM b->i THEN RETURN false; END IF; END LOOP;
 RETURN true;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_row_r4(t text,r jsonb,uid uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE keys text[]:=vault_macro02_private.metadata_columns_r4(t);
BEGIN
 IF uid IS NULL OR keys IS NULL OR jsonb_typeof(r) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT (r ?& keys) OR (SELECT count(*) FROM jsonb_object_keys(r))<>cardinality(keys) THEN RETURN false; END IF;
 RETURN coalesce(vault_macro02_private.metadata_uuid_r4(r->'id') AND r->>'user_id'=uid::text AND vault_macro02_private.metadata_uuid_r4(r->'person_id') AND (t='medicamentos' OR vault_macro02_private.metadata_uuid_r4(r->'medicamento_id')) AND vault_macro02_private.metadata_instant_r4(r->'updated_at') AND (r->'created_at'='null'::jsonb OR vault_macro02_private.metadata_instant_r4(r->'created_at')),false);
END $$;
CREATE FUNCTION vault_macro02_private.metadata_planned_r4(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT coalesce(r->>'dose_kind'='planned' AND vault_macro02_private.metadata_missing_r4(r,ARRAY['tomado_em','ignorado_em','unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot']) AND vault_macro02_private.metadata_day_r4(r->'data') AND vault_macro02_private.metadata_hour_r4(r->'horario') AND vault_macro02_private.metadata_quantity_r4(r->'quantidade'),false) $$;
CREATE FUNCTION vault_macro02_private.metadata_pure_rx_r4(r jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT vault_macro02_private.metadata_missing_r4(r,ARRAY['data_aquisicao','tipo_aquisicao','quantidade','preco','lote','validade_produto']) $$;
CREATE FUNCTION vault_macro02_private.metadata_unresolved_r4(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT coalesce(r->>'status' IN('agendada','cancelada','nao_realizada') AND vault_macro02_private.metadata_missing_r4(r,ARRAY['renovacao_realizada_id','quantidade_retirada','realizada_em']) AND vault_macro02_private.metadata_day_r4(r->'data') AND (r->'horario'='null'::jsonb OR vault_macro02_private.metadata_hour_r4(r->'horario')) AND vault_macro02_private.metadata_quantity_r4(r->'quantidade_prevista'),false) $$;
CREATE FUNCTION vault_macro02_private.metadata_change_r4(c jsonb,uid uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE t text:=c->>'table'; k text:=c->>'kind'; a jsonb:=nullif(c->'before','null'::jsonb); b jsonb:=nullif(c->'after','null'::jsonb); r jsonb:=c->'receipt'; reassign boolean; permitted text[];
BEGIN
 IF jsonb_typeof(c) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT(c ?& ARRAY['table','kind','before','after']) OR EXISTS(SELECT 1 FROM jsonb_object_keys(c) x WHERE x NOT IN('table','kind','before','after','receipt')) OR (a IS NULL AND b IS NULL) OR vault_macro02_private.metadata_columns_r4(t) IS NULL THEN RETURN false; END IF;
 IF (a IS NOT NULL AND NOT vault_macro02_private.metadata_row_r4(t,a,uid)) OR (b IS NOT NULL AND NOT vault_macro02_private.metadata_row_r4(t,b,uid)) THEN RETURN false; END IF;
 IF a IS NOT NULL AND b IS NOT NULL THEN
  IF (a->'id',a->'user_id',a->'person_id',a->'created_at') IS DISTINCT FROM (b->'id',b->'user_id',b->'person_id',b->'created_at') OR (t<>'medicamentos' AND k<>'withdrawal-plan' AND a->'medicamento_id' IS DISTINCT FROM b->'medicamento_id') OR (b->>'updated_at')::timestamptz<(a->>'updated_at')::timestamptz THEN RETURN false; END IF;
 END IF;
 IF k IS DISTINCT FROM 'withdrawal-link-receipt' AND c ? 'receipt' THEN RETURN false; END IF;
 CASE k
 WHEN 'planned-dose' THEN
  RETURN t='doseLogs' AND (a IS NULL OR vault_macro02_private.metadata_planned_r4(a)) AND (b IS NULL OR vault_macro02_private.metadata_planned_r4(b)) AND (a IS NULL OR b IS NULL OR a-ARRAY['quantidade','motivo','observacoes','updated_at']=b-ARRAY['quantidade','motivo','observacoes','updated_at']);
 WHEN 'medication-create' THEN
  IF t<>'medicamentos' OR a IS NOT NULL OR b IS NULL OR b->'estoque_ciclo_id' IS DISTINCT FROM 'null'::jsonb OR b->'macro02_stock_managed' IS DISTINCT FROM 'false'::jsonb OR jsonb_typeof(b->'nome') IS DISTINCT FROM 'string' OR length(btrim(b->>'nome'))=0 OR jsonb_typeof(b->'dosagem') IS DISTINCT FROM 'string' OR length(btrim(b->>'dosagem'))=0 THEN RETURN false; END IF;
  -- Conservative stock-unit subset with explicit accent normalization; any
  -- unknown unit is rejected, not inferred from drug name or dosage.
  IF b->'estoque_quantidade'='null'::jsonb THEN RETURN true; END IF;
  IF jsonb_typeof(b->'estoque_quantidade') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  RETURN (b->>'estoque_quantidade')::numeric>=0 AND ((b->>'estoque_quantidade')::numeric=0 OR coalesce(translate(lower(btrim(b->>'estoque_unidade_medida')),'áàâãéêíóôõúüç','aaaaeeiooouuc') IN('comprimido','comprimidos','comprimido(s)','capsula','capsulas','capsula(s)','gota','gotas','gota(s)','ml','unidade','unidades','unidade(s)','aplicacao','aplicacoes','aplicacao(oes)','inalacao','inalacoes','mg','mcg','g','ui','jato','jatos','adesivo','adesivos','sache','saches'),false));
 WHEN 'medication-discontinue' THEN
  IF t<>'medicamentos' OR a IS NULL OR b IS NULL OR b->>'status' IS DISTINCT FROM 'descontinuado' OR NOT vault_macro02_private.metadata_day_r4(b->'data_descontinuacao') OR jsonb_typeof(b->'motivo_descontinuacao') IS DISTINCT FROM 'string' OR length(btrim(b->>'motivo_descontinuacao'))=0 THEN RETURN false; END IF;
  permitted:=ARRAY['status','data_descontinuacao','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','updated_at'];
 WHEN 'medication-metadata' THEN
  IF t<>'medicamentos' OR a IS NULL OR b IS NULL THEN RETURN false; END IF; permitted:=ARRAY['nome','dosagem','medico','farmacia','medico_id','farmacia_id','hospital_id','local_id','document_id','data_receita','proxima_renovacao','observacoes','tipo_receita','lembrete_receita_modo','lembrete_receita_data','tipo_uso','tipo_aquisicao','data_retorno_sus','forma_farmaceutica','cor_principal','cor_secundaria','status','estoque_horarios','formato','cores','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','data_descontinuacao','preco','historico_dosagens','catalog_snapshot','contexto_clinico_m1','cid_ids','tratamento_ids','updated_at'];
 WHEN 'prescription-create' THEN RETURN t='renovacoes' AND a IS NULL AND b IS NOT NULL AND vault_macro02_private.metadata_pure_rx_r4(b) AND vault_macro02_private.metadata_day_r4(b->'data');
 WHEN 'prescription-delete' THEN RETURN t='renovacoes' AND a IS NOT NULL AND b IS NULL AND vault_macro02_private.metadata_pure_rx_r4(a);
 WHEN 'prescription-edit' THEN
  IF t<>'renovacoes' OR a IS NULL OR b IS NULL THEN RETURN false; END IF;
  IF NOT vault_macro02_private.metadata_pure_rx_r4(a) OR NOT vault_macro02_private.metadata_pure_rx_r4(b) THEN permitted:=ARRAY['observacoes','anexo_url','document_id','updated_at'];
  ELSE
   IF NOT vault_macro02_private.metadata_day_r4(b->'data') OR NOT vault_macro02_private.metadata_prefix_r4(a->'a3_location_changes',b->'a3_location_changes') THEN RETURN false; END IF;
   permitted:=ARRAY['data','document_id','medico_id','farmacia_id','hospital_id','local_id','observacoes','data_proxima_retirada','data_retorno_sus','exige_nova_receita','anexo_url','a3_location_snapshot','a3_location_changes','updated_at'];
  END IF;
 WHEN 'withdrawal-plan' THEN
  IF t<>'retiradas' OR (a IS NOT NULL AND NOT vault_macro02_private.metadata_unresolved_r4(a)) OR (b IS NOT NULL AND NOT vault_macro02_private.metadata_unresolved_r4(b)) THEN RETURN false; END IF;
  IF a IS NULL OR b IS NULL THEN RETURN true; END IF;
  reassign:=a->'medicamento_id' IS DISTINCT FROM b->'medicamento_id';
  IF reassign AND (a->>'status' IS DISTINCT FROM 'agendada' OR b->>'status' IS DISTINCT FROM 'agendada' OR NOT vault_macro02_private.metadata_missing_r4(a,ARRAY['renovacao_origem_id','fornecimento_id','fornecimento_ciclo_id']) OR NOT vault_macro02_private.metadata_missing_r4(b,ARRAY['renovacao_origem_id','fornecimento_id','fornecimento_ciclo_id'])) THEN RETURN false; END IF;
  IF NOT vault_macro02_private.metadata_prefix_r4(a->'reagendamentos',b->'reagendamentos') OR NOT vault_macro02_private.metadata_prefix_r4(a->'a3_location_changes',b->'a3_location_changes') THEN RETURN false; END IF;
  permitted:=ARRAY['data','horario','tipo','status','medico_id','farmacia_id','hospital_id','local_id','medicamento_nome','medicamento_dosagem','quantidade_prevista','exige_nova_receita','observacoes','reagendamentos','fornecimento_id','fornecimento_ciclo_id','a3_location_snapshot','a3_location_changes','updated_at']; IF reassign THEN permitted:=array_append(permitted,'medicamento_id'); END IF;
 WHEN 'withdrawal-annotate' THEN
  IF t<>'retiradas' OR a IS NULL OR b IS NULL OR a->>'status' IS DISTINCT FROM 'realizada' OR b->>'status' IS DISTINCT FROM 'realizada' THEN RETURN false; END IF; permitted:=ARRAY['observacoes','updated_at'];
 WHEN 'withdrawal-link-receipt' THEN
  IF t<>'retiradas' OR a IS NULL OR b IS NULL OR NOT vault_macro02_private.metadata_row_r4('renovacoes',r,uid) OR coalesce(a->>'status','') NOT IN('agendada','realizada') OR a->'renovacao_realizada_id' IS DISTINCT FROM 'null'::jsonb OR b->>'status' IS DISTINCT FROM 'realizada' OR r->'person_id' IS DISTINCT FROM a->'person_id' OR r->'medicamento_id' IS DISTINCT FROM a->'medicamento_id' OR NOT vault_macro02_private.metadata_day_r4(r->'data_aquisicao') OR jsonb_typeof(r->'quantidade') IS DISTINCT FROM 'number' OR NOT vault_macro02_private.metadata_quantity_r4(r->'quantidade') OR r->'id' IS DISTINCT FROM b->'renovacao_realizada_id' OR r->'quantidade' IS DISTINCT FROM b->'quantidade_retirada' OR NOT vault_macro02_private.metadata_instant_r4(b->'realizada_em') OR (a->'realizada_em'<>'null'::jsonb AND a->'realizada_em' IS DISTINCT FROM b->'realizada_em') OR (a->>'tipo'='sus' AND r->>'tipo_aquisicao' IS DISTINCT FROM 'sus') THEN RETURN false; END IF;
  permitted:=ARRAY['status','renovacao_realizada_id','quantidade_retirada','realizada_em','updated_at'];
 ELSE RETURN false;
 END CASE;
 RETURN coalesce(a-permitted=b-permitted,false);
END $$;
-- Infer the only valid mixed routes from the immutable envelope. A mixed
-- operation cannot carry unrelated medication edits, another prescription or
-- two uses of the same acquisition receipt. Per-row validation alone is not
-- enough to establish these cross-row invariants.
CREATE FUNCTION vault_macro02_private.metadata_route_r4(changes jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE c jsonb; rx jsonb; w jsonb; row_image jsonb; a jsonb; b jsonb; k text; primary_kind text; rx_count integer:=0; receipt_ids text[]:='{}'; matched boolean;
BEGIN
 FOR c IN SELECT value FROM jsonb_array_elements(changes) LOOP
  k:=c->>'kind';
  IF k LIKE 'prescription-%' THEN rx_count:=rx_count+1;rx:=c; END IF;
  IF k='withdrawal-link-receipt' THEN
   IF (c->'receipt'->>'id')=ANY(receipt_ids) THEN RETURN false; END IF;
   receipt_ids:=array_append(receipt_ids,c->'receipt'->>'id');
  END IF;
 END LOOP;
 IF rx_count>1 THEN RETURN false; END IF;
 IF rx_count=1 THEN primary_kind:=rx->>'kind';
 ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(changes) x WHERE x->>'kind' IN('withdrawal-plan','withdrawal-annotate')) THEN primary_kind:='withdrawal-plan';
 ELSE primary_kind:=changes->0->>'kind'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(changes) LOOP
  k:=c->>'kind';a:=nullif(c->'before','null'::jsonb);b:=nullif(c->'after','null'::jsonb);
  IF k=primary_kind OR (primary_kind='withdrawal-plan' AND k='withdrawal-annotate') THEN CONTINUE; END IF;
  IF rx_count=1 AND k='withdrawal-plan' THEN
   row_image:=coalesce(nullif(rx->'after','null'::jsonb),rx->'before');
   IF (a IS NOT NULL AND (a->'medicamento_id' IS DISTINCT FROM row_image->'medicamento_id' OR a->'renovacao_origem_id' IS DISTINCT FROM row_image->'id')) OR (b IS NOT NULL AND (b->'medicamento_id' IS DISTINCT FROM row_image->'medicamento_id' OR b->'renovacao_origem_id' IS DISTINCT FROM row_image->'id')) THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  IF k='medication-metadata' AND primary_kind IN('prescription-create','prescription-edit','withdrawal-plan') THEN
   IF a IS NULL OR b IS NULL OR a-ARRAY['data_retorno_sus','updated_at'] IS DISTINCT FROM b-ARRAY['data_retorno_sus','updated_at'] THEN RETURN false; END IF;
   matched:=false;
   FOR w IN SELECT value FROM jsonb_array_elements(changes) LOOP
    IF (rx_count=1 AND w=rx OR rx_count=0 AND w->>'kind' IN('withdrawal-plan','withdrawal-annotate')) AND (w->'before'->'medicamento_id'=b->'id' OR w->'after'->'medicamento_id'=b->'id') THEN matched:=true; END IF;
   END LOOP;
   IF NOT matched THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  RETURN false;
 END LOOP;
 RETURN true;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_intent_policy_r4(p jsonb,uid uuid,ep uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE c jsonb; r jsonb; seen text[]:='{}'; key text; person text;
BEGIN
 IF uid IS NULL OR ep IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT(p ?& ARRAY['format','account_id','epoch','operation_id','changes']) OR (SELECT count(*) FROM jsonb_object_keys(p))<>5 OR p->>'format' IS DISTINCT FROM 'macro02-metadata-r3' OR p->>'account_id' IS DISTINCT FROM uid::text OR p->>'epoch' IS DISTINCT FROM ep::text OR NOT vault_macro02_private.metadata_uuid_r4(p->'operation_id') OR jsonb_typeof(p->'changes') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p->'changes') NOT BETWEEN 1 AND 512 THEN RETURN false; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(p->'changes') LOOP
  IF vault_macro02_private.metadata_change_r4(c,uid) IS DISTINCT FROM true THEN RETURN false; END IF;
  r:=coalesce(nullif(c->'after','null'::jsonb),c->'before');key:=(c->>'table')||':'||(r->>'id');
  IF key=ANY(seen) OR (person IS NOT NULL AND person IS DISTINCT FROM r->>'person_id') THEN RETURN false; END IF;
  seen:=array_append(seen,key);person:=r->>'person_id';
 END LOOP;
 RETURN vault_macro02_private.metadata_route_r4(p->'changes');
END $$;
-- Internal only. Explicit revocations are needed even for pure predicates.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vault_macro02_private' AND p.proname LIKE 'metadata%\_r4' ESCAPE '\' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker',f.signature);
 END LOOP;
END $$;
COMMIT;
