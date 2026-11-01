#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
function ok(condition,label){assert(condition,`P15 R7: ${label}`);console.log(`✓ ${++n}: ${label}`)}
const files={
  detail:'app/saude/medicamentos/detalhes/page.tsx',
  renewal:'components/saude/MedicationRenewalAttention.tsx',
  behavior:'components/saude/MedicationBehaviorEvidence.tsx',
  home:'components/home/HomeDailyHero.tsx',
  today:'components/hoje/TodayRoutinePulse.tsx',
  avatar:'components/saude/HealthAvatar3D.tsx',
  brain:'lib/health-intelligence/avatar-decision-brief.ts'
};
const source=Object.fromEntries(Object.entries(files).map(([k,v])=>[k,read(v)]));
for(const [key,path] of Object.entries(files)){
  const kind=path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const tree=ts.createSourceFile(path,source[key],ts.ScriptTarget.Latest,true,kind);
  ok(tree.parseDiagnostics.length===0,`TS/TSX sintaticamente válido: ${path}`);
}
const {detail,renewal,behavior,home,today,avatar,brain}=source;
ok(detail.includes('<MedicationRenewalAttention')&&detail.includes('onOpen={() => navigateCareAction(accessAction.href, accessAction.cta, alertaInteligente.mensagem)}'), 'Aviso de renovação usa a ação clínica original');
ok(detail.includes('med.status !==')&&detail.includes('accessAction &&')&&detail.includes('urgent={alertaInteligente.urgencia === "alta"}'), 'Não cria aviso sem ação nem para tratamento encerrado');
ok(detail.includes('<details open={comportamento.tipo === "alerta_adesao"}')&&detail.includes('<MedicationBehaviorEvidence'), 'Observação mantém expansão original de atenção à adesão');
ok(detail.includes('confidence={comportamento.confianca}')&&detail.includes('sample={comportamento.amostra}')&&detail.includes('suggestedAction={comportamento.acaoSugerida}'), 'Expõe evidência, amostra e sugestão calculadas pela autoridade existente');
ok(!/(\bdb\.|\bsupabase\b|safeAdd|safeUpdate|marcarDose\(|useLiveQuery|fetch\()/i.test(renewal+behavior), 'Componentes não consultam ou alteram registros');
ok(detail.includes('VAULT_V320_QUICK_DOSE_TOP')&&detail.includes('onClick={\n                    abrirQuickDose')&&detail.includes('QuickDoseModal'), 'QuickDose mantém único handler e modal originais');
ok(detail.includes('med.status !== "descontinuado" || isSOS')&&detail.includes('todayQuantityLabel="Quantidade registrada hoje"'), 'V320: SOS e quantidade permanecem na página original');
ok(detail.includes('<MedicationStockOverview')&&detail.includes('<MedicationSuspensionSummary')&&detail.includes('<MedicationRoutineSummary'), 'R5/R6 permanecem em uso real');
ok(detail.includes('`/saude/medicamentos/historico?id=${id}`')&&detail.includes('getElementById("historico-aquisicoes")'), 'V70: histórico e média continuam navegáveis');
ok(detail.includes('<ClinicalDisclosure id="medicamento-rede"')&&detail.includes('<ClinicalDisclosure id="medicamento-financeiro"'), 'V197: seções progressivas conservadas');
ok((detail.match(/vault-deferred/g)||[]).length>=5, 'V197: cinco grupos progressivos permanecem');
ok(home.includes('scheduled > 0 && Number.isFinite(progress)')&&home.includes('motion-reduce:transition-none active:bg-surface-raised/40'), 'Home preserva 0/0 e animação reduzida na ação');
ok(today.includes('aria-atomic="true"')&&today.includes('aria-valuetext={`${completed} concluídas, ${ignored} ignoradas, ${unconfirmed} sem confirmação`}'), 'Hoje mantém leitura inclusiva dos três estados, sem recontagem');
ok(avatar.includes('roughness: .89, transparent:true, opacity:appearance.lips')&&avatar.includes('renderer.forceContextLoss()')&&avatar.includes('expressionEyeScaleY'), 'Avatar suaviza material existente sem alterar malhas ou teardown');
ok(!avatar.includes('requestAnimationFrame(animate)')&&avatar.includes("event.key==='Home'||event.key==='0'"), 'Avatar mantém orçamento GPU e controle de teclado');
const b={exports:{}};
const brainJS=ts.transpileModule(brain,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
new Function('exports','module',brainJS)(b.exports,b);
const brief=b.exports.buildAvatarDecisionBrief({reason:'Acido\u0301\u202e  em   revisao',evidenceKind:'projected',overdueWithdrawals:2,missingDocuments:3});
ok(!/[\u202a-\u202e]/.test(brief.explanation)&&brief.explanation.includes('2 retirada')&&brief.explanation.includes('3 documento'), 'Fênix normaliza Unicode sem esconder pendências');
ok(brief.explanation.includes('Projeção não confirma realização.')&&brief.explanation.length<=370, 'Fênix não converte previsão em evento concluído');
ok(b.exports.buildAvatarDecisionBrief({reason:'Sintomas nos mesmos dias',evidenceKind:'association'}).explanation.includes('não demonstra causa'), 'Fênix não transforma associação em causalidade');
// Execute both real components with a minimal JSX runtime; no DOM, database or React hooks required.
const jsx=(type,props)=>({type,props:props||{}});
const runtime={'react':{memo:f=>f},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'framer-motion':{motion:{div:'motion.div'}},'lucide-react':{AlertTriangle:'alert-icon',Activity:'activity-icon'}};
function load(key){const box={exports:{}};const js=ts.transpileModule(source[key],{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',js)(box,box.exports,id=>{if(!(id in runtime))throw Error('unexpected component import '+id);return runtime[id]});return box.exports;}
function contents(tree){if(tree===null||tree===undefined||typeof tree==='boolean')return '';if(Array.isArray(tree))return tree.map(contents).join('');if(typeof tree!=='object')return String(tree);return contents(tree.props?.children);}
function find(tree,fn){if(!tree||typeof tree!=='object')return null;if(Array.isArray(tree)){for(const n of tree){const result=find(n,fn);if(result)return result;}return null;}if(fn(tree))return tree;return find(tree.props?.children,fn);}
const Renewal=load('renewal').MedicationRenewalAttention;const Evidence=load('behavior').MedicationBehaviorEvidence;
let invoked=0;
for(const [kind,label] of [['receita','Planejamento da receita'],['sus','Próxima retirada'],['estoque','Atenção ao estoque']]){
  const tree=Renewal({urgent:kind==='receita',kind,message:'Conferir evento registrado',cta:'Abrir próxima etapa',daysRemaining:12,onOpen:()=>{invoked++;}});
  ok(contents(tree).includes(label)&&contents(tree).includes('12 dias'),`Aviso de ${kind} exibe destino e prazo corretos`);
  const button=find(tree,n=>n.type==='button');assert(button&&typeof button.props.onClick==='function');button.props.onClick();
}
ok(invoked===3,'Os três avisos possuem ação real, sem registrar evento no componente');
const noDays=Renewal({urgent:false,kind:'estoque',message:'',cta:'Revisar',daysRemaining:-2,onOpen:()=>{}});
ok(!contents(noDays).includes('dias'),'Prazo vencido não vira contagem futura positiva');
const e1=Evidence({alert:true,title:'Doses ignoradas',message:'Três sem confirmação',suggestedAction:'Revisar registros',confidence:'media',sample:3});
ok(contents(e1).includes('Confiança')&&contents(e1).includes('3 registro')&&contents(e1).includes('Sugestão:'),'Observação exibe amostra e ação sugerida');
const e2=Evidence({alert:false,title:'Padrão',message:'Sem certeza causal',suggestedAction:'Levar à consulta',confidence:null});
ok(!contents(e2).includes('Confiança')&&contents(e2).includes('Sem certeza causal'),'Observação sem amostra não inventa confiança');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-p15-r7-medication-insights-modules.cjs'),'Novo contrato incluído no release gate');
console.log(`VAULT P15 R7: ${n} verificações de decisão, UI, histórico, Brain e Avatar aprovadas.`);
