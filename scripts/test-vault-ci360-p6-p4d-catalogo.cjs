#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const r=require('../lib/medication-catalog/catalog-release-review-p4d.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const p=path.join(os.tmpdir(),'vault-catalog-p4d-fixtures-'+process.pid+'-'+Date.now());
fs.mkdirSync(p,{recursive:false,mode:0o700});
let passed=0;
function ok(label,fn){fn();passed++;console.log('✓ P4D '+String(passed).padStart(2,'0')+' '+label);}
async function check(label,fn){await fn();passed++;console.log('✓ P4D '+String(passed).padStart(2,'0')+' '+label);}
const url=r.ALLOWED_SOURCES.anvisa_consulta_medicamentos;
function manifest(baseline,candidate,config={}){
  const enc=config.encoding||'utf-8';
  const b=Buffer.isBuffer(baseline)?baseline:Buffer.from(baseline,enc==='windows-1252'?'latin1':'utf8');
  const c=Buffer.isBuffer(candidate)?candidate:Buffer.from(candidate,enc==='windows-1252'?'latin1':'utf8');
  fs.writeFileSync(path.join(p,'baseline.csv'),b);fs.writeFileSync(path.join(p,'candidate.csv'),c);
  return {schema_version:1,sources:[{
    source_key:'anvisa_consulta_medicamentos',source_url:url,delimiter:config.delimiter||';',encoding:enc,
    key_columns:config.key_columns||['id'],
    baseline:{file:'baseline.csv',sha256:sha(b),version:'v1',retrieved_at:'2026-11-17'},
    candidate:{file:'candidate.csv',sha256:sha(c),version:'v2',retrieved_at:'2026-11-18'},
  }]};
}
const basic='id;nome;valor\n1;Produto A;10\n2;Produto B;20\n3;Produto C;30\n';
const next='id;nome;valor\n1;Produto A;10\n2;Produto B;21\n3;Produto C;30\n4;Produto D;40\n';
async function run(){
  ok('fontes públicas únicas do importador original',()=>{assert.equal(Object.keys(r.ALLOWED_SOURCES).length,3);assert(url.startsWith('https://dados.anvisa.gov.br/'));});
  ok('dias reais aceitos, inválidos e absurdos negados',()=>{assert(r.safeDay('2024-02-29'));for(const x of ['2026-02-29','2026-11-31','2026-13-01','9999-99-99','2026-00-01','2026-11-18T15:00'])assert.equal(r.safeDay(x),false,x);});
  ok('manifesto rejeita domínio externo',()=>{let m=manifest(basic,next);m.sources[0].source_url='https://anvisa.gov.br.evil.test/';assert.throws(()=>r.validateManifest(m),/Fonte\/URL/);});
  ok('manifesto rejeita versão idêntica',()=>{let m=manifest(basic,next);m.sources[0].candidate.version='v1';assert.throws(()=>r.validateManifest(m),/versão igual/i);});
  ok('manifesto rejeita hash duplicado',()=>{let m=manifest(basic,next);m.sources[0].candidate.sha256=m.sources[0].baseline.sha256;assert.throws(()=>r.validateManifest(m),/idênticos/);});
  ok('manifesto rejeita datas futuras impossíveis',()=>{let m=manifest(basic,next);m.sources[0].candidate.retrieved_at='2026-02-31';assert.throws(()=>r.validateManifest(m),/Data de coleta/);});
  ok('manifesto rejeita data de coleta futura',()=>{let m=manifest(basic,next);m.sources[0].candidate.retrieved_at='2099-01-01';assert.throws(()=>r.validateManifest(m),/futuro/);});
  ok('manifesto rejeita caminho de traversal',()=>{let m=manifest(basic,next);m.sources[0].baseline.file='../.env';assert.throws(()=>r.validateManifest(m),/sem diretórios/);});
  ok('manifesto rejeita campo inesperado de execução',()=>{let m=manifest(basic,next);m.apply=true;assert.throws(()=>r.validateManifest(m),/Campo desconhecido/);});
  ok('manifesto rejeita origem repetida',()=>{let m=manifest(basic,next);m.sources.push({...m.sources[0]});assert.throws(()=>r.validateManifest(m),/Fonte duplicada/);});
  ok('manifesto rejeita chaves duplicadas',()=>{let m=manifest(basic,next);m.sources[0].key_columns=['id','id'];assert.throws(()=>r.validateManifest(m),/key_columns/);});
  ok('manifesto rejeita formato desconhecido',()=>{let m=manifest(basic,next);m.sources[0].encoding='ucs2';assert.throws(()=>r.validateManifest(m),/encoding/);});
  const m=manifest(basic,next);
  const old=await r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'base',m.sources[0].baseline.sha256);
  const newer=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'candidate',m.sources[0].candidate.sha256);
  ok('CSV mantém total e cabeçalho',()=>{assert.equal(old.rows,3);assert.equal(newer.rows,4);assert.deepEqual(old.headers,['id','nome','valor']);});
  const d=r.compareData(m.sources[0],old,newer);
  ok('diff incremental captura uma inclusão e uma alteração',()=>{assert.equal(d.added,1);assert.equal(d.changed,1);assert.equal(d.removed,0);assert.equal(d.unchanged,2);});
  ok('mudança >25% pede bloqueio para revisão',()=>{assert.equal(d.review_status,'blocked_for_review');assert(d.blockers.some(x=>x.includes('25%')));});
  const all=await r.reviewManifest(m,p);
  ok('dossiê tem autoridade explicitamente offline',()=>{assert.equal(all.phase,'OFFLINE_STAGING_ONLY');assert(!all.guardrails.database_writes);assert(all.guardrails.requires_live_catalog_reconciliation);assert.equal(all.coverage,'partial_source_set');});
  ok('texto não representa um deploy',()=>{const md=r.markdownReport(all);assert(md.includes('não é uma autorização para deploy'));assert(md.includes('Anvisa'));});
  await check('sha256 divergente bloqueia antes do relatório',async()=>{await assert.rejects(()=>r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'bad','0'.repeat(64)),/SHA256/);});
  await check('mudança de schema bloqueada',async()=>{
    const n=manifest(basic,'id;nome;extra\n1;A;N\n2;B;N\n');const a=await r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'schema-base',n.sources[0].baseline.sha256);const b=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'schema-candidate',n.sources[0].candidate.sha256);
    assert.throws(()=>r.compareData(n.sources[0],a,b),/colunas/);
  });
  await check('duplicação de chave detectada',async()=>{
    const n=manifest(basic,'id;nome;valor\n1;A;1\n1;B;2\n');await assert.rejects(()=>r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'duplicate',n.sources[0].candidate.sha256),/duplicada/);
  });
  await check('chave composta evita colisão',async()=>{
    const n=manifest('id;apresentacao;valor\n1;a;2\n1;b;2\n','id;apresentacao;valor\n1;a;2\n1;b;3\n',{key_columns:['id','apresentacao']});
    const x=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id','apresentacao'],'compound',n.sources[0].candidate.sha256);assert.equal(x.rows,2);
  });
  await check('aspas, delimitador e newline dentro do campo atravessando chunks',async()=>{
    const text='id;nome;valor\r\n1;"Produto; com ""aspas""\r\ne nome";10\r\n2;F;20\r\n';
    const n=manifest(basic,text);const parser=r.csvAccumulator(';',['id'],'chunked');
    for(const ch of text)parser.feed(ch);
    assert.equal(parser.finish().rows,2);
    const f=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'quoted',n.sources[0].candidate.sha256);assert.equal(f.rows,2);
  });
  await check('aspas não fechadas causam bloqueio',async()=>{const n=manifest(basic,'id;nome;valor\n1;"sem fechar;3\n');await assert.rejects(()=>r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'quote',n.sources[0].candidate.sha256),/aspas/);});
  await check('linha com coluna extra bloqueia',async()=>{const n=manifest(basic,'id;nome;valor\n1;A;2;extra\n');await assert.rejects(()=>r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'extra',n.sources[0].candidate.sha256),/colunas/);});
  await check('coluna-chave inexistente bloqueia',async()=>{const n=manifest(basic,next);await assert.rejects(()=>r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['registro'],'no-key',n.sources[0].candidate.sha256),/coluna-chave/);});
  await check('dados UTF-8 inválidos falham sem substituir caracteres',async()=>{
    const n=manifest(basic,Buffer.from([105,100,59,110,111,109,101,10,49,59,0xFF,10]));
    await assert.rejects(()=>r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'invalid-utf8',n.sources[0].candidate.sha256));
  });
  await check('CSV Windows-1252 mantém acentos reais',async()=>{
    const n=manifest('id;nome;valor\n1;São Paulo;10\n','id;nome;valor\n1;São Paulo;11\n',{encoding:'windows-1252'});
    const x=await r.inspectCsv(path.join(p,'candidate.csv'),'windows-1252',';',['id'],'w1252',n.sources[0].candidate.sha256);
    assert.equal(x.rows,1);assert.equal(x.bytes,fs.statSync(path.join(p,'candidate.csv')).size);
  });
  await check('removidos capturados e risco de exclusão',async()=>{
    const n=manifest(basic,'id;nome;valor\n1;Produto A;10\n2;Produto B;20\n');
    const b=await r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'b',n.sources[0].baseline.sha256);const c=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'c',n.sources[0].candidate.sha256);
    const diff=r.compareData(n.sources[0],b,c);assert.equal(diff.removed,1);assert(diff.blockers.some(x=>x.includes('2%')));
  });
  await check('ordem de linhas e colunas não vira mudança semântica',async()=>{
    const n=manifest('id;nome;valor\n1;A;2\n2;B;3\n','valor;id;nome\n3;2;B\n2;1;A\n');
    const b=await r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'b',n.sources[0].baseline.sha256);const c=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'c',n.sources[0].candidate.sha256);
    const diff=r.compareData(n.sources[0],b,c);assert.equal(diff.changed,0);assert.equal(diff.added,0);assert(diff.blockers.some(x=>x.includes('sem alterações lógicas')));
  });
  await check('diff conserva invariantes de linhas',async()=>{const n=manifest(basic,next);const a=await r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'a',n.sources[0].baseline.sha256);const b=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'b',n.sources[0].candidate.sha256);const d=r.compareData(n.sources[0],a,b);assert.equal(d.added+d.changed+d.unchanged,b.rows);assert.equal(d.removed+d.changed+d.unchanged,a.rows);});
  await check('diff baixo pode exigir revisão sem bloqueio',async()=>{
    const base=['id;nome;valor'];const newer=['id;nome;valor'];for(let i=0;i<50;i++){base.push(`${i};A;2`);newer.push(`${i};A;${i===2?3:2}`);}
    const n=manifest(base.join('\n')+'\n',newer.join('\n')+'\n');const b=await r.inspectCsv(path.join(p,'baseline.csv'),'utf-8',';',['id'],'b',n.sources[0].baseline.sha256);const c=await r.inspectCsv(path.join(p,'candidate.csv'),'utf-8',';',['id'],'c',n.sources[0].candidate.sha256);
    assert.equal(r.compareData(n.sources[0],b,c).review_status,'requires_human_review');
  });
  await check('CLI cria relatório seguro mas nunca aprova',async()=>{
    const base=['id;nome;valor'],candidate=['id;nome;valor'];for(let i=0;i<50;i++){base.push(`${i};A;2`);candidate.push(`${i};A;${i===2?3:2}`)}
    const n=manifest(base.join('\n')+'\n',candidate.join('\n')+'\n');
    const man=path.join(p,'manifest.json'),out=path.join(p,'review-1');fs.writeFileSync(man,JSON.stringify(n));
    const cli=path.join(__dirname,'medication-catalog/review-catalog-update-p4d.cjs');
    const run=spawnSync(process.execPath,[cli,'--manifest',man,'--out',out],{encoding:'utf8',timeout:20000});
    assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
    const approval=JSON.parse(fs.readFileSync(path.join(out,'REVIEW-NOT-APPROVAL.json'),'utf8'));
    assert.equal(approval.approved_for_production,false);
    assert.equal(approval.signed_off,false);
    assert(fs.readFileSync(path.join(out,'RELATORIO.md'),'utf8').includes('Somente análise'));
    const again=spawnSync(process.execPath,[cli,'--manifest',man,'--out',out],{encoding:'utf8',timeout:20000});assert.notEqual(again.status,0);
    const forbidden=spawnSync(process.execPath,[cli,'--apply'],{encoding:'utf8',timeout:20000});assert.notEqual(forbidden.status,0);
  });
  ok('sem dependências de banco/rede no motor',()=>{
    const text=fs.readFileSync(require.resolve('../lib/medication-catalog/catalog-release-review-p4d.cjs'),'utf8');
    for(const t of ['@supabase/','fetch(',".from('medication_",'db.medicamentos.put(','.insert(','.delete(','execFileSync(','process.env.SUPABASE','service_role','git push'])assert.equal(text.toLowerCase().includes(t.toLowerCase()),false,t);
  });
  const repo=path.resolve(__dirname,'..');const gate=path.join(repo,'scripts/test-v63-release-gate.mjs');
  if(fs.existsSync(gate))ok('contrato P4D único no gate V63',()=>{const s=fs.readFileSync(gate,'utf8');assert.equal(s.split('"scripts/test-vault-ci360-p6-p4d-catalogo.cjs"').length-1,1);assert(s.includes('"scripts/test-vault-ci360-p6-p4c-catalogo.cjs"'));});
  console.log('P4D: '+passed+' garantias comportamentais executadas, nenhum acesso ao banco');
}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>{try{fs.rmSync(p,{recursive:true,force:true})}catch{}});
