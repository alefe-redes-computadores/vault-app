#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const files=['components/saude/AvatarCareReadiness.tsx','components/saude/AvatarCareWorkspace.tsx','components/saude/AvatarAssociationSummary.tsx','components/saude/CareContinuityAvatarSummary.tsx','components/saude/HealthAvatar3D.tsx','components/saude/AvatarReadinessCounters.tsx','lib/health-intelligence/avatar-decision-brief.ts'];
const read=p=>fs.readFileSync(p,'utf8');
for(const p of files){const tree=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,p+' TS parse '+tree.parseDiagnostics.map(x=>x.messageText).join('; '));}
const m=new Module('lib/health-intelligence/avatar-decision-brief.ts',module);
m._compile(ts.transpileModule(read('lib/health-intelligence/avatar-decision-brief.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'lib/health-intelligence/avatar-decision-brief.ts');
const brief=m.exports.buildAvatarDecisionBrief;
assert.equal(brief({title:'Retirada agendada',reason:'Confirmar no local',evidenceKind:'recorded'}).authority,'Fato registrado');
assert.equal(brief({title:'Estimativa',evidenceKind:'projected'}).authority,'Projeção, não confirmação');
assert.match(brief({evidenceKind:'association'}).authority,/não causal/);
assert.match(brief({evidenceKind:'missing_data'}).explanation,/Faltam dados/);
assert.match(brief({title:'Receita',overdueWithdrawals:2}).explanation,/2 retirada/);
assert.match(brief({counts:{overdue:1,prepare:2,unknown:3}}).explanation,/3 para esclarecer/);
assert(!brief({reason:'A'.repeat(500)}).explanation.includes('A'.repeat(400)),'reason is bounded');
const ready=read(files[0]),workspace=read(files[1]),associations=read(files[2]),care=read(files[3]),avatar=read(files[4]),count=read(files[5]);
assert(ready.includes('buildAvatarDecisionBrief(')&&ready.includes('command?.decision')&&ready.includes('planFocus.priorityScore')&&ready.includes('planFocus.confidence === "high"')&&ready.includes('planFocus?.supplyRoute'),'Brain source, score and confidence preserved');
assert(ready.includes('healthSignal?.records7d')&&ready.includes('medicationSignal?.temporaryCoursesOpen')&&ready.includes('accessSignal?.withdrawals.overdue')&&ready.includes('accessSignal?.documents.explicitMissing')&&ready.includes('archiveSignal?.plannedPrescriptions'),'V325/326/327 true evidence indicators');
assert(ready.includes('nextAction.title')&&ready.includes('line-clamp-1')&&ready.includes('change.label'),'V257/265 legacy operational summary and contextual change');
assert(ready.includes('planFocus?.href')&&ready.includes('compareCarePlan')&&ready.includes('readCarePlanMemory')&&ready.includes('(!portfolio.items.length && !forecast?.actions.length)'),'shared plan/owner and navigation preserved');
assert(workspace.includes('<AvatarCareReadiness')&&workspace.includes('<AvatarReadinessCounters')&&workspace.includes('id="avatar-contexto-evidencias"')&&workspace.includes('{() => <AvatarEvidenceWorkspace'),'Avatar primary and lazily mounted secondary preserved');
assert(workspace.includes('CareContinuityAvatarSummary')&&workspace.includes('AvatarAssociationSummary')&&workspace.includes('command?.documents?.items?.length'),'source-bound evidence visibility');
assert(count.includes('filter(item=>Number.isFinite(item.value)&&item.value>0)')&&count.includes('min-[390px]:grid-cols-3'),'hide false zero cards, keep mobile responsive');
assert(associations.includes('items.slice(1).slice(0,5)') && associations.includes('aria-expanded={showAll}')&&associations.includes('visibleAdditional.map')&&associations.includes('Observações não estabelecem causa nem diagnóstico'),'bounded non-causal associations');
assert(care.includes('const closest=useMemo(')&&care.includes('overview?.ready.flatMap')&&care.includes('AvatarWeekCoverage'),'linear memoized earliest consultation and weekly evidence');
assert(avatar.includes('P12: tecidos com difusão fosca')&&avatar.includes('P8: pele e olhos menos plastificados')&&avatar.includes('P9: transição de luz no rosto')&&avatar.includes('P10: pelos e lábios')&&avatar.includes('P11: acabamento fosco'),'cumulative Avatar refinements');
assert(avatar.includes('opacity: .42')&&avatar.includes('opacity:.075')&&avatar.includes('avatarAdaptiveRatio(')&&avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(function'),'V273/P8 optics and GPU limits intact');
console.log('VAULT P12: Brain honesty and clarity, on-demand Avatar, bounded context, memoization and GPU OK');
