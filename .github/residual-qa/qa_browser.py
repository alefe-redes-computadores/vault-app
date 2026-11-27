#!/usr/bin/env python3
"""Chromium on exact static export with loopback-only synthetic services.
Partial individual evidence, never live Supabase/RLS/native certification.
"""
import argparse, base64, hashlib, json, mimetypes, os, re, socket, threading, time, traceback
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,parse_qs,unquote,urlencode
from playwright.sync_api import sync_playwright,expect

USER='10000000-0000-4000-8000-000000000001'; PERSON_A='20000000-0000-4000-8000-000000000001'; PERSON_B='20000000-0000-4000-8000-000000000002'; MED_A='30000000-0000-4000-8000-000000000001'; MED_B='30000000-0000-4000-8000-000000000002'
NAME_A='QA Pessoa Alfa'; NAME_B='QA Pessoa Beta'; MEDNAME_A='QA MEDICAMENTO ALFA'; MEDNAME_B='QA MEDICAMENTO BETA'
NOW='2026-11-26T12:00:00.000Z'; EMAIL='qa-residual@example.invalid'; PASSWORD='QA-SYNTHETIC-ONLY-0001'
ORIGIN='http://127.0.0.1:8765'
ROOT=None; CHALLENGES={}; AUTH_EVENTS=[]; LOCK=threading.Lock()
OUTAGE=False; NETWORK_EVENTS=[]; SW_PROOF={}
def b64(b):return base64.urlsafe_b64encode(b).decode().rstrip('=')
def user():return {'id':USER,'aud':'authenticated','role':'authenticated','email':EMAIL,'email_confirmed_at':NOW,'created_at':NOW,'updated_at':NOW,'app_metadata':{'provider':'email','providers':['email']},'user_metadata':{},'identities':[],'is_anonymous':False}
def session():
 exp=int(time.time())+86400
 token=b64(b'{"alg":"HS256","typ":"JWT"}')+'.'+b64(json.dumps({'sub':USER,'aud':'authenticated','role':'authenticated','iat':int(time.time()),'exp':exp}).encode())+'.'+b64(b'fixture-not-valid-outside-loopback')
 return {'access_token':token,'refresh_token':'fixture-refresh','token_type':'bearer','expires_in':86400,'expires_at':exp,'user':user()}
def person(id,name,color,default):return {'id':id,'user_id':USER,'name':name,'color':color,'is_default':default,'created_at':NOW,'updated_at':NOW,'synced':True}
def med(id,pid,name):return {'id':id,'user_id':USER,'person_id':pid,'nome':name,'dosagem':'1 mg','medico':'','data_receita':'','proxima_renovacao':'','tipo_uso':'continuo','tipo_aquisicao':'comprado','forma_farmaceutica':'comprimido','status':'ativo','tratamento_ids':[],'created_at':NOW,'updated_at':NOW,'synced':True}
TABLES={'persons':[person(PERSON_A,NAME_A,'#38BDF8',True),person(PERSON_B,NAME_B,'#34D399',False)],'medicamentos':[med(MED_A,PERSON_A,MEDNAME_A),med(MED_B,PERSON_B,MEDNAME_B)],'settings':[{'id':USER,'user_id':USER,'default_person_id':PERSON_A,'created_at':NOW,'updated_at':NOW,'synced':True}]}
class Server(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def reply(self,status,body,typ='application/json',extra=None):
  self.send_response(status);self.send_header('Content-Type',typ);self.send_header('Content-Length',str(len(body)))
  for k,v in (extra or {}).items():self.send_header(k,v)
  self.end_headers()
  if self.command!='HEAD':
   try:self.wfile.write(body)
   except (BrokenPipeError,ConnectionResetError):pass
 def js(self,status,obj,extra=None):self.reply(status,json.dumps(obj).encode(),extra=extra)
 def input_json(self):
  n=int(self.headers.get('Content-Length','0'));assert n<=2_000_000,'fixture request too large';return json.loads(self.rfile.read(n) or b'{}')
 def do_HEAD(self):self.do_GET()
 def do_GET(self):
  u=urlsplit(self.path);p=unquote(u.path);q=parse_qs(u.query)
  with LOCK:
   outage=OUTAGE
   if outage or p=='/auth/callback':NETWORK_EVENTS.append({'path':self.path,'outage':outage})
  if outage:
   # A real transport failure for every HTTP request, including worker fetches.
   # No synthetic success/status/body; no production service is reachable.
   self.close_connection=True
   try:self.connection.shutdown(socket.SHUT_RDWR)
   except OSError:pass
   return
  if p=='/auth/v1/authorize':
   redirect=q.get('redirect_to',[''])[0];challenge=q.get('code_challenge',[''])[0];method=q.get('code_challenge_method',[''])[0]
   if redirect!=ORIGIN+'/auth/callback' or not re.fullmatch(r'[A-Za-z0-9_-]{43}',challenge) or method.lower()!='s256':return self.js(400,{'msg':'QA invalid PKCE challenge'})
   code='qa-code-'+str(time.time_ns());CHALLENGES[code]=challenge;AUTH_EVENTS.append('PKCE_CHALLENGE')
   return self.reply(302,b'',extra={'Location':redirect+'?'+urlencode({'code':code}) ,'Cache-Control':'no-store'})
  if p=='/auth/v1/user':return self.js(200,user(),{'Cache-Control':'no-store'})
  if p.startswith('/rest/v1/'):
   table=p.split('/')[-1]
   if '/rpc/' in p:return self.js(404,{'code':'QA_UNMODELED_RPC','message':'Synthetic fixture does not implement this RPC'})
   rows=list(TABLES.get(table,[]))
   # Empty responses model empty synthetic tables, not server/RLS proof.
   for col in ('id','user_id','person_id'):
    for val in q.get(col,[]):
     if val.startswith('eq.'):rows=[r for r in rows if r.get(col)==val[3:]]
   if 'application/vnd.pgrst.object+json' in self.headers.get('Accept',''):
    return self.js(200,rows[0]) if len(rows)==1 else self.js(406,{'code':'PGRST116','message':'No single synthetic row'})
   return self.js(200,rows,{'Content-Range':f'0-{len(rows)-1}/{len(rows)}' if rows else '*/0','Cache-Control':'no-store'})
  if p=='/__qa__/blank':return self.reply(200,b'<!doctype html><title>QA fixture blank</title><h1>QA fixture blank</h1>','text/html',{'Cache-Control':'no-store'})
  if p.startswith('/auth/v1/') or p.startswith('/realtime/') or p.startswith('/storage/'):return self.js(404,{'message':'QA unmodeled endpoint'})
  if '\\' in p or '\x00' in p:return self.reply(400,b'bad path','text/plain')
  root=ROOT.resolve();f=(root/p.lstrip('/')).resolve()
  if not f.is_relative_to(root):return self.reply(403,b'blocked','text/plain')
  choices=[f,f.with_suffix('.html') if not f.suffix else f,f/'index.html'] if p!='/' else [root/'index.html']
  file=next((a for a in choices if a.is_file() and a.resolve().is_relative_to(root)),None)
  if file is None:return self.reply(404,b'Not found','text/plain')
  cc='no-store, private, max-age=0' if p.startswith('/auth/callback') else 'no-cache, max-age=0, must-revalidate' if p in ('/sw.js','/manifest.json') else 'public, max-age=0'
  typ=mimetypes.guess_type(file)[0] or 'application/octet-stream'
  self.reply(200,file.read_bytes(),typ,{'Cache-Control':cc,**({'Referrer-Policy':'no-referrer'} if p.startswith('/auth/callback') else {})})
 def do_POST(self):
  p=urlsplit(self.path);q=parse_qs(p.query);data=self.input_json()
  if p.path=='/auth/v1/token':
   grant=q.get('grant_type',[''])[0]
   if grant=='password' and data.get('email')==EMAIL and data.get('password')==PASSWORD:AUTH_EVENTS.append('PASSWORD');return self.js(200,session(),{'Cache-Control':'no-store'})
   if grant=='pkce':
    code=data.get('auth_code');verifier=data.get('code_verifier','');expected=CHALLENGES.pop(code,None)
    if expected and b64(hashlib.sha256(verifier.encode()).digest())==expected:AUTH_EVENTS.append('PKCE_VERIFIED');return self.js(200,session(),{'Cache-Control':'no-store'})
   if grant=='refresh_token' and data.get('refresh_token')=='fixture-refresh':return self.js(200,session(),{'Cache-Control':'no-store'})
   return self.js(400,{'error_code':'invalid_credentials','msg':'QA credenciais inválidas'})
  if p.path=='/auth/v1/logout':return self.reply(204,b'')
  # The application may persist its default synthetic profile. No clinical write acknowledged.
  if p.path=='/rest/v1/settings':
   rows=data if isinstance(data,list) else [data]
   if not all(isinstance(row,dict) and row.get('user_id')==USER and row.get('default_person_id') in (PERSON_A,PERSON_B,None) for row in rows):return self.js(403,{'message':'QA scope refused'})
   return self.js(201,rows)
  return self.js(403,{'message':'QA no synthetic clinical write authorized'})
 def do_PATCH(self):return self.do_POST()
 def do_DELETE(self):return self.js(403,{'message':'QA deletion denied'})

def require(x,msg):
 if not x:raise AssertionError(msg)
def path_is(page,path):expect(page).to_have_url(re.compile(re.escape(ORIGIN+path)+r'(?:[?#]|$)'),timeout=45000)
def new_context(browser,width=390):
 c=browser.new_context(viewport={'width':width,'height':844},timezone_id='America/Sao_Paulo',locale='pt-BR',service_workers='allow',accept_downloads=False)
 # Network can only reach the loopback fixture. No real provider or clinical service.
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(ORIGIN+'/') else r.abort())
 return c

def wait_nav(p):expect(p.get_by_role('navigation',name='Navegação principal')).to_be_visible(timeout=60000)
def select_profile(p,name=NAME_A):
 button=p.get_by_role('button',name=re.compile(re.escape(name)))
 try:button.first.click(timeout=20000)
 except Exception:
  # If profile already selected, nav must be visible; never treat this as login pass by itself.
  wait_nav(p)
 wait_nav(p)
def login(p,pkce=False,profile=NAME_A):
 p.goto(ORIGIN+'/login');expect(p.get_by_role('button',name='Entrar',exact=True)).to_be_visible(timeout=30000)
 if pkce:
  n=len(AUTH_EVENTS);p.get_by_role('button',name='Entrar com Google').click();p.wait_for_function("location.pathname !== '/login'",timeout=30000);select_profile(p,profile);require('PKCE_VERIFIED' in AUTH_EVENTS[n:],'mock PKCE exchange not validated')
 else:
  n=len(AUTH_EVENTS);p.locator('input[type=email]').fill(EMAIL);p.locator('input[type=password]').fill(PASSWORD);p.get_by_role('button',name='Entrar',exact=True).click();select_profile(p,profile);require('PASSWORD' in AUTH_EVENTS[n:],'mock password login not observed')
def list_a(p):
 p.goto(ORIGIN+'/saude/medicamentos');expect(p.get_by_role('button',name=f'Abrir Gaveta 360 de {MEDNAME_A}',exact=True)).to_be_visible(timeout=45000);expect(p.get_by_role('button',name=f'Abrir Gaveta 360 de {MEDNAME_B}',exact=True)).to_have_count(0)
def guard(p):
 p.goto(ORIGIN+'/saude/medicamentos');path_is(p,'/login');expect(p.locator('input[type=email]')).to_be_visible();require(MEDNAME_A not in p.locator('body').inner_text(),'protected fixture data leaked')
def pkce(p):login(p,True);path_is(p,'/');wait_nav(p)
def nav(p):
 login(p);bar=p.get_by_role('navigation',name='Navegação principal');
 for name,target in [('Hoje','/hoje'),('Saúde','/saude/minha-saude'),('Documentos','/documentos'),('Mais','/mais'),('Início','/')]:
  bar.get_by_role('button',name=name,exact=True).click();path_is(p,target);wait_nav(p)
 # browser DOM overflow, not native safe-area/keyboard/TalkBack
 for width in [320,360,390,412,430]:
  p.set_viewport_size({'width':width,'height':844});require(p.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),'home horizontal overflow width '+str(width));require(bar.is_visible(),'navigation not visible')
def fenix(p):
 login(p);p.goto(ORIGIN+'/saude/minha-saude');p.get_by_role('button',name='Abrir Fênix e Perfil Clínico').click();path_is(p,'/saude/fenix');expect(p.get_by_role('heading',name='Fênix e Perfil Clínico')).to_be_visible(timeout=30000);p.get_by_role('button',name='Voltar à origem').click();path_is(p,'/saude/minha-saude')
def open_med_menu(p):
 # Actual mobile control: the desktop direct Edit button is hidden below sm.
 expect(p.get_by_text(MEDNAME_A,exact=True).first).to_be_visible(timeout=45000)
 expect(p.get_by_role('button',name='Mais ações',exact=True)).to_be_visible(timeout=45000)
 p.get_by_role('button',name='Mais ações',exact=True).click()
 edit=p.get_by_role('button',name='Editar medicamento',exact=True)
 expect(edit).to_be_visible(timeout=15000)
 return edit

def close_med_menu(p):
 backdrop=p.get_by_role('button',name='Fechar menu',exact=True)
 expect(backdrop).to_be_visible()
 proof=backdrop.evaluate("""el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,hit:document.elementFromPoint(12,380)===el}}""")
 require(abs(proof['x'])<2 and abs(proof['y'])<2 and proof['w']>=proof['vw']-2 and proof['h']>=proof['vh']-2 and proof['hit'],'backdrop does not cover or receive viewport click: '+str(proof))
 backdrop.click(position={'x':12,'y':380})
 expect(p.get_by_role('button',name='Fechar menu',exact=True)).to_have_count(0,timeout=15000)

def med_return(p):
 login(p);list_a(p)
 detail='/saude/medicamentos/detalhes?id='+MED_A
 for return_to in ['/saude/medicamentos?return_to='+ORIGIN+'/bad','https://example.invalid/no-return','/saude/medicamentos/detalhes?id='+MED_A]:
  p.goto(ORIGIN+detail+'&'+urlencode({'return_to':return_to}));open_med_menu(p);close_med_menu(p);p.get_by_role('button',name='Voltar',exact=True).click();path_is(p,'/saude/medicamentos');require('return_to' not in urlsplit(p.url).query,'nested return leaked');expect(p.get_by_role('button',name=f'Abrir Gaveta 360 de {MEDNAME_A}')).to_be_visible()
def med_unknown(p):
 login(p);list_a(p)
 expect(p.get_by_text('Princípio ativo · confirmar referência nos detalhes',exact=True).first).to_have_count(1)
 p.goto(ORIGIN+'/saude/medicamentos/detalhes?id='+MED_A);open_med_menu(p);close_med_menu(p)
 expect(p.locator('[data-vault-v34x-ingredient-visible]')).to_have_count(0)

def profile_b(p):
 login(p,profile=NAME_B);p.goto(ORIGIN+'/saude/medicamentos')
 expect(p.get_by_role('button',name=f'Abrir Gaveta 360 de {MEDNAME_B}',exact=True)).to_be_visible(timeout=45000)
 expect(p.get_by_role('button',name=f'Abrir Gaveta 360 de {MEDNAME_A}',exact=True)).to_have_count(0)
 p.goto(ORIGIN+'/saude/medicamentos/detalhes?id='+MED_A)
 expect(p.get_by_text('Voltar aos medicamentos',exact=True)).to_be_visible(timeout=30000)
 expect(p.get_by_role('button',name='Editar medicamento')).to_have_count(0,timeout=30000)

def edit_return(p):
 login(p);list_a(p);p.goto(ORIGIN+'/saude/medicamentos/detalhes?id='+MED_A);open_med_menu(p).click();path_is(p,'/saude/medicamentos/editar');require(parse_qs(urlsplit(p.url).query).get('id')==[MED_A],'wrong editor id');p.get_by_role('button',name='Voltar',exact=True).click();path_is(p,'/saude/medicamentos/detalhes');require(parse_qs(urlsplit(p.url).query).get('id')==[MED_A],'wrong medication on clean editor return');expect(p.get_by_text(MEDNAME_A,exact=True).first).to_be_visible(timeout=45000)
 # Preserve the desktop direct action, rather than removing its contract.
 p.set_viewport_size({'width':768,'height':844});expect(p.get_by_role('button',name='Editar medicamento',exact=True)).to_be_visible(timeout=15000)
def worker(p):
 global OUTAGE
 p.goto(ORIGIN+'/__qa__/blank');p.evaluate("""async()=>{let c=await caches.open('vault-shell-v25-5');await c.put('/auth/callback?code=qa-stale',new Response('stale-secret'));await c.put('/qa-preserved',new Response('kept'));let x=await caches.open('unrelated-qa');await x.put('/auth/callback?code=qa-unrelated',new Response('unrelated'));await new Promise((res,rej)=>{let r=indexedDB.open('qa-sentinel',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>{let db=r.result,t=db.transaction('data','readwrite');t.objectStore('data').put('kept','k');t.oncomplete=()=>{db.close();res()};t.onerror=rej};r.onerror=rej});await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;}""")
 p.wait_for_function('!!navigator.serviceWorker.controller',timeout=30000)
 result=p.evaluate("""async()=>{let c=await caches.open('vault-shell-v25-5'),x=await caches.open('unrelated-qa');return [!(await c.match('/auth/callback?code=qa-stale')),!!(await c.match('/qa-preserved')),!!(await x.match('/auth/callback?code=qa-unrelated'))]}""");require(result==[True,True,True],'cache purge scope incorrect')
 require(p.evaluate("""async()=>{const r=await fetch('/auth/callback?code=qa-http-only');await r.text();for(const name of await caches.keys()){if(name.startsWith('vault-shell-')&&(await (await caches.open(name)).match('/auth/callback?code=qa-http-only')))return false}return true;}"""),'auth callback cached')
 # First reproduce the original condition and distinguish actual network from cache.
 p.context.set_offline(True)
 try:
  p.goto(ORIGIN+'/__qa__/not-cached-route',wait_until='domcontentloaded');expect(p.get_by_text('Esta página não abriu',exact=False).first).to_be_visible(timeout=15000)
  with LOCK:before=len(NETWORK_EVENTS)
  rejected=p.evaluate("""async()=>{try{await fetch('/auth/callback?code=qa-offline');return false}catch{return true}}""")
  with LOCK: hits=[x for x in NETWORK_EVENTS[before:] if x['path']=='/auth/callback?code=qa-offline']
  SW_PROOF['original_offline_probe']={'rejected':rejected,'origin_hits':len(hits)}
  require(rejected or bool(hits),'offline auth returned without origin hit: possible cached response')
 finally:p.context.set_offline(False)
 # Do not rely on CDP offline emulation reaching the service worker. Poison
 # exact auth keys in test-only caches; then cut the loopback transport itself.
 p.evaluate("""async()=>{for(const n of ['vault-shell-v25-6','vault-shell-v25-5']){const c=await caches.open(n);await c.put('/auth/callback?code=qa-transport-cut',new Response('QA-POISON-NOT-ORIGIN'));if(!(await c.match('/auth/callback?code=qa-transport-cut')))throw Error('poison setup failed')}}""")
 with LOCK:OUTAGE=True
 try:
  p.goto(ORIGIN+'/__qa__/not-cached-transport',wait_until='domcontentloaded');expect(p.get_by_text('Esta página não abriu',exact=False).first).to_be_visible(timeout=15000)
  with LOCK:before=len(NETWORK_EVENTS)
  rejected=p.evaluate("""async()=>{try{const r=await fetch('/auth/callback?code=qa-transport-cut');await r.text();return false}catch{return true}}""")
  with LOCK: hits=[x for x in NETWORK_EVENTS[before:] if x['path']=='/auth/callback?code=qa-transport-cut' and x['outage']]
  SW_PROOF['transport_cut_probe']={'rejected':rejected,'origin_transport_failures':len(hits),'poisoned_cache_keys':2}
  require(rejected and bool(hits),'auth must reach failed transport and reject despite exact poisoned caches')
 finally:
  with LOCK:OUTAGE=False
 # Reconnect proves fresh origin response, not the poisoned cache.
 with LOCK:before=len(NETWORK_EVENTS)
 fresh=p.evaluate("""async()=>{const r=await fetch('/auth/callback?code=qa-transport-cut');return r.ok && !(await r.text()).includes('QA-POISON-NOT-ORIGIN')}""")
 with LOCK:hits=[x for x in NETWORK_EVENTS[before:] if x['path']=='/auth/callback?code=qa-transport-cut' and not x['outage']]
 SW_PROOF['reconnect_probe']={'fresh':fresh,'origin_hits':len(hits)}
 require(fresh and bool(hits),'reconnected auth did not use origin')
 p.evaluate("""async()=>{for(const n of ['vault-shell-v25-6','vault-shell-v25-5'])await (await caches.open(n)).delete('/auth/callback?code=qa-transport-cut')}""")
 p.goto(ORIGIN+'/login');expect(p.locator('input[type=email]')).to_be_visible(timeout=30000)
 require(p.evaluate("""async()=>await new Promise((resolve,reject)=>{const r=indexedDB.open('qa-sentinel',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('data'),g=t.objectStore('data').get('k');g.onsuccess=()=>{resolve(g.result==='kept');db.close()};g.onerror=reject};r.onerror=reject})"""),'IndexedDB sentinel lost')

CASES=[('AUTH-NEGATIVE',[],guard,'Protected route redirects unauthenticated browser'),('AUTH-PKCE-SYNTHETIC',[],pkce,'Actual SDK PKCE exchange with verified synthetic challenge'),('NAV-BASE-GEOMETRY',['NAV-02','STB-02','STB-03','STB-04','STB-13'],nav,'Five navigation destinations and five viewport widths; browser only'),('NAV-FENIX',['NAV-01'],fenix,'Minha Saúde to Fênix and back; partial NAV-01 (other origins remain)'),('NAV-MED-RETURN',['NAV-03','NAV-04','STB-07'],med_return,'Medicine detail returns safely for nested, external and self targets; partial IDs'),('NAV-MED-EDITOR',['NAV-09'],edit_return,'Clean editor Back returns same record; save and dirty cancel still pending'),('MED-UNKNOWN',['MED-03','MED-04','STB-10'],med_unknown,'No ingredient inferred from synthetic unbound medication; partial negative case'),('PROFILE-B',['GX-06','STB-07'],profile_b,'Separate synthetic profile list and foreign-person detail rejected; not real RLS'),('SW-OFFLINE',['STB-08'],worker,'Real worker install/purge, callback no-cache, fallback, reconnect, IndexedDB; not remote sync or native notifications')]
assert len(CASES)==9

def main():
 global ROOT
 a=argparse.ArgumentParser();a.add_argument('--out',type=Path,required=True);a.add_argument('--evidence',type=Path,required=True);a.add_argument('--sha',required=True);a.add_argument('--chromium');args=a.parse_args();ROOT=args.out.resolve();require((ROOT/'index.html').is_file() and (ROOT/'sw.js').is_file(),'not static export');args.evidence.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',8765),Server);threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 try:
  with sync_playwright() as pw:
   opts={'headless':True};
   if args.chromium:opts['executable_path']=args.chromium
   browser=pw.chromium.launch(**opts)
   for name,ids,fn,expected in CASES:
    c=new_context(browser);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)[:300]));start=datetime.now(timezone.utc).isoformat();r={'case':name,'ids':ids,'criterion':expected,'started_at':start,'sha':args.sha,'mode':'REAL_CHROMIUM_LOOPBACK_SYNTHETIC_BACKEND','acceptance':'PARTIAL_NOT_FULL_ID_ACCEPTANCE'}
    try:fn(p);require(not errors,'Unhandled page exception: '+str(errors[:3]));r.update(status='PASS',observed='All case assertions passed')
    except Exception as exc:r.update(status='FAIL',observed=str(exc)[:2500]);traceback.print_exc()
    try:p.screenshot(path=str(args.evidence/(name+'.png')),timeout=10000)
    except Exception as e:r['screenshot_error']=str(e)[:300]
    r['page_errors']=errors;r['final_url']=p.url;r['ended_at']=datetime.now(timezone.utc).isoformat();results.append(r);print(name+'='+r['status'],flush=True);c.close()
   browser.close()
 finally:
  server.shutdown();(args.evidence/'browser-results.json').write_text(json.dumps({'candidate':args.sha,'cases':results,'expected_cases':len(CASES),'productionWrites':0,'liveSync':'NOT_RUN','nativeQA':'NOT_RUN','prior_run':45922991403,'prior_passes_not_rerun':[],'sw_network_proof':SW_PROOF},indent=2,ensure_ascii=False)+'\n')
 return 0 if len(results)==len(CASES) and all(x['status']=='PASS' for x in results) else 1
if __name__=='__main__':raise SystemExit(main())
