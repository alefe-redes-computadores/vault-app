#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let n=0;
function check(value,label){assert(value,`P14 R2: ${label}`);n++;console.log(`✓ P14 R2 ${n}: ${label}`);}
const files=[
  'components/saude/ClinicalSectionNav.tsx',
  'components/saude/MedicationListActiveFilter.tsx',
  'lib/health-intelligence/medication-list-presentation.ts',
  'app/saude/medicamentos/page.tsx',
  'app/saude/medicamentos/detalhes/page.tsx',
  'components/saude/HealthAvatar3D.tsx',
  'lib/health-intelligence/avatar-decision-brief.ts',
];
for(const file of files){const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(tree.parseDiagnostics.length===0,`TS/TSX íntegro ${file}`);}
const [nav,badge,viewSource,list,detail,avatar,briefSource]=files.map(read);
check(nav.includes('priorityCount?:number')&&nav.includes('primary=items.slice(0,count)'),'navegação mostra prioridades e preserva demais seções');
check(nav.includes('secondary=items.slice(count)')&&nav.includes('Mais áreas · {secondary.length}'),'acesso visível a todas as seções restantes');
check(nav.includes('aria-expanded={expanded}')&&nav.includes('onClick={()=>setExpanded(value=>!value)}'),'Mais áreas utilizável por teclado');
check(nav.includes('hashchange')&&nav.includes('IntersectionObserver'),'âncoras anteriores e seção ativa intactas');
check(nav.includes('secondary.some(item=>item.id===activeId)')&&nav.includes('setExpanded(true)'),'deep link a seção secundária expande a navegação');
check(nav.includes('density?:"regular"|"compact"')&&nav.includes('layout?:"scroll"|"grid"'),'API de navegação antiga preservada');
check(nav.includes('min-[480px]:grid-cols-4')&&nav.includes('min-[480px]:grid-cols-5'),'grade responsiva antiga preservada');
check(nav.includes('break-words text-center')&&nav.includes('aria-current='),'rótulos acessíveis e estado ativo mantidos');
check(detail.includes('label="Áreas do medicamento" layout="grid" density="compact" priorityCount={4}'),'detalhes começa com quatro áreas primárias');
for(const id of ['medicamento-agora','medicamento-rotina','medicamento-receita','medicamento-fornecimento','medicamento-rede','medicamento-financeiro','historico-aquisicoes'])check(detail.includes(`id:"${id}"`)||detail.includes(`id="${id}"`),`âncora preservada: ${id}`);
check(detail.indexOf('id:"medicamento-receita"')<detail.indexOf('id:"medicamento-rede"'),'receita aparece antes da rede nas prioridades');
check(detail.includes('hasRoutineSection')&&detail.includes('hasFinancialSection')&&detail.includes('...(renovacoes.length?'),'navegação não mostra âncoras inexistentes');
check(detail.includes('<ClinicalDisclosure id="medicamento-jornada"')&&detail.includes('<ClinicalDisclosure id="historico-aquisicoes"'),'jornada e histórico continuam independentes');
check(detail.includes('title="Jornada do medicamento"')&&detail.includes('title="Movimentações anteriores"'),'rótulos distinguem próximo passo de histórico');
check(detail.includes('V332_CARE_EVIDENCE_DISCLOSURE')&&detail.includes('(brainCareAction?.evidence || careDecision.evidence).slice(0,3).map('),'evidências do Brain não foram removidas');
check(detail.includes('(brainCareAction?.evidence || careDecision.evidence).slice(3).map('),'evidências completas permanecem acessíveis');
check(detail.includes('navigateCareAction(')&&detail.includes('<QuickDoseModal'),'ação clínica e registro de doses preservados');
check(detail.includes('medicamento-lembretes')&&detail.includes('MedicationAlertPreferences'),'lembretes e escopo de pessoa preservados');
check(list.includes('<MedicationListActiveFilter view={listPresentation}')&&list.includes('setSearchQuery("")'),'indicador de filtros e limpeza reais');
check(list.includes('listPresentation.emptyDescription')&&list.includes('listPresentation.clearLabel'),'sem falsos estados vazios quando categoria está filtrada');
check(list.includes('selectMedicationFilter("todos")')&&list.includes('selectMedicationFilter(value)'),'limpeza e filtros compartilham handler antigo');
check(list.includes('medsPrioridade.map(renderCard)')&&list.includes('medsEmDia.map(renderCard)')&&list.includes('medsSOS.map(renderCard)'),'categorias clínicas anteriores intactas');
check(list.includes('density="compact"')&&list.includes('navigationLabel={`Ver detalhes de ${med.nome}`}'),'cards compactos e acessibilidade preservados');
check(list.includes('interactiveContent')&&list.includes('VAULT_V318_OPERATIONAL_STRIP'),'ação e indicadores do medicamento preservados');
check(badge.includes('aria-live="polite"')&&badge.includes('role="status"'),'feedback de filtro disponível para leitor de tela');
check(badge.includes('if(!view.active)return null'),'nenhum cartão extra ao exibir lista completa');
const load=p=>{const m=new Module(p,module);m._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,p);return m.exports;};
const presentation=load('lib/health-intelligence/medication-list-presentation.ts').medicationListPresentation;
check(!presentation('todos','',9).active,'nenhuma faixa extra no modo padrão');
check(presentation('atencao','',0).emptyDescription.includes('nesta categoria'),'categoria vazia não significa conta sem medicamentos');
check(presentation('todos','pristiq',2).countLabel.includes('2 medicamentos'),'busca exibe contagem correta');
check(presentation('sos','x',1).title.includes('SOS'),'busca e categoria identificadas juntas');
check(presentation('todos','',0).emptyDescription.includes('Nenhum medicamento cadastrado'),'conta realmente vazia conserva mensagem');
check(presentation('controlados','',Number.NaN).countLabel.startsWith('0'),'quantidade inválida não chega à interface');
const brief=load('lib/health-intelligence/avatar-decision-brief.ts').buildAvatarDecisionBrief;
check(brief({lane:'prepare',evidenceKind:'projected'}).title==='Preparar próxima etapa','Fênix diferencia preparo de conclusão');
check(brief({lane:'discuss',evidenceKind:'recorded'}).title==='Levar questão à consulta','Fênix distingue consulta de ação imediata');
check(brief({evidenceKind:'association'}).explanation.includes('não demonstra causa'),'associação sem motivo não inventa causalidade');
check(brief({title:'Retirada agendada',reason:'Confirmar no local',evidenceKind:'recorded'}).authority==='Fato registrado','fato confirmado continua fato');
check(brief({evidenceKind:'missing_data'}).explanation.includes('Faltam dados'),'dados ausentes não viram confirmação');
const together=brief({reason:'Conferir eventos',overdueWithdrawals:2,missingDocuments:3,evidenceKind:'projected'});
check(together.explanation.includes('2 retirada')&&together.explanation.includes('3 documento'),'retirada e documentos simultâneos preservados');
check(together.authority==='Projeção, não confirmação','previsão não vira fato');
check(avatar.includes('roughness: .675')&&avatar.includes('opacity:.22')&&avatar.includes('P14 R2: ponta nasal menos esférica'),'Avatar refina materiais sem custo extra');
check(avatar.includes('P14: crânio e mandíbula')&&avatar.includes('P12: tecidos com difusão fosca'),'melhorias anteriores do Avatar preservadas');
check(avatar.includes('expressionEyeScaleY')&&avatar.includes('expressionLidScaleY')&&avatar.includes('expressionHighlightScale'),'escalas dos olhos contra traves preservadas');
check(avatar.includes('avatarAdaptiveRatio(')&&avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(function'),'orçamento WebGL e limpeza continuam');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.includes('"scripts/test-p14-r2-medication-ux-avatar-brain.cjs"'),'novo contrato integra gate histórico');
check(gate.includes('"scripts/test-p14-focus-hierarchy-brain-avatar.cjs"')&&gate.includes('"scripts/test-p13-device-cert.cjs"'),'P14 R1 e P13 continuam exigidos');
console.log(`VAULT P14 R2: ${n} verificações de regressão aprovadas.`);
