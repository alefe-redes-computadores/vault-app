#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let n=0;
const ok=(value,msg)=>{assert.ok(value,`M146: ${msg}`);console.log(`✓ M146 ${++n}: ${msg}`);};
const files=[
 'app/page.tsx','app/mais/page.tsx','app/saude/minha-saude/page.tsx',
 'app/saude/medicamentos/page.tsx','app/saude/renovacao/detalhes/page.tsx',
 'app/saude/retiradas/nova/page.tsx','components/health-intelligence/BrainCarePlan.tsx',
 'components/vault-intelligence/HealthInsightSheet.tsx',
 'components/vault-intelligence/VaultInsightSheet.tsx','lib/ui/quantity-ptbr.ts',
 'lib/navigation/return-context.ts'
];
for(const file of files){
 const content=read(file);
 const ast=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,`TypeScript/TSX parse ${file}`);
}
function pure(path){
 const transpiled=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module=new Module(path,require.main);module.paths=module.constructor._nodeModulePaths(process.cwd());
 module._compile(transpiled,path);return module.exports;
}
const {formatPtBrQuantity}=pure('lib/ui/quantity-ptbr.ts');
ok(formatPtBrQuantity(0,'registro','registros')==='0 registros','Zero em plural natural');
ok(formatPtBrQuantity(1,'dia','dias')==='1 dia','Singular correto');
ok(formatPtBrQuantity(2,'tomada','tomadas')==='2 tomadas','Plural correto');
const {safeReturnTarget,withReturnTarget}=pure('lib/navigation/return-context.ts');
ok(safeReturnTarget('//externo.example/redirect','/saude/retiradas')==='/saude/retiradas','Retorno bloqueia origem externa');
ok(safeReturnTarget('https://evil.example/','/saude/renovacao')==='/saude/renovacao','Retorno bloqueia URL absoluta externa');
ok(safeReturnTarget('/saude/retiradas/detalhes?id=1&return_to=%2F','/saude/retiradas').startsWith('/saude/retiradas/detalhes'),'Retorno interno preserva query');
ok(withReturnTarget('/saude/renovacao/detalhes?id=1','/').includes('return_to=%2F'),'Retorno da Home propaga pelo filho');
// Residual Closure: real navigation guards and privacy projection (not a UI/Android claim).
for(const href of ['/%61pi/health','/aPi%2Fhealth','/%2F%2Fevil.example','/%5Cevil.example','/saude/%252Fapi','/saude/%00bad','/saude/%0Abad','/saude/%ZZ','/saude/%2e%2e/hoje','/saude/../hoje'])
 ok(safeReturnTarget(href,'/hoje')==='/hoje',`residual encoded/traversal path blocked: ${href}`);
for(const href of ['/','/saude/vital/evolucao','/saude/medicamentos/detalhes?id=x%2Fy#secao','/saude/retiradas?status=planejada','/saude/%C3%A1rea'])
 ok(safeReturnTarget(href,'/hoje')===href,`residual valid contextual route preserved: ${href}`);
ok(withReturnTarget('/saude/medicamentos/detalhes?id=2','/saude/medicamentos/detalhes?id=1').includes('return_to='),'residual same route distinct record remains navigable');
ok(!withReturnTarget('/hoje','/hoje').includes('return_to='),'residual self-return not introduced');
const {sanitizeClinicalBackHrefUX360,scrubLegacyClinicalQueryUX360}=pure('lib/ui/clinical-a10-filter-session-ux360.ts');
const back=(raw)=>sanitizeClinicalBackHrefUX360(safeReturnTarget(raw,'/saude/linha-clinica'));
const rawClinical='/saude/linha-clinica?busca=synthetic&inicio=2026-01-01&fim=2026-01-02&historico=1#fato';
ok(back(rawClinical)==='/saude/linha-clinica#fato','residual private search/period removed from return');
const detail='/saude/linha-clinica/detalhe?origem=medicamentos&id=opaque';
ok(back(detail+'&busca=synthetic&inicio=2026-01-01')===detail,'residual detail retains opaque ID/source without legacy filter');
const nested=detail+'&origin_from='+encodeURIComponent(rawClinical);
ok(new URL(back(nested),'https://vault.local').searchParams.get('origin_from')==='/saude/linha-clinica#fato','residual nested origin sanitized');
ok(back('/saude/linha-clinica?%2562usca=synthetic')==='/saude/linha-clinica','residual encoded search key stripped');
ok(back('/saude/linha-clinica?origin_from='+encodeURIComponent('https://evil.example'))==='/saude/linha-clinica','residual external nested origin removed');
ok(back(null)==='/saude/linha-clinica','residual default origin preserved');
const detailPage=read('app/saude/linha-clinica/detalhe/page.tsx');
ok(detailPage.includes("sanitizeClinicalBackHrefUX360(safeReturnTarget(params.get('return_to'),'/saude/linha-clinica'))")&&detailPage.includes('useEffect(()=>{scrubLegacyClinicalQueryUX360();},[params])'),'residual real detail uses privacy authority on links and current entry');
const previousWindow=global.window;
try {
 let replaced=null;
 const marker={next:'preserve'};
 global.window={location:{href:'https://vault.local'+detail+'&q=synthetic&inicio=2026-01-01&return_to='+encodeURIComponent(rawClinical)},history:{state:marker,replaceState:(state,title,url)=>{replaced={state,url}}}};
 scrubLegacyClinicalQueryUX360();
 ok(replaced&&replaced.state===marker&&new URL(replaced.url,'https://vault.local').searchParams.get('id')==='opaque'&&!replaced.url.includes('synthetic')&&!replaced.url.includes('inicio')&&new URL(replaced.url,'https://vault.local').searchParams.get('return_to')==='/saude/linha-clinica#fato','residual replaces current entry without losing opaque ID, Next state or origin');
}finally{if(previousWindow===undefined)delete global.window;else global.window=previousWindow;}
const navRenew=read('app/saude/renovacao/detalhes/page.tsx');
const navWithdrawal=read('app/saude/retiradas/nova/page.tsx');
ok(navRenew.includes('const returnTo = safeReturnTarget(rawReturnTo, "/saude/renovacao")')&&navRenew.includes('router.replace(returnTo)'), 'Detalhes da renovação preservam rota autorizada');
ok(navWithdrawal.includes('const returnTo = safeReturnTarget(rawReturnTo, "/saude/retiradas")')&&navWithdrawal.includes('router.replace(returnTo)'), 'Cadastro da retirada preserva rota autorizada');
const more=read('app/mais/page.tsx');
const pref=more.indexOf('Preferências e lembretes');
const prefClose=more.indexOf('</details>',pref);
const update=more.indexOf('<VaultUpdateCenter />');
const cloud=more.indexOf('Sincronização</h3>');
ok(pref>=0&&prefClose>pref&&update>prefClose&&cloud>update,'Update Center permanece visível mesmo após fechar preferências');
ok((more.match(/<VaultUpdateCenter\s*\/>/g)||[]).length===1,'Update Center montado uma única vez');
ok(more.includes('<details className="group rounded-[18px]')&&more.includes('<PersonSelector mode="compact"'),'M145: perfil compacto e preferências preservados');
ok(more.includes('aria-label="Acessos de saúde"')&&more.includes('router.push("/inteligencia")')&&more.includes('grid grid-cols-2 gap-2.5'), 'V198: Inteligência mantém largura total na grade');
ok(more.includes('formatPtBrQuantity(pendingQueueCount')&&more.includes('text-xs leading-snug text-ink-muted'), 'Status da sincronização legível e plural correto');
const health=read('app/saude/minha-saude/page.tsx');
const avatar=health.indexOf('id="meu-avatar"');
const panorama=health.indexOf('Panorama, mapa e vínculos do cuidado');
const trust=health.indexOf('<CareTrustPanelM119');
const workspace=health.indexOf('id="avatar-care-workspace"');
ok(avatar>=0&&panorama>avatar&&trust>panorama&&workspace>trust,'Fênix vem antes do panorama e de auditoria secundária');
ok((health.match(/Panorama, mapa e vínculos do cuidado/g)||[]).length===1&&health.includes('<CareJourney360'),'Mapa do cuidado sem duplicações e sem exclusão de recursos');
const med=read('app/saude/medicamentos/page.tsx');
const filtered=med.slice(med.indexOf('if (medicationFilter === "atencao")'),med.indexOf('if (medicationFilter === "continuos")'));
const grouped=med.slice(med.indexOf('// M146: a mesma regra executiva'),med.indexOf('if (precisaAcao)'));
for(const segment of [filtered,grouped]){
 ok(segment.includes('medicationCareStageNeedsAttention(')&&segment.includes('brainLane === "now" || brainLane === "prepare"')&&segment.includes('reasons.some(reason'), 'Filtro e grupo utilizam decisão executiva canônica');
}
ok(med.includes('className="mt-1 text-xs leading-relaxed text-amber-200" aria-label="Motivo da atenção"'),'Motivo de atenção legível');
const home=read('app/page.tsx');
ok(home.indexOf('id="home-compromissos"')<home.indexOf('id="home-atencao"')&&home.indexOf('id="home-atencao"')<home.indexOf('id="home-brain"'),'M145: agenda preserva precedência sobre alertas e Brain');
ok(home.includes('<p className="sr-only" role="note">')&&home.includes('<HomeDailyHero'),'Nota complementar acessível sem ocupar a primeira dobra');
const brain=read('components/health-intelligence/BrainCarePlan.tsx');
ok(brain.includes('formatPtBrQuantity(plan.consultationWindow.days')&&brain.includes('formatPtBrQuantity(plan.items.length'),'Plano Brain com pluralização real');
ok(brain.includes('futureScheduleM145')&&brain.includes('Agendadas para depois')&&brain.includes('expanded && !compact ? plan.items : plan.focus.slice(0, 2)'),'M145: projeções futuras preservadas em detalhe, sem falsa urgência');
const healthSheet=read('components/vault-intelligence/HealthInsightSheet.tsx');
const vaultSheet=read('components/vault-intelligence/VaultInsightSheet.tsx');
ok(healthSheet.includes('bg-black/85 backdrop-blur-md')&&vaultSheet.includes('bg-black/85 backdrop-blur-md'),'M145: modais preservam plano de fundo escurecido');
ok(healthSheet.includes('text-[11px] font-bold uppercase text-ink-muted')&&vaultSheet.includes('formatPtBrQuantity(insight.sample'),'Legibilidade de evidências e contagem dos modais');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('const contracts = [\n  "scripts/test-vault-m92-medication-premium-2.cjs",\n  "scripts/test-vault-m93-home-brain-documents.cjs",\n  "scripts/test-vault-m94-notifications-update.cjs",'),'M92/M93/M94 mantidos como os primeiros contratos');
for(const token of ['test-vault-m143-p2-consolidated.cjs','test-vault-m143-p3-closure.cjs','test-vault-m145-video-navigation.cjs','test-vault-brain-v7-universal.cjs','test-vault-supply-shield-ss7.cjs','test-vault-visual-studio-v8.cjs'])
 ok(gate.includes(token),`Suite protegida ${token}`);
ok(gate.split('"scripts/test-vault-m146-premium-ux.cjs"').length===2,'M146 aparece uma vez no gate');
console.log(`VAULT M146 PREMIUM: ${n} contratos aprovados`);

// Residual Closure: consumer regressions in the existing permanent gate.
require('./test-vault-residual-consumers.cjs');
