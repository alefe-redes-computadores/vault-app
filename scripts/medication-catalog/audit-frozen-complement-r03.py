#!/usr/bin/env python3
"""Read-only supplemental evidence ledger. Never resolves codes from brand/name alone."""
import argparse,csv,hashlib,json,re,unicodedata
from collections import Counter,defaultdict
from pathlib import Path
FIELDS=['TIPO_PRODUTO','NOME_PRODUTO','DATA_FINALIZACAO_PROCESSO','CATEGORIA_REGULATORIA','NUMERO_REGISTRO_PRODUTO','DATA_VENCIMENTO_REGISTRO','NUMERO_PROCESSO','CLASSE_TERAPEUTICA','EMPRESA_DETENTORA_REGISTRO','SITUACAO_REGISTRO','PRINCIPIO_ATIVO']
def require(ok,msg):
    if not ok: raise ValueError(msg)
def norm(x):return ' '.join(unicodedata.normalize('NFC',str(x or '')).casefold().split())
def exact_identity(reg,name,manufacturer):
    reg=str(reg or '').strip(); name=norm(name); manufacturer=norm(manufacturer)
    return (reg,name,manufacturer) if re.fullmatch(r'[0-9]+',reg) and name and manufacturer else None
def owner(x):return re.sub(r'^\d{14}\s+-\s+','',str(x or ''))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load_index(p):
    ix=defaultdict(list); byreg=defaultdict(set); count=0
    with Path(p).open(encoding='cp1252',newline='') as f:
        rows=csv.reader(f,delimiter=';',strict=True);require(next(rows)==FIELDS,'supplement header changed')
        prev=rows.line_num
        for a in rows:
            line=prev+1;prev=rows.line_num;count+=1;require(len(a)==len(FIELDS),'invalid width at '+str(line))
            r=dict(zip(FIELDS,a));k=exact_identity(r['NUMERO_REGISTRO_PRODUTO'],r['NOME_PRODUTO'],owner(r['EMPRESA_DETENTORA_REGISTRO']))
            if k:
                ix[k].append({'line':line,'endLine':prev,'state':norm(r['SITUACAO_REGISTRO']),'ingredients':r['PRINCIPIO_ATIVO'],'process':r['NUMERO_PROCESSO'],'holder':r['EMPRESA_DETENTORA_REGISTRO']});byreg[k[0]].add(k)
    return ix,byreg,count
def assess(rows,active,known):
    if not rows:return {'status':'no_exact_identity','rows':0,'states':[],'texts':[],'witnessLines':[],'ingredientComparison':'not_established'}
    states=sorted({r['state'] for r in rows});texts=sorted({norm(r['ingredients']) for r in rows if norm(r['ingredients'])});expected='ativo' if active else 'inativo'
    status='exact_identity_consistent_state' if states==[expected] else 'exact_identity_state_conflict'
    if any(not norm(r['ingredients']) for r in rows) or len(texts)!=1: ingredient='missing_or_conflicting_text'
    elif len(known)==1 and texts[0]==norm(known[0]):ingredient='literal_agreement_single_known_name'
    elif len(known)>1:
        # Never interpret comma-separated raw text as a code mapping. Only compare an exact
        # already known set if no name contains the candidate delimiter.
        k=[norm(v) for v in known];text=texts[0];ingredient='not_established'
        for delim in [';',',','+','|']:
            if all(delim not in n for n in k) and sorted(norm(v) for v in text.split(delim))==sorted(k):ingredient='literal_set_agreement_only';break
    else:ingredient='text_evidence_only_no_code_assignment'
    return {'status':status,'rows':len(rows),'states':states,'texts':texts,'witnessLines':[r['line'] for r in rows],'ingredientComparison':ingredient}
def build(snap,report,ix,byreg):
    byp={x['productId']:x for x in report['existingReports']};require(len(byp)==len(snap['products']),'missing reports')
    assoc={x['productExternalId']:x for x in report['associationReports']};require(len(assoc)==len(report['associationReports']),'duplicate official identity')
    subs={x['id']:x for x in snap['substances']};links=defaultdict(list)
    for l in snap['links']:links[l['product_id']].append(l['substance_id'])
    additions=defaultdict(list)
    for l in report['proposedLinks']:additions[l['product_id']].append(l['substance_id'])
    result=[];counts=Counter();p_by_identity=defaultdict(list);p_by_reg=defaultdict(list)
    for p in snap['products']:
        k=exact_identity(p['registration_number'],p['product_name'],p['manufacturer']);before=links[p['id']];after=before+additions[p['id']]
        if k:p_by_identity[k].append(p['id']);p_by_reg[k[0]].append(p['id'])
        a=assess(ix.get(k,[]),p['active'],[subs[s]['canonical_name'] for s in after]);
        if k and not ix.get(k) and byreg.get(k[0]):a['status']='registration_match_identity_differs'
        group='active_unlinked_after' if p['active'] and not after else 'inactive_unlinked_after' if not after else 'active_linked_after' if p['active'] else 'inactive_linked_after'
        counts[(group,a['status'],a['ingredientComparison'])]+=1
        result.append({'productId':p['id'],'externalId':p['external_id'],'name':p['product_name'],'registration':p['registration_number'],'manufacturer':p['manufacturer'],'active':p['active'],'linksBefore':len(before),'linksSimulated':len(after),'originalClassification':byp[p['id']]['status'],**a})
    unmatched=[]
    for p in report['unmatchedOfficialProducts']:
        k=exact_identity(p['registrationNumber'],p['name'],p['manufacturer']);a=assess(ix.get(k,[]),p['active'],[])
        unmatched.append({'externalId':p['externalId'],'name':p['name'],'registration':p['registrationNumber'],'active':p['active'],'sameStableIdentityCandidates':p_by_identity.get(k,[]),'sameRegistrationCandidates':p_by_reg.get(k[0],[]) if k else [],**a})
    historical=defaultdict(set);bycode=defaultdict(set);byn=defaultdict(set)
    for s in snap['substances']:
        if s['external_id']:bycode[s['external_id']].add(s['id'])
        byn[norm(s['canonical_name'])].add(s['id'])
    for l in snap['links']:
        if l.get('external_substance_id'):historical[l['external_substance_id']].add(l['substance_id'])
    missing=[{**s,'sameLiteralNameIds':sorted(byn[norm(s['canonicalName'])]),'historicalCodeOwners':sorted(historical[s['externalId']]),'existingCodeOwners':sorted(bycode[s['externalId']]),'status':'REVIEW_ONLY_NO_CREATION'} for s in report['unmatchedOfficialSubstances']]
    return {'products':result,'unmatchedProducts':unmatched,'unmatchedSubstances':missing,'counts':[{'group':a,'identity':b,'ingredients':c,'count':n} for (a,b,c),n in sorted(counts.items())]}
def main():
    p=argparse.ArgumentParser();p.add_argument('raw');p.add_argument('snapshot');p.add_argument('report');p.add_argument('output');p.add_argument('--expected-source-sha',required=True);p.add_argument('--expected-snapshot-sha',required=True);p.add_argument('--expected-report-sha',required=True);a=p.parse_args()
    for f,h in [(a.raw,a.expected_source_sha),(a.snapshot,a.expected_snapshot_sha),(a.report,a.expected_report_sha)]:require(sha(f)==h,'input hash mismatch '+str(f))
    snap=json.loads(Path(a.snapshot).read_text());report=json.loads(Path(a.report).read_text());require(report['publication']=='LOCKED' and report['productionWrites']==0 and report['reviewPlan']['beforeSHA256']==snap['manifest']['sha256'],'unbound input')
    ix,byreg,n=load_index(a.raw);out=build(snap['snapshot'],report,ix,byreg);out['mode']='SUPPLEMENTAL_REVIEW_ONLY';out['publication']='LOCKED';out['productionWrites']=0;out['sourceSHA256']=a.expected_source_sha;out['snapshotFileSHA256']=a.expected_snapshot_sha;out['reportFileSHA256']=a.expected_report_sha;out['sourceRecords']=n;out['sourceIdentityCount']=len(ix)
    with Path(a.output).open('x',encoding='utf8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
    print(json.dumps({k:len(out[k]) for k in ['products','unmatchedProducts','unmatchedSubstances']}|{'sourceRecords':n,'sourceIdentityCount':len(ix),'publication':'LOCKED'},ensure_ascii=False))
if __name__=='__main__':main()
