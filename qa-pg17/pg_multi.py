"""Multi-session synthetic QA; called only by collector on its private local cluster."""
import copy, json, subprocess, time
from pathlib import Path

def run_multi(psql, env, logs):
    uid='20000000-0000-4000-8000-000000000001'
    mid='30000000-0000-4000-8000-000000000001'
    op_count='50000000-0000-4000-8000-000000000003'
    op_dose='50000000-0000-4000-8000-000000000004'
    op_acq='50000000-0000-4000-8000-000000000005'
    new_dose='60000000-0000-4000-8000-000000000002'
    new_acq='70000000-0000-4000-8000-000000000001'
    new_cycle='40000000-0000-4000-8000-000000000002'
    revision='2026-01-01T10:00:00Z'
    cmd=[str(x) for x in psql]+['-qAt','-v','ON_ERROR_STOP=1']
    procs=[]; streams=[]
    def need(ok,msg):
        if not ok: raise RuntimeError(msg)
    def q(sql):
        return subprocess.check_output(cmd+['-c',sql],env=env,stderr=subprocess.STDOUT,timeout=15,text=True).strip()
    def expr(func,intent):
        wire=json.dumps(intent,separators=(',',':')).replace("'","''")
        return f"SELECT public.{func}('{wire}'::jsonb);"
    def auth_sql(body):
        return ("BEGIN; SET LOCAL TIME ZONE 'UTC'; SET LOCAL ROLE authenticated; "
                f"SET LOCAL request.jwt.claim.sub='{uid}'; SET LOCAL lock_timeout='20s'; "+body)
    def load(name):
        return (logs/(name+'.log')).read_text(errors='replace')
    def spawn(name,sql=None):
        f=(logs/(name+'.log')).open('wb');streams.append(f)
        p=subprocess.Popen(cmd+(['-c',sql] if sql is not None else ['-f','-']),stdin=subprocess.PIPE if sql is None else subprocess.DEVNULL,stdout=f,stderr=subprocess.STDOUT,env={**env,'PGAPPNAME':name});procs.append(p);return p
    def wait_activity(condition,wanted):
        end=time.monotonic()+12
        while time.monotonic()<end:
            if q('SELECT count(*) FROM pg_stat_activity WHERE '+condition)==str(wanted):return
            time.sleep(.15)
        raise RuntimeError('session lock barrier not observed: '+condition)
    def ack(name):
        lines=[x for x in load(name).splitlines() if x.startswith('{')]
        need(len(lines)==1,'expected one persisted ACK: '+name)
        return json.loads(lines[0])
    try:
        snapshot=json.loads(q("SET TIME ZONE 'UTC'; SELECT jsonb_build_object('stock',vault_macro02_private.stock_projection(m),'count',vault_macro02_private.count_projection(m),'count_request',(SELECT request FROM vault_macro02_private.dose_commits WHERE operation_id='50000000-0000-4000-8000-000000000001'),'dose_request',(SELECT request FROM vault_macro02_private.dose_commits WHERE operation_id='50000000-0000-4000-8000-000000000002')) FROM public.medicamentos m WHERE id='"+mid+"';"))
        b=snapshot['stock'];before=snapshot['count'];need(b['balance']==11,'synthetic baseline balance')
        count=copy.deepcopy(snapshot['count_request']);count.update(operationId=op_count,sequence=1,predecessor=None,stockBefore=b,stockAfter={**b,'balance':13,'basis':new_cycle},beforeCount=before,afterCount={**before,'estoque_quantidade':13,'estoque_ciclo_id':new_cycle,'updated_at':revision},stockRevisionBefore=before['updated_at'],stockRevisionAfter=revision,countedCurrentStock=13)
        dose=copy.deepcopy(snapshot['dose_request']);fact=copy.deepcopy(dose['after']);fact.update(id=new_dose,horario='09:00',tomado_em='2026-01-01T09:00:00Z',created_at=revision,updated_at=revision);fact['estoque_movimento']['receipt'].update(doseId=new_dose,appliedAt=revision)
        dose.update(operationId=op_dose,sequence=1,predecessor=None,after=fact,stockBefore=b,stockAfter={**b,'balance':10},stockRevisionBefore=before['updated_at'],stockRevisionAfter=revision)
        fields='id user_id person_id medicamento_id medicamento_nome medicamento_dosagem medico_id farmacia_id hospital_id local_id document_id a3_location_snapshot a3_location_changes tipo_aquisicao data_proxima_retirada data_retorno_sus exige_nova_receita quantidade preco lote validade_produto data data_aquisicao anexo_url observacoes created_at updated_at'.split()
        acq_record=dict.fromkeys(fields);acq_record.update(id=new_acq,user_id=uid,person_id=b['person_id'],medicamento_id=mid,a3_location_changes=[],tipo_aquisicao='compra',quantidade=2,data='2026-01-01',data_aquisicao='2026-01-01',created_at=revision,updated_at=revision)
        acq=copy.deepcopy(count);acq.update(operationId=op_acq,mode='acquisition',acquisition=acq_record,countedCurrentStock=None,stockAfter={**b,'balance':13},afterCount={**before,'estoque_quantidade':13,'updated_at':revision})
        # A holds the medication row after successfully writing count and ledger.
        a=spawn('PG_RACE_A');a.stdin.write((auth_sql(expr('vault_macro02_commit_stock',count))+'\n').encode());a.stdin.flush()
        wait_activity("application_name='PG_RACE_A' AND state='idle in transaction' AND query LIKE '%vault_macro02_commit_stock%'",1)
        retry=spawn('PG_RACE_RETRY',auth_sql(expr('vault_macro02_commit_stock',count))+' COMMIT;')
        stale_dose=spawn('PG_RACE_DOSE',auth_sql(expr('vault_macro02_commit_dose',dose))+' COMMIT;')
        stale_acq=spawn('PG_RACE_ACQ',auth_sql(expr('vault_macro02_commit_stock',acq))+' COMMIT;')
        wait_activity("application_name IN ('PG_RACE_RETRY','PG_RACE_DOSE','PG_RACE_ACQ') AND wait_event_type='Lock'",3)
        a.stdin.write(b'COMMIT;\n\\q\n');a.stdin.flush();a.stdin.close()
        need(a.wait(timeout=25)==0,'count transaction did not commit')
        need(retry.wait(timeout=25)==0 and ack('PG_RACE_A')==ack('PG_RACE_RETRY'),'same intent retry differs')
        for name,p in [('PG_RACE_DOSE',stale_dose),('PG_RACE_ACQ',stale_acq)]:
            need(p.wait(timeout=25)!=0 and 'MACRO02_STOCK_CAS' in load(name),'stale operation did not fail CAS: '+name)
        actual=json.loads(q(f"SELECT jsonb_build_object('balance',(SELECT estoque_quantidade FROM public.medicamentos WHERE id='{mid}'),'cycle',(SELECT estoque_ciclo_id FROM public.medicamentos WHERE id='{mid}'),'ledger',(SELECT count(*) FROM vault_macro02_private.dose_commits),'staleDose',(SELECT count(*) FROM public.dose_logs WHERE id='{new_dose}'),'staleAcq',(SELECT count(*) FROM public.renovacoes WHERE id='{new_acq}'));"))
        need(actual=={'balance':13,'cycle':new_cycle,'ledger':3,'staleDose':0,'staleAcq':0},'unexpected persisted state '+repr(actual))
        # Retry the acquisition with an explicitly new operation based on the persisted count.
        fresh_rev='2026-01-01T10:01:00Z';count_ack=ack('PG_RACE_A');b2=count_ack['stock'];c2=count_ack['stockSnapshot']
        acq_record.update(created_at=fresh_rev,updated_at=fresh_rev);acq.update(operationId='50000000-0000-4000-8000-000000000006',sequence=2,predecessor=op_count,stockBefore=b2,stockAfter={**b2,'balance':15},beforeCount=c2,afterCount={**c2,'estoque_quantidade':15,'updated_at':fresh_rev},stockRevisionBefore=count_ack['stockRevision'],stockRevisionAfter=fresh_rev)
        p=spawn('PG_RACE_ACQ_REVIEWED',auth_sql(expr('vault_macro02_commit_stock',acq))+' COMMIT;');need(p.wait(timeout=25)==0,'reviewed acquisition failed')
        a2=ack('PG_RACE_ACQ_REVIEWED');need(a2['stock']['balance']==15 and a2['stock']['basis']==new_cycle and a2['acquisition']['id']==new_acq,'acquisition ACK mismatch')
        need(q(f"SELECT (SELECT estoque_quantidade=15 AND estoque_ciclo_id='{new_cycle}' FROM public.medicamentos WHERE id='{mid}') AND (SELECT count(*)=1 FROM public.renovacoes WHERE id='{new_acq}') AND (SELECT count(*)=4 FROM vault_macro02_private.dose_commits);")=='t','reviewed acquisition persistence')
        return {'observed_waiting_sessions':3,'same_operation_ack_identical':True,'stale_dose_blocked':True,'stale_acquisition_blocked':True,'reviewed_acquisition_persisted':True,'final_balance':15,'ledger_rows':4}
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()
                try:p.wait(timeout=5)
                except subprocess.TimeoutExpired:p.kill();p.wait()
        for f in streams:f.close()
