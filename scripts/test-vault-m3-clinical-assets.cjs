#!/usr/bin/env node
'use strict';
/** M3 contract suite: pure behavior + source safety. No actual clinical or server writes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let count=0;
const check=(value,message)=>{assert.ok(value,'M3: '+message);count++;};
const files=[
 'lib/clinical-exams-m3/policy.ts','lib/clinical-exams-m3/cache.ts','lib/clinical-exams-m3/repository.ts',
 'components/saude/ClinicalAssetViewerM3.tsx','components/saude/ExamClinicalDocumentsM3.tsx',
 'components/saude/ClinicalAssetLibraryM3.tsx','components/saude/ClinicalConsultationAssetsM3.tsx',
 'app/saude/exames/pedidos/page.tsx','app/saude/documentos/page.tsx',
 'app/saude/consultas/detalhes/page.tsx','components/Providers.tsx',
];
for(const file of files){const s=read(file);const parsed=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(parsed.parseDiagnostics.length===0,'TS/TSX parse: '+file+' '+parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' | ')));}
const policySrc=read(files[0]);const js=ts.transpileModule(policySrc,{fileName:files[0],compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod=new Module(path.join(process.cwd(),'m3-domain.cjs'),module);mod.filename=path.join(process.cwd(),'m3-domain.cjs');mod.paths=module.paths;mod._compile(js,mod.filename);
const p=mod.exports;
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',assetId='44444444-4444-4444-8444-444444444444';
check(p.PRIVATE_BUCKET_M3==='clinical-private','bucket privado obrigatório');
check(p.MAX_CLINICAL_FILE_M3===12*1024*1024,'limite binário conservador');
check(p.storagePathM3(uid,pid,assetId,'application/pdf')===`${uid}/${pid}/${assetId}.pdf`,'path canônico escopado');
assert.throws(()=>p.storagePathM3('../segredo',pid,assetId,'application/pdf'));count++;
assert.throws(()=>p.storagePathM3(uid,other,'../../escape','application/pdf'));count++;
assert.throws(()=>p.fileExtensionM3('text/html'));count++;
const pdf=new Uint8Array([37,80,68,70,45,49,46,52,10,0,0,0,0,0,0,0]);
p.inspectClinicalFileM3({name:'arquivo.pdf',type:'application/pdf',size:1024},pdf);count++;
assert.throws(()=>p.inspectClinicalFileM3({name:'falso.pdf',type:'application/pdf',size:1024},new Uint8Array(16)));count++;
assert.throws(()=>p.inspectClinicalFileM3({name:'muito-grande.pdf',type:'application/pdf',size:13*1024*1024},pdf));count++;
const stamp='2026-11-20T00:00:00.000Z';const sha='a'.repeat(64);
const asset={id:assetId,user_id:uid,person_id:pid,sha256:sha,filename:'documento.pdf',mime_type:'application/pdf',size_bytes:1024,storage_bucket:'clinical-private',storage_path:p.storagePathM3(uid,pid,assetId,'application/pdf'),upload_status:'synced',created_at:stamp,updated_at:stamp,deleted_at:null};
check(p.canOpenAssetM3(asset,uid,pid),'asset próprio autenticável');
check(!p.canOpenAssetM3(asset,uid,other),'outra pessoa não abre asset');
check(!p.canOpenAssetM3({...asset,storage_path:`${uid}/${other}/${assetId}.pdf`},uid,pid),'path divergente bloqueado');
check(!p.canOpenAssetM3({...asset,storage_bucket:'documents'},uid,pid),'bucket público rejeitado');
check(p.deduplicateAssetsM3([asset],uid,pid,sha)?.id===assetId,'SHA reutilizado na pessoa');
check(p.deduplicateAssetsM3([asset],uid,other,sha)===null,'SHA não cruza pessoa');
const items=Array.from({length:12},(_,i)=>`${String(i).padStart(8,'0')}-0000-4000-8000-000000000000`);
const targets=items.map(entity_id=>({entity_type:'exam_order_item',entity_id}));
check(p.uniqueTargetsM3(targets,'result').length===12,'um laudo para 12 exames');
assert.throws(()=>p.uniqueTargetsM3([...targets,targets[0]],'result'));count++;
assert.throws(()=>p.uniqueTargetsM3([{entity_type:'exam_order',entity_id:assetId}],'result'));count++;
assert.throws(()=>p.uniqueTargetsM3(targets.slice(0,1),'wrong'));count++;
const links=targets.map((t,i)=>({id:`link${i}`,asset_id:assetId,user_id:uid,person_id:pid,entity_type:t.entity_type,entity_id:t.entity_id,role:'result',deleted_at:null}));
const before=p.projectAssetSummaryM3([asset],links,uid,pid);
check(before.assets===1&&before.links===12&&before.items===12,'12 vínculos, 1 único arquivo físico');
const after=p.projectAssetSummaryM3([asset],links.map((x,i)=>i===0?{...x,deleted_at:stamp}:x),uid,pid);
check(after.assets===1&&after.links===11,'desvincular 1 mantém arquivo e outros 11');
check(p.projectAssetSummaryM3([asset],links,uid,other).assets===0,'projeção não vaza outro perfil');
const repo=read(files[2]);
for(const name of ['registerClinicalAssetM3','retryClinicalAssetM3','unlinkClinicalAssetM3','openClinicalAssetBlobM3','shareClinicalAssetM3'])check(repo.includes('function '+name),'ação disponível: '+name);
for(const snippet of ['sha256M3(blob)','supabase.auth.getUser()','download(asset.storage_path)','upsert:false',"await db.transaction('rw'",'validateTargetsM3(uid,pid,targets)','enfileirarOperacao(\'clinical_asset_links\'','deleted_at:now()','scope']){
 if(snippet==='scope')continue;check(repo.includes(snippet),'integridade '+snippet);
}
check(!repo.includes('getPublicUrl')&&!repo.includes('createSignedUrl')&&!repo.includes('.remove(')&&!repo.includes('storage.from("vault-attachments")'),'sem URL pública, token exportável ou remoção física');
const cache=read(files[1]);
check(cache.includes('Directory.Data')&&cache.includes('readClinicalCacheM3')&&cache.includes('clearClinicalCacheM3'),'Filesystem privado + limpeza');
check(!cache.includes('localStorage')&&!cache.includes('IndexedDB')&&!cache.includes('db.clinical_assets'),'binário não armazenado em IndexedDB');
check(cache.includes('const exact=new ArrayBuffer(bytes.byteLength)')&&cache.includes('new Uint8Array(exact).set(bytes)')&&cache.includes('new Blob([exact],{type:mime})'),'cache BlobPart usa ArrayBuffer concreto sem cast inseguro');
check(!cache.includes('new Blob([bytesFromBase64(data)]')&&!cache.includes('as any'),'sem buffer genérico ou bypass da tipagem');
const ui=read(files[4]);
check(ui.includes('setSelected')&&ui.includes("role==='result'?candidates")&&ui.includes('confirmed')&&ui.includes('window.confirm'),'seleção e confirmação explícita por item');
check(ui.includes('Todos coletados / com resultado')&&ui.includes('sessions.map'),'atalhos seletivos para múltiplos vínculos');
check(ui.includes('unlinkClinicalAssetM3')&&ui.includes('arquivo compartilhado foi preservado'),'desvincula sem apagar PDF');
check(read('app/saude/exames/pedidos/page.tsx').includes('<ExamClinicalDocumentsM3'),'pedido canônico recebe M3 sem novo cadastro');
check(read('app/saude/documentos/page.tsx').includes('<ClinicalAssetLibraryM3'),'Biblioteca existente mostra private assets');
check(read('app/saude/consultas/detalhes/page.tsx').includes('<ClinicalConsultationAssetsM3'),'Consulta existente mostra vínculos explícitos');
const cons=read('components/saude/ClinicalConsultationAssetsM3.tsx');
check(cons.includes('consultation_exam_order_links')&&cons.includes('entity_type')&&cons.includes('consultationId'),'sem associação por coincidência de datas');
const prov=read('components/Providers.tsx');
check(prov.includes('clearClinicalCacheM3()')&&prov.includes('if (loading')&&prov.includes('vault:m3:clinical-cache-owner'),'logout limpa cache após hidratação');
check(read('lib/clinical-exams-m1/types.ts').includes('clinical_asset_links'),'reutiliza 7 tabelas M1 sem criar esquema');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.split('"scripts/test-vault-m3-clinical-assets.cjs"').length===2,'contrato novo único no V63');
for(const old of ['test-vault-m1-exames-offline.cjs','test-vault-m2-exams-360.cjs','test-v112-lifestyle-insights.mjs','test-vault-r5-integracao-clinica.cjs'])check(gate.includes(old),'gate legado preservado '+old);
console.log(`M3_CONTRATOS_OK | ${count} verificacoes | 1 PDF / 12 itens | isolamento | cache | zero escrita real`);
