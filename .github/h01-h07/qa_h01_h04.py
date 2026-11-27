#!/usr/bin/env python3
"""Real Chromium, same synthetic records and viewport in baseline and candidate.
No real patient/provider/network. Assertions inspect rendered layout and actual route navigation.
Chromium inset simulation is explicitly not native Android certification.
"""
import argparse, json, re, threading, traceback, statistics
from pathlib import Path
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, expect
import qa_browser as q

WIDTHS=(320,390,430)
NAMES={"normal":"QA MEDICAMENTO ALFA", "zero":"QA MEDICAMENTO ZERO", "conflict":"QA MEDICAMENTO CONFLITO", "unit":"QA MEDICAMENTO UNIDADE", "negative":"QA MEDICAMENTO SALDO", "ignored":"QA MEDICAMENTO IGNORADO", "sos":"QA MEDICAMENTO SOS", "long":"QA MEDICAMENTO IDENTIDADE EXTENSA COM NOME COMPLETO E PRINCIPIO ATIVO"}

def require(x,msg):
 if not x: raise AssertionError(msg)
def uid(prefix,n):return f'{prefix}0000000-0000-4000-8000-{n:012d}'
def fixtures(day):
 source={'id':'qa-reg','authority':'anvisa','label':'ANVISA — FIXTURE SINTÉTICA DE TESTE','version':'qa','url':'https://www.gov.br/anvisa/pt-br','verifiedAt':day}
 docs=[]; meds=[]; dose=[]
 for n,(kind,name) in enumerate(NAMES.items(),1):
  id=uid(3,100+n); special=kind in ('normal','conflict','long'); decl='comum' if kind=='conflict' or not special else 'branca'; strength='1 mg'; ingredient='COMPOSTO SINTÉTICO DE QA A + COMPOSTO SINTÉTICO DE QA B' if kind=='long' else 'COMPONENTE SINTÉTICO QA'
  ref={'id':uid(5,n),'canonicalName':name,'activeIngredients':[ingredient],'presentations':[{'label':'1 MG COM CT BL AL X 30','value':1,'unit':'mg'}],'sources':[source],'regulatoryIdentity':{'referenceType':'product','productId':uid(5,n)},'regulatoryRules':[{'id':'qa-rule-'+kind,'substance':ingredient,'prescriptionModel':'Receita de controle especial' if special else 'Receita comum','prescriptionModelCode':'receita_controle_especial' if special else 'receita_comum','vaultPrescriptionType':'branca' if special else 'comum','sourceId':'qa-reg','verifiedAt':day,'sources':[source]}]}
  row=q.med(id,q.PERSON_A,name);row.update(dosagem=strength,tipo_receita=decl,formato='comprimido',estoque_quantidade={'zero':0,'unit':0,'negative':-2}.get(kind,35),estoque_unidade_medida='capsula' if kind=='unit' else 'comprimido',estoque_unidade_por_dose=1,estoque_data_referencia=day,estoque_horarios=['08:00'] if kind=='ignored' else ['20:00'],tipo_uso='sos' if kind=='sos' else 'continuo',laboratorio_etiqueta='Laboratório QA',tratamento_ids=[q.TREAT_A],catalog_snapshot={'schema':1,'lookup_key':name.lower(),'catalog_signature':None,'resolved_at':q.NOW,'quality':1000,'match_kind':'exact','reference':ref})
  if kind=='zero':row.update(data_receita=day,proxima_renovacao=(datetime.fromisoformat(day)+timedelta(days=60)).date().isoformat())
  if kind in ('normal','long'):
   docid=uid(6,n); row.update(document_id=docid,data_receita=day,proxima_renovacao=(datetime.fromisoformat(day)+timedelta(days=60)).date().isoformat());docs.append({'id':docid,'user_id':q.USER,'person_id':q.PERSON_A,'category_id':'saude','type':'receita','title':'QA Receita vinculada','metadata':{},'attachments':[],'is_favorite':False,'entidade_tipo':'medicamento','entidade_id':id,'created_at':q.NOW,'updated_at':q.NOW,'synced':True})
  if kind=='ignored':dose.append({'id':uid(7,n),'user_id':q.USER,'person_id':q.PERSON_A,'medicamento_id':id,'data':day,'horario':'08:00','ignorado_em':day+'T11:00:00Z','quantidade':1,'dose_kind':'scheduled','created_at':q.NOW,'updated_at':q.NOW,'synced':True})
  meds.append(row)
 q.TABLES['medicamentos']=meds+[q.med(q.MED_B,q.PERSON_B,q.MEDNAME_B)]
 q.TABLES['documents']=docs; q.TABLES['dose_logs']=dose; q.TABLES['doseLogs']=dose
 for t in q.TABLES['tratamentos']:
  if t['id']==q.TREAT_A:t['medicamento_ids']=[m['id'] for m in meds]
 return meds

def seed_fixture(p):
 # Synthetic IDB setup after real login. The earlier run rendered medication before its linked treatment.
 # Seed the exact scoped records, using both real relation fields; no stubbed UI or clinical production writer.
 require(p.url.startswith(q.ORIGIN+'/'),'fixture origin refused')
 payload={k:q.TABLES[k] for k in ('tratamentos','medicamentos','documents')};payload['doseLogs']=q.TABLES['doseLogs']
 result=p.evaluate("""async rows=>{const info=await indexedDB.databases();if(!info.some(d=>d.name==='vault-db'))throw Error('fixture DB missing');const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('vault-db');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});try{const stores=Object.keys(rows);if(stores.some(s=>!db.objectStoreNames.contains(s)))throw Error('fixture store absent');await new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);for(const s of stores)for(const row of rows[s]){if(row.user_id!=='10000000-0000-4000-8000-000000000001'||!/^20000000-0000-4000-8000-00000000000[12]$/.test(row.person_id))throw Error('nonfixture scope');tx.objectStore(s).put(row)}});return stores.map(s=>[s,rows[s].length]);}finally{db.close()}}""",payload)
 require(dict(result)=={k:len(v) for k,v in payload.items()},'synthetic fixture incomplete')
 p.reload();q.wait_nav(p)

def shot(p,out,name,el=None):
 if el:
  el.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})");expect(el).to_be_visible(timeout=30000)
  p.wait_for_timeout(180)
  r=el.bounding_box();require(r and r['y']<844 and r['y']+r['height']>0,'screenshot target offscreen '+name)
 p.screenshot(path=str(out/(name+'.png')),timeout=15000,animations='disabled')
 return name+'.png'

def card(p,name):return p.locator('article[data-vault-medication-flow="true"]').filter(has=p.get_by_role('button',name=re.compile(r'^Abrir (?:Gaveta 360|Gaveta de medicamentos) de '+re.escape(name)+r'$'))).first

def geometry(c):
 return c.evaluate('''e=>{const rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2}};const op=e.querySelector('[data-vault-r5-operational]'),cta=e.querySelector('[data-vault-r4-main-action] > button'),body=e.querySelector('[data-vault-med-flow-body]'),header=e.querySelector('[data-vault-med360-header]'),strip=e.querySelector('[data-vault-h01-operational-strip]')||op?.firstElementChild?.firstElementChild;const title=e.querySelector('[data-vault-med360-entry="name"]');const chips=Array.from(e.querySelectorAll('[data-vault-r5-context]')).map(n=>{const s=getComputedStyle(n);return {text:n.innerText,rect:rect(n),minHeight:s.minHeight,padding:s.padding,borderRadius:s.borderRadius,alignItems:s.alignItems,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}});return {card:rect(e),body:rect(body),available:rect(body?.parentElement),header:rect(header),op:rect(op),strip:rect(strip),cta:rect(cta),ctaText:cta?.innerText||'',dose:rect(e.querySelector('[data-vault-h01-dose]')),stock:rect(e.querySelector('[data-vault-h01-stock]')),chips,titleText:title?.innerText||'',titleOverflow:title?title.scrollHeight>title.clientHeight+2:false,overflow:e.scrollWidth>e.clientWidth+2,reg:e.querySelector('[data-vault-ux360-regulatory-label]')?.innerText||'',text:e.innerText,alerts:[...e.querySelectorAll('[data-vault-med360-microbanner],[data-vault-h01-independent-alert],[data-vault-h01-attention],[data-vault-h01-declaration]')].map(n=>n.innerText)}}''')

def card_assert(kind,g,mode,after):
 require(g['card']['height']>0,f'{kind} card not rendered');
 if after:require(not g['overflow'],f'{kind} card overflow')
 if after:require(g['body']['width']>=g['available']['width']-2,'body still constrained by avatar')
 require(g['reg'] and ('Controle especial' in g['reg'] if kind in ('normal','conflict','long') else 'Receita comum' in g['reg']),f'{kind} actual official fixture missing: '+g['reg'])
 if kind in ('normal','long'):require('COMPONENTE SINTÉTICO QA' in g['titleText'] or 'COMPOSTO SINTÉTICO DE QA' in g['titleText'],'active ingredient not rendered')
 if kind=='normal':require(re.search(r'Próxima dose às 20:00',g['text'],re.I) and re.search(r'35\s+comprimid',g['text'],re.I),'future/stock fixture not rendered')
 if kind=='zero':require(re.search(r'0\s+comprimid|sem estoque|estoque zerado',g['text'],re.I) and g['ctaText'].strip().startswith('Repor'),'zero stock with real restock CTA not rendered')
 if kind=='unit':require('Unidade do estoque diferente' in g['text'],'independent stock unit warning absent')
 if kind=='negative':require('Saldo divergente' in g['text'],'negative balance warning absent')
 if kind=='ignored':require(re.search(r'ignorad',g['text'],re.I),'ignored dose fixture not rendered')
 if kind=='sos':require('Quando necessário' in g['text'],'SOS fixture not rendered')
 if mode=='comfort' and kind=='normal':
  for marker in ('QA TRATAMENTO ALFA','Comprado','Laboratório QA','Documento vinculado'):require(marker in g['text'],f'comfort context absent: {marker}')
 if not after:return
 if kind in ('normal','long'):require('Tipo informado: Controle especial' not in g['text'] and 'Cadastro: Controle especial' not in g['text'],'duplicate declaration')
 if kind=='conflict':require('Receita e catálogo: conferir' in g['text'] or 'Cadastro em conferência' in g['text'],'real regulatory conflict hidden')
 if kind=='zero':require('Saldo registrado zerado · conferir' not in g['text'],'duplicated zero stock warning')
 require(not g['titleOverflow'],'identity clipped')
 if kind=='long':require(NAMES[kind] in g['titleText'] and 'COMPOSTO SINTÉTICO DE QA B' in g['titleText'],'long identity truncated')
 if g['cta']:
  require(g['cta']['height']>=43 and g['cta']['width']>=43,'primary target below 44px')
  require(abs(g['cta']['cy']-g['strip']['cy'])<=3,'operational CTA not vertically centered')
  require(g['cta']['x']>=g['strip']['right']-1,'operational CTA overlaps text')
 require(g['dose'] and g['stock'] and abs(g['dose']['x']-g['stock']['x'])<=1,'dose/stock columns misaligned')
 require(g['stock']['y']>=g['dose']['bottom']-1,'dose/stock rows overlap')
 if g['chips']:
  expected=24 if mode=='compact' else 28
  for chip in g['chips']:
   require(chip['rect']['height']>=expected-1 and chip['scrollWidth']<=chip['clientWidth']+2,'chip overflow/target')
   require(chip['alignItems']=='center' and chip['borderRadius']=='8px','chip geometry mismatch')
  require(len({(x['minHeight'],x['padding'],x['borderRadius']) for x in g['chips']})==1,'chips inconsistent in same density')

def header(p,out,width,after):
 h=p.locator('header').filter(has=p.get_by_role('heading',name='Medicamentos',exact=True)).first
 expect(h).to_be_visible(timeout=30000)
 p.evaluate('window.scrollTo(0,0)');p.wait_for_timeout(200)
 natural=h.bounding_box()
 # Simulate 28px inset only in Chromium, without changing the app's own padding rule.
 p.add_style_tag(content=':root { --vault-h01-safe-top: 28px; } body { padding-top:28px !important; }')
 p.wait_for_timeout(100);first=h.bounding_box()
 p.evaluate('window.scrollTo(0,260)');p.wait_for_timeout(300)
 r=h.bounding_box();title=h.get_by_role('heading',name='Medicamentos',exact=True).bounding_box();back=h.get_by_role('button',name='Voltar',exact=True).bounding_box();search=h.get_by_role('button',name='Pesquisar medicamentos',exact=True).bounding_box()
 proof={'natural':natural,'initialSimulated':first,'scrolled':r,'title':title,'back':back,'search':search,'scrollY':p.evaluate('scrollY'),'background':h.evaluate('e=>getComputedStyle(e).backgroundColor'),'top':h.evaluate('e=>getComputedStyle(e).top')}
 require(proof['scrollY']>=100,'header test did not scroll')
 if after:
  require(abs(first['y']-28)<=3 and abs(r['y']-28)<=3,'sticky offset incorrect or duplicated inset')
  require(title['y']>=28 and back['y']>=28 and search['y']>=28,'status bar overlaps title/back/search')
  require(proof['background'].startswith('rgb('),'header not opaque')
 shot(p,out,f'{width}-header-scrolled')
 # Verify actual search handler remains reachable on scrolled header, then close.
 if after:
  h.get_by_role('button',name='Pesquisar medicamentos',exact=True).click();expect(h.get_by_role('searchbox',name='Buscar medicamento')).to_be_visible();h.get_by_role('button',name='Fechar pesquisa').click()
 return proof

def go_map(p):
 p.goto(q.ORIGIN+'/saude/mapa');expect(p.get_by_role('heading',name='Explorar o VAULT',exact=True)).to_be_visible(timeout=45000);q.wait_nav(p)
 search=p.get_by_role('searchbox',name='Buscar áreas de saúde');expect(search).to_be_enabled(timeout=30000);search.fill('');expect(p.locator('[data-vault-clinical-map-entry="reabilitacao"]')).to_have_count(1,timeout=30000)
 return search

def map_geometry(p):
 p.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');p.wait_for_timeout(300)
 return p.evaluate('''()=>{const e=[...document.querySelectorAll('p')].find(x=>x.textContent.startsWith('Este mapa organiza acessos existentes.'));const m=e?.closest('main'),shell=document.querySelector('.vault-app-shell-r03'),nav=document.querySelector('nav.vault-bottom-nav'),fab=nav?.querySelector('button.absolute,[data-vault-home-compose] > button');const r=x=>{if(!x)return null;const a=x.getBoundingClientRect();return {top:a.top,bottom:a.bottom,left:a.left,right:a.right,height:a.height,width:a.width}};const nr=r(nav),fr=r(fab),end=r(e);const top=Math.min(nr.top,fr&&fr.height>0?fr.top:nr.top);const hit=n=>{if(!n)return null;const a=n.getBoundingClientRect();return n.contains(document.elementFromPoint(a.x+a.width/2,a.y+a.height/2))};return {end,main:r(m),nav:nr,fab:fr,navHit:hit(nav),fabHit:hit(fab),gap:top-end.bottom,viewport:document.documentElement.clientHeight,obstruction:document.documentElement.clientHeight-top,measured:parseFloat(shell.style.getPropertyValue('--vault-footer-obstruction-r03')),ready:shell.getAttribute('data-vault-footer-r03'),padding:parseFloat(getComputedStyle(m).paddingBottom),shellPadding:parseFloat(getComputedStyle(shell).paddingBottom),overflow:document.documentElement.scrollWidth>innerWidth+2,scrollY,scrollMax:document.documentElement.scrollHeight-document.documentElement.clientHeight}}''')

def map_cases(p,out,width,after):
 p.goto(q.ORIGIN+'/saude/minha-saude');launcher=p.locator('[data-vault-ui360-r5-launcher]').first;expect(launcher).to_be_visible(timeout=45000)
 expect(launcher.locator('[data-vault-zhf-vital]')).to_be_visible();fixed=launcher.get_by_role('region',name='Cuidados e recuperação');expect(fixed).to_have_count(0 if after else 1)
 target=launcher.get_by_role('button',name='Ver todas as áreas de saúde');shot(p,out,f'{width}-hub',target)
 # Real hub search, not text presence alone. Both modules remain visible via search.
 search=launcher.get_by_role('searchbox',name='Buscar módulos de saúde e rede');
 for term,label in [('internação','Internações'),('fisioterapia','Reabilitação')]:
  search.fill(term);expect(launcher.get_by_role('button',name='Abrir '+label,exact=True)).to_be_visible(timeout=30000);shot(p,out,f'{width}-hub-search-{label}',launcher.get_by_role('region',name='Resultados da busca'))
 search.fill('');target.click();q.path_is(p,'/saude/mapa');search=go_map(p)
 entries=p.locator('[data-vault-clinical-map-entry]');ids=sorted(entries.evaluate_all('(els)=>els.map(e=>e.dataset.vaultClinicalMapEntry)'));require(len(ids)==len(set(ids)),'map duplicated route');require(len(ids)==57,'58 catalog accesses include Hoje in BottomNav/search; visible map inventory='+str(len(ids)))
 expect(p.get_by_text('58 acessos clínicos disponíveis · por área',exact=True)).to_be_visible();expect(p.locator('[data-vault-map-density]')).to_have_count(0 if after else 1)
 shot(p,out,f'{width}-map-top',p.get_by_role('heading',name='Explorar o VAULT',exact=True))
 if after:p.wait_for_function("document.querySelector('.vault-app-shell-r03')?.getAttribute('data-vault-footer-r03')==='ready'",timeout=30000)
 g=map_geometry(p);require(g['scrollMax']-g['scrollY']<=2,'not at real bottom');require(not g['overflow'],'map overflow');require(g['end']['bottom']<=g['viewport']+1 and g['end']['bottom']>0,'map end outside viewport')
 if after:
  require(g['ready']=='ready' and abs(g['measured']-g['obstruction'])<=2,'STB-13 measured reserve not actual obstruction')
  require(abs(g['padding']-(g['measured']+12))<=2 and g['shellPadding']==0,'duplicate bottom reservation')
  require(9<=g['gap']<=16,'end/FAB gap not single 12px reserve '+str(g))
  require(g['navHit'],'nav is not reachable')
  if g['fab']:require(g['fabHit'] and g['fab']['bottom']<=g['nav']['top']+2,'FAB overlap or not clickable')
 shot(p,out,f'{width}-map-end')
 # Search all 58 including Hoje and exercise both actual recovery route links.
 search.fill('Hoje');expect(p.locator('[data-vault-clinical-map-entry="hoje"]')).to_have_count(1);search.fill('')
 for id,term,label in [('internacoes','internação','Internações'),('reabilitacao','fisioterapia','Reabilitação')]:
  search.fill(term);link=p.locator(f'[data-vault-clinical-map-entry="{id}"]');expect(link).to_be_visible(timeout=30000);shot(p,out,f'{width}-map-search-{id}',link)
  link.click();q.path_is(p,'/saude/'+id);q.wait_nav(p);expect(p.get_by_role('heading',name=re.compile(label,re.I)).first).to_be_visible(timeout=45000);shot(p,out,f'{width}-actual-route-{id}',p.get_by_role('heading',name=re.compile(label,re.I)).first)
  search=go_map(p)
 # Pin through real control, verify shared favorites on both screens and return to map.
 pin=p.get_by_role('button',name='Fixar Reabilitação',exact=True);expect(pin).to_be_visible(timeout=30000);pin.click();expect(p.get_by_role('region',name='Favoritos').get_by_role('link',name='Reabilitação',exact=True)).to_be_visible(timeout=30000)
 p.goto(q.ORIGIN+'/saude/minha-saude');launcher=p.locator('[data-vault-ui360-r5-launcher]').first;expect(launcher.get_by_role('region',name='Módulos fixados').get_by_role('button',name='Abrir Reabilitação',exact=True)).to_be_visible(timeout=45000);shot(p,out,f'{width}-hub-favorite',launcher.get_by_role('region',name='Módulos fixados'))
 return {'ids':ids,'geometry':g,'fixedRecovery':0 if after else 1,'mapDensity':0 if after else 1,'verifiedRoutes':['internacoes','reabilitacao'],'sharedFavorites':True,'catalogTotal':58}

def main():
 a=argparse.ArgumentParser();a.add_argument('--out',required=True,type=Path);a.add_argument('--evidence',required=True,type=Path);a.add_argument('--sha',required=True);a.add_argument('--phase',required=True,choices=['before','after']);a.add_argument('--baseline',type=Path);a.add_argument('--day',required=True);args=a.parse_args();after=args.phase=='after';q.ROOT=args.out.resolve();require((q.ROOT/'index.html').is_file() and (q.ROOT/'sw.js').is_file(),'real static export missing');args.evidence.mkdir(parents=True,exist_ok=True);fixtures(args.day)
 report={'sha':args.sha,'phase':args.phase,'mode':'REAL_CHROMIUM_LOOPBACK_SYNTHETIC','nativeSafeArea':'SIMULATED_TOP_ONLY_NATIVE_QA_REQUIRED','productionWrites':0,'widths':{},'status':'FAIL'}
 before=json.loads(args.baseline.read_text()) if after else None
 if after:require(before['status']=='PASS' and before['phase']=='before','valid baseline proof required')
 server=q.ThreadingHTTPServer(('127.0.0.1',8765),q.Server);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True)
   for width in WIDTHS:
    ctx=q.new_context(browser,width);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)[:500]));p.clock.set_fixed_time(datetime.fromisoformat(args.day+'T12:00:00').replace(tzinfo=ZoneInfo('America/Sao_Paulo')));q.login(p);seed_fixture(p);p.goto(q.ORIGIN+'/saude/medicamentos');q.wait_nav(p);expect(card(p,NAMES['normal'])).to_be_visible(timeout=45000)
    result={'cards':{}};report['widths'][str(width)]=result
    for mode,button in [('compact','Compactos'),('comfort','Conforto')]:
     p.get_by_role('button',name=button,exact=True).click();expect(card(p,NAMES['normal']).locator(f'[data-vault-executive-density="{mode}"]')).to_be_visible(timeout=30000)
     measures={};result['cards'][mode]=measures
     for kind,name in NAMES.items():
      c=card(p,name);expect(c).to_be_visible(timeout=45000)
      if kind=='normal' and mode=='comfort':expect(c.get_by_role('button',name='Abrir tratamento QA TRATAMENTO ALFA',exact=True)).to_be_visible(timeout=45000)
      c.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})");p.wait_for_timeout(150);g=geometry(c);measures[kind]=g;g['capture']=shot(p,args.evidence,f'{width}-{mode}-{kind}',c);card_assert(kind,g,mode,after)
    if after:
     base=before['widths'][str(width)]['cards'];comp=result['cards']['compact'];comfort=result['cards']['comfort'];require(comfort['normal']['card']['height']>comp['normal']['card']['height']+8,'comfort not meaningfully distinct');require(comp['zero']['card']['height']<base['compact']['zero']['card']['height'],'zero card not compacted');require(statistics.median(comp[k]['card']['height'] for k in ('normal','zero','conflict','sos'))<statistics.median(base['compact'][k]['card']['height'] for k in ('normal','zero','conflict','sos')),'compact median did not improve');result['compactDeltaPx']={k:round(comp[k]['card']['height']-base['compact'][k]['card']['height'],2) for k in NAMES}
    p.get_by_role('button',name='Compactos',exact=True).click();result['header']=header(p,args.evidence,width,after)
    result['map']=map_cases(p,args.evidence,width,after)
    if after:require(result['map']['ids']==before['widths'][str(width)]['map']['ids'],'map inventory changed');require(result['map']['geometry']['gap']<before['widths'][str(width)]['map']['geometry']['gap'],'bottom gap did not decrease')
    require(not errors,'unhandled page errors '+str(errors));ctx.close();print(f'{args.phase} {width}px PASS',flush=True)
   browser.close()
  report['status']='PASS'
 except Exception as exc:
  report['failure']=str(exc);traceback.print_exc()
 finally:
  server.shutdown();(args.evidence/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 return 0 if report['status']=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
