#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=f=>fs.readFileSync(f,'utf8');let n=0;
function check(cond,label){assert(cond,'P15 R9 R6: '+label);console.log(`✓ ${++n}: ${label}`)}
const files=['components/home/HomeCommandCenter.tsx','components/home/HomeCareOrganizationTiles.tsx',
  'app/hoje/page.tsx','components/hoje/TodayTimelineGuide.tsx','components/saude/MedicationPortfolioOverview.tsx',
  'lib/health-intelligence/medication-portfolio-coherence.ts','components/saude/HealthAvatar3D.tsx'];
for(const f of files){const parsed=ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(!parsed.parseDiagnostics.length,'TS/TSX sintaticamente válido: '+f)}
const [home,tiles,today,guide,meds,audit,avatar]=files.map(read);
check(home.includes('id="home-organizacao"')&&home.includes('<HomeCareOrganizationTiles'),'Home delega organização sem remover divulgação');
check(home.includes('documentPath="/saude/documentos"')&&home.includes('purchasePath="/saude/renovacao"')&&home.includes('networkPath="/saude/rede"'),'três rotas originais preservadas');
check(home.includes('const go = (path: string) => { trigger("vibrate"); router.push(path); };'),'haptics e router continuam na Home');
check(tiles.includes('onNavigate(documentPath)')&&tiles.includes('onNavigate(purchasePath)')&&tiles.includes('onNavigate(networkPath)'),'botões organizacionais acionáveis');
check(!/\bfetch\(|supabase|\.toArray\(|getServerSideProps/.test(tiles),'componente puro, sem nova consulta');
check(tiles.includes('motion-reduce:transition-none')&&tiles.includes('focus-visible:outline'),'home touch, movimento reduzido e foco');
check(tiles.includes('Number.isFinite(diferencaMes)')&&tiles.includes('Number.isFinite(value)'),'valores financeiros inválidos não são exibidos como NaN');
check(home.includes('<HomeSupplyAccessTiles')&&home.includes('home-acessos-medicamentos'),'fornecimento anterior preservado');
check(home.includes('id="home-outras-areas" defaultOpen'),'preferência de abertura preservada');
check(home.includes('networkTone="text-emerald-300/80"')&&tiles.includes('${networkTone}')&&!home.includes('networkTone="text-cyan-400/70"'),'M6 conserva a cor contextual da rede e a prop de apresentação sem ciano excessivo');
check(home.includes('col-span-2 flex min-h-12 items-center gap-2.5 rounded-[20px] border'),'V196: card principal com raio premium preservado após extração');
check(today.includes('<TodayTimelineGuide isHoje={isHoje} isPassado={isPassado} isFuturo={isFuturo} />'),'Hoje recebe guia temporal sem novo estado');
check(today.includes('visibleTimelineItems(dosesFiltradas')&&today.includes('filterTimelineItems(doses,'),'motor canônico de filtros não alterado');
check(guide.includes('Doses futuras são previsões')&&guide.includes('Falta de confirmação no histórico não significa uma dose ignorada'),'futuro e passado não viram realizados');
check(guide.includes('Somente uma confirmação registra tomada')&&guide.includes('<details'),'guia progressivo sem registro');
check(meds.includes('listActiveCount !== portfolio.active')&&meds.includes('Doses SOS não entram nessa meta programada'),'contratos anteriores de divergência e SOS preservados');
check(meds.includes('medicationPortfolioCoherence(portfolio)')&&meds.includes('coherence.hasUnknownType'),'UI exibe somente lacuna real de classificação');
const m=new Module(files[5],module);m._compile(ts.transpileModule(audit,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,files[5]);
const co=m.exports.medicationPortfolioCoherence;
check(co({active:9,continuous:5,temporary:2,asNeeded:1}).unknownType===1,'um tipo ausente não é escondido');
check(!co({active:9,continuous:6,temporary:2,asNeeded:1}).hasUnknownType,'classificação fechada não vira alerta');
check(co({active:0,continuous:0,temporary:0,asNeeded:0}).unknownType===0,'lista vazia sem falso alerta');
check(co({active:NaN,continuous:Infinity,temporary:-10,asNeeded:0}).unknownType===0,'indicadores inválidos saneados');
check(avatar.includes('roughness: .81')&&avatar.includes('opacity: .42')&&avatar.includes('roughness: .53'),'valores dos olhos, reflexos e íris preservados');
check(avatar.includes('P15 R9 R6: luz traseira e acabamento do palco menos sintéticos'),'Fênix recebe acabamento sem nova geometria');
check(avatar.includes('DirectionalLight(0xb1dbd5, 1.28)') && avatar.includes('toneMappingExposure=1.03'),'P14 R4: luz traseira e exposição preservadas após acabamento R6');
check(!avatar.includes('DirectionalLight(0xb1dbd5, 1.16)') && avatar.includes('roughness:.78,metalness:.07'),'palco fosco sem enfraquecer iluminação P14 R4');
check(avatar.includes('rim.position.set(3,3,-3)')&&avatar.includes('new THREE.MeshStandardMaterial({color:0x16372f'),'Fênix mantém cena e material existentes');
check(!avatar.includes('requestAnimationFrame(function'),'Fênix preserva limitação do loop GPU');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.includes('test-p15-r9-r6-modularity-brain-avatar.cjs')&&gate.includes('test-p15-r9-r5-performance-continuity.cjs'),'gate integra R6 e R5');
for(const old of ['test-v165-contextual-health.cjs','test-v253-brain-readiness-calibration-avatar.cjs','test-home-today-v9-contract.mjs'])check(gate.includes('"scripts/'+old+'",'),'gate histórico listado '+old);
check(gate.indexOf('"scripts/test-home-today-v9-contract.mjs",') > gate.indexOf('"scripts/test-p15-r9-r6-modularity-brain-avatar.cjs",'),'V9 entra no gate após o contrato novo R6');
console.log(`P15 R9 R6: ${n} contratos aprovados`);
