#!/usr/bin/env python3
"""Draft integration harness. Creates a NEW private cluster only; no DSN or production path."""
import json, os, pathlib, shutil, subprocess, sys, tempfile
from contextlib import suppress
HERE=pathlib.Path(__file__).resolve().parent
TOOLS={n:shutil.which(n) for n in ['initdb','pg_ctl','psql','node']}
if len(sys.argv)!=3 or not all(TOOLS.values()):
    raise SystemExit('BLOCKED: requires initdb, pg_ctl, psql, node; usage: run-local-lab.py <frozen replay report> <frozen snapshot>')
if os.geteuid()==0: raise SystemExit('BLOCKED: use an unprivileged OS account')
root=pathlib.Path(tempfile.mkdtemp(prefix='vault-pharma-pg-',dir=os.environ.get('HOME')))
root.chmod(0o700); sock=root/'sock';sock.mkdir(mode=0o700); data=root/'data'
# No inherited postgres connection configuration. Fresh socket directory, no TCP listener.
env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env['PGCONNECT_TIMEOUT']='5';env['LC_ALL']='C'
port='55473'; user='vault_lab_admin'; db='vault_pharma_lab_r03'; started=False

def run(args,**kwargs):
    return subprocess.run([str(a) for a in args],env=env,text=True,check=True,**kwargs)

def query(sql,expect_fail=False):
    r=subprocess.run([TOOLS['psql'],'-X','-qAt','-v','ON_ERROR_STOP=1','-h',str(sock),'-p',port,'-U',user,'-d',db,'-c',sql],env=env,text=True,capture_output=True,timeout=1800)
    if (r.returncode!=0)!=expect_fail: raise RuntimeError('unexpected SQL result: '+r.stdout[-1000:]+r.stderr[-1000:])
    return r.stderr if expect_fail else r.stdout.strip()

def file(path,database=db):
    run([TOOLS['psql'],'-X','-v','ON_ERROR_STOP=1','-h',sock,'-p',port,'-U',user,'-d',database,'-f',path],stdout=subprocess.DEVNULL)

schema='vault_catalog_lab_r03'; tables=lambda names: ','.join(schema+'.'+n for n in names.split())
def tx(sql):
    return 'BEGIN ISOLATION LEVEL SERIALIZABLE; SET LOCAL lock_timeout=\'5s\'; LOCK TABLE '+tables('medication_catalog_versions medication_products medication_substances other_catalog_snapshot review_authorizations')+' IN SHARE MODE; LOCK TABLE '+tables('medication_product_substances runs receipts')+' IN SHARE ROW EXCLUSIVE MODE; SET LOCAL ROLE vault_catalog_lab_executor; SET LOCAL search_path=pg_catalog,'+schema+'; '+sql+'; COMMIT;'

def must(condition,label):
    if not condition:raise AssertionError(label)
    print('PG_LAB_PASS',label,flush=True)
try:
    run([TOOLS['node'],HERE.parent/'catalog-incremental-input-r03.cjs','--lab-fixture',pathlib.Path(sys.argv[1]).resolve(),pathlib.Path(sys.argv[2]).resolve(),root/'fixture.sql'])
    run([TOOLS['initdb'],'-D',data,'-A','trust','--username='+user,'--no-locale','-E','UTF8'],stdout=subprocess.DEVNULL)
    run([TOOLS['pg_ctl'],'-D',data,'-l',root/'server.log','-o',f"-h '' -k '{sock}' -p {port}",'-w','start']);started=True
    run([TOOLS['psql'],'-X','-v','ON_ERROR_STOP=1','-h',sock,'-p',port,'-U',user,'-d','postgres','-c','CREATE DATABASE '+db],stdout=subprocess.DEVNULL)
    file(HERE/'schema.sql');file(root/'fixture.sql')
    aid=query(f'SELECT id FROM {schema}.review_authorizations'); pid=query(f"SELECT plan->'groups'->0->>'productId' FROM {schema}.review_authorizations")
    cnt=int(query(f"SELECT plan->'counts'->>'links' FROM {schema}.review_authorizations"));before=int(query(f'SELECT count(*) FROM {schema}.medication_product_substances'))
    apply=f"SELECT {schema}.apply_plan('{aid}'::uuid)";rollback=f"SELECT {schema}.rollback_groups('{aid}'::uuid,ARRAY['{pid}'::uuid])"
    must('permission denied' in query('SET ROLE vault_catalog_lab_unprivileged; '+apply,True),'unprivileged denied')
    must('required lock missing' in query('BEGIN ISOLATION LEVEL SERIALIZABLE; SET LOCAL ROLE vault_catalog_lab_executor; '+apply,True),'missing locks denied')
    must('source version drift' in query(tx(f"RESET ROLE; UPDATE {schema}.medication_catalog_versions SET notes='drift' WHERE source_key='lab_only'; SET LOCAL ROLE vault_catalog_lab_executor; {apply}"),True),'version drift blocks atomic transaction')
    must('product snapshot drift' in query(tx(f"RESET ROLE; UPDATE {schema}.medication_products SET product_name=product_name||' drift' WHERE id='{pid}'::uuid; SET LOCAL ROLE vault_catalog_lab_executor; {apply}"),True),'product drift blocks atomic transaction')
    must(query("SELECT pg_has_role('vault_catalog_lab_executor','vault_catalog_lab_worker','MEMBER')")=='f','caller cannot assume internal worker')
    must(query("SELECT rolcanlogin OR rolsuper OR rolbypassrls FROM pg_roles WHERE rolname='vault_catalog_lab_worker'")=='f','worker is non-login and obeys RLS')
    for table,verbs in [('medication_product_substances',['INSERT','UPDATE','DELETE']),('runs',['INSERT','UPDATE','DELETE']),('receipts',['INSERT','UPDATE','DELETE']),('review_authorizations',['INSERT','UPDATE','DELETE'])]:
        for verb in verbs:must(query(f"SELECT has_table_privilege('vault_catalog_lab_executor','{schema}.{table}','{verb}')")=='f',f'caller no {verb} {table}')
    must('permission denied' in query(f"SET ROLE vault_catalog_lab_executor; INSERT INTO {schema}.medication_product_substances(product_id,substance_id,reconciliation_token) VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid())",True),'direct insert denied before FK')
    must('permission denied' in query(f"SET ROLE vault_catalog_lab_executor; DELETE FROM {schema}.medication_product_substances WHERE false",True),'direct delete denied')
    must('permission denied' in query(f"SET ROLE vault_catalog_lab_executor; SELECT {schema}.require_locked_tx()",True),'internal helper denied')
    must('permission denied' in query(f"SET ROLE vault_catalog_lab_executor; SELECT {schema}.load_fixture('{{}}'::jsonb)",True),'fixture loader denied')
    result=json.loads(query(tx(apply)));must(result['inserted']==cnt,'all approved links inserted in laboratory')
    must(int(query(f'SELECT count(*) FROM {schema}.medication_product_substances'))==before+cnt,'cardinality')
    must(json.loads(query(tx(apply)))['inserted']==0,'idempotent repeat')
    must(int(query(f'SELECT count(*) FROM {schema}.receipts WHERE rolled_back_at IS NULL'))==cnt,'one receipt for every inserted relation')
    must(query(f'SELECT count(*) FROM {schema}.receipts r LEFT JOIN {schema}.medication_product_substances l ON l.product_id=r.product_id AND l.substance_id=r.substance_id AND l.reconciliation_token=r.token WHERE l.product_id IS NULL OR to_jsonb(l) IS DISTINCT FROM r.postimage')=='0','every receipt matches exact live incarnation')
    must(query(f'SELECT count(*) FROM {schema}.medication_product_substances l LEFT JOIN {schema}.medication_products p ON p.id=l.product_id LEFT JOIN {schema}.medication_substances s ON s.id=l.substance_id WHERE p.id IS NULL OR s.id IS NULL')=='0','no orphan links')
    must('explicit unique rollback groups required' in query(tx(f"SELECT {schema}.rollback_groups('{aid}'::uuid,ARRAY['{pid}'::uuid,'{pid}'::uuid])"),True),'duplicate rollback group denied')
    must('explicit unique rollback groups required' in query(tx(f"SELECT {schema}.rollback_groups('{aid}'::uuid,ARRAY[]::uuid[])"),True),'empty rollback group denied')

    must('operation changed or replaced' in query(tx(f"RESET ROLE; UPDATE {schema}.medication_product_substances SET is_primary=is_primary WHERE product_id='{pid}'::uuid AND reconciliation_token IS NOT NULL; SET LOCAL ROLE vault_catalog_lab_executor; {rollback}"),True),'subsequent mutation blocks rollback')
    removed=json.loads(query(tx(rollback)))['removed'];must(removed>0,'whole selected group rollback')
    must(json.loads(query(tx(rollback)))['removed']==0,'idempotent group rollback')
    must('rolled back authorization' in query(tx(apply),True),'rolled back authorization cannot be replayed')
    must(int(query(f'SELECT count(*) FROM {schema}.medication_product_substances'))==before+cnt-removed,'historical rows preserved by cardinality')
    must(query(f"SELECT count(*) FROM {schema}.medication_product_substances WHERE reconciliation_token IS NULL")==str(before),'historical rows not deleted')
    must(query(f"SELECT (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.product_id,l.substance_id) FROM {schema}.medication_product_substances l WHERE l.reconciliation_token IS NULL) IS NOT DISTINCT FROM (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.product_id,l.substance_id) FROM {schema}.review_authorizations a CROSS JOIN LATERAL jsonb_populate_recordset(NULL::{schema}.medication_product_substances,a.snapshot->'links') l)")=='t','every historical link equals frozen preimage')
    print('PG_LAB_COMPLETE: isolated review fixture only, no production writes')
finally:
    if started:
        with suppress(Exception):run([TOOLS['pg_ctl'],'-D',data,'-m','fast','-w','stop'])
    print('LAB_DIRECTORY_RETAINED',root)
