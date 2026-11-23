#!/usr/bin/env node
'use strict';
/** Human-readable release body from complete Git range; no clinical data or network. */
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const SHA=/^[0-9a-f]{40}$/i;
const TYPES={feat:'Novidades',fix:'Correções',perf:'Melhorias',refactor:'Melhorias',docs:'Documentação',test:'Qualidade',chore:'Manutenção'};
const PREFIX={feat:'Novidade: ',fix:'Correção: ',perf:'Desempenho: ',refactor:'Aprimoramento: ',docs:'Documentação: ',test:'Qualidade: ',chore:''};
function classify(subject){
 const raw=String(subject||'').replace(/[\r\n\x00-\x1f]/g,' ').trim().slice(0,300);
 const m=/^(feat|fix|perf|refactor|docs|test|chore)(?:\([^)]{1,60}\))?:\s*(.+)$/i.exec(raw);
 const type=m?.[1]?.toLowerCase()||'other';
 const detail=(m?.[2]||raw).replace(/^VAULT[- ]?/i,'').trim();
 if(!detail)return null;
 return {category:TYPES[type]||'Outras mudanças',text:detail,type};
}
function cleanSubject(subject){const v=classify(subject);return v?(PREFIX[v.type]||'')+v.text:null;}
function summarize(subjects){const seen=new Set(),out=[];for(const s of subjects){const v=cleanSubject(s);if(v&&!seen.has(v.toLowerCase())){seen.add(v.toLowerCase());out.push(v)}}return out;}
function listSubjects(current,previous){
 if(!SHA.test(current||''))throw Error('VAULT_UPDATE360: SHA atual inválido');
 let range=current;
 if(SHA.test(previous||'')){
  execFileSync('git',['cat-file','-e',`${previous}^{commit}`],{stdio:'pipe'});
  execFileSync('git',['merge-base','--is-ancestor',previous,current],{stdio:'pipe'});
  if(previous===current)return [];
  range=`${previous}..${current}`;
 }
 // Deliberately no --max-count: never silently lose a macro from history.
 const out=execFileSync('git',['log','--first-parent','--format=%s',range],{encoding:'utf8',maxBuffer:12*1024*1024});
 return out.split(/\r?\n/).filter(Boolean);
}
function collect(current,previous){return summarize(listSubjects(current,previous));}
function formatReleaseNotes(subjects){
 const found=new Set();const groups=new Map();
 for(const raw of subjects){const v=classify(raw);if(!v)continue;
  const key=(v.category+'|'+v.text).toLowerCase();if(found.has(key))continue;found.add(key);
  if(!groups.has(v.category))groups.set(v.category,[]);groups.get(v.category).push(v.text);
 }
 if(!groups.size)return '- Resumo não informado; consulte o histórico integral deste commit.';
 const order=['Novidades','Melhorias','Correções','Segurança','Outras mudanças','Manutenção','Qualidade','Documentação'];
 return order.filter(k=>groups.has(k)).map(k=>`### ${k}\n${groups.get(k).map(t=>'- '+t).join('\n')}`).join('\n\n');
}
/** Prefer reviewed human notes prepared before build; technical commits remain complete below. */
function curatedVersionNotes(root='.'){
 try{
  const version=JSON.parse(fs.readFileSync(root+'/package.json','utf8')).version;
  const changelog=fs.readFileSync(root+'/CHANGELOG.md','utf8');
  const all=changelog.split(/\r?\n/);
  const index=all.findIndex(line=>line===`## [${version}]`||line.startsWith(`## [${version}] `)||line.startsWith(`## [${version}] —`));
  if(index<0)return null;
  const next=all.findIndex((line,i)=>i>index&&/^## /.test(line));
  const lines=all.slice(index+1,next<0?undefined:next);
  const headers=new Set(['Novidades','Melhorias','Correções','Segurança']);
  const groups=[];let active=null;
  for(const line of lines){
   const h=/^### (.+)$/.exec(line);
   if(h){active=headers.has(h[1].trim())?h[1].trim():null;
    if(active)groups.push({name:active,items:[]});continue}
   if(active&&/^[-] /u.test(line)){
    const value=line.slice(2).trim();if(value.length>6&&value.length<=300)groups[groups.length-1].items.push(value);
   }
  }
  const nonempty=groups.filter(g=>g.items.length);
  return nonempty.length?nonempty.map(g=>`### ${g.name}\n${g.items.map(v=>'- '+v).join('\n')}`).join('\n\n'):null;
 }catch{return null}
}
if(require.main===module){try{
 const technical=listSubjects(process.argv[2],process.argv[3]);
 console.log(curatedVersionNotes()||'- Resumo público ainda não revisado nesta versão; veja os detalhes técnicos abaixo.');
 console.log('\n## Detalhes técnicos verificáveis\n');
 console.log(formatReleaseNotes(technical));
}catch(e){console.error('VAULT_RELEASE_NOTES_STOP: '+String(e.message||e));process.exitCode=1}}
module.exports={classify,cleanSubject,summarize,collect,formatReleaseNotes,listSubjects,curatedVersionNotes};
