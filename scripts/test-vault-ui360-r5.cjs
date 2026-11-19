#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
const ok=(x,label)=>{assert.ok(x,'UI360 R5: '+label);console.log('✓ R5 '+label);};
const targets=[
 'lib/health-hub/r5.ts','components/saude/HealthHubLauncherR5.tsx',
 'components/saude/HealthHubSwitchR5.tsx','components/saude/NetworkHubNavigatorR5.tsx',
 'components/saude/CareFlowRelationsR5.tsx','components/home/HomeCommandCenter.tsx',
 'app/saude/minha-saude/page.tsx','app/saude/rede/page.tsx',
 'app/saude/careflow/exames/page.tsx','app/saude/medicos/detalhes/page.tsx'
];
for(const p of targets){
 const code=read(p);const ast=ts.createSourceFile(p,code,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,'parse TypeScript/TSX '+p);
}
const p='lib/health-hub/r5.ts',mod=new Module(p,module);
mod._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,p);
const u=mod.exports;
const ids=u.HEALTH_MODULES_R5.map(x=>x.id);
ok(new Set(ids).size===ids.length&&ids.length>=16,'registro único com módulos reais');
ok(u.HEALTH_GROUPS_R5.length===4&&new Set(u.HEALTH_GROUPS_R5.map(x=>x.id)).size===4,'quatro grupos semânticos distintos');
ok(u.HEALTH_MODULES_R5.every(x=>x.href.startsWith('/saude/')&&!x.href.includes('javascript:')),'rotas locais e seguras');
ok(u.HEALTH_MODULES_R5.some(x=>x.id==='fenix'&&x.href==='/saude/fenix'),'Fênix e perfil preservados');
ok(u.HEALTH_MODULES_R5.some(x=>x.id==='seguranca'),'plano de segurança acessível');
ok(u.HEALTH_MODULES_R5.some(x=>x.id==='fontes'),'fontes, relógio e anel acessíveis');
let state=u.parseHubPreferencesR5({version:1,favorites:['exames','exames','foreign','pressao'],recent:['fenix','bad','fenix']});
ok(state.favorites.join(',')==='exames,pressao'&&state.recent.join(',')==='fenix','valida dados locais, remove desconhecidos e deduplica');
ok(!u.parseHubPreferencesR5({version:99,favorites:['exames']}).favorites.length,'formato desconhecido não é assumido');
ok(u.toggleHubFavoriteR5(['exames'],'pressao').join(',')==='exames,pressao','pin adiciona');
ok(u.toggleHubFavoriteR5(['exames'],'exames').length===0,'pin remove');
ok(u.moveHubFavoriteR5(['exames','pressao','fenix'],'fenix',-1).join(',')==='exames,fenix,pressao','reordena por botão');
ok(u.moveHubFavoriteR5(['exames','pressao'],'exames',-1).join(',')==='exames,pressao','reordenar fora dos limites não corrompe');
ok(u.recordHubRecentR5(['exames','fenix'],'fenix').join(',')==='fenix,exames','recentes sem duplicação');
ok(u.matchHubModuleR5(u.HEALTH_MODULES_R5.find(x=>x.id==='pressao'),'PRES'),'busca por duas letras/case insensitive');
ok(u.matchHubModuleR5(u.HEALTH_MODULES_R5.find(x=>x.id==='hidratacao'),'água'),'busca aceita acentos');
const now=new Date('2026-11-17T10:00:00-03:00');
const scope={userId:'u1',personId:'p1',now,consultations:[],events:[],favorites:[],recent:[]};
const f=more=>u.buildHealthFocusR5({...scope,...more});
ok(f({}).length===0,'sem evento e sem histórico não inventa foco');
ok(f({recent:['exames','fenix','pressao']}).map(x=>x.id).join(',')==='exames,fenix,pressao','fallback só usa histórico real do Hub');
ok(f({recent:['exames','fenix'],favorites:['exames']}).every(x=>x.id!=='exames'),'nenhum card duplicado com favoritos');
const appt=(status,date,person_id='p1')=>({user_id:'u1',person_id,status,data:date,horario:'08:00'});
ok(f({consultations:[appt('cancelada','2026-11-18')]}).length===0,'consulta cancelada não gera pré-consulta');
ok(f({consultations:[appt('agendada','2026-11-18')]}).some(x=>x.id==='dossie'),'pré-consulta comprovada sugere dossiê');
ok(f({consultations:[appt('agendada','2026-11-18','p2')]}).length===0,'sem cruzar consulta entre pessoas');
ok(f({consultations:[{...appt('agendada','2026-11-18'),user_id:'u2'}]}).length===0,'sem cruzar contas');
ok(f({consultations:[appt('realizada','2026-11-16')]}).some(x=>x.id==='pharmalens'),'pós-consulta explícita, sem confirmar leitura de receita');
ok(f({consultations:[appt('realizada','2026-10-05')]}).length===0,'consulta antiga não se torna pós-consulta novo');
const plan=(start,end,person_id='p1')=>({id:'plan',user_id:'u1',person_id,kind:'monitor_plan',parent_id:null,created_at:'2026-11-17T10:00:00',payload:{start,end}});
ok(f({events:[plan('2026-11-01','2026-11-20')]}).some(x=>x.id==='pressao'),'plano ativo real');
ok(f({events:[plan('2026-10-01','2026-10-15')]}).length===0,'plano encerrado não gera foco');
ok(f({events:[plan('2026-11-01','2026-11-20','p2')]}).length===0,'plano de outra pessoa não vaza');
const item={id:'item',user_id:'u1',person_id:'p1',kind:'exam_item',parent_id:'order',created_at:'2026-11-17',payload:{name:'exame'}};
ok(f({events:[item]}).some(x=>x.id==='exames'),'exame sem resultado confirmado');
ok(f({events:[item,{...item,id:'result',kind:'exam_result',parent_id:'item',payload:{result:'real'}}]}).length===0,'exame com resultado não finge pendência');
ok(f({events:[item,{...item,id:'cancel',kind:'exam_status',parent_id:'item',payload:{state:'cancelled'}}]}).length===0,'exame cancelado não gera pendência');
ok(f({events:[{...item,user_id:'u2'}]}).length===0,'sem vazamento entre contas nos exames');
const brain={person_id:'p1',state:'active',snapshot:{link:'/saude/careflow/exames',titulo:'Rever resultado cadastrado'}};
ok(f({brain:[brain]}).some(x=>x.id==='exames'),'Brain aponta apenas para módulo com rota canônica');
ok(f({brain:[{...brain,person_id:'p2'}]}).length===0,'Brain de outra pessoa bloqueado');
ok(f({brain:[{...brain,snoozed_until:'2099-01-01'}]}).length===0,'Brain adiado respeitado');
ok(f({brain:[{...brain,snapshot:{link:'https://example.com',titulo:'Injetado'}}]}).length===0,'Brain não inventa destino externo');
const h=read('components/saude/HealthHubLauncherR5.tsx');
ok(h.includes('Reorder.Group')&&h.includes('useDragControls')&&h.includes('moveHubFavoriteR5'),'arrastar e fallback acessível');
ok(h.includes('loadedScope===scope')&&h.includes('encodeURIComponent(userId)')&&h.includes('encodeURIComponent(personId)'),'dados locais escopados por conta/pessoa');
ok(h.includes('onOpenPersonalSection')&&h.includes('HubModuleTileR5')&&h.includes('matchHubModuleR5'),'módulos, busca e retorno ao perfil dedicado');
ok(h.includes('HealthHubSwitchR5')&&read('app/saude/rede/page.tsx').includes('HealthHubSwitchR5'),'troca rápida nos dois hubs');
ok(h.includes('motion-reduce:transition-none')&&h.includes('useReducedMotion'),'acessibilidade ao movimento');
ok(read('components/home/HomeCommandCenter.tsx').includes('description="CareFlow, exames, sinais e dossiê"'),'Home com descrição atualizada');
const health=read('app/saude/minha-saude/page.tsx');
for(const token of ['HealthHubLauncherR5','NewHealthDataSummary','<HealthBody key={personId}','id="meu-avatar"','DeferredHealthSection id="fontes"','DeferredHealthSection id="indicadores"','DeferredHealthSection id="historico"','HealthInsightSheet','ConfirmationModal'])ok(health.includes(token),'painel clínico antigo preservado: '+token);
ok(health.includes('profileOnly')&&health.includes('hashchange')&&health.includes('/saude/fenix'),'painel detalhado em pagina dedicada, hashes antigos preservados');
const network=read('app/saude/rede/page.tsx');
ok(network.includes('NetworkHubNavigatorR5')&&network.includes('Quem cuida de você')&&network.includes('Resumo da sua saúde'),'Rede sem perda das rotas legadas');
ok(network.includes('Acessos clínicos relacionados')&&network.includes('Resumo clínico vinculado'),'conteúdo clínico da Rede recolhido');
const rel=read('components/saude/CareFlowRelationsR5.tsx');
ok(rel.includes('order.user_id!==userId')&&rel.includes('order.person_id!==personId'),'chips CareFlow isolados por conta/pessoa');
ok(rel.includes('doctor_id')&&rel.includes('location_id')&&rel.includes('doctorOwnerId!==userId'),'somente vínculos explícitos e sem mistura entre titulares');
ok(read('app/saude/careflow/exames/page.tsx').includes('CareFlowOrderRelationsR5'),'exame vincula médico/local/consulta');
ok(read('app/saude/medicos/detalhes/page.tsx').includes('DoctorCareFlowRelationsR5'),'médico lista pedidos CareFlow ligados');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-ui360-r5.cjs"').length===2,'R5 uma única vez no gate V63');
ok(gate.includes('"scripts/test-vault-ui360-r4-final.cjs"')&&gate.includes('"scripts/test-vault-ci360-m3-p1.cjs"'),'R4 e M3 preservadas');
console.log('VAULT UI360 R5: módulos, favoritos, foco e isolamento de pessoa aprovados');
