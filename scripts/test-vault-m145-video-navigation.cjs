#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');
let n=0;
function ok(yes,label){assert.ok(yes,'M145: '+label);console.log('✓ M145 '+(++n)+' '+label)}
const files=[
 'app/page.tsx','app/mais/page.tsx','app/saude/retiradas/detalhes/page.tsx',
 'app/saude/minha-saude/page.tsx','components/PersonSelector.tsx',
 'components/saude/CareTrustPanelM119.tsx','components/health-intelligence/BrainCarePlan.tsx',
 'components/vault-intelligence/HealthInsightSheet.tsx','components/vault-intelligence/VaultInsightSheet.tsx',
 'components/saude/HealthAvatar3D.tsx','lib/medication-availability.ts',
 'lib/health-intelligence/plan-display-m145.ts'
];
for(const f of files){
 const source=read(f);
 const syntax=ts.createSourceFile(f,source,ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(syntax.parseDiagnostics.length===0,'Sintaxe '+f);
}
function pure(file){const js=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m=new Module(file,module);m._compile(js,file);return m.exports;}
const home=read(files[0]),more=read(files[1]),withdrawal=read(files[2]);
ok(withdrawal.includes('router.push(withReturnTarget(`/saude/renovacao/detalhes?') && withdrawal.includes('encodeURIComponent(backTarget)'), 'Aquisição vinculada propaga origem da retirada');
ok(withdrawal.includes('router.replace(\n                  backTarget'), 'Retirada mantém retorno contextual explícito');
ok(home.includes('withReturnTarget(`/saude/retiradas/detalhes?id=${retirada.id}`, "/")'), 'Home mantém contexto da retirada');
ok(home.indexOf('id="home-compromissos"')<home.indexOf('id="home-atencao"') && home.indexOf('id="home-compromissos"')<home.indexOf('id="home-brain"'), 'Agenda real vem antes das análises');
ok(home.includes('quantityAlreadyInBrain') && home.includes('item.entidadeId === quantityFollowUpInsight.entidadeId') && home.includes('quantidade confirmada fora do padrão'), 'Alerta de quantidade deduplicado por medicamento e fenômeno');
ok(home.includes('<HomeDoseQuantityFollowUp')&&home.includes('<HomeAttentionRail')&&home.includes('<HomeBrainEvidenceGroup'), 'Nenhuma autoridade clínica da Home foi excluída');
ok(more.indexOf('<OperationalReadinessM103') > more.indexOf('Dados & Nuvem'), 'Prontidão agora está em Dados & Nuvem');
ok((more.match(/<OperationalReadinessM103/g)||[]).length===1,'Prontidão não foi duplicada');
ok(more.includes('<PersonSelector mode="compact"')&&read(files[4]).includes('"compact"')&&read(files[4]).includes('mode === "compact"'), 'Pessoa ativa compacta sem segundo avatar no botão');
ok(!more.includes('className="absolute bottom-0 right-0 flex h-8 w-8')&&more.includes('aria-label="Configurações do perfil"'), 'Edição do perfil sem sobrepor fotografia');
ok(more.includes('<details open className="group rounded-[18px]') && more.includes('<VaultUpdateCenter />') && more.includes('Biometria') && more.includes('Lembretes'), 'Controles e Update Center visíveis inicialmente');
ok(more.includes('grid grid-cols-2 gap-2.5') && more.includes('item.id === "inteligencia" ? "col-span-2') && more.includes(': "col-span-2 min-h-[72px] sm:col-span-1"') && more.includes('mt-0.5 line-clamp-2 text-[11px]'), 'Acessos de Mais legíveis em lista no celular');
const medication=pure(files[10]);
const taken=medication.medicationIgnoredStatus({taken:1,ignored:1,pending:0,emptyStock:false});
ok(taken.label==='1 tomada · 1 ignorada'&&!taken.detail.includes('(s)'), 'Singular real para tomada e ignorada');
const plural=medication.medicationIgnoredStatus({taken:2,ignored:3,pending:1,emptyStock:false});
ok(plural.label==='2 tomadas · 3 ignoradas'&&plural.detail.includes('1 pendente'),'Plural real e dose pendente no singular');
const plan=pure(files[11]).isFutureDosePlanningM145;
ok(plan({evidenceKind:'projected',phenomenon:'schedule',title:'Cerumin: dose',dueDate:'2026-11-14'},'2026-11-13'),'Dose de amanhã é planejamento');
ok(!plan({evidenceKind:'projected',phenomenon:'schedule',title:'Cerumin: dose',dueDate:'2026-11-13'},'2026-11-13'),'Dose de hoje não some');
ok(!plan({evidenceKind:'recorded',phenomenon:'withdrawal',title:'Retirada',dueDate:'2026-11-14'},'2026-11-13'),'Retirada registrada não é filtrada');
ok(!plan({evidenceKind:'projected',phenomenon:'prescription',title:'Receita de amanhã',dueDate:'2026-11-14'},'2026-11-13'),'Receitas futuras continuam como tarefas próprias');
const brain=read(files[6]);
ok(brain.includes('expanded && !compact ? plan.items : plan.focus.slice(0, 2)')&&brain.includes('futureScheduleM145')&&brain.includes('Agendadas para depois'), 'Brain preserva plano original e desloca futuro para drawer');
ok(read(files[7]).includes('bg-black/85 backdrop-blur-md')&&read(files[8]).includes('bg-black/85 backdrop-blur-md'), 'Dois modais explicativos têm backdrop opaco');
ok(read(files[7]).includes('bg-void shadow-')&&read(files[8]).includes('bg-void p-5 shadow-'), 'Superfícies de explicação isoladas');
const health=read(files[3]);
ok(health.indexOf('id="meu-avatar"') < health.indexOf('<CareTrustPanelM119') && health.indexOf('<CareTrustPanelM119') < health.indexOf('id="avatar-care-workspace"'), 'Avatar principal vem antes dos vínculos auxiliares');
ok(read(files[5]).includes('Revisar vínculos individuais')&&read(files[5]).includes('audit.findings.map('), 'Vínculos agrupados sem perder origens individuais');
ok(read(files[9]).includes('M145: keep toes and ankles')&&read(files[9]).includes('element.clientWidth < 420'), 'Enquadramento de tênis mais amplo apenas no compacto');
ok(!read(files[9]).includes('requestAnimationFrame(() => requestAnimationFrame'), 'Nenhum loop de renderização paralelo adicionado');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('const contracts = [\n  "scripts/test-vault-m92-medication-premium-2.cjs",'),'M92 continua primeiro');
ok(gate.includes('"scripts/test-vault-m93-home-brain-documents.cjs",\n  "scripts/test-vault-m94-notifications-update.cjs",'),'M93 e M94 preservam posição');
ok(gate.split('"scripts/test-vault-m145-video-navigation.cjs"').length===2,'M145 entra no gate uma única vez');
for(const v of ['test-vault-m143-p2-consolidated.cjs','test-vault-m143-p3-closure.cjs','test-vault-brain-v7-universal.cjs','test-vault-supply-shield-ss7.cjs','test-vault-visual-studio-v8.cjs'])ok(gate.includes(v),'Gate legado preservado: '+v);
console.log(`VAULT M145 VIDEO 2: ${n} contratos aprovados`);
