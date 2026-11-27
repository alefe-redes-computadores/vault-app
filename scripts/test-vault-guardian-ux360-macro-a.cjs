#!/usr/bin/env node
'use strict';
/** Hermetic Guardian Macro A regression tests; never reads a user database. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let count=0;
const failures=[];
function ok(desc,fn){
 const index=++count;
 try { fn(); console.log('✓ MACRO A '+String(index).padStart(3,'0')+' '+desc); }
 catch(error){
  const details=error && error.stack ? String(error.stack) : String(error);
  failures.push({index,desc,details});
  console.error('✗ MACRO A '+String(index).padStart(3,'0')+' '+desc+'\n'+details);
 }
}
function load(p,mocks={}){
 const js=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function('module','exports','require',js)(m,m.exports,name=>{if(Object.hasOwn(mocks,name))return mocks[name];throw new Error('Dependencia nao permitida em teste puro: '+name)});
 return m.exports;
}
const paths=[
 'components/saude/ClinicalBackLinkP0.tsx', 'lib/navigation/return-context.ts',
 'lib/navigation/clinical-return-m150.ts','lib/navigation/clinical-directory-m150.ts',
 'lib/health-hub/r5.ts','app/saude/minha-saude/page.tsx', 'app/saude/mapa/page.tsx',
 'app/saude/rede/page.tsx','app/saude/careflow/page.tsx',
 'components/saude/BrainV7UniversalConsole.tsx','app/saude/linha-clinica/page.tsx',
 'app/saude/consultas/detalhes/page.tsx','app/saude/cirurgias/detalhes/page.tsx',
 'app/saude/cids/detalhes/page.tsx','app/saude/medicamentos/historico/page.tsx',
 'components/BottomNav.tsx','app/saude/fenix/page.tsx',
 'app/saude/careflow/pressao/page.tsx','hooks/useReturnContext.ts',
 'app/saude/linha-clinica/detalhe/page.tsx',
 'scripts/test-v63-release-gate.mjs'
];
for(const p of paths){ok('TS/TSX parse ou integridade '+p,()=>{
 if(p.endsWith('.mjs')){assert(read(p).includes('scripts/test-vault-guardian-ux360-macro-a.cjs'));return;}
 const src=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(src.parseDiagnostics.length,0,src.parseDiagnostics.map(x=>x.messageText).join('; '));
})}
const u=load('lib/navigation/return-context.ts');
const c=load('lib/navigation/clinical-return-m150.ts',{'@/lib/navigation/return-context':u});
const valid=['/saude/consultas?id=abc','/saude/mapa?q=pressao#resultado','/saude/fenix#fontes','/hoje?focus=doses'];
for(const v of valid)ok('Origem valida '+v,()=>assert.equal(u.safeReturnTarget(v,'/'),v));
for(const v of ['//evil.example','https://evil.example','javascript:alert(1)','/\\evil.com','/api/privado','/api','/saude/medicamentos\nhttps://bad',''])ok('Rejeita retorno '+JSON.stringify(v),()=>assert.equal(u.safeReturnTarget(v,'/saude/mapa'),'/saude/mapa'));
ok('Remove retorno aninhado sem perder busca/hash',()=>assert.equal(u.safeReturnTarget('/saude/mapa?q=pressao&return_to=%2Fsaude%2Fconsultas#abc','/'),'/saude/mapa?q=pressao#abc'));
ok('Retorno auto-referente usa fallback',()=>assert.equal(c.safeClinicalReturnM150('/saude/mapa?q=teste','/saude/mapa','/'),'/'));
ok('Mesma rota e estado idêntico não gera autorretorno',()=>assert.equal(u.withReturnTarget('/saude/mapa?f=1','/saude/mapa?f=1'),'/saude/mapa?f=1'));
ok('Mesma rota com filtro diferente preserva a origem',()=>{const link=u.withReturnTarget('/saude/mapa?f=1','/saude/mapa');assert.equal(new URL(link,'https://vault.local').searchParams.get('return_to'),'/saude/mapa')});
ok('Subrota mantém origem mais filtros',()=>assert.equal(c.safeClinicalReturnM150('/saude/mapa?q=clinica#resultado','/saude/brain-v7','/saude/minha-saude'),'/saude/mapa?q=clinica#resultado'));
ok('Proíbe dominio externo em M150',()=>assert.equal(c.safeClinicalReturnM150('//evil.org','/saude/brain-v7','/saude/mapa'),'/saude/mapa'));
ok('Preserva retorno original de A10',()=>assert(u.withReturnTarget('/saude/careflow/fato?id=f1','/saude/linha-clinica?dominio=doses&busca=2026').includes('return_to=%2Fsaude%2Flinha-clinica%3Fdominio%3Ddoses%26busca%3D2026')));
const d=load('lib/navigation/clinical-directory-m150.ts');
const original=d.clinicalDirectoryM150.flatMap(g=>g.items);
const extras=d.clinicalAdditionalSectionsM150.flatMap(g=>g.items);
const all=[...original,...extras];
ok('Diretorio existente mantido',()=>assert(original.length>=31));
const expectedExtraRoutes={"reabilitacao":"/saude/reabilitacao","vacinas":"/saude/vacinas","procedimentos-a9":"/saude/procedimentos","reacoes-a9":"/saude/reacoes","engenharia-clinica":"/saude/engenharia-clinica","relatorio":"/saude/relatorios","rede-medicos":"/saude/medicos","rede-hospitais":"/saude/hospitais","rede-farmacias":"/saude/farmacias","fenix-indicadores":"/saude/fenix#indicadores","fenix-fontes":"/saude/fenix#fontes","vital":"/saude/vital","vital-treinos":"/saude/vital/treinos","vital-nutricao":"/saude/vital/nutricao","vital-evolucao":"/saude/vital/evolucao","vital-planos":"/saude/vital/planos"};
const assertExtraRoutes=()=>{assert.equal(extras.length,16);for(const [id,href] of Object.entries(expectedExtraRoutes))assert.equal(extras.filter(x=>x.id===id&&x.href===href).length,1,`Destino ausente/duplicado: ${id} ${href}`);};
ok('Onze destinos históricos e cinco Vital, IDs e rotas exatos',assertExtraRoutes);
ok('Nenhum destino duplicado por URL',()=>assert.equal(new Set(all.map(e=>e.href)).size,all.length));
ok('Nenhum ID duplicado',()=>assert.equal(new Set(all.map(e=>e.id)).size,all.length));
for(const e of extras)ok('Rota complementar existente '+e.href,()=>{const route=e.href.split(/[?#]/,1)[0];assert(fs.existsSync(path.join('app',route,'page.tsx')),'Rota não existe: '+route)});
for(const term of ['reabilitacao','fisioterapia','farmacias','medicos','vacina','procedimentos','relatorio medico','samsung','anel','terapia ocupacional'])ok('Busca complementar '+term,()=>assert(d.searchClinicalDirectoryM150(term).flatMap(g=>g.items).length>0));
ok('Busca não inventa novos módulos',()=>assert.equal(d.searchClinicalDirectoryM150('termo-nao-existente-290395').length,0));
const hub=load('lib/health-hub/r5.ts');
ok('Hub preserva IDs e favoritos',()=>assert(hub.HEALTH_MODULES_R5.some(x=>x.id==='fenix'&&x.href==='/saude/fenix')));
ok('Preferências de outra pessoa não são globalizadas',()=>assert(read('app/saude/mapa/page.tsx').includes('encodeURIComponent(uid)')&&read('app/saude/mapa/page.tsx').includes('encodeURIComponent(pid)')));
ok('Fonte de retorno preserva pesquisa',()=>assert(read('app/saude/mapa/page.tsx').includes('const sourceHref=')));
ok('Explorar conserva todos os destinos na apresentação única H03',()=>{const page=read('app/saude/mapa/page.tsx');assert(!page.includes('setShowAdditional')&&!page.includes('data-vault-map-density'));assert(page.includes('clinicalVisibleSectionsSTB(false)')&&page.includes('searchClinicalDirectoryM150(query)')&&page.includes('toggleHubFavoriteR5'));assert.deepEqual(d.clinicalVisibleSectionsSTB(false),d.clinicalVisibleSectionsSTB(true));assert.equal(d.clinicalHiddenCountSTB(),0);});
const flow=read('app/saude/careflow/page.tsx');
ok('Card principal corresponde ao real destino Linha Clínica',()=>assert(flow.includes('const primary=areas[0]')&&flow.includes('>Linha Clínica</strong>')&&!flow.includes('>Modo Médico 360</strong>')));
ok('PDFs têm card visível',()=>assert(flow.includes("cards:[areas[1],areas[3],areas[7]]")));
ok('Nenhum cartão perdeu associação',()=>{const m=flow.match(/otherGroups=\[\{label:[\s\S]*?\}\];/);assert(m);for(let i=1;i<9;i++)assert(m[0].includes('areas['+i+']'))});
ok('Fênix monta painel dedicado',()=>assert(read('app/saude/minha-saude/page.tsx').includes('const isFenix=')&&read('app/saude/minha-saude/page.tsx').includes('? <HealthDashboard')));
ok('Arquivo Fênix delegador intacto',()=>assert(read('app/saude/fenix/page.tsx').includes('return <MyHealthPage/>')));
ok('Back arrow não usa histórico adivinhado',()=>{const b=read('components/saude/ClinicalBackLinkP0.tsx');assert(b.includes('safeClinicalReturnM150')&&!b.includes('router.back()'))});
ok('Brain tem retorno contextual',()=>{const b=read('components/saude/BrainV7UniversalConsole.tsx');assert(b.includes('href={backHref}')&&b.includes('safeClinicalReturnM150'))});
for(const [p,fall] of [['app/saude/consultas/detalhes/page.tsx','/saude/consultas'],['app/saude/cirurgias/detalhes/page.tsx','/saude/cirurgias'],['app/saude/cids/detalhes/page.tsx','/saude/cids']])ok('Detalhe tem origem contextual '+p,()=>assert(read(p).includes('safeClinicalReturnM150(searchParams.get("return_to")')&&read(p).includes('"'+fall+'"')));
ok('Histórico de medicamento sem modificar doses',()=>assert(read('app/saude/medicamentos/historico/page.tsx').includes('safeClinicalReturnM150(searchParams.get("return_to")')));
ok('Linha Clínica ancora retorno ao fato e filtros',()=>assert(read('app/saude/linha-clinica/page.tsx').includes('id={"a10-"+encodeURIComponent(f.key)}')));
ok('BottomNav mantém replace intencional',()=>assert(read('components/BottomNav.tsx').includes('router.replace(path)')));
ok('Pressão mantém redirect existente',()=>assert(read('app/saude/careflow/pressao/page.tsx').includes('preserveReturnTarget("/saude/registros?foco=pressao"')));
ok('Gate V63 registra Guardian uma vez',()=>assert.equal(read('scripts/test-v63-release-gate.mjs').split('"scripts/test-vault-guardian-ux360-macro-a.cjs"').length-1,1));
const ids=['NAV-01','NAV-02','NAV-03','NAV-04','NAV-05','NAV-06','NAV-07','NAV-08','NAV-09','NAV-10','NAV-11','NAV-12','HUB-01','HUB-02','HUB-03','HUB-04','HUB-05','HUB-06','HUB-07','HUB-08','CL-03'];
ok('21 IDs da Macro A preservados',()=>{const text=read('scripts/test-vault-guardian-ux360-macro-a.cjs');assert.equal(ids.length,21);for(const id of ids)assert(text.includes(id))});
const identityCases={
 'NAV-01':()=>assert(read('app/saude/minha-saude/page.tsx').includes('const isFenix=')),
 'NAV-02':()=>assert.equal(c.safeClinicalReturnM150('/saude/consultas/detalhes?id=1','/saude/consultas/detalhes','/saude/consultas'),'/saude/consultas'),
 'NAV-03':()=>assert(!read('components/saude/ClinicalBackLinkP0.tsx').includes('router.back()')),
 'NAV-04':()=>assert.equal(c.safeClinicalReturnM150('/saude/mapa?q=cid#abc','/saude/cids/detalhes','/saude/cids'),'/saude/mapa?q=cid#abc'),
 'NAV-05':()=>assert(read('app/saude/cids/detalhes/page.tsx').includes('safeClinicalReturnM150(searchParams.get("return_to")')),
 'NAV-06':()=>assert(read('components/saude/BrainV7UniversalConsole.tsx').includes('href={backHref}')),
 'NAV-07':()=>assert(read('components/BottomNav.tsx').includes('router.replace(path)')),
 'NAV-08':()=>assert(read('app/saude/mapa/page.tsx').includes('returnHref={sourceHref}')),
 'NAV-09':()=>assert(read('app/saude/cirurgias/detalhes/page.tsx').includes('safeClinicalReturnM150(searchParams.get("return_to")')),
 'NAV-10':assertExtraRoutes,
 'NAV-11':()=>assert(read('app/saude/linha-clinica/page.tsx').includes('scrollIntoView')),
 'NAV-12':()=>assert.equal(c.safeClinicalReturnM150('/api/private','/saude/linha-clinica','/saude/mapa'),'/saude/mapa'),
 'HUB-01':()=>{const page=read('app/saude/mapa/page.tsx');assert(!page.includes('setShowAdditional')&&page.includes('clinicalVisibleSectionsSTB(false)')&&page.includes('searchClinicalDirectoryM150(query)'));assert.equal(d.clinicalHiddenCountSTB(),0);},
 'HUB-02':()=>assert.equal(new Set(all.map(e=>e.href)).size,all.length),
 'HUB-03':()=>assert(all.some(e=>e.href==='/saude/brain-v7')),
 'HUB-04':()=>assert(hub.HEALTH_MODULES_R5.some(e=>e.id==='medicamentos'&&e.title==='Medicamentos')),
 'HUB-05':()=>assert(flow.includes('>Linha Clínica</strong>')&&flow.includes("title:'PDFs clínicos'")),
 'HUB-06':()=>assert(hub.HEALTH_MODULES_R5.some(e=>e.id==='fenix'&&e.href==='/saude/fenix')),
 'HUB-07':()=>assert(d.searchClinicalDirectoryM150('farmácias').flatMap(g=>g.items).some(e=>e.href==='/saude/farmacias')),
 'HUB-08':()=>assert(hub.HEALTH_MODULES_R5.some(e=>e.id==='modo-medico'&&e.title==='Modo Médico')),
 'CL-03':()=>assert(flow.includes('cards:[areas[1],areas[3],areas[7]]')),
 'GX-01':()=>assert(extras.some(e=>e.href==='/saude/reabilitacao')),
 'GX-02':()=>assert(read('app/saude/careflow/pressao/page.tsx').includes('preserveReturnTarget(')),
 'GX-06':()=>{const page=read('app/saude/linha-clinica/page.tsx');assert(page.includes('encodeURIComponent(sourceBack)')&&page.includes('sanitizeClinicalBackHrefUX360')&&page.includes('persistReturnFilters')&&!page.includes("p.set('busca',query")&&!page.includes("params.get('busca')"));},
 'GX-08':()=>assert(read('components/saude/ClinicalBackLinkP0.tsx').includes('safeClinicalReturnM150')),
 'GM-06':()=>assert(flow.includes('>Linha Clínica</strong>')&&flow.includes('>Modo Médico</strong>')===false),
 'GM-07':()=>assert(read('app/saude/rede/page.tsx').includes('Outras áreas de saúde')&&read('app/saude/rede/page.tsx').includes('<HealthHubSwitchR5')),
 'NX-01':()=>assert(flow.includes('const primary=areas[0]')&&flow.includes('>Linha Clínica</strong>')),
 'NX-02':()=>assert(flow.includes('cards:[areas[1],areas[3],areas[7]]')),
};
for(const [id,check] of Object.entries(identityCases))ok(`Critério ${id} · contrato de regressão parcial`,check);
ok('Matriz Guardian 29 IDs exatos',()=>assert.equal(Object.keys(identityCases).length,29));
const androidFlows=Array.from({length:15},(_,i)=>'A'+String(i+1).padStart(2,'0'));
console.log('CONTRATOS_ID=29; TESTES_POSITIVOS_E_NEGATIVOS_PUROS=EXECUTADOS; Android '+androidFlows.join(',')+' = PENDENTE_FISICO');
console.log(`MACRO A: ${count} contratos automatizados. Fluxos A01–A15 e Android Back ainda requerem QA físico.`);

if (failures.length>0){
 console.error('GUARDIAN_MACRO_A_FALHAS_CONSOLIDADAS='+failures.length+' TOTAL_EXECUTADOS='+count);
 for(const item of failures) console.error('GUARDIAN_FALHA | '+item.index+' | '+item.desc+' | '+item.details.split('\n')[0]);
 process.exitCode=1;
}else{
 console.log('GUARDIAN_MACRO_A_COLETA_COMPLETA_OK='+count);
}
