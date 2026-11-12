#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8'); let count=0;
function ok(value,label){assert(value,'R9 R5: '+label);console.log(`✓ ${++count}: ${label}`);}
function pure(path){const compiled=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const m=new Module(path,module);m._compile(compiled,path);return m.exports;}
const files=['lib/health-intelligence/care-readiness.ts','lib/health-intelligence/medication-portfolio.ts',
'components/home/HomeCommandCenter.tsx','components/hoje/TodayRoutinePulse.tsx',
'components/saude/AvatarCareReadiness.tsx','components/home/HomeSupplyAccessTiles.tsx',
'lib/health-intelligence/readiness-renewal-index.ts','lib/health-intelligence/avatar-care-posture.ts','lib/today/today-temporal-guidance.ts'];
for(const file of files){const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(tree.parseDiagnostics.length===0,'parser TS/TSX '+file);}
const {indexOwnedReadinessRenewals:index}=pure(files[6]);
const owned=(id,user='u',person='p')=>({id,medicamento_id:'m',user_id:user,person_id:person});
const events=[owned('mine'),owned('foreign','u','other'),owned('other-account','another','p'),owned('legacy','u',undefined),{...owned('second'),medicamento_id:'m2'}];
const before=events.slice();const rows=index(events,'p','u');
ok(rows.get('m').map(x=>x.id).join(',')==='mine,legacy','índice preserva ordem e legado na mesma conta');
ok(rows.get('m2').length===1&&rows.size===2,'agrupamento por medicamento em passagem única');
ok(!rows.get('m').some(x=>x.id==='foreign'||x.id==='other-account'),'pessoa e conta isoladas');
ok(index(events,'','u').size===0&&index(events,'p','').size===0,'sem proprietário = nenhum evento exposto');
ok(events.every((x,i)=>x===before[i]),'fonte não mutada');
const {avatarCarePosture:posture}=pure(files[7]);
ok(posture({overdue:2,prepare:3,unknown:4}).tone==='urgent','retirada vencida prevalece');
ok(posture({overdue:0,prepare:3,unknown:4}).tone==='planning','preparação não vira urgência');
ok(posture({overdue:0,prepare:0,unknown:2}).tone==='unknown','dado incerto sem diagnóstico');
ok(posture({overdue:0,prepare:0,unknown:0}).tone==='quiet','sem risco inventado');
ok(posture({overdue:NaN,prepare:-2,unknown:Infinity}).tone==='quiet','contagens inválidas não causam falso alarme');
const {todayTemporalGuidance:guidance}=pure(files[8]);
ok(/Previsão/.test(guidance({isFuturo:true,isPassado:false,recorded:0,unconfirmed:3})),'futuro não vira tomada');
ok(/não significa dose ignorada/.test(guidance({isFuturo:false,isPassado:true,recorded:0,unconfirmed:2})),'histórico vazio não vira dose ignorada');
ok(/Histórico parcial/.test(guidance({isFuturo:false,isPassado:true,recorded:2,unconfirmed:1})),'passado parcial permanece sem confirmação');
ok(guidance({isFuturo:false,isPassado:false,recorded:2,unconfirmed:1})===null,'hoje não ganha aviso redundante');
const ready=read(files[0]),portfolio=read(files[1]),home=read(files[2]),today=read(files[3]),avatar=read(files[4]),tiles=read(files[5]);
ok(ready.includes('indexOwnedReadinessRenewals(context.renovacoes, context.personId, routeUserId)'),'prontidão usa índice único, escopado');
ok(ready.includes('[...(renewalIndex.get(id) ?? [])]')&&ready.includes('renewalEventDate(b).localeCompare'),'ordem temporal e origem imutável');
ok(ready.includes('row.user_id === med.user_id'),'conta do medicamento continua conferida');
ok(ready.includes('med.document_id?.trim()')&&ready.includes('conferir tipo, titularidade e validade'),'documento vinculado não vira receita válida');
ok(ready.includes('planned event never becomes completed stock')&&ready.includes('Ausência de evento não significa falha clínica'),'proteção literal V253 preservada');
ok(ready.includes('routeEvidence.declared === "private"')&&ready.includes('routeEvidence.declared === "public"'),'SUS e comprado independentes');
ok(ready.includes('withdrawal?.overdue')&&ready.includes('Aquisição planejada · não realizada'),'atraso e compra futura com autoridades distintas');
ok(portfolio.includes('!activeMedicationIds.has(item.medicationId)')&&portfolio.includes('med.user_id === context.userId'),'contagens de rotas escopadas');
ok(portfolio.includes('activeMedicationIds.has(item.medicationId)'),'ações do Brain usam o mesmo conjunto ativo');
ok(home.includes('<HomeSupplyAccessTiles')&&home.includes('withdrawalPath="/saude/retiradas"')&&home.includes('supplyPath="/saude/fornecimento"'),'Home preserva rotas e extrai interface');
ok(home.includes('const go = (path: string) => { trigger("vibrate"); router.push(path); };'),'haptics e navegação permanecem no pai');
ok(home.includes('id="home-outras-areas" title=') && !home.includes('id="home-outras-areas" defaultOpen')&&home.includes('id="home-organizacao"'),'divulgações da Home mantidas');
ok(tiles.includes('onNavigate(withdrawalPath)')&&tiles.includes('onNavigate(supplyPath)')&&!/db\.|supabase|fetch\(/.test(tiles),'atalhos são puros e reais');
ok(tiles.includes('motion-reduce:transition-none')&&tiles.includes('focus-visible:outline'),'acessibilidade e movimento reduzido');
ok(tiles.includes('Programações, locais e histórico de retirada')&&read('scripts/test-home-today-v9-contract.mjs').includes('supplyTiles.includes("onNavigate(withdrawalPath)")'),'descrição V9 preservada no componente modular e rota testada');
ok(today.includes('todayTemporalGuidance({ isFuturo, isPassado, recorded, unconfirmed })')&&today.includes('data-temporal-authority'),'Hoje respeita origem temporal');
ok(today.includes('!isFuturo && recorded > 0')&&today.includes('safePercentage'),'progresso só usa registros reais');
ok(avatar.includes('Brain · {brief.posture}')&&avatar.includes('avatarCarePosture(portfolio.counts)'),'Fênix recebe postura e contagem canônicas');
ok(avatar.includes('data-care-status={carePosture.tone}')&&avatar.includes('Rota do cadastro ou histórico; não comprova retirada'),'Fênix explica incerteza');
ok(!/requestAnimationFrame\(|new THREE\./.test(avatar),'Fênix não adiciona WebGL/GPU');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('test-p15-r9-r5-performance-continuity.cjs')&&gate.includes('test-p15-r9-r4-evidence-home-fenix.cjs'),'gate integra R5 e preserva R4');
for(const legacy of ['test-v253-brain-readiness-calibration-avatar.cjs','test-v271-supply-index-medication-surfaces-avatar.cjs','test-v165-contextual-health.cjs','test-p15-r6-medication-routine-modules.cjs'])ok(gate.includes(legacy),'gate histórico preservado '+legacy);
console.log(`P15 R9 R5: ${count} contratos novos aprovados`);
