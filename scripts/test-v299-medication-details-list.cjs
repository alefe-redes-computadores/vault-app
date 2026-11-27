#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const read=file=>fs.readFileSync(file,'utf8');
const details=read('app/saude/medicamentos/detalhes/page.tsx');
const list=read('app/saude/medicamentos/page.tsx');
const routeError=read('app/error.tsx');
for(const [name,code] of [['detalhes',details],['listagem',list],['error',routeError]]){
  const parsed=ts.createSourceFile(name+'.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length,0,`${name}: TSX deve ser sintaticamente valido`);
}
// The real component is large; validate using the TS AST instead of assuming where it ends.
const root=ts.createSourceFile('details.tsx',details,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const fn=root.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='MedicamentoDetalhesContent');
assert(fn?.body,'Encontrar componente de detalhes');
let firstTopLevelReturnAt=Number.POSITIVE_INFINITY;
for(const s of fn.body.statements){
  if(!ts.isIfStatement(s))continue;
  const branches=[s.thenStatement,s.elseStatement].filter(Boolean);
  const hasReturn=branches.some(b=>ts.isReturnStatement(b)||(ts.isBlock(b)&&b.statements.some(x=>ts.isReturnStatement(x))));
  if(hasReturn){firstTopLevelReturnAt=s.getStart(root);break;}
}
assert(Number.isFinite(firstTopLevelReturnAt),'Encontrar retorno condicional de carregamento');
const declaration=fn.body.statements.find(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>d.name.getText(root)==='journeySnapshot'));
assert(declaration,'Resumo de jornada clinica presente');
assert(declaration.getStart(root)<firstTopLevelReturnAt,'Hook de jornada sempre executa antes do primeiro retorno condicional');
assert.match(declaration.getText(root),/useMemo\s*\(/,'Manter memoizacao do historico');
assert.match(declaration.getText(root),/med\s*\?\s*buildMedicationJourneySnapshot/,'Sem calcular enquanto medicamento ainda carrega');
assert.match(declaration.getText(root),/\[med, renovacoes, retiradas, journeyToday\]/,'Dependencias clinicas e dia civil preservados');
assert.equal((details.match(/const journeySnapshot\s*=/g)||[]).length,1,'Somente uma origem do resumo');
assert.match(list,/density="compact"/,'Listagem ainda usa cards compactos');
assert.match(list,/interactiveContent/,'Navegacao e botoes independentes preservados');
assert.match(list,/navigationLabel=\{`Ver detalhes de \$\{med\.nome\}`\}/,'Nome completo acessivel no card');
assert.match(list, /<span title=\{medicationListDisplayNameM150P3\([^\n]+\)\} className="min-w-0 max-w-full break-words font-display[^"\n]*">\s*\{medicationListDisplayNameM150P3\(/,'Nome principal sem truncate no mobile');
assert.doesNotMatch(list, /<span title=\{medicationListDisplayNameM150P3[^\n]*className="[^"\n]*(?:line-clamp-|truncate)/, "nome completo sem corte na identidade H01");
assert.doesNotMatch(list,/grid-cols-\[minmax\(0,1fr\)_auto\] items-start/,'Acoes nao disputam largura com nome');
assert.match(list,/contextualActionLabel/,'Acao contextual real, contexto completo mantido em aria-label');
assert.match(list,/\{careAction\.label\}/,'Rótulo completo permanece acessivel');
assert.match(list,/const careAction = brainAction \?\?/,'Prioridade do Brain preservada');
assert.match(list,/VAULT_V318_OPERATIONAL_STRIP/,'Hoje e estoque em faixa curta, sem painel repetido');
assert.ok((list.includes('setSelectedRegulatoryScope({medicationId: med.id || "", userId: treatmentOwner?.id || "", personId: activePersonId || ""})') && list.includes('med.id === selectedRegulatoryScope.medicationId') && list.includes('med.user_id === selectedRegulatoryScope.userId') && list.includes('med.person_id === selectedRegulatoryScope.personId') && list.includes('regulatoryProfiles[selectedRegulatoryMedication.id') && list.includes('selectedRegulatory && selectedRegulatoryMedication') && list.includes('onClick={closeRegulatoryModal}') && !list.includes('setSelectedRegulatory(regulatoryProfile)')),'Modal regulatorio e classificação preservados');
assert.match(routeError,/não conseguiu renderizar esta tela/,'Erro generico sem atribuir causa prematura ao PWA');
console.log('V299 OK: ordem de hooks com AST TypeScript, memoizacao, nome, acoes, estoque, segurança e erro de rota.');
