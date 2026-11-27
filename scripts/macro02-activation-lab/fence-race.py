#!/usr/bin/env python3
"""Only disposable CI PG17 container, no credentials or URL input."""
import subprocess, time, sys
C='macro02-activation-pg17'
cmd=['docker','exec','-i',C,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres']
u='00000000-0000-4000-8000-000000000001'; m='00000000-0000-4000-8000-000000000031'; e='00000000-0000-4000-8000-000000000098'
def run(q):
 r=subprocess.run(cmd,input=q,text=True,capture_output=True,timeout=20);assert r.returncode==0,r.stderr;return r.stdout.strip()
def session():return subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
def send(p,q):p.stdin.write(q+'\n');p.stdin.flush()
def marker(p,s):
 for line in p.stdout:
  if line.strip()==s:return
 raise RuntimeError('session marker absent')
def close(p):
 if p.poll() is None: p.terminate()
 p.wait(timeout=10)
freeze=f"SELECT vault_macro02_private.cutover_freeze_lab('{u}','{e}','race-fixture');"
cancel=f"SELECT vault_macro02_private.cutover_cancel_lab('{u}','{e}');"
try:
 # Legacy transaction holds account lock; freeze cannot pass it until commit.
 a=session();b=session()
 try:
  send(a,f"SET statement_timeout='10s'; BEGIN; UPDATE public.medicamentos SET evidence='{{\"stock\":7}}' WHERE id='{m}'; SELECT 'WRITE_LOCKED';")
  marker(a,'WRITE_LOCKED')
  send(b,"SET application_name='m02-freeze-race'; SET statement_timeout='10s'; "+freeze+" SELECT 'FROZEN';")
  until=time.monotonic()+5
  while time.monotonic()<until:
   if run("SELECT count(*) FROM pg_stat_activity WHERE application_name='m02-freeze-race' AND wait_event_type='Lock';")=='1':break
   time.sleep(.1)
  else:raise RuntimeError('freeze did not wait for legacy writer')
  send(a,"COMMIT; SELECT 'COMMITTED';");marker(a,'COMMITTED');marker(b,'FROZEN')
  assert run(f"SELECT evidence->>'stock' FROM public.medicamentos WHERE id='{m}';")=='7'
 finally:close(a);close(b)
 run(cancel)
 # An old repeatable-read transaction must fail instead of crossing the fence.
 a=session()
 try:
  send(a,f"SET statement_timeout='10s'; BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT evidence->>'stock' FROM public.medicamentos WHERE id='{m}'; SELECT 'OLD_SNAPSHOT';");marker(a,'OLD_SNAPSHOT')
  e2='00000000-0000-4000-8000-000000000097'
  run(freeze.replace(e,e2))
  send(a,f"UPDATE public.medicamentos SET evidence='{{\"stock\":1}}' WHERE id='{m}';");a.stdin.close();a.wait(timeout=15)
  err=a.stderr.read();assert a.returncode!=0 and ('could not serialize access' in err or 'M02_LAB_FROZEN' in err),'stale writer not rejected'
  assert run(f"SELECT evidence->>'stock' FROM public.medicamentos WHERE id='{m}';")=='7'
 finally:close(a)
 run(cancel.replace(e,e2))
 print('MACRO02_FENCE_RACE_LAB_PASS')
except Exception as exc:
 print(type(exc).__name__,str(exc),file=sys.stderr);sys.exit(1)
