#!/usr/bin/env node
'use strict';
/** CI-only, public Git metadata. No clinical records, APIs, tokens or local user data. */
const {execFileSync}=require('node:child_process');
const SHA=/^[0-9a-f]{40}$/i;
function cleanSubject(subject){
  const raw=String(subject||'').replace(/[\r\n\x00-\x1f]/g,' ').trim().slice(0,160);
  const m=/^(feat|fix|perf|refactor|docs|test|chore)(?:\([^)]{1,40}\))?:\s*(.+)$/i.exec(raw);
  const type=m?.[1]?.toLowerCase()||'other';
  const detail=(m?.[2]||raw).replace(/^VAULT[- ]?/i,'').trim();
  if(!detail) return null;
  const prefix=type==='fix'?'Correção: ':type==='feat'?'Novidade: ':type==='perf'?'Desempenho: ':type==='docs'?'Documentação: ':type==='test'?'Qualidade: ':type==='refactor'?'Aprimoramento: ':'';
  return (prefix+detail).slice(0,170);
}
function summarize(subjects){
  const found=new Set(); const out=[];
  for(const subject of subjects){
    const s=cleanSubject(subject);
    if(!s || found.has(s.toLowerCase())) continue;
    found.add(s.toLowerCase());out.push(s);
  }
  return out.slice(0,12);
}
function collect(current,previous){
  if(!SHA.test(current||'')) throw Error('VAULT_UPDATE360: SHA atual inválido');
  let range=current;
  if(SHA.test(previous||'')) {
    try {
      execFileSync('git',['cat-file','-e',`${previous}^{commit}`],{stdio:'pipe'});
      execFileSync('git',['merge-base','--is-ancestor',previous,current],{stdio:'pipe'});
      if(previous!==current) range=`${previous}..${current}`;
    } catch { /* Missing ancestor: fall back to latest commit; never invent history. */ }
  }
  const lines=execFileSync('git',['log','--first-parent','--max-count=40','--format=%s',range],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return summarize(lines.split(/\r?\n/).filter(Boolean));
}
if(require.main===module){
  try {
    const notes=collect(process.argv[2],process.argv[3]);
    for(const item of notes.length?notes:['Resumo de novidades não disponível; consulte o histórico de commits da release.']) console.log('- '+item);
  }catch(e){console.error(String(e.message||e));process.exitCode=1}
}
module.exports={cleanSubject,summarize,collect};
