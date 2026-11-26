#!/usr/bin/env python3
"""Targeted isolated PG17 test, no Supabase credentials, no network, no production SQL."""
import hashlib,json,os,re,shutil,subprocess,sys,tempfile,zipfile
from pathlib import Path
from pg_multi import run_multi
from pg_legacy_race import run_legacy_race
HERE=Path(__file__).resolve().parent; SQL=HERE.parent/'migrations-propostas'
BIN=Path(os.environ['PG17_BIN']).expanduser() if os.environ.get('PG17_BIN') else None

def tool(name):
 p=(BIN/name) if BIN else Path(shutil.which(name) or '/missing')
 if not p.is_file(): raise SystemExit('STOP: PostgreSQL 17 local obrigatório: '+name)
 v=subprocess.check_output([str(p),'--version'],text=True)
 if not re.search(r'\b17\.6(?:\s|$)',v): raise SystemExit('STOP: PostgreSQL 17.6 exato obrigatório: '+v.strip())
 return str(p)
initdb,pg_ctl,psql=map(tool,['initdb','pg_ctl','psql'])
# Explicit fresh cluster, private unix socket. Never accept a remote connection configuration.
if hasattr(os,'geteuid') and os.geteuid()==0: raise SystemExit('STOP: use usuário local sem root.')
work=Path(tempfile.mkdtemp(prefix='m02pg17-',dir=Path.home())); logs=work/'logs';logs.mkdir();socket=work/'sock';socket.mkdir(mode=0o700)
cluster=work/'db'; env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env.update(PGHOST=str(socket),PGPORT='55439',PGDATABASE='postgres',PGUSER='qa_admin')
status={}; started=False

def run(name,args,env_override=None):
 print('>>>',name,flush=True)
 with (logs/(name+'.log')).open('wb') as f:
  p=subprocess.run(args,env=env_override or env,stdout=f,stderr=subprocess.STDOUT,timeout=180)
 status[name]=p.returncode;print(name,'EXIT=',p.returncode,flush=True)
 if p.returncode:
  print((logs/(name+'.log')).read_text(errors='replace')[-12000:],flush=True)
  raise RuntimeError(name+' failed; inspect evidence')

def query(name,filename,admin=False,atomic=False):
 e=dict(env);e['PGUSER']='qa_admin' if admin else 'postgres'
 run(name,[psql,'-X','-v','ON_ERROR_STOP=1']+(['-1'] if atomic else [])+['-f',str(filename)],e)
try:
 run('PG_INIT',[initdb,'-D',str(cluster),'-U','qa_admin','-A','trust','--no-locale','--encoding=UTF8'])
 run('PG_START',[pg_ctl,'-D',str(cluster),'-l',str(logs/'server.log'),'-o',f"-k {socket} -h '' -p 55439",'-w','start']);started=True
 query('BOOTSTRAP',HERE/'bootstrap.sql',admin=True)
 query('FIXTURE',HERE/'fixture.sql')
 mode=os.environ.get('M02_FIXTURE_MODE','synthetic')
 if mode not in ('synthetic','catalog-mirror'):raise RuntimeError('fixture mode invalid')
 if mode=='catalog-mirror':query('CATALOG_MIRROR',HERE/'catalog-mirror.sql')
 run('PG_VERSION',[psql,'-X','-At','-v','ON_ERROR_STOP=1','-c',"select current_setting('server_version')"])
 if not (logs/'PG_VERSION.log').read_text().strip().startswith('17.6'):raise RuntimeError('server version mismatch')
 query('EXPAND',SQL/'01-expansao-inativa.sql',atomic=True)
 query('EXPAND_COMPAT',HERE/'expand-tests.sql')
 query('WRITERS',SQL/'02-escritores-inativos.sql',atomic=True)
 query('ROLES_AND_CUTOVER',HERE/'role-tests.sql')
 query('MAINTENANCE_AND_CASCADE',HERE/'maintenance-tests.sql')
 query('R4_DIRECTED',HERE/'pg-directed.sql',atomic=True)
 multi=run_multi([psql,'-X'],{**env,'PGUSER':'postgres'},logs);(logs/'PG_MULTI.json').write_text(json.dumps(multi,indent=2));status['PG_MULTI']=0
 query('R4_ADJUSTMENT',HERE/'pg-r3.sql')
 legacy=run_legacy_race([psql,'-X'],{**env,'PGUSER':'postgres'},logs);(logs/'PG_LEGACY_RACE.json').write_text(json.dumps(legacy,indent=2));status['PG_LEGACY_RACE']=0
except Exception as e:
 status['ERROR']=str(e); print('FAIL',e,flush=True)
finally:
 if started:
  try:run('PG_STOP',[pg_ctl,'-D',str(cluster),'-m','fast','-w','stop'])
  except Exception as e:status['STOP_ERROR']=str(e)
 status['sql_sha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in SQL.glob('0[12]*.sql')}
 status['fixture']=os.environ.get('M02_FIXTURE_MODE','synthetic')+', managed-role simulation, not full production schema clone';(logs/'STATUS.json').write_text(json.dumps(status,indent=2))
 dest=Path(os.environ.get('M02_EVIDENCE_DIR',str(Path.home()/'storage/downloads'))).expanduser();dest=dest if dest.is_dir() else Path.home();out=dest/('MACRO02-PG17-'+work.name+'.zip')
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(logs.iterdir()):z.write(p,p.name)
 print('EVIDENCIA=',out,'SHA256=',hashlib.sha256(out.read_bytes()).hexdigest(),flush=True)
 print(json.dumps(status,ensure_ascii=False));sys.exit(1 if 'ERROR' in status or 'STOP_ERROR' in status else 0)
