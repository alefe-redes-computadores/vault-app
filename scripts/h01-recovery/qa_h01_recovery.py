#!/usr/bin/env python3
"""Real app export, synthetic loopback only. Geometry + actual modal selection.
No clinical mutations; synthetic device marker is NOT an enrollment certification.
"""
import argparse, json, re, statistics, threading, traceback
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, expect
import qa_browser as q
import qa_h01_h04 as h

WIDTHS=(320,360,390,430)
EPOCH='90000000-0000-4000-8000-000000000001'
AUTH_MODE='legacy'
ENROLL_READS=[]
class Server(q.Server):
    def do_POST(self):
        if self.path.split('?')[0]=='/rest/v1/rpc/vault_macro02_read_enrollment_r5':
            self.input_json(); ENROLL_READS.append(AUTH_MODE)
            return self.js(200,{'format':'macro02-enrollment-r3','account_id':q.USER,'state':AUTH_MODE,'epoch':EPOCH if AUTH_MODE=='premium' else None,'minimum_protocol':3,'generation':2 if AUTH_MODE=='premium' else 0},{'Cache-Control':'no-store'})
        return super().do_POST()

def require(ok,msg):
    if not ok: raise AssertionError(msg)

def fixtures(day):
    h.NAMES.update(review='QA MEDICAMENTO REVISAO',taken='QA MEDICAMENTO TOMADO')
    meds=h.fixtures(day)
    by={k:next(m for m in meds if m['nome']==v) for k,v in h.NAMES.items()}
    # Same complete synthetic product references as prior H01 QA, not patient data.
    ignored=by['ignored']; ignored.update(estoque_quantidade=0,data_receita=day,tipo_receita='branca')
    rule=ignored['catalog_snapshot']['reference']['regulatoryRules'][0]
    rule.update(prescriptionModel='Receita de controle especial',prescriptionModelCode='receita_controle_especial',vaultPrescriptionType='branca')
    review=by['review']; review.update(tipo_receita='amarela',data_receita=day)
    review['catalog_snapshot']['reference']['regulatoryRules'][0]['hasMalformedExceptions']=True
    taken=by['taken'];taken.update(estoque_horarios=['10:00'],data_receita=day)
    q.TABLES['doseLogs'].append({'id':h.uid(7,999),'user_id':q.USER,'person_id':q.PERSON_A,'medicamento_id':taken['id'],'data':day,'horario':'10:00','tomado_em':day+'T13:00:00Z','quantidade':1,'dose_kind':'scheduled','created_at':q.NOW,'updated_at':q.NOW,'synced':True})
    # Original helper aliases dose_logs and doseLogs; guarantee the same exact list.
    q.TABLES['dose_logs']=q.TABLES['doseLogs']
    long=by['long']; new_id=h.uid(8,900)
    t=dict(next(t for t in q.TABLES['tratamentos'] if t['id']==q.TREAT_A)); t.update(id=new_id,nome='QA TRATAMENTO EXTENSO DE IDENTIDADE E CUIDADO CONTINUADO',medicamento_ids=[long['id']]);q.TABLES['tratamentos'].append(t);long['tratamento_ids']=[q.TREAT_A,new_id]
    return by

def seed_device(p):
    # Synthetic only; a real device proof remains a separate clinical cutover step.
    if AUTH_MODE!='premium': return
    p.evaluate('''async row=>{if(location.origin!=='http://127.0.0.1:8765')throw Error('nonlab');const db=await new Promise((res,rej)=>{const r=indexedDB.open('vault-db');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});try{await new Promise((res,rej)=>{const tx=db.transaction('macro02_device_enrollment','readwrite');tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);tx.objectStore('macro02_device_enrollment').put(row)})}finally{db.close()}}''',{'format':'macro02-device-r5','account_id':q.USER,'epoch':EPOCH,'generation':2,'local_sha256':'a'*64,'remote_sha256':'b'*64})
    p.reload();q.wait_nav(p)

def scale_text(p,factor):
    # Simulate larger type, not browser zoom; preserve the same CSS viewport.
    p.evaluate('''f=>{const root=document.querySelector('main:has(article[data-vault-medication-flow])');if(!root)throw Error('list not rendered');for(const e of root.querySelectorAll('[data-h01-qa-scale]')){e.style.removeProperty('font-size');e.style.removeProperty('line-height');e.removeAttribute('data-h01-qa-scale')}if(f===1)return;const nodes=[...root.querySelectorAll('h1,p,span,button,div')].filter(e=>!e.closest('svg')&&(e.tagName==='BUTTON'||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())));const rows=nodes.map(e=>{const s=getComputedStyle(e);return[e,parseFloat(s.fontSize),s.lineHeight.endsWith('px')?parseFloat(s.lineHeight):null]});for(const [e,n,l] of rows){e.setAttribute('data-h01-qa-scale','1');e.style.setProperty('font-size',n*f+'px','important');if(l)e.style.setProperty('line-height',l*f+'px','important')}}''',factor)

def top_geometry(p):
    p.evaluate("window.scrollTo({top:0,behavior:'instant'})");p.wait_for_function('scrollY<=1');p.wait_for_timeout(150)
    return p.evaluate('''()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};const first=document.querySelector('article[data-vault-medication-flow]'),header=document.querySelector('.vault-h01-medications-header'),nav=document.querySelector('nav.vault-bottom-nav');return {first:rect(first),header:rect(header),nav:rect(nav),usable:Math.max(0,rect(nav).y-rect(first).y),viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+2}}''')

def inspect(c):
    g=h.geometry(c)
    g.update(c.evaluate('''e=>{const r=n=>{const x=n.getBoundingClientRect();return {x:x.x,y:x.y,right:x.right,bottom:x.bottom,w:x.width,h:x.height}};const card=r(e),rail=e.querySelector('button[aria-label^="Ver classificação da receita"]'),reg=e.querySelector('[data-vault-ux360-regulatory-label]'),rx=e.querySelector('[data-vault-v34x-receita-cadastro]');const visible=[...e.querySelectorAll('button:not([aria-hidden="true"]),[data-vault-h01-dose],[data-vault-h01-stock],[data-vault-r5-active-ingredient],[data-vault-ux360-regulatory-label],[data-vault-v34x-receita-cadastro]')].filter(n=>n.getBoundingClientRect().width>2&&n.getBoundingClientRect().height>2&&!n.closest('.sr-only'));return {rail:rail?.innerText||'',regTitle:reg?.title||reg?.getAttribute('aria-label')||'',regHidden:!!reg?.classList.contains('sr-only'),rx:rx?.innerText||'',outside:visible.filter(n=>{const a=r(n);return a.x<card.x-2||a.right>card.right+2||a.y<card.y-2||a.bottom>card.bottom+2||n.scrollWidth>n.clientWidth+3}).map(n=>n.innerText.slice(0,90))}}'''))
    return g

def check(kind,g,mode,after):
    require(g['card']['height']>0,kind+' absent')
    text=g['text']; facts=g['reg']+' '+g['regTitle']+' '+g['rail']
    if kind in ('normal','long','ignored'):
        require(re.search(r'Controle especial|Especial',facts,re.I),'confirmed classification missing '+kind)
        require(re.search(r'fonte oficial',g['reg']+' '+g['regTitle'],re.I),'official origin missing '+kind)
    if kind=='review':
        require(re.search(r'revis[aã]o|sem confirma',facts,re.I),'review classification not evidenced')
        require('Notificação amarela' in text,'declared yellow missing')
        require('fonte oficial' not in g['reg'].lower(),'review promoted to official')
    if kind in ('normal','long','ignored','review','taken'):require(bool(re.search(r'\d{2}/\d{2}/\d{4}',g['rx'])),'registered date absent '+kind)
    if kind=='normal':require('Próxima dose às 20:00' in text and '35 comprimidos' in text,'next scheduled dose/stock missing')
    if kind=='taken':require(re.search(r'Tomado às 10:00|Dose concluída',text,re.I),'completed dose not factual')
    if kind in ('ignored','zero'):require(re.search(r'0\s+comprimid|sem estoque|estoque zerado',text,re.I) and g['ctaText'].strip().startswith('Repor'),'zero/restock missing '+kind)
    if kind=='ignored':
        require('Dose ignorada' in text,'ignored dose missing')
        if after:require('Dose ignorada para revisar' not in text,'duplicate ignored reason')
    if kind=='unit':require('Unidade do estoque diferente' in text,'unit warning lost')
    if kind=='negative':require('Saldo divergente' in text,'negative warning lost')
    if kind=='conflict':require('Receita e catálogo: conferir' in text or 'Cadastro em conferência' in text,'conflict lost')
    if kind=='long':require('COMPOSTO SINTÉTICO DE QA B' in g['titleText'] and 'QA TRATAMENTO EXTENSO' in text,'long identity/treatment missing')
    if not after:return
    require(not g['overflow'] and not g['titleOverflow'] and not g['outside'],'clipping '+kind+': '+str(g['outside']))
    if kind in ('normal','ignored'):require(g['regHidden'],'repeated classification visible in body '+g['reg'])
    if g['cta']:
        require(g['cta']['height']>=43 and g['cta']['width']>=43,'CTA target below 44 '+kind)
        require(abs(g['cta']['cy']-g['strip']['cy'])<=3,'CTA misaligned '+kind)
        require(g['cta']['x']>=g['strip']['right']-1,'CTA overlap '+kind)
    require(g['dose'] and g['stock'] and abs(g['dose']['x']-g['stock']['x'])<=1 and g['stock']['y']>=g['dose']['bottom']-1,'operational geometry '+kind)

def check_modal(p,authority):
    c=h.card(p,h.NAMES['normal']);b=c.locator('[data-vault-r4-main-action] > button');expect(b).to_be_visible();b.click()
    dialog=p.get_by_role('dialog',name='Registrar dose');expect(dialog).to_be_visible(timeout=30000)
    premium=dialog.get_by_role('button',name='Registrar somente o histórico, sem alterar o estoque')
    if authority=='premium':expect(premium).to_be_visible(timeout=30000)
    else:expect(premium).to_have_count(0)
    dialog.get_by_role('button',name='Fechar',exact=True).click();expect(dialog).not_to_be_visible(timeout=10000)

def main():
    global AUTH_MODE
    a=argparse.ArgumentParser();a.add_argument('--out',type=Path,required=True);a.add_argument('--evidence',type=Path,required=True);a.add_argument('--sha',required=True);a.add_argument('--phase',choices=['before','after'],required=True);a.add_argument('--baseline',type=Path);a.add_argument('--day',required=True);args=a.parse_args()
    after=args.phase=='after';q.ROOT=args.out.resolve();require((q.ROOT/'index.html').is_file(),'real export missing');args.evidence.mkdir(parents=True,exist_ok=True);fixtures(args.day)
    baseline=json.loads(args.baseline.read_text()) if after else None
    if after:require(baseline['status']=='PASS' and baseline['phase']=='before','baseline required')
    report={'sha':args.sha,'phase':args.phase,'status':'FAIL','cases':{},'failures':{},'safeArea':'simulated Chromium','authority':'synthetic enrollment; no SQL or clinical mutation','productionWrites':0}
    server=q.ThreadingHTTPServer(('127.0.0.1',8765),Server);threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            for width in WIDTHS:
                for authority in ('legacy','premium'):
                    AUTH_MODE=authority;ctx=None;key=f'{width}-{authority}';errors=[];report['cases'][key]={}
                    try:
                        n=len(ENROLL_READS);ctx=q.new_context(browser,width);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)[:500]));p.clock.set_fixed_time(datetime.fromisoformat(args.day+'T12:00:00').replace(tzinfo=ZoneInfo('America/Sao_Paulo')))
                        q.login(p);h.seed_fixture(p);seed_device(p);p.goto(q.ORIGIN+'/saude/medicamentos');q.wait_nav(p);expect(h.card(p,h.NAMES['normal'])).to_be_visible(timeout=45000)
                        p.get_by_role('button',name='Lista',exact=True).click();check_modal(p,authority);require(authority in ENROLL_READS[n:],'no actual authority RPC')
                        for scale in (1,1.25):
                            k=str(scale);result={};report['cases'][key][k]=result
                            for mode,label in [('compact','Compactos'),('comfort','Conforto')]:
                                scale_text(p,1);p.get_by_role('button',name=label,exact=True).click();expect(h.card(p,h.NAMES['normal']).locator(f'[data-vault-executive-density="{mode}"]')).to_be_visible();scale_text(p,scale)
                                top=top_geometry(p);data={'top':top,'cards':{}};result[mode]=data
                                p.screenshot(path=str(args.evidence/f'{key}-{scale}-{mode}-top.png'),animations='disabled')
                                if after:require(not top['overflow'],'viewport overflow')
                                for kind,name in h.NAMES.items():
                                    c=h.card(p,name);expect(c).to_be_visible(timeout=30000);c.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})");p.wait_for_timeout(100);g=inspect(c);data['cards'][kind]=g;check(kind,g,mode,after)
                                    if scale==1 and kind in ('normal','ignored','review','long'):p.screenshot(path=str(args.evidence/f'{key}-{mode}-{kind}.png'),animations='disabled')
                                if after:
                                    b=baseline['cases'][key][k][mode];data['delta_first_y']=top['first']['y']-b['top']['first']['y'];data['delta_median']=statistics.median(g['card']['height'] for g in data['cards'].values())-statistics.median(g['card']['height'] for g in b['cards'].values());require(data['delta_first_y']<0,'header not compacted')
                                    if mode=='compact':require(data['delta_median']<0,'compact card median did not improve')
                            if after:
                                for kind in ('normal','ignored','review','long'):
                                    require(result['comfort']['cards'][kind]['card']['height']>result['compact']['cards'][kind]['card']['height']+4,'density not distinct '+kind)
                        scale_text(p,1);p.get_by_role('button',name='Compactos',exact=True).click();p.evaluate('window.scrollTo(0,0)');p.add_style_tag(content=':root { --vault-h01-safe-top:28px; } body { padding-top:28px!important; padding-bottom:20px!important; }');p.wait_for_timeout(150);p.evaluate('window.scrollTo(0,260)');p.wait_for_timeout(250);r=p.locator('.vault-h01-medications-header').bounding_box();require(abs(r['y']-28)<=3,'safe top overlap');p.screenshot(path=str(args.evidence/f'{key}-safe-area.png'),animations='disabled');require(not errors,'page errors '+str(errors));print('H01_CASE_PASS',key,flush=True)
                    except Exception as exc:
                        report['failures'][key]=str(exc);traceback.print_exc();print('H01_CASE_FAIL',key,str(exc),flush=True)
                        if ctx:
                            try:p.screenshot(path=str(args.evidence/f'{key}-failure.png'),animations='disabled')
                            except Exception:pass
                    finally:
                        if ctx:ctx.close()
            browser.close()
        report['status']='FAIL' if report['failures'] else 'PASS'
    finally:
        server.shutdown();(args.evidence/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return 0 if report['status']=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
