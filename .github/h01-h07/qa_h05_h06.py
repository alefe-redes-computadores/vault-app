#!/usr/bin/env python3
"""Actual Chromium on exact exported source. Local synthetic mutation, no production writes."""
import argparse, json, re, threading, traceback, statistics
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, expect
import qa_browser as q
import qa_h01_h04 as h
WIDTHS=(320,390,430)
SECOND='40000000-0000-4000-8000-000000000003'
NAME='QA TRATAMENTO ALFA'

def require(ok,message):
 if not ok: raise AssertionError(message)

def fixtures(day):
 h.fixtures(day)
 q.TABLES['tratamentos']=[q.treatment(q.TREAT_A,q.PERSON_A,NAME,'brain'),q.treatment(SECOND,q.PERSON_A,NAME,'heart'),q.treatment(q.TREAT_B,q.PERSON_B,NAME,'pill')]
 q.TABLES['tratamentos'][0]['medicamento_ids']=[m['id'] for m in q.TABLES['medicamentos'] if m['person_id']==q.PERSON_A];q.TABLES['tratamentos'][1]['cor']='#DC2626';q.TABLES['tratamentos'][2]['cor']='#2563EB'

def continuity_fixture(day):
 # One active synthetic medication with both explicit link fields, manual renewal reminder due.
 # The generic eight-card fixture is intentionally retained for H05, not for this test.
 fixtures(day)
 med=next(x for x in q.TABLES['medicamentos'] if x['nome']==h.NAMES['normal'] and x['person_id']==q.PERSON_A)
 med.update(id=q.MED_A, tratamento_ids=[q.TREAT_A], data_receita='', proxima_renovacao='', lembrete_receita_modo='data_personalizada', lembrete_receita_data=(datetime.fromisoformat(day)-timedelta(days=7)).date().isoformat())
 med.pop('document_id',None)
 q.TABLES['medicamentos']=[med,q.med(q.MED_B,q.PERSON_B,q.MEDNAME_B)]
 q.TABLES['tratamentos'][0]['medicamento_ids']=[q.MED_A]
 q.TABLES['documents']=[];q.TABLES['dose_logs']=[];q.TABLES['doseLogs']=[]

def geometry(p):
 nav=p.get_by_role('navigation',name='Áreas do tratamento');expect(nav).to_be_visible(timeout=45000)
 return nav.evaluate('''n=>{const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cy:r.y+r.height/2,top:r.top,bottom:r.bottom}};const tabs=[...n.querySelectorAll('a')].map(e=>({href:e.getAttribute('href'),rect:rect(e),icon:rect(e.children[0]),title:rect(e.children[1]),badge:rect(e.children[2]),text:e.innerText,active:e.getAttribute('aria-current'),overflow:e.scrollWidth>e.clientWidth+2}));const candidates=[...document.querySelectorAll('main div.grid.grid-cols-3')].filter(e=>e.children.length===3&&[...e.children].every(x=>x instanceof HTMLDivElement&&x.children.length===3&&x.children[0] instanceof HTMLDivElement&&x.children[0].children[1] instanceof HTMLSpanElement&&x.children[1] instanceof HTMLParagraphElement&&x.children[2] instanceof HTMLParagraphElement)&&[...e.children].map(x=>x.children[0].children[1].textContent.trim().toLowerCase()).join('|')==='em uso|documentos|aquisições');document.querySelectorAll('[data-vault-qa-h05-stats]').forEach(e=>e.removeAttribute('data-vault-qa-h05-stats'));const stats=candidates.length===1?candidates[0]:null;if(stats)stats.setAttribute('data-vault-qa-h05-stats','true');return {statsMatches:candidates.length,tabs,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,scrollLeft:n.scrollLeft,stats:stats?[...stats.children].map(e=>({rect:rect(e),icon:rect(e.children[0]?.children[0]),title:rect(e.children[0]?.children[1]),value:rect(e.children[1]),legend:rect(e.children[2]),text:e.innerText,overflow:e.scrollWidth>e.clientWidth+2})):[],pageOverflow:document.documentElement.scrollWidth>innerWidth+2}}''')

def check_geometry(g,after):
 require(len(g['tabs'])==5,'five actual treatment tabs missing');require(g['statsMatches']==1 and len(g['stats'])==3,'unique three actual indicators missing or ambiguous')
 require(not g['pageOverflow'],'page horizontal overflow')
 require([x['href'] for x in g['tabs']]==['#tratamento-visao','#tratamento-medicamentos','#tratamento-rede','#tratamento-linha','#tratamento-financeiro'],'tab order/route altered')
 require(g['tabs'][0]['badge'] is None and g['tabs'][2]['badge'] is None,'invented count')
 if not after:return
 def aligned(items,key,axis):
  values=[x[key][axis] for x in items if x[key]];return max(values)-min(values)<=2
 for items in [g['tabs'],g['stats']]:
  require(aligned(items,'rect','h') and aligned(items,'rect','w'),'card dimensions differ')
  require(aligned(items,'icon','cy') and aligned(items,'title','cy'),'icon or label misaligned')
  require(not any(x['overflow'] for x in items),'card overflow')
 require(aligned(g['tabs'],'badge','cy'),'badges misaligned')
 require(aligned(g['stats'],'value','cy') and aligned(g['stats'],'legend','cy'),'values or legend misaligned')

def h05(p,out,width,after):
 p.goto(q.ORIGIN+'/saude/tratamentos/detalhes?id='+q.TREAT_A);q.wait_nav(p);nav=p.get_by_role('navigation',name='Áreas do tratamento');expect(nav).to_be_visible(timeout=45000)
 nav.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})");p.wait_for_timeout(180)
 g=geometry(p)
 # Preserve the raw measurements even when a subsequent assertion fails.
 (out/f'{width}-H05-geometry.json').write_text(json.dumps(g,ensure_ascii=False,indent=2)+'\n')
 check_geometry(g,after);h.shot(p,out,f'{width}-H05-navigation',nav)
 # Use the same uniquely measured DOM node, not an independent text locator.
 stats=p.locator('[data-vault-qa-h05-stats="true"]');expect(stats).to_have_count(1)
 if after:expect(p.locator('[data-vault-h05-stats][data-vault-qa-h05-stats="true"]')).to_have_count(1)
 h.shot(p,out,f'{width}-H05-stats',stats)
 fifth=nav.locator('a[href="#tratamento-financeiro"]');fifth.scroll_into_view_if_needed();require(fifth.evaluate('e=>{const r=e.getBoundingClientRect(),n=e.closest("nav").getBoundingClientRect();return r.left>=n.left-2&&r.right<=n.right+2}'),'fifth tab clipped');h.shot(p,out,f'{width}-H05-fifth-tab',nav)
 fifth.click();require(p.evaluate('location.hash')=='#tratamento-financeiro','finance tab not functional');nav.locator('a[href="#tratamento-visao"]').click();require(p.evaluate('location.hash')=='#tratamento-visao','overview not functional')
 return g

def assert_icon(loc,choice,color,id):
 expect(loc).to_be_visible(timeout=45000);expect(loc).to_have_attribute('data-vault-treatment-icon',choice,timeout=45000);expect(loc).to_have_attribute('data-vault-treatment-id',id)
 expect(loc).to_have_css('color',color,timeout=45000)

def h06(ctx,p,out):
 # Observe already-mounted consumers in independent tabs sharing the same authenticated IndexedDB.
 p.goto(q.ORIGIN+'/saude/tratamentos');q.wait_nav(p)
 first=p.locator(f'svg[data-vault-treatment-id="{q.TREAT_A}"]').first;second=p.locator(f'svg[data-vault-treatment-id="{SECOND}"]').first
 assert_icon(first,'brain','rgb(139, 92, 246)',q.TREAT_A);assert_icon(second,'heart','rgb(220, 38, 38)',SECOND)
 med=ctx.new_page();med.goto(q.ORIGIN+'/saude/medicamentos');q.wait_nav(med);m=h.card(med,h.NAMES['normal']);expect(m).to_be_visible(timeout=45000)
 chip=m.locator(f'[data-vault-r5-context="tratamento"]:has(svg[data-vault-treatment-id="{q.TREAT_A}"])');assert_icon(chip.locator('svg[data-vault-treatment-icon]'),'brain','rgb(139, 92, 246)',q.TREAT_A)
 home=ctx.new_page();home.goto(q.ORIGIN+'/');q.wait_nav(home);homeicon=home.get_by_role('heading',name='Tratamentos',exact=True).locator('xpath=ancestor::section[1]').locator(f'svg[data-vault-treatment-id="{q.TREAT_A}"]').first;assert_icon(homeicon,'brain','rgb(139, 92, 246)',q.TREAT_A)
 p.bring_to_front();h.shot(p,out,'H06-before-list',first);med.bring_to_front();h.shot(med,out,'H06-before-medication-chip',chip);home.bring_to_front();h.shot(home,out,'H06-before-home',homeicon)
 # Explicit scenario, not fallback tile: prove the actual linked card before the editor action.
 linked=home.get_by_role('button').filter(has_text='Ver tratamento vinculado')
 expect(linked).to_be_visible(timeout=45000);assert_icon(linked.locator('svg[data-vault-treatment-icon]'),'brain','rgb(139, 92, 246)',q.TREAT_A)
 h.shot(home,out,'H06-before-linked-continuity',linked)
 # Use the real editor and repository; fixture backend refuses clinical writes, so local pending is expected.
 edit=ctx.new_page();edit.goto(q.ORIGIN+'/saude/tratamentos/editar?id='+q.TREAT_A);q.path_is(edit,'/saude/tratamentos/editar')
 # Focused editor explicitly hides global navigation. Assert the actual editor.
 picker=edit.locator('[data-vault-treatment-picker]');expect(picker).to_be_visible(timeout=45000)
 expect(edit.get_by_role('button',name='Voltar',exact=True)).to_be_visible(timeout=45000)
 expect(edit.get_by_role('navigation',name='Navegação principal')).to_have_count(0)
 edit.get_by_role('group',name='Cor do tratamento').get_by_role('button',name='Verde',exact=True).click()
 picker.get_by_role('button',name='Escolher na biblioteca',exact=True).click();choice=picker.locator('[data-vault-treatment-choice="moon"]').last;expect(choice).to_be_enabled();h.shot(edit,out,'H06-editor-choice',choice);choice.click();expect(picker.locator('[data-vault-treatment-choice="moon"][aria-pressed="true"]').first).to_be_attached(timeout=30000)
 edit.get_by_role('button',name='Salvar alterações',exact=True).click();q.path_is(edit,'/saude/tratamentos/detalhes')
 # None of the already open consumers is reloaded, nor is the person switched.
 assert_icon(first,'moon','rgb(22, 163, 74)',q.TREAT_A);assert_icon(second,'heart','rgb(220, 38, 38)',SECOND)
 assert_icon(chip.locator('svg[data-vault-treatment-icon]'),'moon','rgb(22, 163, 74)',q.TREAT_A);expect(chip).to_have_css('color','rgb(22, 163, 74)')
 assert_icon(homeicon,'moon','rgb(22, 163, 74)',q.TREAT_A)
 detail=edit.locator(f'svg[data-vault-treatment-id="{q.TREAT_A}"]').last;assert_icon(detail,'moon','rgb(22, 163, 74)',q.TREAT_A)
 expect(first).to_have_attribute('data-vault-treatment-pending','pending');expect(p.locator(f'svg[data-vault-treatment-id="{q.TREAT_B}"]')).to_have_count(0)
 p.bring_to_front();h.shot(p,out,'H06-after-list',first);med.bring_to_front();h.shot(med,out,'H06-after-medication-chip',chip);home.bring_to_front();h.shot(home,out,'H06-after-home',homeicon);edit.bring_to_front();h.shot(edit,out,'H06-after-detail',detail)
 # Home continuity specifically, not a fallback static icon. Require actual card when the fixture produces it.
 linked=home.get_by_role('button').filter(has_text='Ver tratamento vinculado')
 expect(linked).to_be_visible(timeout=45000);assert_icon(linked.locator('svg[data-vault-treatment-icon]'),'moon','rgb(22, 163, 74)',q.TREAT_A);home.bring_to_front();h.shot(home,out,'H06-home-linked-continuity',linked)
 linked.click();q.path_is(home,'/saude/tratamentos/detalhes');require(q.parse_qs(q.urlsplit(home.url).query).get('id')==[q.TREAT_A],'continuity routed to wrong treatment')
 # Reopen the same list by real route, and prove distinct identical-name record stays distinct.
 edit.goto(q.ORIGIN+'/saude/tratamentos');assert_icon(edit.locator(f'svg[data-vault-treatment-id="{q.TREAT_A}"]').first,'moon','rgb(22, 163, 74)',q.TREAT_A)
 assert_icon(edit.locator(f'svg[data-vault-treatment-id="{SECOND}"]').first,'heart','rgb(220, 38, 38)',SECOND)
 return {'localEdit':'actual editor and Dexie repository','alreadyOpenConsumers':['list','medication chip','home','home continuation'],'detailAndReopen':True,'sameNameDistinctIds':True,'otherPersonNotRendered':True,'sync':'LOCAL_PENDING; fixture denies clinical writes; production sync not certified'}

def main():
 a=argparse.ArgumentParser();a.add_argument('--out',type=Path,required=True);a.add_argument('--evidence',type=Path,required=True);a.add_argument('--sha',required=True);a.add_argument('--phase',choices=['before','after'],required=True);a.add_argument('--day',required=True);args=a.parse_args();q.ROOT=args.out.resolve();require((q.ROOT/'index.html').is_file(),'not real export');args.evidence.mkdir(parents=True,exist_ok=True);fixtures(args.day);report={'sha':args.sha,'phase':args.phase,'productionWrites':0,'status':'FAIL','widths':{},'mode':'REAL_CHROMIUM_SYNTHETIC_BACKEND'}
 server=q.ThreadingHTTPServer(('127.0.0.1',8765),q.Server);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True)
   failures={}
   for width in WIDTHS:
    ctx=None
    try:
     ctx=q.new_context(browser,width);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)[:300]));p.clock.set_fixed_time(datetime.fromisoformat(args.day+'T12:00:00').replace(tzinfo=ZoneInfo('America/Sao_Paulo')));q.login(p);h.seed_fixture(p);report['widths'][str(width)]=h05(p,args.evidence,width,args.phase=='after');require(not errors,'page errors '+str(errors));print(f'H05 {args.phase} {width}px PASS',flush=True)
    except Exception as e:
     failures['H05-'+str(width)]=str(e);traceback.print_exc();print(f'H05 {args.phase} {width}px FAIL',flush=True)
     if ctx:
      try:p.screenshot(path=str(args.evidence/f'{width}-H05-failure.png'),timeout=5000)
      except Exception:pass
    finally:
     if ctx:ctx.close()
   if args.phase=='after':
    ctx=None
    try:
     continuity_fixture(args.day)
     ctx=q.new_context(browser,390);p=ctx.new_page();p.clock.set_fixed_time(datetime.fromisoformat(args.day+'T12:00:00').replace(tzinfo=ZoneInfo('America/Sao_Paulo')));q.login(p);h.seed_fixture(p);report['H06']=h06(ctx,p,args.evidence);print('H06 after PASS',flush=True)
    except Exception as e:
     failures['H06']=str(e);traceback.print_exc();print('H06 after FAIL',flush=True)
     if ctx:
      for i,pg in enumerate(ctx.pages):
       try:pg.screenshot(path=str(args.evidence/f'H06-failure-{i}.png'),timeout=5000)
       except Exception:pass
    finally:
     if ctx:ctx.close()
   browser.close();report['failures']=failures;report['status']='FAIL' if failures else 'PASS'
 except Exception as e:report['failure']=str(e);traceback.print_exc()
 finally:server.shutdown();(args.evidence/'measurements-h05-h06.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 return 0 if report['status']=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
