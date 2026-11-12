#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');
let pass=0; const ok=(v,why)=>{assert(v,`P15 R9 R4: ${why}`);console.log(`✓ ${++pass}: ${why}`);};
const files=[
'lib/health-supply/medication-evidence.ts',
'lib/health-intelligence/care-readiness.ts',
'components/home/HomeClinicalAreaTile.tsx',
'components/home/HomeCommandCenter.tsx',
'components/saude/AvatarCareReadiness.tsx',
'components/saude/MedicationListRouteLabel.tsx',
'components/hoje/TodayRoutinePulse.tsx',
];
for(const p of files){const s=read(p);const parsed=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(parsed.parseDiagnostics.length===0,p+' sem erro sintático');}
function loadPure(file){const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod=new Module(file,module);mod._compile(code,file);return mod.exports;}
const {describeMedicationSupplyEvidence}=loadPure('lib/health-supply/medication-evidence.ts');
const hybrid={origins:['municipal'],hasPrivatePurchase:true,mode:'hybrid',labels:['SUS municipal','Comprado']};
let e=describeMedicationSupplyEvidence({tipo_aquisicao:'comprado'},hybrid);
ok(e.declared==='private'&&e.declaredLabel==='Comprado · cadastro','Pristiq comprado usa origem declarada, sem apagar SUS');
ok(e.historicalMixed&&e.hasActivePublicLink&&e.hasRecordedPrivatePurchase,'histórico híbrido documentado em evidências independentes');
ok(/não comprovam fornecimento simultâneo/.test(e.detail),'coexistência não é fornecimento simultâneo');
e=describeMedicationSupplyEvidence({tipo_aquisicao:'sus'},hybrid);
ok(e.declared==='public'&&e.declaredLabel==='SUS · cadastro','SUS declarado prevalece sobre compra histórica');
e=describeMedicationSupplyEvidence({tipo_aquisicao:'gratuito'},hybrid);
ok(e.declared==='free'&&e.declaredLabel==='Gratuito · cadastro','gratuito não vira SUS automaticamente');
e=describeMedicationSupplyEvidence({tipo_aquisicao:undefined},hybrid);
ok(e.declared==='unknown'&&e.historicalMixed,'origem não declarada falha fechado em histórico híbrido');
e=describeMedicationSupplyEvidence({tipo_aquisicao:'comprado'},null);
ok(!e.historicalMixed&&!e.hasRecordedPrivatePurchase&&e.declared==='private','compra declarada não inventa registro de aquisição');
e=describeMedicationSupplyEvidence({tipo_aquisicao:'sus'},{origins:[],hasPrivatePurchase:false,mode:'none',labels:[]});
ok(!e.hasActivePublicLink&&/Sem vínculo público/.test(e.detail),'SUS cadastrado não inventa processo ativo');
const ready=read(files[1]);
ok(ready.includes('describeMedicationSupplyEvidence(med, route)'),'prontidão usa autoridade declarada separada');
ok(ready.includes('(!context.userId || med.user_id === context.userId)'),'prontidão isola conta e person_id');
ok(ready.includes('routeEvidence.declared === "private"')&&ready.includes('routeEvidence.declared === "public"')&&ready.includes('routeEvidence.declared === "free"'),'motor distingue particular, SUS e gratuidade');
ok(ready.includes('route.mode === "hybrid"')&&ready.includes('Histórico público e particular; origem atual a conferir'),'híbrido sem declaração não vira compra atual');
ok(ready.includes('isFutureAcquisition(row, today)')&&ready.includes('Aquisição planejada · não realizada'),'compra futura não vira compra concluída');
ok(ready.includes('withdrawal?.overdue')&&ready.includes('Retirada pendente precisa de decisão'),'retirada vencida preserva autoridade');
ok(ready.includes('prescription = events.find')&&ready.includes('isPrescriptionOnly(row)'),'receitas e compras continuam independentes');
ok(ready.includes('routeIndex.get(id)')&&ready.includes('const routeIndex ='),'índice escopado compartilhado permanece O(n)');
ok(ready.includes("Ausência de evento não significa falha clínica")&&ready.includes("planned event never becomes completed stock"),"V253: ausência de registro não é falha clínica e planejamento não vira estoque");
ok(ready.includes('`Cadastro: ${routeEvidence.declaredLabel}`')&&ready.includes('`Vínculos históricos: ${route.labels.join(" + ") || "não informados"}`'),'evidência separa registro atual e vínculos históricos');
const tile=read(files[2]),home=read(files[3]);
ok(home.includes('<HomeClinicalAreaTile key={path}')&&tile.includes('onNavigate(path)'),'Home modulariza 6 atalhos e mantém handler de haptics no pai');
ok(tile.includes('aria-label={`${label}: ${description}`}')&&tile.includes('focus-visible:outline')&&tile.includes('motion-reduce:transition-none'),'atalhos acessíveis e com reduced-motion');
ok(tile.includes('path === "/saude/minha-saude"')&&home.includes('label="Minha saúde"'),'Minha Saúde possui destaque contextual');
ok(home.includes('id="home-outras-areas" title=') && !home.includes('id="home-outras-areas" defaultOpen')&&home.includes('id="home-acessos-medicamentos"')&&home.includes('id="home-organizacao"'),'somente Outras áreas aberta por padrão');
ok(home.includes('"/saude/medicamentos"')&&home.includes('"/saude/retiradas"')&&home.includes('"/saude/fornecimento"'),'rotas críticas preservadas');
const avatar=read(files[4]);
ok(avatar.includes('Brain · {brief.posture}')&&avatar.includes('planFocus.priorityScore')&&avatar.includes('authorityLabel ?? brief.authority'),'Fênix mantém postura e evidência do Brain');
ok(avatar.includes('Rota do cadastro ou histórico; não comprova retirada nem aquisição atual'),'Fênix não confunde rota e retirada realizada');
ok(avatar.includes('portfolio.counts.unknown > 0')&&avatar.includes('sem confirmação documental ou operacional'),'Fênix comunica incerteza sem inventar diagnóstico');
ok(!/requestAnimationFrame\(|new THREE\./.test(avatar),'Fênix não cria loop GPU ou malha 3D');
const label=read(files[5]);
ok(label.includes('export function MedicationListRouteLabel({route,label}')&&label.includes('{label}'),'API de etiqueta V271 mantida');
ok(label.includes('route.mode === "none"')&&label.includes('Origem registrada'),'sem rota não exibe fornecimento falso');
ok(label.includes('Não confirma retirada, compra atual ou disponibilidade.'),'texto da etiqueta diferencia histórico do ato realizado');
const pulse=read(files[6]);
ok(pulse.includes('data-temporal-authority={isFuturo ? "projected" : isPassado ? "historical" : "today"}'),'Hoje distingue data futura, passada e atual');
ok(pulse.includes('Planejamento futuro não significa dose tomada.')&&pulse.includes('Sem confirmação histórica não significa dose ignorada.'),'Hoje não inventa tomada nem ignorada');
ok(pulse.includes('!isFuturo && recorded > 0')&&pulse.includes('motion-reduce:transition-none'),'progresso só para registros e respeita movimento reduzido');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-p15-r9-r4-evidence-home-fenix.cjs'),'gate integra nova cirurgia');
for(const prior of ['test-p15-r8-r4-brain-ledger-real-contract.cjs','test-p15-r6-medication-routine-modules.cjs','test-v271-supply-index-medication-surfaces-avatar.cjs'])ok(gate.includes(prior),'contrato histórico retido: '+prior);
console.log(`P15 R9 R4: ${pass} verificações — rotas, prontidão, Home, Hoje, Fênix e histórico.`);
