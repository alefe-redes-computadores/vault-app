#!/usr/bin/env python3
"""Run original lab plus two independent probes in a disposable copy. Never edit certified tree."""
import hashlib,pathlib as p,shutil,subprocess as sp,sys,tempfile
if len(sys.argv)!=4:raise SystemExit('usage: pharma-lab-extended.py <candidate> <report> <snapshot>')
tree=p.Path(sys.argv[1]).resolve();src=tree/'scripts/medication-catalog';original=src/'pg-lab-r03/run-local-lab.py';raw=original.read_text()
root=p.Path(tempfile.mkdtemp(prefix='pharma-lab-extended-'));copy=root/'medication-catalog';shutil.copytree(src,copy,ignore=shutil.ignore_patterns('__pycache__'))
anchor="    result=json.loads(query(tx(apply)));must(result['inserted']==cnt,'all approved links inserted in laboratory')"
probe='''    # Independent extension: same fixture, no candidate edits; collect negatives without skipping original tests.
    extra_fail=[]
    def extra(label,fn):
        try:
            if not fn():raise AssertionError(label)
            print('PG_EXTRA_PASS',label,flush=True)
        except Exception as e:
            extra_fail.append(label);print('PG_EXTRA_FAIL',label,str(e),flush=True)
    def concurrent_writer():
        import time
        cmd=[TOOLS['psql'],'-X','-qAt','-v','ON_ERROR_STOP=1','-h',str(sock),'-p',port,'-U',user,'-d',db,'-c',"SET application_name='vault_lab_contention_probe'; BEGIN; LOCK TABLE "+schema+".medication_products IN ROW EXCLUSIVE MODE; SELECT pg_sleep(20); ROLLBACK;"]
        proc=subprocess.Popen(cmd,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
        try:
            for _ in range(60):
                if query("SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE a.application_name='vault_lab_contention_probe' AND l.relation='"+schema+".medication_products'::regclass AND l.mode='RowExclusiveLock' AND l.granted")=='1':break
                if proc.poll() is not None:raise RuntimeError('concurrent session exited')
                time.sleep(.1)
            else:raise RuntimeError('concurrent lock not acquired')
            err=query(tx(apply),True)
            return 'lock timeout' in err and int(query(f'SELECT count(*) FROM {schema}.medication_product_substances'))==before
        finally:
            # Terminate only the explicitly named session in this private laboratory.
            with suppress(Exception):query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='vault_lab_contention_probe' AND pid<>pg_backend_pid()")
            if proc.poll() is None:proc.terminate()
            with suppress(Exception):proc.communicate(timeout=5)
            if proc.poll() is None:proc.kill();proc.wait()
    def direct_writer_denied():
        # An executor must not be able to bypass the authorization procedure. Rollback regardless.
        direct=f"BEGIN; SET LOCAL ROLE vault_catalog_lab_executor; INSERT INTO {schema}.medication_product_substances(product_id,substance_id,reconciliation_token) SELECT (plan->'groups'->0->'operations'->0->'row'->>'product_id')::uuid,(plan->'groups'->0->'operations'->0->'row'->>'substance_id')::uuid,gen_random_uuid() FROM {schema}.review_authorizations; ROLLBACK;"
        err=query(direct,True)
        return 'permission denied' in err or 'row-level security' in err
    extra('independent writer lock blocks application atomically',concurrent_writer)
    extra('executor cannot bypass authorized entry point with direct INSERT',direct_writer_denied)
'''
end="    print('PG_LAB_COMPLETE: isolated review fixture only, no production writes')"
if raw.count(anchor)!=1 or raw.count(end)!=1:raise SystemExit('BLOCKED: harness anchors changed')
raw=raw.replace(anchor,probe+anchor).replace(end,end+"\n    print('PG_EXTRA_FAILURES='+str(len(extra_fail)),flush=True)\n    if extra_fail:raise SystemExit(1)")
runner=copy/'pg-lab-r03/run-local-lab.py';runner.write_text(raw);compile(raw,str(runner),'exec');print('ORIGINAL_LAB_SHA256='+hashlib.sha256(original.read_bytes()).hexdigest(),flush=True);print('EXTENDED_LAB_SHA256='+hashlib.sha256(runner.read_bytes()).hexdigest(),flush=True);print('EXTENDED_COPY='+str(root),flush=True)
sys.exit(sp.run([sys.executable,str(runner),str(p.Path(sys.argv[2]).resolve()),str(p.Path(sys.argv[3]).resolve())]).returncode)
