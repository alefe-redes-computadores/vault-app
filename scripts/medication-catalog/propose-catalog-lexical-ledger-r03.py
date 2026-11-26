#!/usr/bin/env python3
"""Versioned proposal-only lexical stage. Never edits originals or connects to a DB."""
import argparse,base64,codecs,collections,csv,hashlib,io,json,pathlib,subprocess,tempfile,urllib.parse,sys
P=pathlib.Path(__file__).resolve().parent
ENC='cp1252'
csv.field_size_limit(64*1024*1024)
if not __debug__:raise SystemExit('Optimized mode forbidden')
def readj(p):return json.loads(p.read_text(encoding='utf-8'))
def detect_encoding(p):
 decoder=codecs.getincrementaldecoder('utf-8')('strict')
 try:
  with p.open('rb') as f:
   for chunk in iter(lambda:f.read(1024*1024),b''):decoder.decode(chunk)
  decoder.decode(b'',final=True);return 'utf-8'
 except UnicodeDecodeError:return 'cp1252'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()
def digest(b):return hashlib.sha256(b).hexdigest()
def strict(s):
 r=list(csv.reader(io.StringIO(s,newline=''),delimiter=';',quotechar='"',doublequote=True,strict=True))
 if len(r)!=1: raise ValueError('expected one logical record')
 return r[0]
def quote(s):return '"'+s.replace('"','""')+'"'
def body_end(s):
 for nl in ('\r\n','\n','\r'):
  if s.endswith(nl):return s[:-len(nl)],nl
 return s,''
# Locate the first target column using strict lexical rules, not split(';').
def prefix_boundary(s,n):
 pos=0
 for _ in range(n):
  start=pos
  if pos<len(s) and s[pos]=='"':
   pos+=1
   while pos<len(s):
    if s[pos]=='"':
     if pos+1<len(s) and s[pos+1]=='"':pos+=2;continue
     pos+=1;break
    pos+=1
   else:raise ValueError('unterminated prefix')
   if pos>=len(s) or s[pos]!=';':raise ValueError('invalid prefix quote')
  else:
   pos=s.find(';',pos)
   if pos<0:raise ValueError('missing prefix delimiter')
  # Independently confirm this one token is strict, including empty field.
  if len(strict(s[start:pos]+';'))!=2:raise ValueError('bad prefix token')
  pos+=1
 return pos

def proposals(raw,header,name,line):
 """Return candidates only for evidenced field-specific patterns. Never repair unknowns."""
 s,nl=body_end(raw)
 if '\n' in s or '\r' in s:return [] # Never infer boundaries of ambiguous multiline records.
 rules={'TA_CONSULTA_MEDICAMENTOS.CSV':'DS_REFERENCIA','TA_PRECOS_MEDICAMENTOS.csv':'DS_APRESENTACAO','TA_RESTRICAO_MEDICAMENTO.csv':'DS_CONCENTRACAO'}
 field=rules[name];idx=header.index(field)
 try: start=prefix_boundary(s,idx)
 except (ValueError,csv.Error):return []
 tail=s[start:];results=[]
 # Only the observed numeric HTML entity in the documented concentration field.
  # This is a review proposal, never a productive repair.
 if field=='DS_CONCENTRACAO':
  try:bad=strict(s)
  except (ValueError,csv.Error):return []
  if len(bad)!=len(header)+1 or bad[idx]!='&#8805' or not tail.startswith('&#8805;'):return []
  end=tail.find(';',len('&#8805;'))
  if end<0:return []
  values=[(end,tail[:end],'HTML_ENTITY_SEMICOLON')]
 elif field=='DS_APRESENTACAO':
  # Only the observed literal token "F" followed by whitespace, within a bare field.
  if not (tail.startswith('"F" ') or tail.startswith('"F"\t')):return []
  end=tail.find(';')
  if end<0:return []
  values=[(end,tail[:end],'LEADING_LITERAL_F_TOKEN')]
 else:
  if not tail.startswith('"'):return []
  values=[]
  # Enumerate possible end delimiters; no guessed boundary is accepted if ambiguous.
  for end,c in enumerate(tail):
   if c!=';' or end<2 or tail[end-1]!='"':continue
   inner=tail[1:end-1];i=0;decoded=[];literal=False
   while i<len(inner):
    if inner[i]=='"' and i+1<len(inner) and inner[i+1]=='"':decoded.append('"');i+=2;continue
    if inner[i]=='"':literal=True
    decoded.append(inner[i]);i+=1
   if literal:values.append((end,''.join(decoded),'QUOTED_FIELD_INTERNAL_LITERAL'))
 for end,value,rule in values:
  before=s[:start];after=tail[end:];new=before+quote(value)+after+nl
  try:
   fields=strict(new)
   if len(fields)!=len(header) or fields[idx]!=value:continue
   # Check unchanged prefix and suffix independently; no field dropped or truncated.
   if idx and strict(before[:-1]+';')[:-1]!=fields[:idx]:continue
   if strict(after[1:])!=fields[idx+1:]:continue
   if field=='DS_CONCENTRACAO' and fields!=bad[:idx]+[bad[idx]+';'+bad[idx+1]]+bad[idx+2:]:continue
  except (csv.Error,ValueError):continue
  results.append({'text':new,'field':field,'rule':rule,'fieldIndex':idx,'rawField':tail[:end],'interpretedField':value,'fields':fields})
 return results

class Tracker:
 def __init__(self,f):self.f=iter(f);self.parts=[];self.line=0;self.offset=0
 def __iter__(self):return self
 def __next__(self):
  s=next(self.f);self.parts.append(s);self.line+=1;self.offset+=len(s.encode(ENC));return s

def overlay(src,dst,header):
 global ENC
 name=src.name;ENC=detect_encoding(src)
 edits=[];unresolved=[];counts=collections.Counter();raw_h=hashlib.sha256();out_h=hashlib.sha256();reverse_h=hashlib.sha256();field_h=hashlib.sha256()
 with src.open('r',encoding=ENC,newline='') as fin,dst.open('xb') as fout:
  t=Tracker(fin)
  while True:
   t.parts=[];line=t.line+1;offset=t.offset;err=None;fields=None
   try:fields=next(csv.reader(t,delimiter=';',quotechar='"',doublequote=True,strict=True))
   except StopIteration:break
   except csv.Error as e:err=str(e)
   raw=''.join(t.parts);rb=raw.encode(ENC);raw_h.update(rb);new=raw;counts['inputAttempts']+=1
   if line==1:
    if err or fields!=header:raise ValueError('exact header mismatch '+name)
   elif err or (fields and len(fields)!=len(header)):
    choices=proposals(raw,header,name,line) if ((name=='TA_RESTRICAO_MEDICAMENTO.csv' and err is None) or (name!='TA_RESTRICAO_MEDICAMENTO.csv' and err and 'expected after' in err)) else []
    issue={'startLine':line,'endLine':t.line,'byteOffset':offset,'rawSHA256':digest(rb),'rawBase64':base64.b64encode(rb).decode(),'originalError':err or f'width={len(fields)} expected={len(header)}','candidateCount':len(choices)}
    if len(choices)==1:
     c=choices[0];new=c.pop('text');fields=c.pop('fields');issue.update(c);nb=new.encode(ENC);issue.update({'postSHA256':digest(nb),'postBase64':base64.b64encode(nb).decode(),'overlayOffset':fout.tell()});edits.append(issue);counts['proposedRepairs']+=1
    else:
     issue['candidateInterpretations']=[{k:v for k,v in c.items() if k!='text'} for c in choices];unresolved.append(issue);counts['unresolved']+=1
   if fields is not None and (line==1 or not fields or len(fields)==len(header)) and not (err and new==raw):
    field_h.update((json.dumps(fields,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8'));counts['parsedRecords']+=1
   nb=new.encode(ENC);fout.write(nb);out_h.update(nb)
   # Reverse the proposed single-record replacement exactly; unchanged bytes remain identical.
   reverse_h.update(base64.b64decode(edits[-1]['rawBase64']) if new!=raw else nb)
  counts['physicalLines']=t.line
  counts.setdefault('proposedRepairs',0)
 if raw_h.hexdigest()!=sha(src) or reverse_h.hexdigest()!=raw_h.hexdigest() or out_h.hexdigest()!=sha(dst) or reverse_from_disk(dst,edits)!=raw_h.hexdigest():raise ValueError('source/overlay/reversal hash mismatch '+name)
 return {'name':name,'encoding':ENC,'rawSHA256':raw_h.hexdigest(),'overlaySHA256':out_h.hexdigest(),'reversedSHA256':reverse_h.hexdigest(),'counts':dict(counts),'fieldDigest':field_h.hexdigest(),'editsSHA256':digest(json.dumps(edits,ensure_ascii=False,separators=(',',':')).encode('utf8')),'edits':edits,'unresolved':unresolved}

def reverse_from_disk(file,edits):
 h=hashlib.sha256()
 with file.open('rb') as f:
  for e in edits:
   remaining=e['overlayOffset']-f.tell()
   if remaining<0:raise ValueError('overlapping ledger')
   while remaining:
    b=f.read(min(remaining,1024*1024))
    if not b:raise ValueError('ledger offset outside overlay')
    h.update(b);remaining-=len(b)
   post=base64.b64decode(e['postBase64'],validate=True);raw=base64.b64decode(e['rawBase64'],validate=True)
   if f.read(len(post))!=post or digest(post)!=e['postSHA256'] or digest(raw)!=e['rawSHA256']:raise ValueError('ledger pre/post drift')
   h.update(raw)
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()

def independent(file):
 h=hashlib.sha256();records=0;header=None;widths=collections.Counter();blank=0
 with file.open('r',encoding=ENC,newline='') as f:
  for r in csv.reader(f,delimiter=';',quotechar='"',doublequote=True,strict=True):
   h.update((json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8'));records+=1
   if not r:blank+=1;continue
   if header is None:header=r;continue
   if len(r)!=len(header):raise ValueError('independent width mismatch')
   widths[len(r)]+=1
 return {'digest':h.hexdigest(),'records':records,'header':header,'widths':dict(widths),'blank':blank}


def require(ok,message):
 if not ok:raise ValueError(message)
def main():
 a=argparse.ArgumentParser();a.add_argument('raw_dir',type=pathlib.Path);a.add_argument('output',type=pathlib.Path);v=a.parse_args();raw=v.raw_dir.resolve();out=v.output.resolve();out.mkdir(mode=0o700,parents=True,exist_ok=False)
 contract=readj(P/'catalog-source-contract-r03.json');manifest=readj(raw/'SOURCE-MANIFEST.json');ledger={'mode':'FROZEN_LEXICAL_LEDGER_REVIEW_ONLY','publication':'LOCKED','schemaVersion':contract['schemaVersion'],'manifestSHA256':sha(raw/'SOURCE-MANIFEST.json'),'contractSHA256':sha(P/'catalog-source-contract-r03.json'),'sources':[]};require(manifest['status']=='COMPLETE' and manifest.get('supplementalStatus')=='COMPLETE','manifest incomplete');require(len(manifest['sources'])==len(contract['sources']) and {x['name'] for x in manifest['sources']}==set(contract['sources']),'manifest source set mismatch')
 for m in manifest['sources']:
  name=m['name'];expected=contract['sources'][name];url=urllib.parse.urlparse(m['effectiveUrl']);require(m['url']==expected['url'] and url.scheme=='https' and url.hostname=='dados.anvisa.gov.br' and not url.username and not url.password and m['status']=='DOWNLOADED','source origin mismatch '+name);p=raw/name;h=raw/(name+'.headers');require(p.is_file() and not p.is_symlink() and h.is_file() and not h.is_symlink() and p.stat().st_size==m['bytes'] and sha(p)==m['sha256'] and sha(h)==m['headersSHA256'],'source drift '+name)
 for name,c in contract['sources'].items():
  if c['header'] is None:continue
  dst=out/name;result=overlay(raw/name,dst,c['header']);ledger['sources'].append(result)
  if result['unresolved']:continue
  py=independent(dst);proc=subprocess.run(['node',str(P/'probe-catalog-csv-r03.cjs'),str(dst)],capture_output=True,text=True,check=True);js=json.loads(proc.stdout);result['python']=py;result['node']=js
  result['dualPass']=bool(js['valid'] and js['sha256']==result['overlaySHA256'] and js['digest']==py['digest']==result['fieldDigest'] and js['header']==py['header']==c['header'] and js['widths']=={str(k):v for k,v in py['widths'].items()} and js['stats']['records']==py['records']==result['counts']['parsedRecords'] and js['blank']==py['blank'] and js['invalid']==0 and js['syntaxError'] is None and js['good']+js['allEmpty']+js['blank']+1==py['records'] and result['reversedSHA256']==result['rawSHA256'])
  print('LEXICAL_REVIEW',name,'proposals='+str(len(result['edits'])),'dual='+str(result['dualPass']),flush=True)
 path=out/'FROZEN-LEXICAL-LEDGER.json';path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('LEDGER_SHA256='+sha(path));require(len(ledger['sources'])==3 and all(s.get('dualPass') and not s['unresolved'] for s in ledger['sources']),'unresolved source or dual divergence');print('REVIEW_ONLY; PUBLICATION=LOCKED')
if __name__=='__main__':
 try:main()
 except Exception as e:print('BLOCKED:',e,file=sys.stderr);raise SystemExit(3)
