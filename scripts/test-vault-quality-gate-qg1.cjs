#!/usr/bin/env node
'use strict';
/** QG1 phase 1: real touch/route/catalog safety and test modernization. */
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {WIDTHS,classMinHeightAtLeastQG1,homePrimaryMinHeightQG1,clinicalTileMinHeightQG1,extractClassAfter}=require('./vault-qg1-touch-contract.cjs');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
const ok=(value,what)=>{assert.ok(value,'QG1: '+what);console.log('✓ QG1 '+(++n)+' '+what)};
// Negative fixtures prove the gate rejects the actual old inaccessible layout,
// not merely that it accepts a convenient renamed string.
ok(WIDTHS.join(',')==='320,360,393,430','four actual narrow Android viewports');
ok(!classMinHeightAtLeastQG1('min-h-[72px] !min-h-[72px]',84),'rejects 72px target');
ok(!classMinHeightAtLeastQG1('min-h-[84px] min-[380px]:!min-h-[76px]',84),'rejects 76px override at 393px');
ok(!classMinHeightAtLeastQG1('min-h-[90px] min-[390px]:min-h-[70px]',84),'rejects 70px later-width override');
ok(classMinHeightAtLeastQG1('min-h-[100px]',84),'accepts stable 100px target');
ok(classMinHeightAtLeastQG1('min-h-[84px]',84),'accepts safe 84px legacy target');
ok(classMinHeightAtLeastQG1('min-h-[76px]',76),'aceita atalhos de 76px');
ok(!classMinHeightAtLeastQG1('min-h-[60px]',76),'rejeita regressão abaixo de 76px nos atalhos');
const home=read('components/home/HomeCommandCenter.tsx');
const tile=read('components/home/HomeClinicalAreaTile.tsx');
ok(homePrimaryMinHeightQG1(home,76),'Medicamentos: usable touch and real navigation');
ok(clinicalTileMinHeightQG1(tile,76),'Minha saúde: usable touch and preserved semantic color');
ok(extractClassAfter(home,'onClick={() => go("/saude/medicamentos")}').includes('min-h-[76px]')&&/viva\s*\?\s*"h-auto self-start"\s*:\s*"h-full"/.test(extractClassAfter(home,'onClick={() => go("/saude/medicamentos")}')),'Home Medicamentos mantém mínimo 76px; não estica quando Viva aparece');
ok(read('components/home/HomeVivaP4.tsx').includes('min-h-11')&&/viva\s*\?\s*\(\s*<HomeVivaP4\s+data=\{viva\}/.test(home),'Home Viva preserva alvos tocaveis e integracao no lugar do tile redundante');
ok(extractClassAfter(tile,'<button type="button" onClick={() => onNavigate(path)}').includes('min-h-[76px]'),'Saúde compacta usa 76px e mantém toque acessível');
ok(home.includes('grid min-w-0 grid-cols-2 gap-2 items-start max-[349px]:grid-cols-1')&&/viva\s*\?\s*"!grid-cols-1"\s*:\s*""/.test(home)&&/viva\s*\?\s*"h-auto self-start"\s*:\s*"h-full"/.test(home),'320px uma coluna, Home Viva sem stretch e alvo 76px');
const map=read('app/saude/mapa/page.tsx'),directory=read('lib/navigation/clinical-directory-m150.ts');
const tree=ts.createSourceFile('lib/navigation/clinical-directory-m150.ts',directory,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
ok(tree.parseDiagnostics.length===0,'directory TypeScript valid');
const source=ts.transpileModule(directory,{fileName:'clinical-directory-m150.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exp={}; new Function('exports','module',source)(exp,{exports:exp});
const all=exp.clinicalDirectoryM150.flatMap(section=>section.items);
ok(all.length>=31&&new Set(all.map(entry=>entry.href)).size===all.length,'31+ unique real routes');
const required=['careflow','episodios','modo-medico','linha-do-tempo','dossie','exames-360','pressao','sintomas','biblioteca'];
ok(required.every(id=>all.some(x=>x.id===id&&x.href.startsWith('/saude/careflow'))),'all nine real CareFlow destinations');
ok(['medicamentos','consultas','cirurgias','retiradas','fornecimento','documentos','renovacao','hoje'].every(id=>all.some(x=>x.id===id)),'prior catalogue preserved');
ok(exp.searchClinicalDirectoryM150('medico').flatMap(x=>x.items).length>0,'no empty result for doctor alias');
ok(map.includes('aria-label="Favoritos"')&&map.includes('aria-label="Em foco agora"'),'favorites and evidence-based focus available');
ok(map.includes('onToggle={module?toggle:undefined}')&&map.includes('aria-pressed={favorite}'),'favorite action independent from navigation');
ok(map.includes("vault:health-hub:r5-updated")&&map.includes('encodeURIComponent(pid)'),'same-person favorite updates');
const app=read('app/page.tsx'),episode=read('components/home/ClinicalEpisodePulseP4.tsx');
ok(app.includes('<ClinicalEpisodePulseP4 />')&&episode.includes('prioritizeEpisodePromptD3'),'single canonical D3 decision');
ok(!app.includes('BrainNextStepD3')&&!read('app/saude/careflow/page.tsx').includes('BrainNextStepD3'),'no second D3 engine');
for(const p of ['scripts/test-vault-m136-visual-navigation.cjs','scripts/test-vault-m139-global-visual.cjs',
'scripts/test-vault-m141-visual-viewport.cjs','scripts/test-vault-m58-premium-daily-ux.cjs',
'scripts/test-vault-m25-premium-longlist-hotpath.cjs','scripts/test-vault-m24-r3-global-visual-hotpath.cjs',
'scripts/test-v196-progressive-shell-avatar.cjs','scripts/test-vault-m110-home-today.cjs']){
 ok(read(p).includes('qg1.'),'legacy regression migrated to shared real touch contract '+p);
}
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-quality-gate-qg1.cjs"').length===2,'QG1 registered exactly once in full gate');
ok(gate.split('"scripts/test-vault-ux360-public-identity-r2.cjs"').length===2,'public-title gate preserved');
ok(gate.split('"scripts/test-vault-ci360-p6-p3-d3.cjs"').length===2,'canonical Brain D3 preserved');
console.log('VAULT QG1: '+n+' executable guarantees (no mock clinical records written)');
