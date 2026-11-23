#!/usr/bin/env node
'use strict';
/** Prepare semantic version metadata BEFORE a new build. No network, Git or automatic commit. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const version=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const files=['package.json','package-lock.json','lib/app-version.ts','CHANGELOG.md','README.md'];
const sem=v=>{if(!version.test(v))throw Error('VAULT_VERSION_STOP: semver inválido');return v.split('.').map(Number)};
function consistency(pkg,lock,app){
  if(pkg.version!==lock.version || pkg.version!==lock.packages?.['']?.version ||
     !app.includes(`APP_VERSION = "${pkg.version}"`)) throw Error('VAULT_VERSION_STOP: fontes divergentes');
  return pkg.version;
}
function kind(from,to){const a=sem(from),b=sem(to);
  if(b[0]===a[0]+1 && b[1]===0 && b[2]===0)return 'major';
  if(b[0]===a[0] && b[1]===a[1]+1 && b[2]===0)return 'minor';
  if(b[0]===a[0] && b[1]===a[1] && b[2]===a[2]+1)return 'patch';
  throw Error('VAULT_VERSION_STOP: avanço deve ser patch/minor/major único e sem downgrade');
}
function notes(raw){const n=JSON.parse(raw);const groups=['novidades','melhorias','correcoes','seguranca'];
  if(!n || typeof n!=='object')throw Error('VAULT_VERSION_STOP: notas JSON ausentes');
  if(groups.every(g=>!Array.isArray(n[g]) || n[g].length===0)) throw Error('VAULT_VERSION_STOP: notas reais obrigatórias');
  let out='';const titles={novidades:'Novidades',melhorias:'Melhorias',correcoes:'Correções',seguranca:'Segurança'};
  for(const g of groups){let entries=n[g]??[];if(!Array.isArray(entries)||entries.length>100)throw Error('VAULT_VERSION_STOP: seção de notas inválida');
    if(entries.length){out+=`\n### ${titles[g]}\n`;
      for(const e of entries){if(typeof e!=='string'||e.trim().length<8||e.length>300||/[\r\n]/.test(e))throw Error('VAULT_VERSION_STOP: novidade inválida');out+=`\n- ${e.trim()}\n`}
    }
  }return out;
}
function plan(root,target,entry,kindArg,date){
  const pkgPath=path.join(root,'package.json'),lockPath=path.join(root,'package-lock.json');
  const appPath=path.join(root,'lib/app-version.ts'),changelogPath=path.join(root,'CHANGELOG.md'),readmePath=path.join(root,'README.md');
  const read=p=>fs.readFileSync(p,'utf8');
  const pkg=JSON.parse(read(pkgPath)),lock=JSON.parse(read(lockPath)),app=read(appPath);
  const from=consistency(pkg,lock,app),expected=kind(from,target);
  if(expected!==kindArg)throw Error(`VAULT_VERSION_STOP: incremento deve ser ${expected}`);
  const originalApp=`APP_VERSION = "${from}"`;
  if(app.split(originalApp).length!==2)throw Error('VAULT_VERSION_STOP: APP_VERSION não encontrada uma vez');
  const ch=read(changelogPath);
  if(ch.includes(`## [${target}]`)) throw Error('VAULT_VERSION_STOP: versão já documentada');
  const targetNotes=notes(read(entry));
  const heading=`## [${target}] — Preparação ${date} (não distribuída)\n\n`+
    `Versão de produto preparada; não equivale a Release GitHub, Action, APK instalado ou homologação física.\n${targetNotes}\n`;
  const changeVersion=(file,occurrences)=>{
    const old=`"version": "${from}"`,fresh=`"version": "${target}"`;
    const parts=file.split(old);
    if(parts.length - 1 < occurrences)throw Error('VAULT_VERSION_STOP: manifestos inesperados');
    return parts.slice(0,occurrences+1).join(fresh) + (parts.length>occurrences+1 ? old+parts.slice(occurrences+1).join(old) : '');
  };
  const packageNext=changeVersion(read(pkgPath),1);
  const lockNext=changeVersion(read(lockPath),2);
  const updatedPkg=JSON.parse(packageNext),updatedLock=JSON.parse(lockNext);
  consistency(updatedPkg,updatedLock,app.replace(originalApp,`APP_VERSION = "${target}"`));
  const readme=read(readmePath),marker=`<!-- VAULT_CURRENT_VERSION:${from} -->`;
  if(readme.split(marker).length!==2)throw Error('VAULT_VERSION_STOP: marcador README ausente ou duplicado');
  const readmeNext=readme.replace(marker,`<!-- VAULT_CURRENT_VERSION:${target} -->`);
  const changelog=ch.replace(/^# Histórico de versões do VAULT\n/,'# Histórico de versões do VAULT\n\n'+heading);
  if(changelog===ch)throw Error('VAULT_VERSION_STOP: cabeçalho de CHANGELOG ausente');
  return {from,to:target,kind:expected,files:{
    'package.json':packageNext,'package-lock.json':lockNext,
    'lib/app-version.ts':app.replace(originalApp,`APP_VERSION = "${target}"`),'CHANGELOG.md':changelog,
    'README.md':readmeNext,
  }};
}
function cli(argv=process.argv.slice(2)){
  const flag=(n)=>{const i=argv.indexOf(n);return i<0?null:argv[i+1]};
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),
        lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')),
        app=fs.readFileSync('lib/app-version.ts','utf8');
  const current=consistency(pkg,lock,app);
  if(argv.length===1&&argv[0]==='--check') {
    const readme=fs.readFileSync('README.md','utf8');
    if(!readme.includes(`<!-- VAULT_CURRENT_VERSION:${current} -->`))
      throw Error('VAULT_VERSION_STOP: README não corresponde à versão semântica');
    console.log('VAULT_VERSION_CONSISTENTE='+current);return;
  }
  const target=flag('--prepare'),type=flag('--kind'),entry=flag('--notes');
  if(!target||!type||!entry)throw Error('uso: node scripts/vault-prepare-version.cjs --prepare 1.3.0 --kind minor --notes /caminho/notas.json [--apply]');
  const date=new Date().toISOString().slice(0,10);
  const p=plan(process.cwd(),target,entry,type,date);
  console.log(`PREPARAÇÃO ${p.from} → ${p.to} (${p.kind}); arquivos: ${Object.keys(p.files).join(', ')}`);
  if(!argv.includes('--apply')){console.log('DRY_RUN: nada alterado. Use --apply com VAULT_VERSION_APPLY=SIM após revisão.');return;}
  if(process.env.VAULT_VERSION_APPLY!=='SIM')throw Error('VAULT_VERSION_STOP: autorização explícita ausente');
  const base=path.resolve(process.cwd(),'..','vault-version-backups',Date.now().toString());
  fs.mkdirSync(base,{recursive:true});
  try {for(const f of Object.keys(p.files)){const existing=path.resolve(f);const backup=path.resolve(base,f);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(existing,backup);}}
  catch(e){throw Error(`VAULT_VERSION_STOP: backup falhou (${e.message})`)}
  const written=[];
  try{
    for(const [f,value] of Object.entries(p.files)){
      const temporary=path.resolve(f+'.vault-version-tmp');
      if(fs.existsSync(temporary))throw Error('arquivo temporário preexistente: '+temporary);
      fs.writeFileSync(temporary,value,{flag:'wx'});
      fs.renameSync(temporary,path.resolve(f));written.push(f);
    }
  }catch(e){
    for(const f of written){const original=path.resolve(base,f);if(fs.existsSync(original))fs.copyFileSync(original,path.resolve(f));}
    for(const f of Object.keys(p.files)){const tmp=path.resolve(f+'.vault-version-tmp');if(fs.existsSync(tmp))fs.rmSync(tmp);}
    throw Error('VAULT_VERSION_STOP: falha de gravação; rollback dos arquivos preparados: '+e.message);
  }
  console.log(`VAULT_VERSION_PREPARADA=${target}; BACKUP=${base}; sem stage, commit, push ou build`);
}
if(require.main===module){try{cli()}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={consistency,kind,notes,plan};
