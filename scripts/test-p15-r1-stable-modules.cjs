#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");let n=0;
function ok(check,name){assert(check,`P15 R1: ${name}`);n++;console.log(`✓ ${n}: ${name}`)}
const files=["app/saude/medicamentos/detalhes/page.tsx","app/hoje/page.tsx","components/saude/MedicationDoseEvolutionTimeline.tsx","lib/today/withdrawal-urgency-presentation.ts","components/home/HomeDailyHero.tsx","components/hoje/TodayRoutinePulse.tsx","components/saude/HealthAvatar3D.tsx","lib/health-intelligence/avatar-decision-brief.ts"];
for(const file of files){const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(tree.parseDiagnostics.length===0,`${file}: sintaxe TypeScript válida`)}
const [detail,today,timeline,style,home,pulse,avatar,briefSource]=files.map(read);
ok(detail.includes('import { MedicationDoseEvolutionTimeline }')&&detail.includes('<MedicationDoseEvolutionTimeline')&&detail.includes('history={med.historico_dosagens}'),"Detalhes delegam somente a linha do tempo visual");
ok(detail.includes('className="vault-deferred" history={med.historico_dosagens}')&&timeline.includes('className={`${className} space-y-3'),"V197: a classe de renderização progressiva permanece na página e no componente");
ok(detail.includes('formatDose={(dose)=>formatMedicationDosageDisplay(med.nome,dose)}')&&detail.includes('formatDay={formatDate}'),"Formatação existente de dosagem e data preservada");
ok(detail.includes('VAULT_BUP_DOSAGE_DISPLAY_V70')&&detail.includes('function formatMedicationDosageDisplay('),"Formatação e proteção V70 permanecem nos detalhes");
ok(detail.includes('Quantidade registrada hoje')&&detail.includes('Menor preço médio por farmácia:')&&detail.includes('`/saude/medicamentos/historico?id=${id}`'),"V319/V320/V70 permanecem legíveis");
ok(detail.includes('onClick={\n                    abrirQuickDose'.replace('\n','\n'.replace('\n','\n')))||detail.includes('abrirQuickDose'),"Ação de dose original continua nos detalhes");
ok(timeline.includes('[...history].reverse()')&&timeline.includes('formatDose(item.dosagem_antiga)')&&timeline.includes('formatDay(item.data_mudanca)'),"Evolução visual usa eventos sem mutação e preserva ordem antiga");
ok(!timeline.includes('db.')&&!timeline.includes('supabase')&&!timeline.includes('safeAdd')&&!timeline.includes('safeUpdate'),"Componente de evolução não escreve dados");
ok(today.includes('import { getDiasRestantesEstilo }')&&today.includes('getDiasRestantesEstilo('),"Hoje reutiliza apresentação de prazo");
const compiled=ts.transpileModule(style,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('module','exports',compiled)(m,m.exports);
const get=m.exports.getDiasRestantesEstilo;
for(const [v,label] of [[undefined,'Indefinido'],[null,'Indefinido'],[-2,'Urgente'],[3,'Urgente'],[4,'Em breve'],[7,'Em breve'],[8,'Atenção'],[14,'Atenção'],[15,'Tranquilo']])ok(get(v).label===label,`limite de prazo ${String(v)}: ${label}`);
ok(get(3).pulse&&!get(4).pulse,"Urgência não vira confirmação de retirada");
ok(home.includes('scheduled > 0')&&home.includes('Sem horários')&&home.includes('aria-valuetext={scheduled>0?'),"Home distingue nenhuma previsão de conclusão");
ok(pulse.includes('isPassado && recorded===0 ? "—"')&&pulse.includes('aria-live="polite"'),"Hoje não simula ausência como falha de adesão");
// P15 R1 R3: verify actual material and renderer behavior, never the revision number in a comment.
ok(/sneakers:\s*new THREE\.MeshStandardMaterial\(\{\s*color:\s*appearance\.sneakersColor,\s*roughness:\s*\.77\s*\}\)/.test(avatar)
  && avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')
  && avatar.includes('iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .53, metalness: .01 })')
  && avatar.includes('expressionEyeScaleY')
  && avatar.includes('renderer.forceContextLoss()')
  && !avatar.includes('requestAnimationFrame(animate)'),"Avatar preserva material real, olhos e WebGL sem laço extra");
const transformed=ts.transpileModule(briefSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const b={exports:{}};new Function('module','exports',transformed)(b,b.exports);const build=b.exports.buildAvatarDecisionBrief;
const projected=build({evidenceKind:'projected',reason:'Explicação extensa '.repeat(30),overdueWithdrawals:2,missingDocuments:3});
ok(projected.explanation.length<=370&&projected.explanation.includes('Projeção não confirma realização.')&&projected.explanation.includes('3 documento'),"Fênix reserva ressalva e mantém pendências");
ok(build({evidenceKind:'association',reason:'Sintomas simultâneos'}).explanation.includes('não demonstra causa'),"Brain não converte correlação em causa");
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-p15-r1-stable-modules.cjs'),"Contrato P15 R1 integra release gate");
console.log(`P15 R1: ${n} verificações de estabilidade aprovadas`);
