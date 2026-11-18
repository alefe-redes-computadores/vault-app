#!/usr/bin/env node
'use strict';
/** Never imports or promotes data. Only compares two local, user-supplied datasets. */
const fs=require('node:fs');
const path=require('node:path');
const {
  reviewManifest,markdownReport,
}=require('../../lib/medication-catalog/catalog-release-review-p4d.cjs');

async function main(argv){
  if(argv.length!==4||argv[0]!=='--manifest'||argv[2]!=='--out'){
    throw new Error('Uso: node scripts/medication-catalog/review-catalog-update-p4d.cjs --manifest CAMINHO.json --out DIRETORIO_NOVO');
  }
  const manifestPath=path.resolve(argv[1]);
  const out=path.resolve(argv[3]);
  const repo=path.resolve(__dirname,'../..');
  if(out===repo||out.startsWith(repo+path.sep))throw new Error('P4D_BLOQUEADA: saída não pode estar dentro do checkout');
  if(out===manifestPath)throw new Error('P4D_BLOQUEADA: saída não pode substituir o manifesto');
  const stat=await fs.promises.lstat(manifestPath);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256*1024)throw new Error('P4D_BLOQUEADA: manifesto inválido ou excessivo');
  const obj=JSON.parse(await fs.promises.readFile(manifestPath,'utf8'));
  const report=await reviewManifest(obj,path.dirname(manifestPath));
  // Output only after successful parse + hashing of all inputs.
  if(fs.existsSync(out))throw new Error('P4D_BLOQUEADA: diretório de saída já existe; não sobrescrever revisões anteriores');
  await fs.promises.mkdir(out,{recursive:false,mode:0o700});
  try{
    await fs.promises.writeFile(path.join(out,'REVIEW.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
    await fs.promises.writeFile(path.join(out,'RELATORIO.md'),markdownReport(report),{mode:0o600,flag:'wx'});
    await fs.promises.writeFile(path.join(out,'REVIEW-NOT-APPROVAL.json'),JSON.stringify({
      schema_version:1,meaning:'HUMAN REVIEW ONLY - NOT A DATABASE DEPLOY AUTHORIZATION',
      reviewed_by:'',reviewed_at:'',signed_off:false,approved_for_production:false,
      verified_live_database_version:false,source_authenticity_checked:false,
      notes:'Sem ferramenta de importação/promoção nesta cirurgia.',
    },null,2)+'\n',{mode:0o600,flag:'wx'});
    console.log('P4D_ETAPA_OFFLINE_CONCLUIDA: '+report.status);
    console.log('P4D_FONTES='+report.source_count);
    console.log('P4D_SEM_ESCRITA_NO_BANCO_SEM_PUBLICACAO');
    console.log('RELATORIO='+path.join(out,'RELATORIO.md'));
  }catch(error){
    await fs.promises.rm(out,{force:true,recursive:true});throw error;
  }
  if(report.status==='blocked_for_review')process.exitCode=3;
}
main(process.argv.slice(2)).catch(e=>{console.error(String(e.message||e));process.exitCode=2});
