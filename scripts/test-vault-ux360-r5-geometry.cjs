#!/usr/bin/env node
"use strict";
// R5: semantic geometry and real contextual actions. Read-only; no clinical writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
let n=0;const read=p=>fs.readFileSync(p,'utf8');
const ok=(condition,label)=>{assert.ok(condition,'UX360 R5: '+label);console.log('✓ R5',++n,label)};
for (const p of ['app/saude/medicamentos/page.tsx','components/list/ListCard.tsx','components/saude/MedicationOperationalStrip.tsx','components/saude/MedicationSheet360R3.tsx']) {
 const tree=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(tree.parseDiagnostics.length===0,'TSX sintaxe '+p);
}
const med=read('app/saude/medicamentos/page.tsx'),card=read('components/list/ListCard.tsx'),op=read('components/saude/MedicationOperationalStrip.tsx'),sheet=read('components/saude/MedicationSheet360R3.tsx');
// R5 FIX2: parser alone does not reject duplicate JSX attributes (TS17001).
// Inspect the actual JSX AST for repeated named props before the full tsc gate.
for (const file of ['app/saude/medicamentos/page.tsx','components/list/ListCard.tsx']) {
 const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const repeated=[];
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const names=node.attributes.properties.filter(p=>ts.isJsxAttribute(p)).map(p=>p.name.getText(tree));
   const dup=names.filter((name,i)=>names.indexOf(name)!==i);
   if(dup.length)repeated.push(`${node.tagName.getText(tree)}: ${[...new Set(dup)].join(',')}`);
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
 ok(repeated.length===0,'JSX sem atributos duplicados '+file+(repeated.length ? ': '+repeated.join('; ') : ''));
}

ok(med.includes('medicationFlow')&&card.includes('medicationFlow?: boolean')&&card.includes('medicationFlow = false'),'ListCard opt-in; outros cards preservados');
ok(card.includes('medicationFlow ? "relative col-start-1 row-start-1"')&&card.includes('grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-2'),'ícone flutuante só no cabeçalho, operacional usa largura inteira');
ok(card.includes('railSize === "label" ? (medicationFlow ? "w-7" : "w-8")'),'tarja acessível e reduzida somente em medicamentos');
ok(med.includes('data-vault-med360-header')&&!med.includes('data-vault-med360-header className="flex min-w-0 w-full items-center gap-1.5 pl-11"')&&card.includes('col-start-2 row-start-1 min-w-0'),'nome/dose/seta alinhados com ícone');
ok(!med.includes('personalAccent && <span aria-hidden="true" className="inline-block h-2 w-2'),'ponto decorativo órfão removido');
ok(med.includes('data-vault-r5-active-ingredient')&&med.includes('text-[10px] leading-tight')&&med.includes('text-xs leading-snug'),'princípio ativo visível nos dois modos, hierarquias distintas');
ok(med.includes('grid-cols-[minmax(0,1fr)_88px]')&&med.includes('actionLayoutM150P3.primary ?')&&med.includes('actionLayoutM150P3.primary && <div'),'coluna CTA 88px somente quando há ação');
ok(med.includes('[&>button]:w-full')&&med.includes('[&>button]:min-h-11')&&med.includes('[&>button]:whitespace-normal'),'CTAs sem corte com altura 44px');
ok(!med.includes('!actionLayoutM150P3.primary && <ChevronRight'),'seta lateral solta removida');
ok(med.includes('data-vault-med360-entry="menu"')&&med.includes('grid size-11')&&med.includes('border-transparent bg-transparent'),'menu com hit area 44, visual leve');
ok(med.includes('data-vault-r5-context="regime"')&&med.includes('openMedicationSheet360("rotina")'),'regime clicável abre Rotina');
ok(med.includes('data-vault-r5-context="tratamento"')&&med.includes('router.push(`/saude/tratamentos/detalhes?id=${encodeURIComponent(t.id)}`)'),'tratamento vinculado com rota real para sua identidade');
ok(med.includes('safeTreatmentColorP7(t.cor)')&&med.includes('style={color ? (compactCards ? {color} : {borderColor:`${color}66`,backgroundColor:`${color}12`,color}) : undefined}'),'cores do tratamento sanitizadas');
ok(med.includes('data-vault-r5-comfort-context')&&med.includes('data-vault-r5-context="origem"')&&med.includes('data-vault-r5-context="fabricante"')&&med.includes('data-vault-r5-context="receita"'),'Conforto agrega tags com informação útil');
ok(med.includes('supplyRoute?.mode === "hybrid" ? "Origens · conferir"')&&med.includes('med.tipo_aquisicao === "sus" ? "SUS"')&&med.includes('med.tipo_aquisicao === "comprado" ? "Comprado"')&&!med.includes('SUS · cadastrado')&&!med.includes('Comprado · cadastrado'),'origem não presume fornecimento atual');
ok(med.includes('reconciliationP6.hasDocumentEvidence')&&med.includes('openMedicationSheet360("receita")'),'documento só se houver evidência; destino Receita');
ok(med.includes('{latestManufacturer || med.laboratorio_etiqueta}')&&!med.includes('`Etiqueta: ${med.laboratorio_etiqueta}`'),'fabricante identifica fonte da evidência');
ok(med.includes('className="min-h-0"')&&med.includes('data-vault-executive-density={compactCards?"compact":"comfort"}'),'duas densidades sem altura minima artificial');
ok(med.includes('MedicationOperationalStrip today={todayStatus} compact={compactCards}')&&op.includes('aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}.'),'resumo clínico canônico com acessibilidade');
ok(med.includes('setQuickDoseMedId(med.id!)')&&med.includes('router.push(careAction.href)')&&med.includes('MedicationRestockAction'),'tomada, cuidado e estoque intactos');
ok(med.includes('data-vault-med360-microbanner')&&med.includes('openMedicationSheet360(stockReview ? "estoque" : prescriptionReview360 ? "receita" : "estoque")'),'microaviso real mantém aba correta');
ok(sheet.includes('Embalagens encontradas no catálogo')&&sheet.includes('catalogPackagesForMedicationUXR4'),'catálogo não se confunde com embalagens adquiridas');
ok((med.match(/<MedicationFilterBar\b/g)||[]).length===1&&med.includes('BottomSheet isOpen={visualFilterSheetOpenR1}'),'filtros somente no BottomSheet');
ok(!med.includes('aria-hidden="true">+{actionLayoutM150P3.secondary.length}')&&sheet.includes('value.controls.map'),'sem +1 minúsculo; ações na gaveta');
ok(!med.includes('data-vault-home-viva'),'Home Viva pertence à outra frente');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-ux360-r5-geometry.cjs"').length===2,'R5 registrado exatamente uma vez no gate V63');
ok(med.includes('data-vault-r5-comfort-context className="pointer-events-auto relative z-20 flex min-w-0 flex-wrap') && !med.includes('overscroll-x-contain pb-0.5'), 'Conforto não empilha caixas de 44px');
ok(!med.includes('inline-flex min-h-11 max-w-full items-center gap-1 text-[10px] font-semibold ${compactCards ?'), 'tratamento não força linha 44px');
ok(!med.includes('inline-flex min-h-11 shrink-0 items-center gap-1 text-[10px] font-semibold ${compactCards ?'), 'regime não força linha 44px');
ok(op.includes('h-[18px]') && !op.includes('basis-full truncate'), 'faixa operacional compacta e sem +doses órfãs');
ok(med.includes('data-vault-r5-active-ingredient'), 'princípio ativo preservado, não ocultado');
console.log('VAULT UX360 R5:',n,'contratos sem alteração clínica.');
