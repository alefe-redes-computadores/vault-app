#!/usr/bin/env node
const assert = require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const med=read('app/saude/medicamentos/page.tsx');
const purchase=read('app/saude/renovacao/nova/page.tsx');
const treatment=read('app/saude/tratamentos/page.tsx');
const portfolio=read('components/saude/MedicationPortfolioOverview.tsx');
const journey=read('components/saude/MedicationJourneySummary.tsx');
const guide=read('components/saude/MedicationAcquisitionQuantityGuide.tsx');
const resolver=read('lib/health-intelligence/medication-card-action.ts');
const checks={
 'Remédios mantêm tamanho e faixa lateral':med.includes('density="compact"')&&med.includes('compactTight')&&med.includes('regulatoryBorderColor')&&med.includes('rail={(regulatoryProfile || receita)'),
 'Ícones e cores originais inalterados':med.includes('<SelectedFormatIcon')&&med.includes('fill={fillValue}')&&med.includes('stroke={strokeValue}'),
 'Filtro compacto e todas as sete categorias':med.includes('Mais filtros')&&med.includes('Outras categorias de medicamentos')&&['Todos','Atenção','Contínuos','Por período','SOS','Controlados','Encerrados'].every(x=>med.includes('"'+x+'"')),
 'Filtros secundários na mesma linha quando couber':med.includes('min-w-[110px] flex-1 basis-auto'),
 'Ações continuam navegáveis e maiores':med.includes('Ações do medicamento')&&med.includes('router.push(careAction.href)')&&med.includes('min-h-10 max-w-full'),
 'Registro SOS mesmo sem saldo mantém aviso':med.includes('(!isEstoqueZerado || isSOS)')&&med.includes('Saldo registrado zerado'),
 'SUS e comprado continuam distintos':med.includes('supplyRoute?.mode === "hybrid"')&&med.includes('supplyRoute.labels.join(" + ")'),
 'Relações de tratamento preservadas':treatment.includes('getVaultTreatmentIcon')&&treatment.includes('<MedicationFormatIcon'),
 'Tratamento expõe filtro ativo':treatment.includes('activeCount={filtroStatus === "todos" ? 0 : 1}'),
 'Aquisição mantém modalidade isolada':purchase.includes('<MedicationEventBoundary mode="acquisition"/>'),
 'Aquisição não presume unidade por caixa':purchase.includes('<MedicationAcquisitionQuantityGuide medicamento={selectedMedicamento} quantity={quantidadeAdicionar}/>')&&guide.includes('Não presuma que 1 caixa equivale a 1 unidade'),
 'Aquisição não inventa receita':purchase.includes('VAULT_ACQUISITION_ONLY_V93'),
 'Guia usa ícones reais do produto':guide.includes('<MedicationFormatIcon formato={medicamento.formato} cores={medicamento.cores}'),
 'Panorama continua honesto sobre tomadas/ignoradas':portfolio.includes('ignored > 0')&&portfolio.includes('O percentual considera somente doses marcadas como tomadas'),
 'SOS e período continuam disponíveis nos detalhes':portfolio.includes('portfolio.temporaryCoursesOpen > 0')&&portfolio.includes('portfolio.asNeeded > 0')&&portfolio.includes('Entender origens, doses e estados'),
 'Histórico não mistura eventos':journey.includes('Receitas')&&journey.includes('Aquisições')&&journey.includes('Retiradas')&&journey.includes('Planejadas'),
 'Nova prioridade não reescreve motor clínico':resolver.includes('registeredNextStep')&&resolver.includes('return brainAction ?? canonical ?? accessAction;'),
 'V299 mantém prioridade visível do Brain':med.includes('const careAction = brainAction ??')&&med.includes('const brainAction = brainSuggestion')&&med.includes('resolveMedicationCardAction(careDecision, brainSuggestion, null)'),
 'Prioridade clínica sem tom incorreto':med.includes('careAction === brainSuggestion'),
};
let fails=0;for(let [name,ok] of Object.entries(checks)){console.log((ok?'OK':'FALHOU')+': '+name);if(!ok)fails++;}if(fails)process.exit(1);
const ts=require('typescript');
const js=ts.transpileModule(resolver,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports});
const resolve=mod.exports.resolveMedicationCardAction;
const brain={href:'/saude/renovacao/nova-receita?medicamento_id=x',label:'Registrar receita',description:'Receita'};
const buy={stage:'acquisition_needed',actionHref:'/saude/renovacao/nova?medicamento_id=x&mode=acquisition',actionLabel:'Registrar aquisição',explanation:'Receita registrada; falta compra'};
assert.equal(resolve(buy,brain,null).href,buy.actionHref,'Compra registrada em decisão supera prompt de receita');
const planned={...buy,stage:'acquisition_planned',actionLabel:'Ver planejamento'};
assert.equal(resolve(planned,brain,null).href,buy.actionHref,'Planejamento não vira nova receita');
const stable={...buy,stage:'stable'};
assert.equal(resolve(stable,brain,null),brain,'Brain mantém prioridade sem contradição');
const nonconflict={href:'/saude/retiradas',label:'Retirada em atenção',description:'Retirada'};
assert.equal(resolve(buy,nonconflict,null),nonconflict,'Brain não contraditório preservado');
assert.equal(resolve(buy,null,null).href,buy.actionHref,'Decisão canônica sem Brain');
console.log('P6 R3: 19 contratos UI + 5 cenários de prioridade relacional OK');
