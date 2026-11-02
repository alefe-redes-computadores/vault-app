#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let total=0;
const ok=(value,message)=>{assert.ok(value,'M17: '+message);total++;};
const files=['app/page.tsx','app/inteligencia/page.tsx','app/saude/minha-saude/page.tsx','app/saude/fornecimento/page.tsx','components/home/HomeSectionNav.tsx','components/saude/CareRelationshipRoutes.tsx','components/saude/SupplyRelationshipMap.tsx','components/saude/HealthSupplyEntry.tsx','lib/health-supply/relationship-map.ts','components/saude/HealthAvatar.tsx','lib/health-profile/avatar-visibility-policy.ts'];
for(const file of files){const source=read(file),parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(parsed.parseDiagnostics.length===0,'TS/TSX syntax '+file);}
const [home,brain,health,supply,homeNav,routes,map,entry,pure,avatar,policy]=files.map(read);
ok(home.includes('<HomeSectionNav')&&['home-agora','home-atencao','home-brain','home-organizacao'].every(id=>home.includes(`id="${id}"`)),'Home hierarchy points to rendered sections');
ok(homeNav.includes('scrollIntoView')&&homeNav.includes('aria-label="Áreas da página inicial"'),'Home navigation is mobile and keyboard visible');
ok(['insight-decisoes','insight-evidencias','insight-saude','insight-cofre'].every(id=>brain.includes(id))&&brain.includes('<ClinicalSectionNav'),'Vault Insight exposes decisions, evidence, health and vault hierarchy');
ok(health.includes('<CareRelationshipRoutes onNavigate={goFromHealth} compact/>')&&brain.includes('<CareRelationshipRoutes compact'),'cross-care routes preserve return context');
ok(routes.includes('/saude/medicamentos')&&routes.includes('/saude/tratamentos')&&routes.includes('/saude/fornecimento')&&routes.includes('/inteligencia'),'care routes remain reciprocal and explicit');
ok(supply.includes('projectSupplyRelationshipMap(relationalIndex, process.id)')&&supply.includes('<SupplyRelationshipMap value={selectedRelationshipMap}'),'supply uses owner-scoped relational index');
ok(map.includes('Mapa relacional')&&map.includes('/saude/tratamentos/detalhes')&&map.includes('/saude/medicamentos/detalhes')&&map.includes('/saude/documentos/detalhes')&&map.includes('/saude/retiradas/detalhes'),'map exposes both sides of care relations');
ok(pure.includes('processIdsByMedication')===false&&pure.includes('treatmentsByProcess')&&pure.includes('medicationIdsByProcess'),'projection consumes canonical bidirectional indexes without rebuilding them');
ok(entry.includes('summarizeMedicationSupplyRelations')&&entry.includes('Processos vinculados ao medicamento'),'medication detail exposes reverse supply navigation');
ok(avatar.includes('deviceMemory')&&avatar.includes('hardwareConcurrency')&&avatar.includes('O 3D continua disponível ao ampliar')&&policy.includes('!input.resourceConstrained'),'Fenix keeps explicit 3D while avoiding automatic constrained preview');
ok(!/\b(fetch\(|supabase|\bdb\.|localStorage|\.put\(|\.update\()/.test(homeNav+'\n'+routes+'\n'+map+'\n'+pure),'new presentation/projection modules have no database or remote IO');
ok(supply.includes('SUS, compras e documentos mantêm suas origens independentes')&&map.includes('não comprovam realização uns dos outros'),'relationship UI preserves event authority boundaries');

function load(file,imports={}){const js=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m=new Module(file,module);m.require=id=>{if(id in imports)return imports[id];throw Error('M17 unexpected import '+id)};m._compile(js,file);return m.exports;}
const summarize=load(files[8],{'@/lib/health-supply/types':{SUPPLY_ORIGIN_LABELS:{comprado:'Comprado',municipal:'SUS municipal'}}}).summarizeMedicationSupplyRelations;
const data={processos:[{id:'p1',status:'ativo',titulo:'SUS A',origem:'municipal'},{id:'p2',status:'encerrado',titulo:'Antigo',origem:'comprado'}],itens:[{processo_id:'p1',ciclo_id:'c1',medicamento_id:'m1'},{processo_id:'p2',ciclo_id:'c2',medicamento_id:'m1'}],ciclos:[{id:'c1',processo_id:'p1',status:'protocolado'},{id:'c2',processo_id:'p2',status:'autorizado'}],documentos:[]};
const summary=summarize(data,'m1');
ok(summary.processes.length===1&&summary.processes[0].id==='p1','closed process stays historical, not active medication route');
ok(summary.protocolled===1&&summary.authorized===0,'cycle state is scoped to active linked process');
ok(summary.origins.join(',')==='SUS municipal','origin comes from recorded process');
const can=load(files[10]).canMountAvatar3D,base={ready:true,expanded:true,mode:'3d',documentVisible:true,unavailable:false,size:'compact',previewVisible:true};
ok(can(base)&&!can({...base,resourceConstrained:true}),'resource constraint blocks only compact automatic WebGL');
ok(can({...base,size:'expanded',previewVisible:false,resourceConstrained:true,reducedMotion:true}),'explicit expanded 3D remains available');
const gate=read('scripts/test-v63-release-gate.mjs');ok(gate.includes('test-vault-m17-relational-hierarchy-fenix.cjs'),'M17 is cumulative in release gate');
console.log(`VAULT M17: ${total} structural/behavioral checks passed`);
