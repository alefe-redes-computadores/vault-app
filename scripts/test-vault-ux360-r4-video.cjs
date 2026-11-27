#!/usr/bin/env node
'use strict';
// Contrato de regressão ligado ao vídeo do usuário (19/11/2026).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('typescript'),Module=require('node:module');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');let count=0;
const ok=(v,msg)=>{assert.ok(v,msg);count++;console.log('OK R4',count,msg)};
const file='lib/medications/catalog-packaging-ux-r4.ts';
const moduleRef=new Module(path.join(root,file),module);moduleRef._compile(ts.transpileModule(read(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path.join(root,file));
const parse=moduleRef.exports.catalogPackagesForMedicationUXR4;
const box=(raw,dose,form)=>parse(raw,dose,form).options.map(x=>x.size);
assert.deepEqual(box('150 MG COM CT BL AL X 12; 150 MG COM CT BL AL X 60; 150 MG COM CT BL AL X 30','150 mg','comprimido'),[12,30,60]);ok(true,'BUP preserva múltiplas embalagens da mesma concentração');
assert.deepEqual(box('10 MG/ML SOL INJ CX 10 AMP VD AMB X 1 ML; 10 MG COM CT BL AL/AL X 20','10 mg','comprimido'),[20]);ok(true,'METADONA não confunde X 1 ML com caixa c/ 1');
assert.deepEqual(box('100 MG COM CT X 30; 100 MG COM CT X 60; 50 MG COM CT X 60','50mg','comprimido'),[60]);ok(true,'DONAREN 50mg rejeita 100mg');
assert.deepEqual(box('30 MG CAP DURA CT BL X 28','30 mg','capsula'),[28]);ok(true,'cápsulas com potência correspondente');
assert.deepEqual(box('150 MG COM CT BL X 12 150 MG COM CT BL X 30 150 MG COM CT BL X 60','150 mg','comprimido'),[12,30,60]);ok(true,'apresentações concatenadas também são segmentadas');
assert.deepEqual(box('150 MG COM CT BL X 30','75 mg','comprimido'),[]);ok(true,'concentração divergente não inventa caixa');
assert.deepEqual(box('10 MG/ML SOL INJ CX 10 AMP X 1 ML','10 mg','comprimido'),[]);ok(true,'solução injetável isolada não vira comprimido');
assert.deepEqual(box('50 MG COM CT X 20','50 mg','injecao'),[]);ok(true,'forma líquida não herda cartela sólida');
assert.deepEqual(box('50 MG COM CT X 20',null,'comprimido'),[]);ok(true,'dose ausente não autoriza inferência');
assert.deepEqual(box('50 MG COM CT X 20','50 mg',null),[]);ok(true,'formato ausente não autoriza inferência');
// RESIDUAL CLOSURE MED-18 / STB-10: compound strengths and presentation copy.
// No V63 registry change; all historical assertions remain intact.
const residualPackages=[
['10 MG + 5 MG COM CT X 30','5 mg','comprimido',[]],
['10 MG + 5 MG COM CT X 30','10 mg','comprimido',[]],
['10 MG + 5 MG COM CT X 30','10 mg + 5mg','comprimido',[30]],
['10 MG + 5 MG COM CT X 30','5 mg + 10 mg','comprimido',[]],
['10 MG + 5 MG COM CT X 30','10 mg + 6 mg','comprimido',[]],
['6 MG + 0,4 MG COM REV LIB PROL CT BL AL AL X 10','6mg + 0,4mg','comprimido',[10]],
['6 MG + 0,4 MG COM REV LIB PROL CT BL AL AL X 10','0,4mg','comprimido',[]],
['10 MG / 5 MG COM CT X 30','5mg','comprimido',[]],
['10 MG/ 5 ML COM CT X 30','10mg','comprimido',[]],
['10 MG COM CT X 30','10 mg/2 ml','comprimido',[]],
['10 MG COM CT X 2 BL X 15','10mg','comprimido',[]],
['10 MG COM CT X 30 ML','10mg','comprimido',[]],
['10 MG COM CT X 30 AMP','10mg','comprimido',[]],
['10 MG COM CT X 30, 20 MG COM CT X 60','20 mg','comprimido',[60]],
['10 MG + 5 MG COM CT X 30 5 MG COM CT X 15','5mg','comprimido',[15]],
['10 MG COM CT X 30 COMPRIMIDOS','10mg','comprimido',[30]],
['10 MG CAP COM CT X 30','10mg','capsula',[]],
['10 MG COM CT X 30 CAPSULAS','10mg','comprimido',[]],
['0,5 MG COM CT X 20','0.5mg','comprimido',[20]],
['0,5 MG COM CT X 20','5mg','comprimido',[]],
['10 MG COM CT X 0','10mg','comprimido',[]],
['10 MG COM CT X 1001','10mg','comprimido',[]],
['10 MG COM CT X 30; 10 MG COM CT X 30','10mg','comprimido',[30]],
['10 MG COM CT X 30\n10 MG COM CT X 20','10mg','comprimido',[20,30]],
['(50+125) MG COM CT X 30','125mg','comprimido',[]],
['10 MG 5 MG COM CT X 30','5mg','comprimido',[]],
['10 MG & 5 MG COM CT X 30','5mg','comprimido',[]],
['10 MG + 5 MG COM CT X 30','10mg + 5mcg','comprimido',[]],
['10 MG COM CT X 1,5','10mg','comprimido',[]],
['10 MG COM CT X 30; 10 MG CAP CT X 20','10mg','comprimido',[30]],
['10 MG COM CT X 30 · 10 MG COM CT X 60','10mg','comprimido',[30,60]],
['10 MG + 5 MG COM CT X 30 · 5 MG COM CT X 15','5mg','comprimido',[15]],
['10 MG/ML SOL INJ CX 10 AMP X 1 ML · 10 MG COM CT X 20','10mg','comprimido',[20]],
['5 MG COM SUB-LING CT BL AL PLAS INC X 90 (EMB FRAC)','5mg','comprimido',[90]],
['500 MG COM REV CT BL AL PLAS INC X 300 (EMB HOSP)','500mg','comprimido',[300]],
['20 MG CAP DURA LIB RETARD CX BL AL PLAS TRANS X 420 (EMB HOSP)','20mg','capsula',[420]],
['20 MG CAP DURA CT BL AL X 20 (EMB. HOSP.)','20mg','capsula',[20]],
['750 MG COM CT BL AL PLAS AMB X 200 (EMB MULT)','750mg','comprimido',[200]],
['500MG CAP GEL DURA CX 50 BL AL PLAS INC X 10 (EMB HOSP)','500mg','capsula',[]],
['100 MG COM CX 25 BL AL PLAS INC X 20 (EMB HOSP)','100mg','comprimido',[]],
['300 MG + 150 MG COM REV CX 35 FR PLAS OPC X 60','300 mg + 150 mg','comprimido',[]],
['120 MG CAP GEL COM MICROGRANULOS CT FR VD AMB X 20','120mg','capsula',[20]],
['75MG COM REV CT BL AL/AL X 14 + 100MG COM REV CT BL AL/AL X 14','75mg','comprimido',[]],
['10 MG COM CT X 30 (EMB HOSP) · 20 MG COM CT X 60 (EMB FRAC)','20mg','comprimido',[60]],
['10 MG COM CT X 30 (EMB HOSP) · 10 MG + 5 MG COM CT X 60','5mg','comprimido',[]],
['10 MG COM CT X 30 (25 X 4)','10mg','comprimido',[]],
['10 MG COM CT X 30 EMB HOSP','10mg','comprimido',[30]],
['10 MG COM CT X 30 (EMBA HOSP)','10mg','comprimido',[30]],
];
for(const [raw,dose,form,expected] of residualPackages){
  const result=parse(raw,dose,form);
  assert.deepEqual(result.options.map(x=>x.size),expected);
  assert.equal(result.status,expected.length?'matched':'unverified');
  for(const option of result.options) assert.ok(raw.includes(option.original));
  ok(true,'Residual embalagem: '+raw+' | '+String(dose)+' | '+String(form));
}
const visualFile='lib/medications/visual-copy.ts';
const visualModule=new Module(path.join(root,visualFile),module);
visualModule._compile(ts.transpileModule(read(visualFile),{fileName:visualFile,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path.join(root,visualFile));
const visualCopy=visualModule.exports;
const residualPresentationCopy=[
['10 MG/ML SOL INJ CX AMP X 1 ML','10 MG/ML SOL INJ CX AMP × 1 ML'],
['SOL OR X 1,5 ML','SOL OR × 1,5 ML'],
['SOL OR X 1.5 ML','SOL OR × 1.5 ML'],
['CREM DERM X 30 G','CREM DERM × 30 G'],
['10 MG COM REV CT BL AL X 30','10 MG comprimido revestido cartucho blíster alumínio × 30'],
['10 MG COM CT X 2 BL X 15','10 MG COM cartucho × 2 blíster × 15'],
['0,4 MG CAP X 1','0,4 MG CAP × 1'],
['50 MG + 10 MG COM REV CT X 60','50 MG + 10 MG comprimido revestido cartucho × 60'],
['10 MG COM CT X 20; 20 MG COM CT X 30','10 MG COM cartucho × 20; 20 MG COM cartucho × 30'],
['SOL INJ AMP X 1 ML + SOL INJ AMP X 2 ML','SOL INJ AMP × 1 ML + SOL INJ AMP × 2 ML'],
['  50 MG COM REV  ','50 MG comprimido revestido'],
['SEM REFERÊNCIA','SEM REFERÊNCIA']];
for(const [input,expected] of residualPresentationCopy){
  assert.equal(visualCopy.humanizeOfficialPresentation(input),expected);
  ok(true,'Residual apresentação: '+input);
}
assert.equal(visualCopy.countLabel(1,'dose','doses'),'1 dose');ok(true,'pluralização singular preservada');
assert.equal(visualCopy.countLabel(2,'dose','doses'),'2 doses');ok(true,'pluralização plural preservada');
assert.equal(visualCopy.humanizeCareLocationKind('ubs'),'UBS');ok(true,'local de cuidado preservado');
assert.equal(visualCopy.humanizeStockUnit('comprimido',2),'comprimidos');ok(true,'unidade de estoque preservada');
assert.equal(visualCopy.shortPrescriptionKnowledgeLabel('Notificação B · azul'),'NOTIF. B');ok(true,'rótulo regulatório preservado');
// Residual parity: shared visual selector, not a new authority or write path.
const ingredient=visualCopy.medicationIngredientDisplayResidual;
const fact=(authority,value='A + B')=>({kind:'active_ingredient',authority,value});
const ingredientCases=[
 [undefined,[fact('official_exact')],[]],
 [{authorityState:'possible_divergence',activeIngredients:['A']},[fact('official_exact')],[]],
 [{authorityState:'confirmed',activeIngredients:['A','B']},[],['A','B']],
 [{authorityState:'compatible',activeIngredients:['A']},[fact('official_inferred')],['A']],
 [{authorityState:'unvalidated',activeIngredients:['A']},[],['A']],
 [{authorityState:'unvalidated'},[fact('official_exact')],[]],
 [{authorityState:'confirmed'},[fact('official_inferred')],[]],
 [{authorityState:'confirmed'},[fact('unknown')],[]],
 [{authorityState:'confirmed'},[fact('conflict')],[]],
 [{authorityState:'confirmed'},[fact('official_exact')],['A + B']],
 [{authorityState:'compatible'},[fact('official_exact')],['A + B']],
 [{authorityState:'confirmed',activeIngredients:[],activeIngredient:'A'},[],['A']],
 [{authorityState:'confirmed',activeIngredients:[' ']},[fact('official_exact',' ')],[]],
 [{authorityState:'confirmed'},[{kind:'prescription_type',authority:'official_exact',value:'A'}],[]],
];
for(const [identity,facts,expected] of ingredientCases){assert.deepEqual(ingredient(identity,facts),expected);ok(true,'Residual identidade: '+JSON.stringify([identity,facts]));}
const parityList=read('app/saude/medicamentos/page.tsx');
const parityDetail=read('app/saude/medicamentos/detalhes/page.tsx');
ok(parityList.includes('medicationIngredientDisplayResidual(catalogIdentity, medicationKnowledge360.facts)'),'Residual listagem usa projeção compartilhada');
ok(parityList.includes('catalogIdentities[selectedRegulatoryMedication.id || ""],\n        resolveMedicationKnowledgeM153P4(selectedRegulatoryMedication'),'Residual modal mantém identidade do medicamento selecionado');
ok(parityDetail.includes('medicationIngredientDisplayResidual(catalogIdentity, stableMedicationKnowledge.facts)'),'Residual detalhe usa projeção compartilhada');
ok(!parityDetail.includes('stableMedicationKnowledge.facts.find(fact => fact.kind === "active_ingredient")'),'Residual detalhe não promove inferência');

const page=read('app/saude/medicamentos/page.tsx');
ok((page.match(/<MedicationFilterBar\b/g)||[]).length===1,'filtros visíveis apenas na gaveta');
ok(page.includes('data-vault-density-control="canonical-single"'),'um único controle de densidade');
ok(!page.includes('>-bottom-1 -left-1')&&!page.includes('aria-hidden="true">+{actionLayoutM150P3.secondary.length}'),'badge +1 minúsculo removido');
ok(page.includes('data-vault-med360-entry="name"')&&page.includes('data-vault-med360-entry="menu"'),'nome e menu abrem gaveta 360');
ok(page.includes('data-vault-med360-microbanner'),'microaviso mantém destino próprio');
ok(page.includes('today={todayStatus} compact={compactCards}'),'projeção operacional usa densidade');
const sheet=read('components/saude/MedicationSheet360R3.tsx');
ok(sheet.includes('catalogPackagesForMedicationUXR4'),'gaveta usa parser seguro com dose e forma');
ok(sheet.includes('Embalagens encontradas no catálogo'),'referência comercial tem rótulo explícito');
ok(sheet.includes('bg-white text-slate-950'),'aba ativa com alto contraste');
const map=read('app/saude/mapa/page.tsx');
ok(map.includes('data-vault-focus-icon="r4"')&&map.includes('replace(/^Brain:\\s*/i'), 'Em foco mostra ícone e limpa prefixo repetido');
const home=read('app/page.tsx');
ok(home.includes('duplicatePrimaryStockUXR4'),'aviso duplicado controlado por identidade de medicamento');
ok(read('components/home/HomeCommandCenter.tsx').includes('min-h-[76px]')&&/viva\s*\?\s*"h-auto self-start"\s*:\s*"h-full"/.test(read('components/home/HomeCommandCenter.tsx'))&&!read('components/home/HomeCommandCenter.tsx').includes('className="group flex h-full min-h-[76px]'),'atalho Medicamentos mantém 76px sem stretch do Viva');
ok(read('components/home/HomeClinicalAreaTile.tsx').includes('min-h-[76px]'),'atalho Minha Saúde acompanha geometria');
const gate=read('scripts/test-v63-release-gate.mjs');
ok((gate.match(/"scripts\/test-vault-ux360-r4-video.cjs"/g)||[]).length===1,'R4 listado exatamente uma vez no V63');
console.log('UX360 R4',count,'contratos dirigidos. Gate V63 e TypeScript global continuam obrigatórios.');
