#!/usr/bin/env node
"use strict";
const fs=require("node:fs"), assert=require("node:assert/strict"), ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8"); let checked=0;
const ok=(check,message)=>{assert(check,`P15 R8: ${message}`);console.log(`✓ ${++checked}: ${message}`)};
const paths={
 home:'app/page.tsx',detail:'app/saude/medicamentos/detalhes/page.tsx',today:'app/hoje/page.tsx',
 rail:'components/home/HomeAttentionRail.tsx',comparison:'components/saude/MedicationCatalogNameComparison.tsx',
 hero:'components/home/HomeDailyHero.tsx',avatar:'components/saude/HealthAvatar3D.tsx',brain:'lib/health-intelligence/avatar-decision-brief.ts'
};
const s=Object.fromEntries(Object.entries(paths).map(([key,p])=>[key,read(p)]));
for(const [key,p] of Object.entries(paths)){
 const ast=ts.createSourceFile(p,s[key],ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,`Sintaxe TS/TSX ${p}`);
}
ok(s.home.includes('<HomeAttentionRail alerts={unifiedAlerts} description="O que merece prioridade agora" expanded={mostrarTodosAlertas}') && s.home.includes('renderAlert={alert => <AlertRow alert={alert} />}'), 'Home mantém priorização e componente original de cada alerta');
ok(s.home.includes('onToggle={() => { trigger("vibrate"); setMostrarTodosAlertas(previous => !previous); }}'), 'Alternância e haptics originais preservados');
ok(s.rail.includes('alerts.slice(0, 3)')&&s.rail.includes('key={alert.id}')&&s.rail.includes('aria-expanded={expanded}'), 'Carrossel limita três e expansão é acessível');
ok(s.detail.includes('<MedicationCatalogNameComparison currentName={med.nome}') && s.detail.includes('referenceName={catalogNameSuggestion.reference.canonicalName}'), 'Identidade de cadastro comparada somente à referência existente');
ok(s.detail.includes('handleAcceptNameCorrection')&&s.detail.includes('handleDismissNameCorrection')&&s.detail.includes('Usar nome da referência')&&s.detail.includes('O Vault não considera automaticamente o cadastro incorreto'), 'Aceitar ou ignorar referência continuam sujeitos à escolha do usuário');
ok(s.detail.includes('result.matchedText')&&s.detail.includes('normalizedCurrentName'), 'Match e aliases canônicos preservados');
ok(s.detail.includes('onClick={\n                    abrirQuickDose') && s.detail.includes('QuickDoseModal'), 'Ação clínica e doses canônicas intocadas');
ok(s.detail.includes('Quantidade registrada hoje')&&s.detail.includes('Menor preço médio por farmácia:')&&s.detail.includes('getElementById("historico-aquisicoes")'), 'Contratos V319/V320/V70 preservados');
ok(s.today.includes('aria-pressed={filtroStatus === "todos"}') && s.today.includes('Período {filtroPeriodo !== "todos"'), 'Filtros antigos permanecem na página Hoje');
for(const field of ['pendentes','tomados','ignorados'])ok(s.today.includes(`aria-pressed={filtroStatus === "${field}"}`),`Filtro ${field} expõe seleção`);
ok(s.today.includes('aria-pressed={filtroPeriodo === value}'), 'Filtro de período expõe seleção sem alterar autoridade');
ok(s.hero.includes('scheduled > 0')&&s.hero.includes('doses resolvidas de'), 'Home não confunde resolução de slot com tomada confirmada');
ok(s.avatar.includes('shirtDetail: new THREE.MeshStandardMaterial')&&s.avatar.includes('roughness: .90')&&s.avatar.includes('renderer.forceContextLoss()')&&!s.avatar.includes('requestAnimationFrame(animate)'), 'Avatar conserva geometria e descarte GPU');

const jsx=(type,props)=>({type,props:props||{}});
const runtime={"react/jsx-runtime":{jsx,jsxs:jsx,Fragment:"fragment"},"lucide-react":{Bell:"bell"}};
function loadComponent(file){
 const compiled=ts.transpileModule(read(file),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const box={exports:{}};new Function('module','exports','require',compiled)(box,box.exports,id=>runtime[id] || require(id));return box.exports;
}
function flatten(node){if(node==null||typeof node==='boolean')return '';if(Array.isArray(node))return node.map(flatten).join('');if(typeof node!=='object')return String(node);return flatten(node.props?.children)}
function find(node,match){if(node==null)return null;if(Array.isArray(node)){for(const n of node){const hit=find(n,match);if(hit)return hit;}return null;}if(typeof node==='object'){if(match(node))return node;return find(node.props?.children,match)}return null}
const Rail=loadComponent(paths.rail).HomeAttentionRail;
const alerts=Array.from({length:5},(_,i)=>({id:`alert-${i}`,title:`Alerta ${i}`}));let toggles=0;
const props={alerts,description:'O que merece prioridade agora',expanded:false,onToggle:()=>toggles++,renderAlert:alert=>jsx('article',{children:alert.title})};
let node=Rail(props);
ok(flatten(node).includes('Alerta 0')&&flatten(node).includes('Alerta 2')&&!flatten(node).includes('Alerta 3'), 'Carrossel exibe só três alertas sem perder dados');
const button=find(node,n=>n.type==='button');ok(Boolean(button)&&button.props['aria-expanded']===false,'Ação de expansão informa estado fechado');button.props.onClick();ok(toggles===1,'Botão chama callback verdadeiro');
node=Rail({...props,expanded:true});ok(flatten(node).includes('Alerta 4')&&find(node,n=>n.type==='button').props['aria-expanded']===true,'Expandido mostra todos sem recalcular prioridade');
ok(Rail({...props,alerts:[]})===null,'Lista vazia não cria alerta fictício');
const Comparison=loadComponent(paths.comparison).MedicationCatalogNameComparison;
node=Comparison({currentName:'Marca própria',referenceName:'Referência padrão',activeIngredients:'Substância',score:.876});
ok(flatten(node).includes('Marca própria')&&flatten(node).includes('Referência padrão')&&flatten(node).includes('88%'),'Comparação mantém nomes distintos e escore aproximado');
ok(flatten(Comparison({currentName:'A',referenceName:'B',score:NaN})).includes('Não calculada'),'Score ausente não produz NaN como porcentagem clínica');
const brain=ts.transpileModule(s.brain,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',brain)(mod,mod.exports);const summarize=mod.exports.buildAvatarDecisionBrief;
const projection=summarize({title:'Título '.repeat(40),reason:'Revisão necessária',evidenceKind:'projected',overdueWithdrawals:2,missingDocuments:3});
ok(projection.title.length<=120&&projection.title.endsWith('…'),'Avatar abrevia apenas título extenso');
ok(projection.explanation.includes('Projeção não confirma realização.')&&projection.explanation.includes('2 retirada')&&projection.explanation.includes('3 documento'),'Fênix não perde ressalva nem pendências');
ok(summarize({evidenceKind:'association',reason:'Dados simultâneos'}).explanation.includes('não demonstra causa'),'Fênix não transforma correlação em causa');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-p15-r8-home-rail-quality-a11y.cjs')&&read('scripts/test-v94-2-home-final-experience-contract.mjs').includes('HomeAttentionRail.tsx'),'Contrato R8 e V94.2 acompanham módulos reais');
console.log(`P15 R8: ${checked} verificações de Home, Hoje, identidade, Avatar e Brain aprovadas`);
