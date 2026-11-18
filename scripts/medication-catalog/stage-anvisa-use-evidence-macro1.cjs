#!/usr/bin/env node
'use strict';
/** Preparação OFFLINE para revisão humana. NÃO conecta ao Supabase, NÃO aprova. */
const fs=require('node:fs');const crypto=require('node:crypto');const path=require('node:path');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds=new Set(['food_relation','fasting','drowsiness','refrigeration','light_protection','after_open','administration_route']);
const day=/^\d{4}-\d{2}-\d{2}$/;
const error=(m)=>{throw Error('MACRO1 STAGING: '+m)};
function officialUrl(v){try{const u=new URL(v);const h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(h==='anvisa.gov.br'||h.endsWith('.anvisa.gov.br')||h==='www.gov.br'&&u.pathname.startsWith('/anvisa/'));}catch{return false;}}
function validDay(v){return typeof v==='string'&&day.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
const txt=(v,max,min=1)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
function prepare(input){
 if(!input||typeof input!=='object'||!Array.isArray(input.facts))error('entrada inválida');
 const source=input.source;
 if(!source||!officialUrl(source.url)||!txt(source.version,100,2)||!validDay(source.reviewed_at)||
   !/^[0-9a-f]{64}$/i.test(source.sha256||''))error('fonte, versão, SHA256 ou data inválida');
 if(input.facts.length>500)error('lote grande demais: dividir e revisar');
 const seen=new Set();const prepared=[];
 for(const [i,row] of input.facts.entries()){
  if(!uuid.test(row.product_id)||row.presentation_id!=null&&!uuid.test(row.presentation_id))error('ID de produto/apresentação inválido na linha '+i);
  if(!kinds.has(row.fact_kind)||!txt(row.statement,520,8)||!txt(row.source_section,180,2)||
    (row.qualification!=null&&!txt(row.qualification,320,1)))error('fato não auditável na linha '+i);
  if(row.presentation_id!=null&&!row.presentation_product_verified)error('apresentação sem prova de pertencer ao produto: linha '+i);
  const key=[row.product_id,row.presentation_id||'',row.fact_kind,row.source_section].join(':');
  if(seen.has(key))error('duplicidade na entrada '+i);seen.add(key);
  prepared.push({product_id:row.product_id,presentation_id:row.presentation_id||null,fact_kind:row.fact_kind,
   statement:row.statement.trim(),qualification:row.qualification?.trim()||null,
   source_url:source.url,source_section:row.source_section.trim(),source_document_sha256:source.sha256.toLowerCase(),
   source_version:source.version,source_published_at:validDay(source.published_at)?source.published_at:null,
   reviewed_at:source.reviewed_at,effective_from:validDay(row.effective_from)?row.effective_from:null,
   effective_until:validDay(row.effective_until)?row.effective_until:null,review_status:'draft'});
 }
 return {version:1,status:'PENDENTE_REVISAO_HUMANA',source,rows:prepared,limitations:[
  'Nenhum fato foi aprovado nem importado no Supabase.',
  'A comprovação de correspondência produto/apresentação exige consulta ao catálogo e à bula original.',
  'Não assumir que ausência de indicação significa segurança de uso, conservação ou interação.']};
}
function main(){const args=process.argv.slice(2);
 if(args.length!==6||args[0]!=='--input'||args[2]!=='--document'||args[4]!=='--output')error('uso: node stage-anvisa-use-evidence-macro1.cjs --input FONTE.json --document BULA.pdf --output REVISAO.json');
 const input=JSON.parse(fs.readFileSync(args[1],'utf8'));
 const stat=fs.statSync(args[3]);if(!stat.isFile()||stat.size>20*1024*1024||stat.size<10)error('PDF de origem ausente, inválido ou muito grande');
 const document=fs.readFileSync(args[3]);
 if(document.subarray(0,5).toString()!=='%PDF-')error('documento de origem deve ser PDF completo');
 const actualSha=crypto.createHash('sha256').update(document).digest('hex');
 if(input?.source?.sha256?.toLowerCase()!==actualSha)error('hash da fonte PDF não coincide com manifesto; não há prova de origem');
 const out=prepare(input),outpath=path.resolve(args[5]);
 if(path.resolve(args[1])===outpath||path.resolve(args[3])===outpath)error('não sobrescrever fonte');
 if(fs.existsSync(outpath))error('arquivo de saída já existe');
 const content=JSON.stringify(out,null,2)+'\n';
 fs.mkdirSync(path.dirname(outpath),{recursive:true});fs.writeFileSync(outpath,content,{flag:'wx',mode:0o600});
 console.log('MACRO1 STAGING: '+out.rows.length+' registros PENDENTES; zero envios; SHA256='+crypto.createHash('sha256').update(content).digest('hex'));
}
if(require.main===module)try{main()}catch(e){console.error(e.message);process.exitCode=2;}
module.exports={prepare,officialUrl,validDay};
