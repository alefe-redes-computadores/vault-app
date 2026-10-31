#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'), ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');let n=0;
function ok(value,label){assert(value,`P15 R6: ${label}`);console.log(`✓ ${++n}: ${label}`)}
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const summary=read('components/saude/MedicationRoutineSummary.tsx');
const hours=read('components/saude/MedicationDoseHourChips.tsx');
const avatar=read('components/saude/HealthAvatar3D.tsx');
const brain=read('lib/health-intelligence/avatar-decision-brief.ts');
for(const [path,code] of [
 ['detalhes.tsx',detail],['rotina.tsx',summary],['horarios.tsx',hours],
 ['avatar.tsx',avatar],['brain.ts',brain],
]) {const file=ts.createSourceFile(path,code,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(file.parseDiagnostics.length===0,`${path}: TS(X) parseável`)}
ok(detail.includes('<section id="medicamento-rotina"')&&detail.includes('<MedicationRoutineSummary')&&detail.includes('med.status !=='),'seção e restrição SOS/descontinuado preservadas');
for(const phrase of ['Quantidade registrada hoje','dosesTomadasHoje.length','formatKnownQuantitySummary(quantidadeHoje)','quantidadeHoje.complete','dosesResolvidasHoje','dosesEsperadasHoje','dosesTomadasProgramadasHoje','dosesIgnoradasProgramadasHoje','horariosTomadosHoje','horariosIgnoradosHoje','temEstoque'])ok(detail.includes(phrase),`estado canônico preservado na página: ${phrase}`);
ok(detail.includes('onClick={\n                    abrirQuickDose')&&detail.includes('QuickDoseModal'),'registro de dose não foi movido');
ok(detail.includes('med.status !== "descontinuado" || isSOS')&&detail.includes('MedicationDoseHistoryLink'),'V320: SOS e histórico preservados');
ok((detail.match(/vault-deferred/g)||[]).length>=5&&detail.includes('id="medicamento-receita"'),'V197: renderização diferida original preservada');
ok(summary.includes('todayQuantityLabel')&&summary.includes('todayQuantityPartial')&&summary.includes('last7DaysQuantityPartial'),'SOS não presume quantidade desconhecida');
ok(summary.includes('{resolvedToday}/{plannedToday}')&&summary.includes('ignoredScheduledToday'),'slot resolvido não se confunde com tomada');
ok(summary.includes('hasStockControl')&&summary.includes('sem controle de estoque'),'sem estoque controlado não impede dose');
ok(hours.includes('const ignorada = !tomada && ignored.has(horario)')&&hours.includes('"sem confirmação"'),'a hora tomada tem precedência e ausente não vira ignorada');
ok(hours.includes('readonly string[]')&&hours.includes('ReadonlySet<string>'),'UI usa conjuntos recebidos, sem recriar cálculo');
ok(!/\b(db\.|supabase|safeAdd|safeUpdate|marcarDose\(|fetch\(|useLiveQuery)/.test(summary+hours),'novos componentes não escrevem nem consultam dados');
ok(!summary.includes('useEffect(')&&!hours.includes('useEffect('),'sem novo ciclo de efeitos');
ok(avatar.includes('opacity:.79')&&avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')&&avatar.includes('roughness: .90'),'pele/olhos/legado visual preservados');
ok(avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(animate)'),'WebGL preserva cleanup e budget');
const code=ts.transpileModule(brain,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('exports','module',code)(m.exports,m);const brief=m.exports.buildAvatarDecisionBrief;
const projected=brief({evidenceKind:'projected',reason:'Detalhe \u202e enganoso \u2067 inválido',overdueWithdrawals:2,missingDocuments:3});
ok(!/[\u202a-\u202e\u2066-\u2069]/.test(projected.explanation),'caracteres bidirecionais invisíveis removidos das evidências');
ok(projected.explanation.includes('Projeção não confirma realização.')&&projected.explanation.includes('2 retirada')&&projected.explanation.includes('3 documento'),'aviso e pendências sobreviveram à sanitização');
ok(brief({evidenceKind:'association',reason:'Coincidência'}).explanation.includes('Associação temporal não demonstra causa.'),'correlação permanece não causal');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-p15-r6-medication-routine-modules.cjs'),'novo contrato adicionado ao gate global');
console.log(`P15 R6: ${n} contratos locais aprovados`);
