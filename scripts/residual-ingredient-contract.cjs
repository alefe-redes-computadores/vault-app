'use strict';
// V319/M108: exercise actual projection and JSX expressions, not a replacement model.
// Pure test, synthetic data only. No browser/DB claims. Existing tests keep their other assertions.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const VISUAL = 'lib/medications/visual-copy.ts';
const LABEL = 'Princípio ativo · confirmar referência nos detalhes';
const read = p => fs.readFileSync(p, 'utf8');
const fact = (authority, value = 'Fato A + Fato B', kind = 'active_ingredient') => ({kind, authority, value});
// Expected values are independent of the implementation and deliberately not real medicines.
const cases = [
 ['missing identity', undefined, [fact('official_exact')], []],
 ['null identity', null, [fact('official_exact')], []],
 ['divergent even with prior data', {authorityState:'possible_divergence',activeIngredients:['Catalogo A'],activeIngredient:'Catalogo A'}, [fact('official_exact')], []],
 ['confirmed multi-ingredient priority', {authorityState:'confirmed',activeIngredients:['Catalogo A','Catalogo B'],activeIngredient:'Outro'}, [fact('official_exact')], ['Catalogo A','Catalogo B']],
 ['compatible actual composition', {authorityState:'compatible',activeIngredients:['Catalogo A']}, [fact('official_inferred')], ['Catalogo A']],
 ['offline verified projection from hook', {authorityState:'unvalidated',activeIngredients:['Catalogo A','Catalogo B']}, [], ['Catalogo A','Catalogo B']],
 ['unvalidated cannot promote fact', {authorityState:'unvalidated'}, [fact('official_exact')], []],
 ['unknown state cannot promote fact', {}, [fact('official_exact')], []],
 ['confirmed inferred rejected', {authorityState:'confirmed'}, [fact('official_inferred')], []],
 ['compatible inferred rejected', {authorityState:'compatible'}, [fact('official_inferred')], []],
 ['unknown rejected', {authorityState:'confirmed'}, [fact('unknown')], []],
 ['conflict rejected', {authorityState:'confirmed'}, [fact('conflict')], []],
 ['confirmed exact fact', {authorityState:'confirmed'}, [fact('official_exact')], ['Fato A + Fato B']],
 ['compatible exact fact', {authorityState:'compatible'}, [fact('official_exact')], ['Fato A + Fato B']],
 ['singular legacy projection', {authorityState:'confirmed',activeIngredients:[],activeIngredient:'Catalogo A'}, [], ['Catalogo A']],
 ['blank excluded', {authorityState:'confirmed',activeIngredients:[' '],activeIngredient:' '}, [fact('official_exact',' ')], []],
 ['wrong fact type excluded', {authorityState:'confirmed'}, [fact('official_exact','Receita','prescription_type')], []],
 ['skip inference and unrelated type', {authorityState:'confirmed'}, [fact('official_inferred','Inventado'),fact('official_exact','Receita','prescription_type'),fact('official_exact','Fato C')], ['Fato C']],
];
function all(node, pred) { const a=[]; function visit(n){if(pred(n))a.push(n);ts.forEachChild(n,visit)} visit(node);return a; }
function one(a, label) { assert.equal(a.length,1,label);return a[0]; }
function parse(page) {const ast=ts.createSourceFile('actual-consumer.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(ast.parseDiagnostics.length,0,'consumer syntax');return ast;}
function decl(ast,name) {const d=one(all(ast,n=>ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.name.text===name),'unique '+name);assert(d.initializer, name+' must have initializer');return d;}
function importHelper(ast) { const d=one(all(ast,n=>ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)&&n.moduleSpecifier.text==='@/lib/medications/visual-copy'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.some(e=>e.name.text==='medicationIngredientDisplayResidual'&&!e.propertyName&&!e.isTypeOnly)), 'canonical helper import');assert(!d.importClause.isTypeOnly,'runtime import'); }
function assertCall(expr, knowledge) { assert(ts.isCallExpression(expr),'actual authority call');assert.equal(expr.expression.getText(),'medicationIngredientDisplayResidual');assert.deepEqual(expr.arguments.map(x=>x.getText()),['catalogIdentity',knowledge+'.facts']); }
function jsxByAttr(ast, name) {return one(all(ast,n=>ts.isJsxElement(n)&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText()===name)),name);}
function enclosingJsxExpression(node) {let n=node.parent;while(n&&!ts.isJsxExpression(n))n=n.parent;assert(n?.expression,'real JSX guard');return n.expression;}
function extractDetails(ast) {return one(all(ast,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText()==='details'&&n.getText().includes('Identidade farmacêutica')),'actual progressive pharmaceutical card');}
function transpile(s, jsx=false) {const o=ts.transpileModule(s,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}});assert.equal((o.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'projection compilation');return o.outputText;}
function loadHelper(source) {const m={exports:{}};new Function('module','exports','require',transpile(source))(m,m.exports,()=>assert.fail('unexpected dependency in pure display helper'));assert.equal(typeof m.exports.medicationIngredientDisplayResidual,'function');return m.exports.medicationIngredientDisplayResidual;}
const React={Fragment:Symbol('fragment'),createElement:(tag,props,...children)=>({tag,props:props||{},children})};
function evaluate(expr, scope) {return new Function(...Object.keys(scope),'React',transpile('return ('+expr.getText()+');',true))(...Object.values(scope),React);}
function nodes(x, pred) {if(Array.isArray(x))return x.flatMap(v=>nodes(v,pred));if(x&&typeof x==='object'&&'tag' in x)return [...(pred(x)?[x]:[]),...nodes(x.children,pred)];return [];}
function txt(x) {if(Array.isArray(x))return x.map(txt).join('');if(x&&typeof x==='object'&&'tag' in x)return txt(x.children);return typeof x==='string'||typeof x==='number'?String(x):'';}
function normalized(x){return txt(x).replace(/\s+/g,' ').trim();}
function dataScope(identity,facts,helper) {return {catalogIdentity:identity&&{referenceType:'product',registrationNumber:'REG-FIXTURE',sourceLabel:'FONTE-FIXTURE',presentationCount:2,authorityLabel:'Estado fixture',...identity},medicationKnowledge360:{facts},stableMedicationKnowledge:{facts},medicationIngredientDisplayResidual:helper};}
function verifyDetail(page, source=read(VISUAL)) {
 const ast=parse(page);importHelper(ast);const d=decl(ast,'stableIngredientKnowledge');const init=d.initializer;
 assert(ts.isCallExpression(init)&&ts.isPropertyAccessExpression(init.expression)&&init.expression.name.text==='join','composition join');assert.deepEqual(init.arguments.map(x=>x.getText()),['" + "']);assertCall(init.expression.expression,'stableMedicationKnowledge');
 const header=enclosingJsxExpression(jsxByAttr(ast,'data-vault-v34x-ingredient-visible'));
 const details=extractDetails(ast);const card=enclosingJsxExpression(details);
 assert(!details.openingElement.attributes.properties.some(x=>ts.isJsxAttribute(x)&&x.name.getText()==='open'),'progressive card stays collapsed');
 const helper=loadHelper(source);
 for(const [label,identity,facts,want] of cases){
   const scope=dataScope(identity,facts,helper), expected=want.join(' + ');
   scope.stableIngredientKnowledge=evaluate(init,scope);assert.equal(scope.stableIngredientKnowledge,expected,label+' detail value');
   const h=evaluate(header,scope);assert.equal(normalized(h),expected?'Princípio ativo:'+expected:'',label+' visible header');
   const c=evaluate(card,scope);const shouldCard=!!identity&&identity.authorityState!=='unvalidated';
   if(!shouldCard){assert.equal(nodes(c,x=>x.tag==='details').length,0,label+' no unvalidated card');continue;}
   const rendered=one(nodes(c,x=>x.tag==='details'),label+' progressive details');
   assert(normalized(rendered).includes('Identidade farmacêutica'));assert(normalized(rendered).includes('Ver ficha'));assert(normalized(rendered).includes('REG-FIXTURE'));assert(normalized(rendered).includes('FONTE-FIXTURE'));
   const ingredient=nodes(rendered,x=>x.tag==='p'&&normalized(x).startsWith('Princípio ativo ·'));
   assert.deepEqual(ingredient.map(normalized),expected?['Princípio ativo · '+expected]:[],label+' expanded composition');
 }
 return cases.length;
}
function verifyList(page,source=read(VISUAL)) {
 const ast=parse(page);importHelper(ast);const ingredients=decl(ast,'activeIngredients'),label=decl(ast,'activeIngredient'),show=decl(ast,'showActiveIngredient');assertCall(ingredients.initializer,'medicationKnowledge360');
 assert.equal(ingredients.parent.parent.parent,label.parent.parent.parent,'same consumer scope');assert.equal(ingredients.parent.parent.parent,show.parent.parent.parent,'same consumer scope');
 const visible=enclosingJsxExpression(jsxByAttr(ast,'data-vault-r5-active-ingredient'));
 const missing=enclosingJsxExpression(one(all(ast,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText()==='span'&&n.children.some(c=>ts.isJsxText(c)&&c.getText().trim()===LABEL)), 'actual missing-reference hint'));
 const accessible=enclosingJsxExpression(one(all(ast,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText()==='p'&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText()==='className'&&a.initializer?.getText()==='"sr-only"')&&n.children.some(c=>ts.isJsxText(c)&&c.getText().trim()==='Princípio ativo:')), 'accessible actual ingredient'));
 const helper=loadHelper(source);
 for(const [name,identity,facts,want] of cases)for(const compactCards of [true,false])for(const isSuspenso of [true,false]){
   const scope={...dataScope(identity,facts,helper),compactCards,isSuspenso};const expected=want.join(' + ');
   scope.activeIngredients=evaluate(ingredients.initializer,scope);assert.deepEqual(scope.activeIngredients,want,name+' list authority');
   scope.activeIngredient=evaluate(label.initializer,scope);assert.equal(scope.activeIngredient,expected,name+' full composition');
   scope.showActiveIngredient=evaluate(show.initializer,scope);assert.equal(scope.showActiveIngredient,!!expected,name+' display guard');
   assert.equal(normalized(evaluate(visible,scope)),expected,name+' visible actual ingredient');
   assert.equal(normalized(evaluate(accessible,scope)),expected?'Princípio ativo: '+expected:'',name+' accessible ingredient');
   assert.equal(normalized(evaluate(missing,scope)),!expected&&!isSuspenso?LABEL:'',name+' missing not inferred');
 }
 return cases.length*4;
}
module.exports={verifyDetail,verifyList};

// Execute the real identityFor projection at the existing authority boundary. The
// authority resolver and persisted-reference lookup are controlled fixtures, not a
// replacement catalogue engine. This does not simulate a Supabase session.
function verifyAuthorityBoundary(hookSource=read('hooks/useMedicationRegulatoryProfiles.ts'),source=read(VISUAL)) {
 const ast=ts.createSourceFile('hook.ts',hookSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'hook syntax');
 const fn=one(all(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='identityFor'),'canonical identityFor');
 const helper=loadHelper(source);
 const scoped=(state,activeIngredients=[])=>({state,activeIngredients});
 const live=(canonicalName,authority)=>({canonicalName,authority});
 const persisted=live('Mesmo Produto',scoped('confirmed',['Historico A','Historico B']));
 const fixtureCases=[
  ['current confirmed',live('Mesmo Produto',scoped('confirmed',['Atual A','Atual B'])),persisted,'exact',['Atual A','Atual B']],
  ['current compatible',live('Outro Produto',scoped('compatible',['Atual A'])),persisted,'exact',['Atual A']],
  ['offline exact verified',null,persisted,'exact',['Historico A','Historico B']],
  ['offline non-exact',null,persisted,'compatible',[]],
  ['offline unconfirmed saved',null,live('Mesmo Produto',scoped('compatible',['Historico A'])),'exact',[]],
  ['same reference unvalidated',live('MESMO PRODUTO',scoped('unvalidated')),persisted,'exact',['Historico A','Historico B']],
  ['different reference unvalidated',live('Outro Produto',scoped('unvalidated')),persisted,'exact',[]],
  ['divergent live rejects saved identity',live('Mesmo Produto',scoped('possible_divergence')),persisted,'exact',[]],
  ['unvalidated no snapshot',null,null,'exact',[]],
 ];
 const run=new Function('catalogAuthorityForMedicationSTB','snapshotReference','normalizeMedicationText','regulatoryNeedsReviewMED04',transpile(fn.getText()+'\nreturn identityFor;'));
 for(const [name,reference,snapshot,match_kind,want] of fixtureCases){
  const identityFor=run((_med,ref)=>ref?.authority??scoped('unvalidated'),()=>snapshot?{reference:snapshot}:null,s=>String(s).toLowerCase().trim(),()=>false);
  const identity=identityFor({catalog_snapshot:{match_kind}},reference);
  assert.deepEqual(identity.activeIngredients,want,name+' canonical authority');assert.equal(identity.activeIngredient,want[0]??null,name+' singular projection');
  assert.deepEqual(helper(identity,[]),want,name+' display preserves scoped authority');
 }
 return fixtureCases.length;
}
module.exports.verifyAuthorityBoundary=verifyAuthorityBoundary;

function replaceOnce(s,a,b) {assert.equal(s.split(a).length,2,'unique mutation anchor '+a);return s.replace(a,()=>b);}
function verifyMutations(detail,list,source,hook) {
 let rejected=0;
 const rejects=(label,fn)=>{let error;try{fn()}catch(e){error=e}assert(error instanceof assert.AssertionError,label+' mutation survived or errored outside assertions: '+(error?.message||'none'));rejected++;console.log('RESIDUAL_MUTANT_REJECTED '+label);};
 const mutateHelper=(label,a,b)=>{const m=replaceOnce(source,a,b);rejects('detail '+label,()=>verifyDetail(detail,m));rejects('list '+label,()=>verifyList(list,m));};
 mutateHelper('divergence','if (!identity || identity.authorityState === "possible_divergence") return [];','if (!identity) return [];');
 mutateHelper('inference','fact.authority === "official_exact"','(fact.authority === "official_exact" || fact.authority === "official_inferred")');
 mutateHelper('unvalidated promotion','if (identity.authorityState !== "confirmed" && identity.authorityState !== "compatible") return [];','');
 mutateHelper('wrong type','fact.kind === "active_ingredient" && ','');
 mutateHelper('composition truncation','if (known.length) return known;','if (known.length) return known.slice(0,1);');
 mutateHelper('lost verified offline projection','if (known.length) return known;','if (known.length && identity.authorityState !== "unvalidated") return known;');
 rejects('detail rendered value substitution',()=>verifyDetail(replaceOnce(detail,'<span className="min-w-0 break-words">{stableIngredientKnowledge}</span>','<span className="min-w-0 break-words">Inventado</span>'),source));
 rejects('detail card ingredient hidden',()=>verifyDetail(replaceOnce(detail,'{stableIngredientKnowledge && (\n                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">','{false && (\n                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">'),source));
 rejects('list visible composition hidden',()=>verifyList(replaceOnce(list,'{showActiveIngredient && <span data-vault-r5-active-ingredient','{false && <span data-vault-r5-active-ingredient'),source));
 rejects('list missing hint suppressed',()=>verifyList(replaceOnce(list,'{!activeIngredients.length && !isSuspenso && (','{false && ('),source));
 rejects('list accessibility text substituted',()=>verifyList(replaceOnce(list,'Princípio ativo: {activeIngredient}\n                </p>','Princípio ativo: Inventado\n                </p>'),source));
 rejects('hook accepts non-exact snapshot',()=>verifyAuthorityBoundary(replaceOnce(hook,'medication.catalog_snapshot?.match_kind === "exact" &&','true &&'),source));
 rejects('hook accepts different product',()=>verifyAuthorityBoundary(replaceOnce(hook,'(!reference || normalizeMedicationText(reference.canonicalName) === normalizeMedicationText(persisted.canonicalName)) &&','true &&'),source));
 return rejected;
}
module.exports.verifyMutations=verifyMutations;
if(require.main===module){
 const detail=read('app/saude/medicamentos/detalhes/page.tsx'),list=read('app/saude/medicamentos/page.tsx'),source=read(VISUAL),hook=read('hooks/useMedicationRegulatoryProfiles.ts');
 const d=verifyDetail(detail,source),l=verifyList(list,source),a=verifyAuthorityBoundary(hook,source),m=verifyMutations(detail,list,source,hook);
 console.log(`RESIDUAL_INGREDIENT_AUTHORITY_PASS detail=${d} list=${l} hook=${a} mutants=${m} MODE=ACTUAL_PROJECTION_JSX_DOUBLES_NO_DB`);
}
