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
    g.update(c.evaluate('''e=>{const rect=n=>{if(!n)return null;const x=n.getBoundingClientRect();return {x:x.x,y:x.y,right:x.right,bottom:x.bottom,w:x.width,h:x.height,cx:x.x+x.width/2,cy:x.y+x.height/2}};const card=rect(e),rail=e.querySelector('button[aria-label^="Ver classificação da receita"]'),reg=e.querySelector('[data-vault-ux360-regulatory-label]'),rx=e.querySelector('[data-vault-v34x-receita-cadastro]'),title=e.querySelector('[data-vault-med360-entry="name"] > span:first-child > span:first-child'),meta=e.querySelector('[data-vault-h01-identity-meta]'),man=e.querySelector('[data-vault-h01-manufacturer]'),chip=e.querySelector('[data-vault-h01-chips]'),strip=e.querySelector('[data-vault-h01-operational-strip]'),panel=e.querySelector('[data-vault-r5-operational]'),base=e.querySelector('[data-vault-h01-final-base]'),action=e.querySelector('[data-vault-r4-main-action],[data-vault-h01-status-slot]'),done=e.querySelector('[data-vault-h01-completed]'),icon=e.querySelector('[data-vault-med-flow-icon]');const visible=[...e.querySelectorAll('button:not([aria-hidden="true"]),[data-vault-h01-dose],[data-vault-h01-stock],[data-vault-h01-manufacturer],[data-vault-r5-active-ingredient],[data-vault-ux360-regulatory-label],[data-vault-v34x-receita-cadastro]')].filter(n=>n.getBoundingClientRect().width>2&&n.getBoundingClientRect().height>2&&!n.closest('.sr-only'));return {viewportWidth:innerWidth,rail:rail?.innerText||'',railRect:rect(rail),railColor:rail?getComputedStyle(rail.parentElement).backgroundColor:'',railTextRect:rect(rail?.querySelector('span[aria-hidden] > span')),regTitle:reg?.title||reg?.getAttribute('aria-label')||'',regHidden:!!reg?.classList.contains('sr-only'),rx:rx?.innerText||'',manufacturer:man?.innerText||'',manufacturerFactory:!!man?.querySelector('svg[data-vault-guardian-factory="true"]'),manufacturerBadge:!!man&&man.getAttribute('data-vault-guardian-laboratory-badge')==='true'&&getComputedStyle(man).boxShadow!=='none'&&getComputedStyle(man).backgroundColor!=='rgba(0, 0, 0, 0)',factsAria:strip?.getAttribute('aria-label')||'',factsText:strip?.innerText||'',completed:done?.innerText||'',completedInteractive:!!done?.closest('button,a,[role="button"],[data-vault-r4-main-action]'),axis:{title:rect(title),meta:rect(meta),chips:rect(chip),recipe:rect(rx),recipeIcon:rect(rx?.querySelector('svg')),panel:rect(panel),base:rect(base),action:rect(action),icon:rect(icon),facts:rect(strip)},outside:visible.filter(n=>{const a=rect(n);return a.x<card.x-2||a.right>card.right+2||a.y<card.y-2||a.bottom>card.bottom+2||n.scrollWidth>n.clientWidth+3}).map(n=>n.innerText.slice(0,90))}}'''))
    return g

def check(kind,g,mode,after):
    require(g['card']['height']>0,kind+' absent')
    text=g['text']; facts=g['reg']+' '+g['regTitle']+' '+g['rail']; aria=g['factsAria']; visible=g['factsText']
    if kind in ('normal','long','ignored'):
        require(re.search(r'Controle especial|Especial',facts,re.I),'confirmed classification missing '+kind)
        require(re.search(r'fonte oficial|Fonte:',g['reg']+' '+g['regTitle'],re.I),'official origin missing '+kind)
    if kind=='review':
        require(re.search(r'revis[aã]o|sem confirma',facts,re.I),'review classification not evidenced')
        require('Notificação amarela' in text,'declared yellow missing')
        require('fonte oficial' not in g['reg'].lower(),'review promoted to official')
    if kind in ('normal','long','ignored','review','taken'):
        if not after or mode=='comfort':require(bool(re.search(r'\d{2}/\d{2}/\d{4}',g['rx'])),'registered date absent '+kind)
        else:require(not g['rx'],'compact administrative row still visible')
    if kind=='normal':
        # M149 displays the stored unit literally (singular or plural); no grammatical inference.
        require('Próxima dose às 20:00' in aria,'next scheduled dose missing: '+repr(aria))
        require(re.search(r'35\s+comprimidos?\b',aria,re.I),'registered stock missing: '+repr(aria))
        require('20:00' in visible and re.search(r'35\s*(?:comp\.|comprimidos?)',visible,re.I),'visible dose/stock missing: '+repr(visible))
    if kind=='taken':require(re.search(r'Tomado às 10:00|Dose concluída',aria,re.I),'completed dose not factual: '+repr(aria))
    if kind in ('ignored','zero'):require(re.search(r'0\s+comprimid|sem estoque|estoque zerado',aria,re.I) and g['ctaText'].strip().startswith('Repor'),'zero/restock missing '+kind+': '+repr(aria))
    if kind=='ignored':
        require('Dose ignorada' in aria and 'ignorada' in visible.lower(),'ignored dose missing')
        if after:require('Dose ignorada para revisar' not in text,'duplicate ignored reason')
    if kind=='unit':require('Unidade do estoque diferente' in text,'unit warning lost')
    if kind=='negative':require('Saldo divergente' in text,'negative warning lost')
    if kind=='conflict':require('Receita e catálogo: conferir' in text or 'Cadastro em conferência' in text,'conflict lost')
    if kind=='long':require('COMPOSTO SINTÉTICO DE QA B' in g['titleText'] and 'QA TRATAMENTO EXTENSO' in text,'long identity/treatment missing')
    if not after:return
    require('Laboratório QA' in g['manufacturer'],'real manufacturer missing '+kind)
    require(not g['overflow'] and not g['titleOverflow'] and not g['outside'],'clipping '+kind+': '+str(g['outside']))
    if kind in ('normal','ignored'):require(g['regHidden'],'repeated classification visible in body '+g['reg'])
    a=g['axis'];x=a['title']['x']
    for name in ('meta','chips','facts' if mode=='compact' else 'panel'):
        require(a[name] is not None and abs(a[name]['x']-x)<=2,'text axis drift '+kind+' '+name+': '+repr(a))
    if mode=='comfort' and g['rx']:
        for name in ('recipe','recipeIcon'):require(a[name] and abs(a[name]['x']-x)<=2,'comfort recipe axis drift '+kind+' '+name+': '+repr(a))
    require(g['railRect'] and a['icon']['x']>=g['railRect']['right']+9,'rail/icon gap insufficient '+kind)
    require(x>=a['icon']['right']+6,'icon/text gap insufficient '+kind)
    if g['railTextRect']:require(g['railTextRect']['y']>=g['railRect']['y']-1 and g['railTextRect']['bottom']<=g['railRect']['bottom']+1,'rail label clipped '+kind)
    if g['cta']:
        require(g['cta']['height']>=43 and g['cta']['width']>=43,'CTA target below 44 '+kind)
        if mode=='compact':
            require(abs(g['cta']['cy']-(a['facts']['cy'] if g['viewportWidth']<=375 else a['base']['cy']))<=3,'CTA misaligned compact '+kind)
            require(g['cta']['x']>=a['facts']['right']-1,'CTA overlap '+kind)
        elif g['cta']['x']>=a['facts']['right']-1:
            require(abs(g['cta']['cy']-a['facts']['cy'])<=3,'CTA misaligned comfort '+kind)
        else:require(g['cta']['y']>=a['facts']['bottom']-1,'CTA stacked overlap '+kind)
    if kind=='taken' and not g['cta']:require(g['completed']=='Tomada' and not g['completedInteractive'],'completed badge missing or fake action')
    if g['completed']:
        require(kind=='taken' and not g['completedInteractive'],'unfactual or interactive completed badge '+kind)
        require(a['action'] and a['action']['h']>=43 and a['action']['w']>=43,'completion geometry '+kind)
        if mode=='compact':
            require(abs(a['action']['cy']-(a['facts']['cy'] if g['viewportWidth']<=375 else a['base']['cy']))<=3,'completion misaligned '+kind)
            require(a['action']['x']>=a['facts']['right']-1,'completion overlap '+kind)
    require(g['dose'] and g['stock'],'missing factual strip '+kind)
    require(g['stock']['x']>=g['dose']['right']-1 or g['stock']['y']>=g['dose']['bottom']-1,'dose/stock overlap '+kind)

def check_modal(p,authority):
    c=h.card(p,h.NAMES['normal']);b=c.locator('[data-vault-r4-main-action] > button');expect(b).to_be_visible();b.click()
    dialog=p.get_by_role('dialog',name='Registrar dose');expect(dialog).to_be_visible(timeout=30000)
    premium=dialog.get_by_role('button',name='Registrar somente o histórico, sem alterar o estoque')
    if authority=='premium':expect(premium).to_be_visible(timeout=30000)
    else:expect(premium).to_have_count(0)
    dialog.get_by_role('button',name='Fechar',exact=True).click();expect(dialog).not_to_be_visible(timeout=10000)

def check_sheet(p,kind,row,linked,diagnostics):
    # Date and document linkage are independent facts. Never infer one from the other.
    require(row['nome']==h.NAMES[kind], 'fixture identity mismatch')
    raw_date=row.get('data_receita')
    expected_date=datetime.fromisoformat(raw_date).strftime('%d/%m/%Y') if raw_date else 'Não informada'
    expected_manufacturer=row['laboratorio_etiqueta']
    require(bool(expected_manufacturer), 'fixture manufacturer missing')
    c=h.card(p,row['nome'])
    # Immediate observation, NOT a wait for positive documentary evidence.
    # A premature negative snapshot must still fail the original drawer assert.
    diagnostics.update(expectedLinked=linked,expectedDate=expected_date,
        cardDocumentMarkersAtOpen=c.locator('[data-vault-v34x-receita-documento]').count())
    c.locator('[data-vault-med360-entry="name"]').click()
    sheet=p.locator('[data-vault-med360-sheet]');expect(sheet).to_be_visible(timeout=15000)
    expect(sheet.get_by_role('heading',level=2)).to_contain_text(row['nome'],timeout=15000)
    # The component restores its initial tab in a React effect. Assert and wait;
    # do not click Ficha to conceal a regression in the default tab.
    ficha=sheet.get_by_role('tab',name='Ficha',exact=True)
    expect(ficha).to_have_attribute('aria-selected','true',timeout=15000)
    panel=sheet.get_by_role('tabpanel')
    manufacturer=panel.get_by_text('Fabricante',exact=True).locator('xpath=../..')
    expect(manufacturer.get_by_text(expected_manufacturer,exact=True)).to_be_visible(timeout=15000)
    receita=sheet.get_by_role('tab',name='Receita',exact=True);receita.click()
    expect(receita).to_have_attribute('aria-selected','true',timeout=15000)
    diagnostics['receiptSelected']=True
    diagnostics['receiptAssertionStage']='document'
    evidence=panel.locator('[data-vault-h01-document-evidence]');expect(evidence).to_be_visible()
    diagnostics['receiptAssertionStage']='linkage'
    expect(evidence.get_by_text('Documento vinculado' if linked else 'Não localizado nos vínculos',exact=True)).to_be_visible()
    diagnostics['receiptAssertionStage']='disclaimer'
    expect(evidence.get_by_text('Vínculo documental não comprova validade atual.',exact=True)).to_be_visible()
    date_field=panel.get_by_text('Data da receita',exact=True).locator('xpath=../..')
    diagnostics['receiptAssertionStage']='date'
    expect(date_field.get_by_text(expected_date,exact=True)).to_be_visible()
    diagnostics['receiptAssertionStage']='details'
    expect(sheet.get_by_role('button',name='Abrir detalhes completos')).to_be_visible()
    sheet.get_by_role('button',name='Fechar Gaveta de medicamentos',exact=True).click();expect(sheet).not_to_be_visible(timeout=10000)
    diagnostics['result']='PASS'
    diagnostics['cardDocumentMarkersAfter']=c.locator('[data-vault-v34x-receita-documento]').count()
    print('H01_DRAWER_PASS',kind,'date='+expected_date,'linked='+str(linked),flush=True)



def guardian_declared(p,after,evidence,key):
    rows=q.TABLES['medicamentos']; original=list(rows)
    matrix=[('comum','CAD. COMUM','rgb(148, 163, 184)'),('branca','CAD. ESPECIAL','rgb(203, 213, 225)'),('azul','CAD. AZUL','rgb(96, 165, 250)'),('amarela','CAD. AMARELA','rgb(250, 204, 21)'),(None,'REG. PENDENTE','rgb(100, 116, 139)')]
    cases=[]
    for i,(declared,expected,color) in enumerate(matrix):
        name=f'QA SEM REFERENCIA ZZ {i+1}'; row=q.med(h.uid(3,800+i),q.PERSON_A,name)
        row.update(laboratorio_etiqueta='Laboratório QA',formato='comprimido',tipo_uso='continuo')
        if declared:row['tipo_receita']=declared
        rows.append(row);cases.append((name,declared,expected,color))
    try:
        p.goto(q.ORIGIN+'/saude/medicamentos');q.wait_nav(p);h.seed_fixture(p);seed_device(p)
        results={}
        for mode,label in [('compact','Compactos'),('comfort','Conforto')]:
            p.get_by_role('button',name=label,exact=True).click()
            result=[]
            for name,declared,expected,color in cases:
                c=h.card(p,name);expect(c).to_be_visible(timeout=45000)
                expect(c.locator(f'[data-vault-executive-density="{mode}"]')).to_be_visible()
                rail=c.get_by_role('button',name=re.compile('^Ver classificação da receita:'))
                expect(rail).to_be_visible();actual=rail.get_attribute('aria-label').split(': ',1)[1].upper();meaning=rail.get_attribute('aria-description') or ''
                record={'name':name,'declared':declared,'rail':actual,'meaning':meaning,'color':rail.evaluate('e=>getComputedStyle(e.parentElement).backgroundColor')}
                result.append(record)
                if after:
                    require(actual==expected,f'{name} rail {actual} != {expected}')
                    require(record['color']==color,f'{name} declared rail color {record["color"]} != {color}')
                    expect(c.locator('[data-vault-guardian-laboratory-badge] svg[data-vault-guardian-factory="true"]')).to_be_visible()
                    if declared:require('Cor da tarja: cadastro' in meaning,'declared color provenance absent')
                    bounds=rail.evaluate("e=>{const r=e.getBoundingClientRect(),t=e.querySelector('span[aria-hidden] > span').getBoundingClientRect();return t.top>=r.top-1&&t.bottom<=r.bottom+1}");require(bounds,'declared rail text clipped '+name)
                    require('fonte oficial' not in meaning.lower().replace('sem confirmação oficial',''),'unverified promoted')
                    if declared:
                        require('cadastro:' in meaning.lower() and 'sem confirmação oficial' in meaning.lower(),'declared provenance missing')
                        require(c.locator('[data-vault-h01-declaration]').count()==0,'duplicate declaration')
                    reg=c.locator('[data-vault-ux360-regulatory-label]');expect(reg).to_have_class('sr-only')
                if declared in ('azul','amarela') or declared is None:
                    c.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
                    p.screenshot(path=str(evidence/f'{key}-{mode}-declared-{declared or "unknown"}.png'),animations='disabled')
            results[mode]=result
        return results
    finally:
        rows[:]=original

FAB_MATRIX=[('Treino', 'sky'), ('Refeição', 'emerald'), ('Medicamento', 'emerald'), ('Tratamento', 'violet'), ('Renovação', 'violet'), ('Médico', 'sky'), ('Farmácia', 'emerald'), ('Hospital', 'emerald'), ('Posto / Local', 'emerald'), ('Exame', 'cyan'), ('Consulta', 'sky'), ('Cirurgia', 'violet'), ('CID', 'violet'), ('Sintoma / Medição', 'rose'), ('Vacinação', 'teal'), ('Procedimento', 'teal'), ('Hidratação', 'cyan'), ('Lembrete', 'amber'), ('Documento / Receita', 'violet'), ('Retirada', 'emerald'), ('Alergia / Reação', 'rose'), ('Dose rápida', 'emerald')]
def guardian_fab(p,after,evidence,key,navigate=True):
    if navigate:p.goto(q.ORIGIN+'/');q.wait_nav(p)
    # Navigation can mount under the real splash. Require its exit from DOM;
    # no force click, animation disabling or time advancement to hide a defect.
    splash=p.locator('[role="status"][aria-label="Abrindo o Vault"]')
    expect(splash).to_have_count(0,timeout=20000)
    fab=p.locator('[data-vault-home-compose] button[aria-label="Adicionar"]')
    expect(fab).to_be_visible(timeout=15000)
    fab.click()
    sheet=p.get_by_role('dialog',name='Adicionar novo registro');expect(sheet).to_be_visible(timeout=30000)
    buttons=sheet.locator('button');expect(buttons).to_have_count(len(FAB_MATRIX))
    data=buttons.evaluate_all("""nodes=>nodes.map(b=>{const i=b.querySelector('div.rounded-full'),s=i&&getComputedStyle(i);return {label:b.innerText.trim(),classes:i?.className||'',icon:!!i?.querySelector('svg'),color:s?.color,background:s?.backgroundColor,border:s?.borderColor,radius:s?.borderRadius}})""")
    require([r['label'] for r in data]==[x[0] for x in FAB_MATRIX],'FAB labels/order changed')
    for row,(_,tone) in zip(data,FAB_MATRIX):
        require(row['icon'] and 'rounded-full' in row['classes'] and 'border' in row['classes'],'FAB icon/ring missing '+row['label'])
        if after:
            require(all(x in row['classes'].split() for x in (f'bg-{tone}-400/10',f'text-{tone}-300',f'border-{tone}-400/25')),'FAB wrong semantic tone '+row['label'])
            require(row['background'] not in ('transparent','rgba(0, 0, 0, 0)') and row['border'] not in ('transparent','rgba(0, 0, 0, 0)'),'FAB computed color missing '+row['label'])
            require(row['radius'] and row['color'],'FAB computed icon missing '+row['label'])
    scroller=sheet.locator('.scrollbar-hide');scroller.evaluate('e=>e.scrollTop=0');p.screenshot(path=str(evidence/f'{key}-fab-top.png'),animations='disabled')
    scroller.evaluate('e=>e.scrollTop=e.scrollHeight');p.screenshot(path=str(evidence/f'{key}-fab-bottom.png'),animations='disabled')
    return data

def guardian_fab_controlled(p,browser,width,after,evidence,key,diagnostics):
    # The original frozen-date context is an explicit control. A failed splash
    # exit is evidence, not an excuse to force the click or claim it succeeded.
    p.goto(q.ORIGIN+'/');q.wait_nav(p)
    splash=p.locator('[role="status"][aria-label="Abrindo o Vault"]')
    try:
        expect(splash).to_have_count(0,timeout=10000)
    except AssertionError:
        require(splash.count()==1,'fixed-clock splash failure without the expected overlay')
        diagnostics['fixedClock']={'status':'BLOCKED_BY_SPLASH','present':True}
        p.screenshot(path=str(evidence/f'{key}-fixed-clock-splash.png'),animations='disabled')
    else:
        diagnostics['fixedClock']={'status':'PASS','matrix':guardian_fab(p,after,evidence,key+'-fixed-clock',navigate=False)}
    # Independent real clock; same viewport, authentication, fixture, authority
    # and list-to-home route. All 22 original checks still run, unchanged.
    real=q.new_context(browser,width)
    page=real.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)[:500]))
    try:
        q.login(page);h.seed_fixture(page)
        page.goto(q.ORIGIN+'/saude/medicamentos');q.wait_nav(page)
        expect(h.card(page,h.NAMES['normal'])).to_be_visible(timeout=45000)
        matrix=guardian_fab(page,after,evidence,key+'-real-clock')
        require(not errors,'real-clock FAB page errors '+str(errors))
        diagnostics['realClock']={'status':'PASS','matrix':matrix}
        diagnostics['classification']='FIXED_CONTEXT_BLOCKED_REAL_CLOCK_PASSED' if diagnostics['fixedClock']['status']=='BLOCKED_BY_SPLASH' else 'BOTH_PASS'
        print('H01_FAB_CLOCK_CONTROL',key,diagnostics['classification'],flush=True)
        return matrix
    except Exception as exc:
        diagnostics['realClock']={'status':'FAIL','error':str(exc)}
        try:page.screenshot(path=str(evidence/f'{key}-real-clock-failure.png'),animations='disabled')
        except Exception:pass
        raise
    finally:real.close()

# Baseline behavior and reference geometry are separate contracts. R4 is immutable.
# A historical drawer reset is retained as FAIL; it cannot certify behavior.
# Only a fully measured, otherwise clean R4 can serve as a geometry reference.
R4_SHA='5d76df41dfae7f2c3607eb18454aa5bf6fe64afd'

def reference_cells():
    return {(f'{width}-{authority}',str(scale),mode)
            for width in WIDTHS for authority in ('legacy','premium')
            for scale in (1,1.25) for mode in ('compact','comfort')}

def historical_drawer_reset(failure,diag,fixture):
    # Narrow exception for the observed historical defect, never the candidate.
    # The user's click really selected Receita, and the old UI later returned
    # to Ficha. No missing document, incorrect date or failed initial click is waived.
    if fixture not in ('zero','unit') or diag.get('expectedLinked') is not False:
        return False
    selectors={'document':'[data-vault-h01-document-evidence]',
               'linkage':'Não localizado nos vínculos',
               'disclaimer':'Vínculo documental não comprova validade atual.',
               'date':'Data da receita'}
    stage=diag.get('receiptAssertionStage')
    return (diag.get('result')=='FAIL' and diag.get('receiptSelected') is True
            and diag.get('selectedTabs')==['Ficha'] and diag.get('drawerDocumentTexts')==[]
            and diag.get('cardDocumentMarkersAtOpen')==0 and diag.get('cardDocumentMarkersAfter')==0
            and diag.get('indexedDB')=={'matching':[]} and 'diagnosticError' not in diag
            and stage in selectors and selectors[stage] in failure
            and '[data-vault-med360-sheet]' in failure and 'tabpanel' in failure
            and 'Actual value: None' in failure and 'element(s) not found' in failure
            and isinstance(diag.get('expectedDate'),str)
            and (stage!='date' or diag['expectedDate'] in failure))

def baseline_geometry_reference(report):
    import math
    errors=[]; known=[]; seen=set()
    failures=report.get('failures',{}); cases=report.get('cases',{})
    if report.get('phase')!='before' or report.get('sha')!=R4_SHA:
        errors.append('unexpected baseline identity')
    if report.get('status')!=('FAIL' if failures else 'PASS'):
        errors.append('inconsistent raw baseline status')
    expected=reference_cells()
    if set(cases)!={key for key,_,_ in expected}:
        errors.append('incomplete baseline cases')
    def finite(v):return type(v) in (int,float) and math.isfinite(v)
    for key,scale,mode in sorted(expected):
        data=cases.get(key,{}).get(scale,{}).get(mode,{})
        top=data.get('top',{}); cards=data.get('cards',{})
        if (not finite(top.get('first',{}).get('y')) or top.get('overflow') is not False
                or set(cards)!=set(h.NAMES)
                or any(not finite(c.get('card',{}).get('height')) or c['card']['height']<=0 for c in cards.values())):
            errors.append(f'missing or invalid geometry: {key}/{scale}/{mode}')
        else:seen.add((key,scale,mode))
    # Every original drawer assertion must have run; only the exact observed
    # old reset can be segregated from geometry, with its failure and screenshot retained.
    for key in sorted({key for key,_,_ in expected}):
        ds=cases.get(key,{}).get('drawer_diagnostics',{})
        for mode in ('compact','comfort'):
            for fixture in ('normal','zero','unit'):
                dk=f'{key}-{mode}-drawer-{fixture}'; diag=ds.get(dk,{})
                if dk in failures and historical_drawer_reset(failures[dk],diag,fixture):
                    known.append(dk)
                elif dk in failures or diag.get('result')!='PASS' or diag.get('receiptSelected') is not True:
                    errors.append('unresolved baseline drawer: '+dk)
    errors.extend('unclassified baseline failure: '+k for k in sorted(set(failures)-set(known)))
    return {'status':'FAIL' if errors else 'PASS','rawBehaviorStatus':report.get('status'),
            'geometryCells':len(seen),'requiredGeometryCells':len(expected),
            'historicalDrawerFailures':sorted(known),'errors':errors}

def main():
    global AUTH_MODE
    a=argparse.ArgumentParser();a.add_argument('--out',type=Path,required=True);a.add_argument('--evidence',type=Path,required=True);a.add_argument('--sha',required=True);a.add_argument('--phase',choices=['before','after'],required=True);a.add_argument('--baseline',type=Path);a.add_argument('--day',required=True);args=a.parse_args()
    after=args.phase=='after';q.ROOT=args.out.resolve();require((q.ROOT/'index.html').is_file(),'real export missing');args.evidence.mkdir(parents=True,exist_ok=True);fixture_rows=fixtures(args.day)
    require(bool(fixture_rows['normal'].get('data_receita')) and bool(fixture_rows['zero'].get('data_receita')) and not fixture_rows['unit'].get('data_receita'),'independent date fixture matrix invalid')
    baseline=json.loads(args.baseline.read_text()) if after else None
    if after:require(baseline['phase']=='before' and baseline['sha']=='5d76df41dfae7f2c3607eb18454aa5bf6fe64afd','certified R4 baseline required')
    reference=baseline_geometry_reference(baseline) if after else None
    reference_ready=after and reference['status']=='PASS' and baseline.get('geometryReference')==reference
    comparisons=set()
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
                                if scale==1:
                                    for fixture,linked in [('normal',True),('zero',False),('unit',False)]:
                                        drawer_key=f'{key}-{mode}-drawer-{fixture}'
                                        diagnostics=report['cases'][key].setdefault('drawer_diagnostics',{}).setdefault(drawer_key,{})
                                        try:check_sheet(p,fixture,fixture_rows[fixture],linked,diagnostics)
                                        except Exception as exc:
                                            report['failures'][drawer_key]=str(exc);print('H01_DRAWER_FAIL',key,mode,fixture,str(exc),flush=True)
                                            diagnostics['result']='FAIL'
                                            drawer=p.locator('[data-vault-med360-sheet]')
                                            # Diagnostic collection after the original failure; never overrides it.
                                            try:
                                                card=h.card(p,fixture_rows[fixture]['nome'])
                                                diagnostics['cardDocumentMarkersAfter']=card.locator('[data-vault-v34x-receita-documento]').count()
                                                diagnostics['drawerDocumentTexts']=drawer.locator('[data-vault-h01-document-evidence]').all_text_contents()
                                                diagnostics['selectedTabs']=drawer.locator('[role="tab"][aria-selected="true"]').all_text_contents()
                                                diagnostics['indexedDB']=p.evaluate('''async row=>{if(location.origin!=='http://127.0.0.1:8765')throw Error('nonlab');const db=await new Promise((res,rej)=>{const r=indexedDB.open('vault-db');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});try{const docs=await new Promise((res,rej)=>{const t=db.transaction('documents','readonly');const r=t.objectStore('documents').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return {matching:docs.filter(d=>d.user_id===row.user_id&&d.person_id===row.person_id&&d.type==='receita'&&(d.id===row.document_id||(d.entidade_tipo==='medicamento'&&d.entidade_id===row.id))).map(d=>d.id)}}finally{db.close()}}''', {k:fixture_rows[fixture].get(k) for k in ('id','document_id','user_id','person_id')})
                                                p.screenshot(path=str(args.evidence/f'{drawer_key}-failure.png'),animations='disabled')
                                            except Exception as diagnostic_error:diagnostics['diagnosticError']=str(diagnostic_error)
                                            print('H01_DRAWER_DIAGNOSTICS',drawer_key,json.dumps(diagnostics,ensure_ascii=False),flush=True)
                                            if drawer.is_visible():drawer.get_by_role('button',name='Fechar Gaveta de medicamentos',exact=True).click();expect(drawer).not_to_be_visible(timeout=10000)
                                top=top_geometry(p);data={'top':top,'cards':{}};result[mode]=data
                                p.screenshot(path=str(args.evidence/f'{key}-{scale}-{mode}-top.png'),animations='disabled')
                                if after:require(not top['overflow'],'viewport overflow')
                                for kind,name in h.NAMES.items():
                                    c=h.card(p,name);expect(c).to_be_visible(timeout=30000);c.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})");p.wait_for_timeout(100);g=inspect(c);data['cards'][kind]=g
                                    if scale==1 and kind in ('normal','ignored','review','long'):p.screenshot(path=str(args.evidence/f'{key}-{mode}-{kind}.png'),animations='disabled')
                                    try:
                                        check(kind,g,mode,True)
                                        if after:
                                            require(g['manufacturerBadge'] and g['manufacturerFactory'],'separate manufacturer Factory badge absent '+kind)
                                            if kind=='review':
                                                require(g['railColor']=='rgb(250, 204, 21)','review lost declared yellow identity '+repr(g['railColor']))
                                                require('REG. REVISÃO' in g['rail'].upper(),'review status hidden')
                                                require('Cor da tarja: cadastro' in g['regTitle'],'review color provenance absent')
                                            elif kind in ('normal','long','ignored','conflict'):
                                                require(g['railColor']=='rgb(203, 213, 225)','confirmed official control color changed '+kind+' '+repr(g['railColor']))
                                            elif kind in ('zero','unit','negative','sos','taken'):
                                                require(g['railColor']=='rgb(148, 163, 184)','confirmed ordinary prescription not gray '+kind+' '+repr(g['railColor']))
                                    except AssertionError as exc:report['failures'][f'{key}-{scale}-{mode}-{kind}']=str(exc);print('H01_CARD_FAIL',key,scale,mode,kind,str(exc),flush=True)
                                if reference_ready:
                                    b=baseline['cases'][key][k][mode];data['delta_first_y']=top['first']['y']-b['top']['first']['y'];data['delta_median']=statistics.median(g['card']['height'] for g in data['cards'].values())-statistics.median(g['card']['height'] for g in b['cards'].values());
                                    data['card_delta_px']={kind:round(g['card']['height']-b['cards'][kind]['card']['height'],2) for kind,g in data['cards'].items()}
                                    comparisons.add((key,k,mode))
                                    for ok,msg in [(data['delta_first_y']<=2,'header grew versus certified R4'),(data['delta_median']<=2,'median height grew versus certified R4'),(max(data['card_delta_px'].values())<=18*scale+2,'individual card grew beyond one text line versus certified R4')]:
                                        if not ok:report['failures'][f'{key}-{scale}-{mode}-{msg}']=msg;print('H01_GEOMETRY_FAIL',key,scale,mode,msg,flush=True)
                            for kind in ('normal','ignored','review','long'):
                                require(result['comfort']['cards'][kind]['card']['height']>result['compact']['cards'][kind]['card']['height']+4,'density not distinct '+kind)
                        scale_text(p,1);p.get_by_role('button',name='Compactos',exact=True).click();p.evaluate('window.scrollTo(0,0)');p.add_style_tag(content=':root { --vault-h01-safe-top:28px; } body { padding-top:28px!important; padding-bottom:20px!important; }');p.wait_for_timeout(150);p.evaluate('window.scrollTo(0,260)');p.wait_for_timeout(250);r=p.locator('.vault-h01-medications-header').bounding_box();require(abs(r['y']-28)<=3,'safe top overlap');p.screenshot(path=str(args.evidence/f'{key}-safe-area.png'),animations='disabled');require(not errors,'page errors '+str(errors))
                        if width in (320,430):report['cases'][key]['guardian_declared']=guardian_declared(p,after,args.evidence,key)
                        if authority=='legacy':
                            diagnostics=report['cases'][key].setdefault('fab_clock_control',{})
                            report['cases'][key]['guardian_fab']=guardian_fab_controlled(p,browser,width,after,args.evidence,key,diagnostics)
                        require(not errors,'page errors '+str(errors));print('H01_CASE_'+('FAIL' if any(z.startswith(key+'-') for z in report['failures']) else 'PASS'),key,flush=True)
                    except Exception as exc:
                        report['failures'][key]=str(exc);traceback.print_exc();print('H01_CASE_FAIL',key,str(exc),flush=True)
                        if ctx:
                            try:p.screenshot(path=str(args.evidence/f'{key}-failure.png'),animations='disabled')
                            except Exception:pass
                    finally:
                        if ctx:ctx.close()
            browser.close()
        if after:
            report['baselineReference']=reference
            report['comparisonCells']=[list(cell) for cell in sorted(comparisons)]
            if not reference_ready:report['failures']['baseline']='Baseline reference incomplete or inconsistent; certification blocked'
            if comparisons!=reference_cells():report['failures']['comparisonCoverage']='Incomplete R4 geometry comparison: '+str(len(comparisons))+'/32'
            print('H01_R4_COMPARISON',len(comparisons),'/',len(reference_cells()),flush=True)
        report['status']='FAIL' if report['failures'] else 'PASS'
        if not after:
            report['geometryReference']=baseline_geometry_reference(report)
            print('H01_R4_RAW_BEHAVIOR',report['status'],flush=True)
            print('H01_R4_GEOMETRY_REFERENCE',json.dumps(report['geometryReference'],ensure_ascii=False),flush=True)
    finally:
        server.shutdown();(args.evidence/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    # Before-phase exit certifies reference usability ONLY. Raw behavioral FAIL
    # and all original evidence are preserved. After-phase exit remains strict.
    if not after:return 0 if report['geometryReference']['status']=='PASS' else 1
    return 0 if report['status']=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
