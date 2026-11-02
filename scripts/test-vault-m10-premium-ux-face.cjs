#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let passed=0;
const ok=(v,label)=>{assert.ok(v,'M10: '+label);console.log(`✓ ${++passed}: ${label}`)};
const paths=[
 'components/saude/HealthAvatar3D.tsx','app/page.tsx','app/hoje/page.tsx',
 'components/saude/MedicationFilterBar.tsx','app/saude/tratamentos/page.tsx',
 'components/saude/TreatmentCareLinks.tsx','app/saude/medicamentos/detalhes/page.tsx',
 'app/saude/minha-saude/page.tsx','scripts/test-v177-avatar-render-budget.cjs',
];
for(const path of paths){
 const data=read(path);
 if(path.endsWith('.tsx')){
   const tree=ts.createSourceFile(path,data,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   const errors=tree.parseDiagnostics.map(d=>{const pos=tree.getLineAndCharacterOfPosition(d.start||0);return `${pos.line+1}:${pos.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`});
   ok(errors.length===0,`${path} sintaxe: ${errors.join('; ')}`);
 }
 ok(data.endsWith('\n')&&!data.endsWith('\n\n'),`${path} EOF válido`);
}
const scene=read(paths[0]),home=read(paths[1]),today=read(paths[2]),filter=read(paths[3]);
const treatments=read(paths[4]),links=read(paths[5]),detail=read(paths[6]),health=read(paths[7]),v177=read(paths[8]);
ok(scene.includes('M10_FACE_GUARD_NATIVE_JAW')&&scene.includes('new THREE.SphereGeometry(.151,20,12)'), 'mandíbula usa geometria convexa nativa de limites fixos');
ok(!scene.includes('new THREE.ExtrudeGeometry(jawShape')&&!scene.includes('const jawShape=new THREE.Shape()'),'extrusão/triangulação da mandíbula removida');
ok(scene.includes('const jaw=mesh(jawGeometry,materials.skin,0,2.657,.018,[1,.79,.63])'),'escala local do rosto delimitada');
ok(scene.includes('cheekbone.scale.y=.95')&&scene.includes('noseContour.scale.x=.97'),'refinamentos M9 preservados');
ok(scene.includes('taperedBox(.055,.068,.074,.034)')&&scene.includes('renderer.forceContextLoss()')&&scene.includes('avatarAdaptiveRatio('),'proteção Android, GPU e bochechas anteriores preservadas');
ok(!scene.includes('requestAnimationFrame(animate)')&&scene.includes('powerPreference: "low-power"'),'sem loop contínuo e WebGL econômico');
const THREE=require('three');
const jaw=new THREE.SphereGeometry(.151,20,12);jaw.scale(1,.79,.63);jaw.computeBoundingBox();
const bb=jaw.boundingBox;const dim=bb.getSize(new THREE.Vector3());
ok(dim.x<=.303&&dim.y<=.242&&dim.z<=.194,'geometria real da mandíbula fica dentro de envelope submétrico');
jaw.dispose();
ok(v177.includes('M10_FACE_GUARD_NATIVE_JAW')&&v177.includes("!scene.includes('new THREE.ExtrudeGeometry(jawShape')"),'V177 agora exige a geometria segura sem perder testes anteriores');
ok(home.includes('defaultOpen={longitudinalHighlights.some(')&&home.includes('&& unifiedAlerts.length === 0}'),'Brain não duplica automaticamente trilho de alertas operacionais');
ok(home.includes('longitudinalHighlights.map(')&&home.includes('setInsightExplicado(')&&home.includes('HomeAttentionRail'),'análise continua acessível com explicação local e alerta prioritário');
ok(today.includes('VAULT_TODAY_FILTERS_V97')&&today.includes('min-w-[11rem]')&&today.includes('aria-label="Filtrar doses por período do dia"'),'filtro de período compacto, explicável e acessível');
ok(today.includes('toggleTodayPeriod(')&&today.includes('toggleTodayStatus(')&&today.includes('TodayRoutinePulse')&&today.includes('TodayBatchAction'),'filtros e ações de doses permanecem com autoridades originais');
ok(filter.includes('"Filtros"')&&filter.includes('useState(false)')&&filter.includes('setExpanded(false)'),'filtros adicionais recolhidos e sem substituir estado canônico');
ok(filter.includes('min-h-11')&&filter.includes('aria-pressed={value === key}')&&filter.includes('onChange(next)'),'alvos táteis e seleção preservados');
ok(treatments.includes('aria-label="Panorama dos tratamentos"')&&treatments.includes('<ClinicalListSummary'),'resumo geral sob demanda sem retirar métricas');
ok(treatments.includes('tratamento.alertaPrincipal && !(tratamento.medicamentosCount === 0'),'ausência de vínculo não repete alerta no card');
ok(treatments.includes('Nenhum tratamento encontrado')&&treatments.includes('medicamentosResumo.map')&&treatments.includes('withReturnTarget('),'lista mantém busca, medicamentos e deep links');
ok(links.includes('M10_EMPTY_TREATMENT_LINKS')&&links.includes('!loading && !hasRelations')&&links.includes('<details'),'seis zeros não dominam tratamento vazio');
ok(links.includes('counts.map(({label,value})')&&links.includes('Um vínculo só aparece quando está salvo explicitamente'),'resumo vazio auditável, sem inferir relações');
ok(links.includes('visibleProcesses.map')&&links.includes('visibleWithdrawals.map')&&links.includes('isFutureAcquisition(')&&links.includes('isPrescriptionOnly('),'processo, retirada, receita e compra mantêm origens separadas');
ok(detail.includes('M10_NAME_SUGGESTION_ON_DEMAND')&&detail.includes('Comparar nomes e revisar sugestão')&&detail.includes('handleAcceptNameCorrection')&&detail.includes('handleDismissNameCorrection'),'comparação de catálogo opcional, ambas decisões preservadas');
ok(detail.includes('O Vault não considera automaticamente o cadastro incorreto.')&&detail.includes('<MedicationCatalogNameComparison'),'sugestão não vira erro clínico presumido');
ok(health.includes('min-h-[60px]')&&health.includes('line-clamp-2')&&health.includes('aria-expanded={open}'),'Minha Saúde ocupa menos altura sem perder disclosures acessíveis');
ok(health.includes('<HealthBody key={personId}')&&health.includes('<AvatarCareWorkspace')&&health.includes('<HealthTrendsExplorer'),'Avatar, Brain e análises preservados');
const gate=read('scripts/test-v63-release-gate.mjs');for(let n=1;n<=10;n++)ok(gate.includes(`test-vault-m${n}-`),`gate M${n} cumulativo`);
console.log(`VAULT M10 — ${passed} verificações: hierarquia visual, segurança clínica e geometria Android OK`);
