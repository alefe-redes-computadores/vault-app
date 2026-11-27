-- Synthetic, independent tests for the server policy. No clinical data.
\set ON_ERROR_STOP on
CREATE TEMP TABLE m02_policy_results(label text PRIMARY KEY, expected boolean NOT NULL, actual boolean);
CREATE FUNCTION pg_temp.fullrow(t text,p jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_object_agg(k,'null'::jsonb) || jsonb_build_object('user_id','00000000-0000-4000-8000-000000000001','person_id','00000000-0000-4000-8000-000000000011','created_at','2026-11-26T12:00:00Z','updated_at','2026-11-26T12:00:00Z') || p FROM unnest(vault_macro02_private.metadata_columns_r4(t)) k
$$;
CREATE FUNCTION pg_temp.change(t text,k text,a jsonb,b jsonb,r jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('table',t,'kind',k,'before',a,'after',b)||CASE WHEN r IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('receipt',r) END $$;
CREATE FUNCTION pg_temp.check_policy(label text,expected boolean,changes jsonb,patch jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid:='00000000-0000-4000-8000-000000000001'; ep uuid:='00000000-0000-4000-8000-000000000099'; actual boolean; req jsonb;
BEGIN
 req:=jsonb_build_object('format','macro02-metadata-r3','account_id',uid,'epoch',ep,'operation_id','00000000-0000-4000-8000-000000000088','changes',changes)||patch;
 actual:=vault_macro02_private.metadata_intent_policy_r4(req,uid,ep);
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_POLICY_TEST: % expected % actual %',label,expected,actual; END IF;
 INSERT INTO m02_policy_results VALUES(label,expected,actual);
END $$;
DO $$
DECLARE mid text:='00000000-0000-4000-8000-000000000031'; rid text:='00000000-0000-4000-8000-000000000071'; t text:='2026-11-26T12:01:00Z'; d jsonb; m jsonb; r jsonb; a jsonb; w jsonb; done jsonb; c jsonb; q jsonb; linked jsonb;
BEGIN
 d:=pg_temp.fullrow('doseLogs',jsonb_build_object('id','00000000-0000-4000-8000-000000000061','medicamento_id',mid,'data','2026-11-26','horario','08:00','dose_kind','planned','quantidade',1));
 m:=pg_temp.fullrow('medicamentos',jsonb_build_object('id',mid,'nome','Synthetic','dosagem','1mg','macro02_stock_managed',false,'estoque_quantidade',9,'estoque_unidade_medida','comprimido'));
 r:=pg_temp.fullrow('renovacoes',jsonb_build_object('id',rid,'medicamento_id',mid,'data','2026-11-26','a3_location_changes','[]'::jsonb));
 a:=r||jsonb_build_object('tipo_aquisicao','sus','data_aquisicao','2026-11-26','quantidade',10);
 w:=pg_temp.fullrow('retiradas',jsonb_build_object('id','00000000-0000-4000-8000-000000000081','medicamento_id',mid,'data','2026-11-26','tipo','sus','status','agendada','reagendamentos','[]'::jsonb,'a3_location_changes','[]'::jsonb));
 done:=w||jsonb_build_object('status','realizada','renovacao_realizada_id',rid,'quantidade_retirada',10,'realizada_em',t,'updated_at',t);
 PERFORM pg_temp.check_policy('planned add',true,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',NULL,d)));
 PERFORM pg_temp.check_policy('planned edit',true,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',d,d||jsonb_build_object('quantidade',2,'updated_at',t))));
 PERFORM pg_temp.check_policy('planned delete',true,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',d,NULL)));
 FOREACH q IN ARRAY ARRAY[jsonb_build_object('tomado_em',t),jsonb_build_object('ignorado_em',t),'{"estoque_movimento":{"amount":1}}'::jsonb,'{"data":"2026-11-27"}'::jsonb,'{"quantidade":-1}'::jsonb] LOOP
  PERFORM pg_temp.check_policy('planned forbidden '||(SELECT string_agg(key,',') FROM jsonb_object_keys(q) key),false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',d,d||q||jsonb_build_object('updated_at',t))));
 END LOOP;
 PERFORM pg_temp.check_policy('med initial stock',true,jsonb_build_array(pg_temp.change('medicamentos','medication-create',NULL,m)));
 PERFORM pg_temp.check_policy('med accent unit',true,jsonb_build_array(pg_temp.change('medicamentos','medication-create',NULL,m||'{"estoque_unidade_medida":"cápsula"}'::jsonb)));
 PERFORM pg_temp.check_policy('med missing unit',false,jsonb_build_array(pg_temp.change('medicamentos','medication-create',NULL,m||'{"estoque_unidade_medida":null}'::jsonb)));
 PERFORM pg_temp.check_policy('med managed initial',false,jsonb_build_array(pg_temp.change('medicamentos','medication-create',NULL,m||'{"macro02_stock_managed":true}'::jsonb)));
 c:=m||jsonb_build_object('status','descontinuado','data_descontinuacao','2026-11-26','motivo_descontinuacao','Synthetic','updated_at',t);
 PERFORM pg_temp.check_policy('med discontinued',true,jsonb_build_array(pg_temp.change('medicamentos','medication-discontinue',m,c)));
 PERFORM pg_temp.check_policy('med discontinued stock changed',false,jsonb_build_array(pg_temp.change('medicamentos','medication-discontinue',m,c||'{"estoque_quantidade":0}'::jsonb)));
 PERFORM pg_temp.check_policy('med note',true,jsonb_build_array(pg_temp.change('medicamentos','medication-metadata',m,m||jsonb_build_object('observacoes','Synthetic','updated_at',t))));
 PERFORM pg_temp.check_policy('med balance changed',false,jsonb_build_array(pg_temp.change('medicamentos','medication-metadata',m,m||'{"estoque_quantidade":10}'::jsonb)));
 PERFORM pg_temp.check_policy('rx create',true,jsonb_build_array(pg_temp.change('renovacoes','prescription-create',NULL,r)));
 PERFORM pg_temp.check_policy('rx create acquisition rejected',false,jsonb_build_array(pg_temp.change('renovacoes','prescription-create',NULL,a)));
 PERFORM pg_temp.check_policy('rx edit',true,jsonb_build_array(pg_temp.change('renovacoes','prescription-edit',r,r||jsonb_build_object('data','2026-11-27','updated_at',t))));
 PERFORM pg_temp.check_policy('rx delete',true,jsonb_build_array(pg_temp.change('renovacoes','prescription-delete',r,NULL)));
 PERFORM pg_temp.check_policy('acquisition delete rejected',false,jsonb_build_array(pg_temp.change('renovacoes','prescription-delete',a,NULL)));
 PERFORM pg_temp.check_policy('acquisition annotation',true,jsonb_build_array(pg_temp.change('renovacoes','prescription-edit',a,a||jsonb_build_object('observacoes','Synthetic','updated_at',t))));
 PERFORM pg_temp.check_policy('acquisition quantity rejected',false,jsonb_build_array(pg_temp.change('renovacoes','prescription-edit',a,a||'{"quantidade":9}'::jsonb)));
 PERFORM pg_temp.check_policy('withdrawal plan',true,jsonb_build_array(pg_temp.change('retiradas','withdrawal-plan',NULL,w)));
 PERFORM pg_temp.check_policy('withdrawal reschedule',true,jsonb_build_array(pg_temp.change('retiradas','withdrawal-plan',w,w||jsonb_build_object('data','2026-11-27','updated_at',t))));
 PERFORM pg_temp.check_policy('withdrawal delete',true,jsonb_build_array(pg_temp.change('retiradas','withdrawal-plan',w,NULL)));
 PERFORM pg_temp.check_policy('withdrawal realization rejected',false,jsonb_build_array(pg_temp.change('retiradas','withdrawal-plan',w,done)));
 PERFORM pg_temp.check_policy('withdrawal history removal rejected',false,jsonb_build_array(pg_temp.change('retiradas','withdrawal-plan',w||'{"reagendamentos":[{"synthetic":1}]}'::jsonb,w)));
 PERFORM pg_temp.check_policy('withdrawal annotation',true,jsonb_build_array(pg_temp.change('retiradas','withdrawal-annotate',done,done||'{"observacoes":"Synthetic"}'::jsonb)));
 PERFORM pg_temp.check_policy('withdrawal annotation quantity rejected',false,jsonb_build_array(pg_temp.change('retiradas','withdrawal-annotate',done,done||'{"quantidade_retirada":1}'::jsonb)));
 PERFORM pg_temp.check_policy('withdrawal receipt',true,jsonb_build_array(pg_temp.change('retiradas','withdrawal-link-receipt',w,done,a)));
 PERFORM pg_temp.check_policy('withdrawal wrong receipt',false,jsonb_build_array(pg_temp.change('retiradas','withdrawal-link-receipt',w,done,a||'{"quantidade":1}'::jsonb)));
 linked:=pg_temp.change('retiradas','withdrawal-link-receipt',w,done,a);
 PERFORM pg_temp.check_policy('duplicate acquisition in batch',false,jsonb_build_array(linked,pg_temp.change('retiradas','withdrawal-link-receipt',w||'{"id":"00000000-0000-4000-8000-000000000082"}'::jsonb,done||'{"id":"00000000-0000-4000-8000-000000000082"}'::jsonb,a)));
 c:=pg_temp.change('retiradas','withdrawal-plan',w,w||jsonb_build_object('data','2026-11-27','updated_at',t));
 PERFORM pg_temp.check_policy('withdrawal mirrored SUS date',true,jsonb_build_array(c,pg_temp.change('medicamentos','medication-metadata',m,m||jsonb_build_object('data_retorno_sus','2026-11-27','updated_at',t))));
 PERFORM pg_temp.check_policy('withdrawal unrelated medication name',false,jsonb_build_array(c,pg_temp.change('medicamentos','medication-metadata',m,m||'{"nome":"Changed"}'::jsonb)));
 PERFORM pg_temp.check_policy('withdrawal foreign linked medication',false,jsonb_build_array(c,pg_temp.change('medicamentos','medication-metadata',m||'{"id":"00000000-0000-4000-8000-000000000032"}'::jsonb,m||'{"id":"00000000-0000-4000-8000-000000000032","data_retorno_sus":"2026-11-27"}'::jsonb)));
 PERFORM pg_temp.check_policy('rx create and linked withdrawal',true,jsonb_build_array(pg_temp.change('renovacoes','prescription-create',NULL,r),pg_temp.change('retiradas','withdrawal-plan',NULL,w||jsonb_build_object('renovacao_origem_id',rid))));
 PERFORM pg_temp.check_policy('rx unrelated withdrawal',false,jsonb_build_array(pg_temp.change('renovacoes','prescription-create',NULL,r),pg_temp.change('retiradas','withdrawal-plan',NULL,w)));
 c:=pg_temp.change('doseLogs','planned-dose',NULL,d);
 PERFORM pg_temp.check_policy('duplicate row',false,jsonb_build_array(c,c));
 PERFORM pg_temp.check_policy('foreign account',false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',NULL,d||'{"user_id":"00000000-0000-4000-8000-000000000002"}'::jsonb)));
 PERFORM pg_temp.check_policy('wrong epoch',false,jsonb_build_array(c),'{"epoch":"00000000-0000-4000-8000-000000000098"}');
 PERFORM pg_temp.check_policy('missing column',false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',NULL,d-'motivo')));
 PERFORM pg_temp.check_policy('unknown column',false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',NULL,d||'{"extra":1}'::jsonb)));
 PERFORM pg_temp.check_policy('invalid calendar date',false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',NULL,d||'{"data":"2026-02-30"}'::jsonb)));
 PERFORM pg_temp.check_policy('invalid time',false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',NULL,d||'{"horario":"24:00"}'::jsonb)));
 PERFORM pg_temp.check_policy('stale revision',false,jsonb_build_array(pg_temp.change('doseLogs','planned-dose',d,d||'{"updated_at":"2026-11-25T12:00:00Z"}'::jsonb)));
 PERFORM pg_temp.check_policy('malformed change',false,'[3]'::jsonb);
 PERFORM pg_temp.check_policy('malformed changes',false,'{}'::jsonb);
 PERFORM pg_temp.check_policy('cross person batch',false,jsonb_build_array(c,pg_temp.change('doseLogs','planned-dose',NULL,d||'{"id":"00000000-0000-4000-8000-000000000062","person_id":"00000000-0000-4000-8000-000000000022"}'::jsonb)));
 PERFORM pg_temp.check_policy('mixed unrelated clinical kinds',false,jsonb_build_array(c,pg_temp.change('medicamentos','medication-metadata',m,m||'{"observacoes":"Synthetic"}'::jsonb)));
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN (VALUES('anon'),('authenticated'),('service_role'),('vault_macro02_worker')) roles(role) WHERE n.nspname='vault_macro02_private' AND p.proname LIKE 'metadata%\_r4' ESCAPE '\' AND has_function_privilege(roles.role,p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'M02_POLICY_EXPOSED'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname='m02_dormant_freeze_r1' AND tgenabled='A')<>2 OR EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) THEN RAISE EXCEPTION 'M02_DORMANT_CHANGED'; END IF;
END $$;
SELECT 'MACRO02_SERVER_METADATA_POLICY_PASS='||count(*) FROM m02_policy_results WHERE expected IS NOT DISTINCT FROM actual;
