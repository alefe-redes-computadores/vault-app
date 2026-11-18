'use strict';
/**
 * P4-D: offline, read-only comparison of Anvisa CSV snapshots.
 * This library does NOT connect to Supabase, fetch URLs, approve releases,
 * write into the repository, interpret drugs, or change any clinical record.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');

const ALLOWED_SOURCES = Object.freeze({
  anvisa_consulta_medicamentos: 'https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV',
  anvisa_precos_medicamentos: 'https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv',
  anvisa_restricao_medicamento: 'https://dados.anvisa.gov.br/dados/TA_RESTRICAO_MEDICAMENTO.csv',
});
const SHA256 = /^[a-f0-9]{64}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const LIMIT_BYTES = 512 * 1024 * 1024;
const LIMIT_ROWS = 1250000;
const MAX_FIELD_CHARS = 100000;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error('P4D_BLOQUEADA: ' + message); };
const safeDay = day => {
  if(typeof day!=='string'||!DATE.test(day))return false;
  const parsed=Date.parse(day+'T12:00:00Z');
  return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===day;
};
const percent = (number, denom) => denom ? Math.round(number / denom * 10000) / 100 : 0;

function validateManifest(obj) {
  if(!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.schema_version !== 1) fail('schema_version deve ser 1');
  if(!Array.isArray(obj.sources) || obj.sources.length < 1 || obj.sources.length > 3) fail('sources deve conter de 1 a 3 fontes');
  if(Object.keys(obj).some(k=>!['schema_version','sources','note'].includes(k))) fail('Campo desconhecido no manifesto');
  const seen=new Set();
  return obj.sources.map((s,position)=>{
    if(!s || typeof s!=='object' || Array.isArray(s)) fail('Fonte malformada na posição '+position);
    const allowed=['source_key','source_url','delimiter','encoding','key_columns','baseline','candidate'];
    if(Object.keys(s).some(k=>!allowed.includes(k))) fail('Campo inesperado na fonte '+position);
    if(!Object.hasOwn(ALLOWED_SOURCES,s.source_key)||s.source_url!==ALLOWED_SOURCES[s.source_key]) fail('Fonte/URL não coincide com fonte Anvisa permitida');
    if(seen.has(s.source_key)) fail('Fonte duplicada: '+s.source_key); seen.add(s.source_key);
    if(![';',',','|','\t'].includes(s.delimiter)) fail('Delimitador não autorizado: '+s.source_key);
    if(!['utf-8','windows-1252'].includes(s.encoding)) fail('Informe encoding utf-8 ou windows-1252');
    if(!Array.isArray(s.key_columns)||s.key_columns.length<1||s.key_columns.length>8||
       new Set(s.key_columns).size!==s.key_columns.length||
       s.key_columns.some(k=>typeof k!=='string'||!/^[^\r\n\x00-\x1f]{1,100}$/.test(k))) fail('key_columns inválidas/duplicadas');
    for(const type of ['baseline','candidate']){
      const x=s[type];
      if(!x || typeof x!=='object' || Array.isArray(x)||Object.keys(x).some(k=>!['file','sha256','version','retrieved_at'].includes(k))) fail(type+' inválido');
      if(typeof x.file!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,149}$/.test(x.file)||x.file==='.'||x.file==='..') fail(type+' precisa de arquivo local sem diretórios');
      if(typeof x.sha256!=='string'||!SHA256.test(x.sha256)) fail('SHA256 de '+type+' inválido');
      if(typeof x.version!=='string'||!VERSION.test(x.version)) fail('Versão de '+type+' inválida');
      if(!safeDay(x.retrieved_at)) fail('Data de coleta '+type+' impossível');
    }
    if(s.baseline.file===s.candidate.file) fail('Arquivos de base/candidata precisam ser diferentes');
    if(s.baseline.sha256.toLowerCase()===s.candidate.sha256.toLowerCase()) fail('Arquivos idênticos não configuram atualização');
    if(s.baseline.version===s.candidate.version) fail('Mudança de conteúdo com versão igual; revisar nomenclatura da fonte');
    if(s.candidate.retrieved_at < s.baseline.retrieved_at) fail('Data candidata anterior à base');
    const today=new Date().toISOString().slice(0,10);
    if(s.candidate.retrieved_at>today||s.baseline.retrieved_at>today)fail('Data de coleta no futuro; não é comprovante de origem');
    return s;
  });
}

/** Strict streaming parser: bounded fields, proper escaped quotes and CRLF across chunks. */
function csvAccumulator(delimiter, keyColumns, label) {
  let state='start',skipLF=false,first=true,field='',record=[],headers=null,indices=[],rowCount=0;
  const map=new Map();
  const putField=()=>{
    record.push(field);field='';state='start';
    if(record.length>260)fail(label+': mais de 260 colunas');
  };
  const putRecord=()=>{
    putField();
    if(record.length===1 && record[0].trim()===''){record=[];return;}
    if(!headers){
      headers=record.map(x=>x.trim().replace(/^\uFEFF/,''));
      if(headers.length<2 || headers.some(x=>!x)||new Set(headers).size!==headers.length)fail(label+': cabeçalhos ausentes/duplicados');
      indices=keyColumns.map(x=>{
        const i=headers.indexOf(x);if(i===-1)fail(label+': coluna-chave não encontrada: '+x);return i;
      });
    }else{
      if(record.length!==headers.length)fail(label+': linha com quantidade distinta de colunas perto de '+(rowCount+2));
      rowCount++;if(rowCount>LIMIT_ROWS)fail(label+': limite de linhas excedido');
      const parts=indices.map(i=>record[i].trim());
      if(parts.some(x=>!x))fail(label+': chave composta incompleta na linha '+rowCount);
      const key=sha(JSON.stringify(parts));
      if(map.has(key))fail(label+': chave composta duplicada; refine key_columns (linha '+rowCount+')');
      const normalized=Object.fromEntries(headers.map((h,i)=>[h,record[i].trim()]));
      const canonical=Object.keys(normalized).sort().map(k=>[k,normalized[k]]);
      map.set(key,sha(JSON.stringify(canonical)));
    }
    record=[];
  };
  const append=c=>{field+=c;if(field.length>MAX_FIELD_CHARS)fail(label+': campo CSV excessivamente longo');};
  const feed=text=>{
    for(let i=0;i<text.length;i++){
      let c=text[i];
      if(first){first=false;if(c==='\uFEFF')continue;}
      if(skipLF){skipLF=false;if(c==='\n')continue;}
      if(state==='quoted'){
        if(c==='"')state='afterquote';else append(c==='\r'?'\n':c);
      }else if(state==='afterquote'){
        if(c==='"'){append('"');state='quoted';}
        else if(c===delimiter)putField();
        else if(c==='\r'||c==='\n'){putRecord();if(c==='\r')skipLF=true;}
        else if(c===' '||c==='\t'){} // non-data whitespace after closing quote
        else fail(label+': caracteres inesperados depois de aspas CSV');
      }else if(c===delimiter)putField();
      else if(c==='\r'||c==='\n'){putRecord();if(c==='\r')skipLF=true;}
      else if(c==='"'){
        if(state==='start'&&!field.length)state='quoted';else fail(label+': aspas em campo não citado');
      }else{append(c);state='unquoted';}
    }
  };
  const finish=()=>{
    if(state==='quoted')fail(label+': CSV termina com aspas não fechadas');
    if(field.length||record.length||state==='afterquote')putRecord();
    if(!headers||rowCount===0)fail(label+': cabeçalho ou dados ausentes');
    return {headers,rows:rowCount,map};
  };
  return {feed,finish};
}

async function inspectCsv(file,encoding,delimiter,keyColumns,label,expectedHash){
  const meta=await fs.promises.lstat(file);
  if(!meta.isFile()||meta.isSymbolicLink()||meta.size<5||meta.size>LIMIT_BYTES)fail(label+': arquivo inválido ou acima de 512 MB');
  const digest=crypto.createHash('sha256');
  const decoder=new TextDecoder(encoding,{fatal:encoding==='utf-8'});
  const csv=csvAccumulator(delimiter,keyColumns,label);
  let read=0;
  for await(const chunk of fs.createReadStream(file,{highWaterMark:128*1024})){
    read+=chunk.length;if(read>LIMIT_BYTES)fail(label+': tamanho aumentou durante leitura');
    digest.update(chunk);csv.feed(decoder.decode(chunk,{stream:true}));
  }
  csv.feed(decoder.decode());
  const observed=digest.digest('hex');
  if(observed!==expectedHash.toLowerCase())fail(label+': SHA256 não coincide com manifesto (substituição ou origem incorreta)');
  const end=csv.finish();
  if(read!==meta.size)fail(label+': tamanho mudou durante leitura');
  return { ...end, bytes:read, sha256:observed };
}

function compareData(source,baseline,candidate){
  const b=new Set(baseline.headers),c=new Set(candidate.headers);
  if(b.size!==c.size||[...b].some(h=>!c.has(h)))fail(source.source_key+': mudanças de colunas exigem revisão de esquema antes do diff');
  let added=0,removed=0,changed=0,unchanged=0;
  const samples={added:[],removed:[],changed:[]};
  for(const [id,fingerprint] of candidate.map){
    if(!baseline.map.has(id)){added++;if(samples.added.length<5)samples.added.push(id);}
    else if(baseline.map.get(id)!==fingerprint){changed++;if(samples.changed.length<5)samples.changed.push(id);}
    else unchanged++;
  }
  for(const id of baseline.map.keys())if(!candidate.map.has(id)){removed++;if(samples.removed.length<5)samples.removed.push(id);}
  const drift={added_pct:percent(added,baseline.rows),removed_pct:percent(removed,baseline.rows),changed_pct:percent(changed,baseline.rows),total_drop_pct:percent(Math.max(0,baseline.rows-candidate.rows),baseline.rows)};
  const blockers=[];
  if(drift.removed_pct>2)blockers.push('Mais de 2% de chaves desapareceram');
  if(drift.changed_pct>25)blockers.push('Mais de 25% das linhas existentes mudaram');
  if(drift.total_drop_pct>3)blockers.push('Redução de volume maior que 3%');
  if(added===0&&removed===0&&changed===0)blockers.push('Conteúdo sem alterações lógicas; verificar versão e bytes');
  return {source_key:source.source_key,source_url:source.source_url,baseline:{version:source.baseline.version,retrieved_at:source.baseline.retrieved_at,sha256:baseline.sha256,rows:baseline.rows,bytes:baseline.bytes},candidate:{version:source.candidate.version,retrieved_at:source.candidate.retrieved_at,sha256:candidate.sha256,rows:candidate.rows,bytes:candidate.bytes},identity_columns:source.key_columns,columns:baseline.headers.length,added,removed,changed,unchanged,drift,samples,blockers,review_status:blockers.length?'blocked_for_review':'requires_human_review'};
}

async function reviewManifest(obj,manifestDirectory){
  const sources=validateManifest(obj);
  const rows=[];
  for(const source of sources){
    const base=path.join(manifestDirectory,source.baseline.file);
    const next=path.join(manifestDirectory,source.candidate.file);
    const old=await inspectCsv(base,source.encoding,source.delimiter,source.key_columns,source.source_key+' baseline',source.baseline.sha256);
    const candidate=await inspectCsv(next,source.encoding,source.delimiter,source.key_columns,source.source_key+' candidate',source.candidate.sha256);
    rows.push(compareData(source,old,candidate));
  }
  const blockers=rows.flatMap(x=>x.blockers.map(b=>x.source_key+': '+b));
  const status=blockers.length?'blocked_for_review':'requires_human_review';
  return {schema_version:1,phase:'OFFLINE_STAGING_ONLY',source_count:rows.length,coverage:rows.length===Object.keys(ALLOWED_SOURCES).length?'three_sources_supplied':'partial_source_set',status,blockers,results:rows,guardrails:{database_writes:false,automatic_approval:false,production_equivalence_proven:false,source_retrieval_dates_are_not_official_validity:true,requires_live_catalog_reconciliation:true,requires_dba_review:true}};
}

function markdownReport(report){
  const lines=['# VAULT — Revisão offline de atualização do catálogo','',`**Situação:** ${report.status} · **Escopo:** ${report.coverage}`, '',
    '**Somente análise:** nenhuma tabela, medicamento, dose, receita, estoque ou fonte online foi alterada.','',
    'Os arquivos foram fornecidos localmente. SHA256 confirma a identidade dos bytes entregues, **não a autenticidade de quem os forneceu**. Datas de coleta não comprovam vigência regulatória.','',
    '| Fonte | Base | Candidata | Adições | Remoções | Alterações | Inalteradas | Estado |', '|---|---:|---:|---:|---:|---:|---:|---|'];
  for(const r of report.results)lines.push(`| ${r.source_key} | ${r.baseline.rows} | ${r.candidate.rows} | ${r.added} | ${r.removed} | ${r.changed} | ${r.unchanged} | ${r.review_status} |`);
  lines.push('','## Pontos para revisão');
  if(!report.blockers.length)lines.push('Nenhum limiar de anomalia foi ultrapassado. **Ainda exige revisão e aprovação humanas.**');
  for(const b of report.blockers)lines.push('- '+b);
  lines.push('','## Checklist obrigatório para decisão humana','',
    '- [ ] Confirmar que os arquivos realmente vieram da URL da fonte oficial, com data de coleta e registro de integridade',
    '- [ ] Conferir os cabeçalhos/identificadores reais e suas relações entre produtos, substâncias e apresentações',
    '- [ ] Conferir versão ativa real do Supabase e conciliar com o arquivo de base',
    '- [ ] Investigar todas as remoções, especialmente registros antigos/históricos e apresentações',
    '- [ ] Auditar regras regulatórias condicionais, períodos e ausência de inferência entre apresentações',
    '- [ ] Simular importação apenas em ambiente de homologação isolado, testar RLS e invariantes',
    '- [ ] Obter autorização independente para migração/promoção e planejar rollback de banco',
    '- [ ] Validar interpretação pública no sistema oficial da Anvisa para casos sensíveis',
    '', '## Segurança','',
    'Este relatório **não é uma autorização para deploy**. O arquivo REVIEW-NOT-APPROVAL.json é apenas um formulário de conferência; não há comando de publicação do catálogo nesta cirurgia.','');
  return lines.join('\n');
}

module.exports={ALLOWED_SOURCES,validateManifest,inspectCsv,compareData,reviewManifest,markdownReport,csvAccumulator,safeDay};
