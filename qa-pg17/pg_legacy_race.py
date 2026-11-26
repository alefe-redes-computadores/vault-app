"""Isolated synthetic legacy-vs-canonical medication lock proof."""
import subprocess,time

def run_legacy_race(psql,env,logs):
    cmd=[*psql,'-qAt','-v','ON_ERROR_STOP=1']; procs=[]; streams=[]
    med='30000000-0000-4000-8000-000000000001'; uid='20000000-0000-4000-8000-000000000001'; person='10000000-0000-4000-8000-000000000001'; dose='60000000-0000-4000-8000-000000000090'
    def query(sql):return subprocess.check_output(cmd+['-c',sql],env=env,stderr=subprocess.STDOUT,text=True,timeout=10).strip()
    def spawn(name,sql=None):
        f=(logs/(name+'.log')).open('wb');streams.append(f)
        p=subprocess.Popen(cmd+(['-c',sql] if sql else ['-f','-']),env={**env,'PGAPPNAME':name},stdin=subprocess.PIPE if not sql else subprocess.DEVNULL,stdout=f,stderr=subprocess.STDOUT);procs.append(p);return p
    def wait(name,condition):
        until=time.monotonic()+12
        while time.monotonic()<until:
            if query("select count(*) from pg_stat_activity where application_name='"+name+"' and "+condition)=='1':return
            time.sleep(.15)
        raise RuntimeError('legacy race barrier not observed: '+name)
    try:
        a=spawn('PG_LEGACY_LOCK');a.stdin.write((f"BEGIN; SELECT id FROM public.medicamentos WHERE id='{med}' FOR UPDATE;\n").encode());a.stdin.flush()
        wait('PG_LEGACY_LOCK',"state='idle in transaction'")
        b=spawn('PG_LEGACY_FACT',f"BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='{uid}'; SET LOCAL lock_timeout='20s'; INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,tomado_em,quantidade,dose_kind) VALUES('{dose}','{uid}','{person}','{med}','2026-01-03','09:00','2026-01-03T09:00:00Z',1,'scheduled'); COMMIT;")
        wait('PG_LEGACY_FACT',"wait_event_type='Lock'")
        a.stdin.write(b'COMMIT;\n\\q\n');a.stdin.flush();a.stdin.close()
        if a.wait(timeout=25)!=0 or b.wait(timeout=25)==0:raise RuntimeError('legacy fact not blocked')
        if 'MACRO02_COMPATIBLE_WRITER_REQUIRED' not in (logs/'PG_LEGACY_FACT.log').read_text():raise RuntimeError('incorrect legacy rejection')
        if query(f"select count(*) from public.dose_logs where id='{dose}'")!='0':raise RuntimeError('legacy fact persisted')
        return {'lock_observed':True,'legacy_fact_rejected':True,'no_fact_persisted':True}
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()
                try:p.wait(timeout=5)
                except subprocess.TimeoutExpired:p.kill();p.wait()
        for f in streams:f.close()
