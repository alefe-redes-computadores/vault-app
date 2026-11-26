#!/usr/bin/env python3
"""Public official file retrieval only. TLS verification mandatory; no DB access."""
import argparse, datetime, hashlib, json, os, pathlib, subprocess, urllib.parse
SOURCES={
'TA_CONSULTA_MEDICAMENTOS.CSV':('https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV','4c2ec4ab500dfd9b1d09bd2bb34ec42ec6d4cd96946bc0886360cb02a0c0655d'),
'TA_PRECOS_MEDICAMENTOS.csv':('https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv','610389fce31a7169f2251793eee856c7e8008cc946ae9b324706fa53a1107a7d'),
'TA_RESTRICAO_MEDICAMENTO.csv':('https://dados.anvisa.gov.br/dados/TA_RESTRICAO_MEDICAMENTO.csv','48590dceb6518874f9764f970dc2251b3f2529b57fd3f1a69ed4eee83c4522a8')}
SUPPLEMENTAL={
'DADOS_ABERTOS_MEDICAMENTOS.csv':'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
'Documentacao_e_Dicionario_de_Dados_MEDICAMENTOS.pdf':'https://dados.anvisa.gov.br/dados/Documentacao_e_Dicionario_de_Dados_MEDICAMENTOS.pdf',
'TA_PRECOS_MEDICAMENTOS-Dicionario.pdf':'https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS%20-%20Dicionario%20de%20Dados.pdf',
'Documentacao_e_Dicionario_Restricao_Medicamento_V1.pdf':'https://dados.anvisa.gov.br/dados/Documentacao_e_Dicionario_Restricao_Medicamento_V1.pdf'}
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def main():
 a=argparse.ArgumentParser();a.add_argument('output',type=pathlib.Path);a.add_argument('--historical-dir',type=pathlib.Path);a.add_argument('--supplemental',action='store_true');args=a.parse_args();out=args.output.resolve();out.mkdir(mode=0o700,parents=True,exist_ok=False)
 manifest={'status':'INCOMPLETE','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':[],'historical':[],'license':'Dados abertos oficiais; termos específicos de redistribuição ainda sujeitos a conferência. Não redistribuir arquivos brutos automaticamente.'}
 all_sources=dict(SOURCES)
 if args.supplemental:all_sources.update({name:(url,None) for name,url in SUPPLEMENTAL.items()})
 for name,(url,old) in all_sources.items():
  entry={'name':name,'url':url,'historicalVersionSHA256':old,'status':'FAILED'};manifest['sources'].append(entry)
  try:
   target=out/name;tmp=out/(name+'.part');headers=out/(name+'.headers')
   cmd=['curl','--disable','--proto','=https','--proto-redir','=https','--location','--fail','--silent','--show-error','--retry','2','--connect-timeout','20','--max-time','600','--max-filesize','300000000','--dump-header',str(headers),'--output',str(tmp),'--write-out','%{url_effective}',url]
   effective=subprocess.check_output(cmd,text=True).strip();u=urllib.parse.urlparse(effective)
   if u.scheme!='https' or u.hostname!='dados.anvisa.gov.br':raise ValueError('Destino efetivo não oficial')
   if not tmp.is_file() or not tmp.stat().st_size:raise ValueError('Fonte vazia')
   with tmp.open('rb') as f:first=f.read(512).lower()
   if b'<html' in first or b'<!doctype' in first:raise ValueError('Resposta HTML no lugar de CSV')
   digest=sha(tmp);tmp.rename(target);entry.update(status='DOWNLOADED',sha256=digest,bytes=target.stat().st_size,effectiveUrl=effective,changedSinceImported=digest!=old,headersSHA256=sha(headers))
  except Exception as e:entry['error']=str(e)
  if args.historical_dir and old:
   p=args.historical_dir/name
   manifest['historical'].append({'name':name,'expected':old,'found':p.is_file(),'sha256':sha(p) if p.is_file() else None,'exact':p.is_file() and sha(p)==old})
 manifest['status']='COMPLETE' if all(x['status']=='DOWNLOADED' for x in manifest['sources'] if x['name'] in SOURCES) else 'INCOMPLETE'
 manifest['supplementalStatus']='NOT_REQUESTED' if not args.supplemental else ('COMPLETE' if all(x['status']=='DOWNLOADED' for x in manifest['sources'] if x['name'] in SUPPLEMENTAL) else 'INCOMPLETE')
 (out/'SOURCE-MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('SOURCES='+manifest['status']);return 0 if manifest['status']=='COMPLETE' else 2
if __name__=='__main__':raise SystemExit(main())
