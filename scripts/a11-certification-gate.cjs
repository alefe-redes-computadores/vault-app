#!/usr/bin/env node
'use strict';
/** A11: validates evidence structure, not the authenticity of human attachments. No release action. */
const fs=require('node:fs');
const file=process.argv[2],sha=process.argv[3];
if(!file||!sha||!/^[a-f0-9]{40}$/i.test(sha)||!fs.existsSync(file)){
 console.error('Uso: node scripts/a11-certification-gate.cjs evidencia-a11.json SHA40');process.exit(2);
}
const ids=['typescript','v63','v70','git_integrity','android_ci','android_install','identity_2x2',
 'storage_2x2','offline_two_devices','race_two_devices','notification_doze','accessibility_320_430',
 'avatar_performance','pwa_production'];
const source={typescript:'code',v63:'code',v70:'code',git_integrity:'code',android_ci:'ci',
 android_install:'physical',identity_2x2:'authenticated',storage_2x2:'authenticated',
 offline_two_devices:'physical',race_two_devices:'physical',notification_doze:'physical',
 accessibility_320_430:'physical',avatar_performance:'physical',pwa_production:'vercel'};
let items;
try{items=JSON.parse(fs.readFileSync(file,'utf8')).evidence}catch{console.error('A11_CERT_BLOCKED: JSON inválido');process.exit(1)}
if(!Array.isArray(items)){console.error('A11_CERT_BLOCKED: conjunto de evidências ausente');process.exit(1)}
const keys=new Set(),failed=[];
for(const row of items){
 if(!row||!ids.includes(row.track)||keys.has(row.track)||
  row.verdict!=='passed'||row.source!==source[row.track]||row.sha!==sha||
  typeof row.evidenceRef!=='string'||row.evidenceRef.trim().length<5){failed.push('Etapa sem evidência válida');continue;}
 keys.add(row.track);
}
for(const id of ids)if(!keys.has(id))failed.push('Pendente: '+id);
if(failed.length){console.error('A11_CERTIFICATION_STOP | '+failed.join(' | '));process.exit(1)}
console.log('A11_EVIDENCE_STRUCTURE_COMPLETE | '+ids.length+' etapas; conferir autenticidade dos anexos com Guardian');
console.log('A11_CERTIFICATION_REQUIRES_INDEPENDENT_GUARDIAN_APPROVAL | sem publicação automática');
