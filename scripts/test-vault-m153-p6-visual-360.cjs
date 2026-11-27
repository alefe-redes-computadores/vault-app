#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
const ok=(v,label)=>{assert.ok(v,`P6: ${label}`);console.log('✓ P6 '+String(++checks).padStart(2,'0')+' '+label)};
const changed=[
'app/page.tsx','app/saude/medicamentos/page.tsx','components/vault-intelligence/HealthInsightSheet.tsx',
'components/home/HomeDoseQuantityFollowUp.tsx','components/saude/PharmaLensWorkspaceV7.tsx',
'app/saude/consultas/page.tsx','components/saude/HealthAvatar3D.tsx','lib/health-profile/avatar-framing.ts',
'components/health-intelligence/BrainActiveProbeCard.tsx','lib/health-intelligence/active-probing/reconcile.ts',
'lib/health-intelligence/active-probing/questions.pt-BR.ts','components/home/HomeEssentialToggleM118.tsx',
'components/health-intelligence/ClinicalSnapshotP6.tsx','components/saude/PharmaLensGuidedReviewP6.tsx',
'lib/health-intelligence/dose-24h-visual-p6.ts','lib/health-intelligence/active-probing/quiet-p6.ts'
];
for(const path of changed){const s=read(path);const ast=ts.createSourceFile(path,s,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(ast.parseDiagnostics.length===0,'TSX/TS parse '+path);}
const home=read('app/page.tsx'),meds=read('app/saude/medicamentos/page.tsx'),clinical=read('components/vault-intelligence/HealthInsightSheet.tsx');
ok(!home.includes('data-vault-home-filters-p6')&&home.includes('Leitura humana do VAULT Brain')&&home.includes('data-vault-home-optional-p6'), 'Home sem filtros ou contadores tecnicos como titulo');
ok(meds.includes('aria-label="Organizar medicamentos"')&&(meds.includes('BottomSheet isOpen={visualFilterSheetOpenR1}') && meds.includes('Limpar filtros'))&&meds.includes('MedicationFilterBar value={medicationFilter}')&&meds.includes('chooseCardDensity(true)')&&meds.includes('chooseCardDensity(false)'), 'medicamentos card unico, filtros recolhidos, densidades preservadas');
ok((meds.match(/data-vault-density-control="canonical-single"/g)||[]).length===1, 'um grupo canonico de densidade');
ok(meds.includes('medsPendentesHoje.map(renderCard)')&&meds.includes('data-vault-executive-density={compactCards?"compact":"comfort"}')&&meds.includes('compactCards ? "gap-0.5" : "gap-2"')&&meds.includes('setQuickDoseMedId(med.id!)')&&meds.includes('actionLayoutM150P3.primary === "dose" ? quickActionButtonM150P3 : null'), 'cronologia e CTA preservadas');
ok(clinical.includes('ClinicalSnapshotP6')&&clinical.includes('insight.acaoSegura')&&clinical.includes('insight.limitacaoSeguranca')&&clinical.includes('regulatory.sources.map'), 'B05 visual e textos obrigatorios com fonte');
ok(read('components/home/HomeDoseQuantityFollowUp.tsx').includes('doseEvidence={{comparable:false}}'), 'quantidade em mg indisponivel quando unidade nao comparavel');
ok(read('components/saude/PharmaLensWorkspaceV7.tsx').includes('PharmaLensGuidedReviewP6')&&read('components/saude/PharmaLensGuidedReviewP6.tsx').includes('não executa OCR'), 'PharmaLens guiado sem alegar OCR executado');
ok(read('app/saude/consultas/page.tsx').includes('Preparar resumo · 30 dias')&&read('app/saude/registros/relatorio/page.tsx').includes('buildConsultationBrief'), 'Consulta CTA reutiliza resumo real');
ok(read('components/saude/HealthAvatar3D.tsx').includes('renderer.forceContextLoss()')&&read('lib/health-profile/avatar-framing.ts').includes('verticalRatio'), 'Fenix GPU e aspect ratio');
ok(read('components/health-intelligence/BrainActiveProbeCard.tsx').includes('probeDisplayAllowedP6')&&read('lib/health-intelligence/active-probing/reconcile.ts').includes('eventMs+2*60*60*1000'), 'SOS confirmado H+2 e cooldown opt-in');
ok(read('components/home/HomeEssentialToggleM118.tsx').includes('dataset.vaultHomeEssentialP6')&&read('app/globals.css').includes('[data-vault-home-optional-p6]'), 'Modo Essencial esconde secundarios reais');
function pure(file){const m=new Module(file,module);m._compile(ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;}
const compare=pure('lib/health-intelligence/dose-24h-visual-p6.ts').dose24hComparisonP6;
ok(compare({confirmedTotalMg:40,officialReferenceMg:10,comparable:false,officialSourceVerified:true,referenceLabel:'bula'}).status==='unavailable','nunca converte quantidade incompatível');
ok(compare({confirmedTotalMg:40,officialReferenceMg:10,comparable:true,officialSourceVerified:false,referenceLabel:'bula'}).status==='unavailable','referencia nao verificada bloqueia barra');
ok(compare({confirmedTotalMg:40,officialReferenceMg:10,comparable:true,officialSourceVerified:true,referenceLabel:'bula'})?.barPercent===100,'barra comparavel tem teto visual e preserva total numerico');
ok(compare({confirmedTotalMg:-1,officialReferenceMg:10,comparable:true,officialSourceVerified:true,referenceLabel:'bula'}).status==='unavailable','negativo nunca exibido');
const quiet=pure('lib/health-intelligence/active-probing/quiet-p6.ts').probeDisplayAllowedP6;
const now=new Date(2026,10,15,14,0,0),late=new Date(2026,10,15,23,0,0);
const probe={id:'p1',user_id:'owner',person_id:'person',status:'eligible',due_at:now.toISOString(),updated_at:now.toISOString(),trigger_type:'confirmed_sos_use'};
ok(quiet(probe,[],now),'sondagem permitida com opt-in fora do silencio');
ok(!quiet(probe,[],late),'silencio noturno para novas perguntas');
ok(quiet({...probe,status:'shown'},[],late),'pergunta ja exibida nao some antes da resposta');
ok(!quiet(probe,[{...probe,id:'p2',status:'dismissed'}],now),'outra pergunta dispensada hoje aciona cooldown');
ok(quiet(probe,[{...probe,id:'p2',status:'dismissed',person_id:'pessoa-alheia'}],now),'nao usa historico de outra pessoa');
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m153-p6-visual-360.cjs"'), 'gate V63 integra P6');
console.log('M153 P6 — '+checks+' contratos estruturais, seguranca e apresentacao aprovados');
