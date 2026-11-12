#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let checked=0;
const ok=(condition,label)=>{assert.ok(condition,`M138: ${label}`);checked++;console.log(`✓ M138 ${checked}: ${label}`);};
const paths=[
'app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx',
'app/saude/medicamentos/page.tsx','app/saude/medicamentos/detalhes/page.tsx',
'components/saude/MedicationIdentityColorPicker.tsx','components/saude/MedicationCustomColorEditorM138.tsx','components/saude/MedicationIdentityPreview.tsx',
'components/home/HomeAgendaBreakdown.tsx','app/page.tsx','lib/types.ts',
'lib/medications/identity-custom-color.ts','lib/medications/form-presentation.tsx',
'components/hoje/TodayAgendaOverview.tsx','components/saude/SupplyProcessJourney.tsx',
];
for(const p of paths){
 const source=read(p);
 const parsed=ts.transpileModule(source,{fileName:p,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 ok(!(parsed.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),`TS/TSX sintaxe ${p}`);
}
const helper=read('lib/medications/identity-custom-color.ts');
const out=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',out)(mod,mod.exports);
const norm=mod.exports.normalizeMedicationIdentityHex;
for(const [value,expected] of [['000000','#000000'],['#000000','#000000'],['#FACC15','#FACC15'],['abc','#AABBCC'],[' fff ','#FFFFFF'],['#12345',null],['#1234567',null],['qualquer',null],['',null],['#000000;',null]])ok(norm(value)===expected,`normalizacao segura ${JSON.stringify(value)}`);
const picker=read('components/saude/MedicationIdentityColorPicker.tsx');
const fallback=read('components/saude/MedicationCustomColorEditorM138.tsx');
const palette=read('lib/medications/form-presentation.tsx');
ok(palette.includes('"#000000"')&&palette.includes('"#FACC15"')&&palette.includes('"#FFFFFF"'),'preto, amarelo e branco diretos na paleta');
ok(picker.includes('type="color"')&&fallback.includes('type="text"')&&fallback.includes('onClick={apply}')&&fallback.includes('aria-invalid='),'fallback HEX acessivel no Android sem quebrar seletor legado');
ok(picker.includes('aria-pressed={active}')&&picker.includes('onToggleColor(hex)')&&fallback.includes('colors.includes(normalized)'),'toggle das duas cores e prevenção de duplicação mantidos');
ok(fallback.includes('normalizeMedicationIdentityHex(draft)')&&fallback.includes('disabled={!normalized||selected}'),'hex invalido nao é enviado ao estado de medicamento');
const types=read('lib/types.ts');
const create=read('app/saude/medicamentos/novo/page.tsx');
const edit=read('app/saude/medicamentos/editar/page.tsx');
const list=read('app/saude/medicamentos/page.tsx');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const preview=read('components/saude/MedicationIdentityPreview.tsx');
// R3: TS.transpileModule nao detecta identificadores importados duas vezes.
// M137 ja importa ManufacturerFieldM129 em Novo; a M138 so pode reutiliza-lo.
for (const [file,content] of [['novo',create],['editar',edit]]) {
  for (const symbol of ['ManufacturerFieldM129','MedicationCustomColorEditorM138']) {
    const sf=ts.createSourceFile(file+'.tsx',content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const imports=sf.statements.filter(ts.isImportDeclaration).flatMap(node => {
      const bindings=node.importClause?.namedBindings;
      return bindings && ts.isNamedImports(bindings) ? bindings.elements.map(e=>e.name.text) : [];
    });
    ok(imports.filter(name => name===symbol).length===1, `${file}: ${symbol} importado exatamente uma vez (protege TS2300)`);
  }
}
ok(types.includes('laboratorio_etiqueta?: string | null;')&&types.includes('separada do fabricante por aquisição'),'etiqueta visual modelada separadamente da aquisição');
ok(create.includes('ManufacturerFieldM129')&&create.includes('MedicationCustomColorEditorM138 colors={cores} onChoose={toggleCor}')&&create.includes('laboratorio_etiqueta: laboratorioEtiqueta.trim() || undefined')&&create.includes('setLaboratorioEtiqueta'),'criacao preenche e salva etiqueta e HEX');
ok(edit.includes('setLaboratorioEtiqueta(item.laboratorio_etiqueta || "")')&&edit.includes('MedicationCustomColorEditorM138 colors={cores} onChoose={toggleCor}')&&edit.includes('laboratorio_etiqueta: laboratorioEtiqueta.trim() || null'),'edicao carrega, limpa e salva etiqueta e HEX');
ok(edit.includes('markChanged();')&&edit.includes('ManufacturerFieldM129 label="Laboratório na etiqueta (opcional)"'),'edicao marca mudanca real sem duplicar campo');
ok(list.includes('Lab. {med.laboratorio_etiqueta}')&&detail.includes('Etiqueta visual · {med.laboratorio_etiqueta}')&&preview.includes('Etiqueta · {label}'),'etiqueta aparece na previa, lista e detalhe');
// M137 ja possui a associacao de fabricante a uma aquisicao efetiva no cadastro.
// A M138 nao pode remover essa associacao nem confundir etiqueta visual com a compra.
const acquisitionSignature = 'observacoes: fabricanteAquisicao.trim() ? attachManufacturerMetadata("", { manufacturer: fabricanteAquisicao }) : undefined';
ok(create.includes(acquisitionSignature) &&
   (create.match(/attachManufacturerMetadata\(/g) || []).length === 1 &&
   !create.includes('attachManufacturerMetadata("", { manufacturer: laboratorioEtiqueta })') &&
   !edit.includes('mergeManufacturerAcquisitionEditM128('),
   'etiqueta independente da aquisicao existente; metadado historico M137 preservado');
const oldManufacturer=read('components/saude/MedicationManufacturerOverviewM128.tsx');
ok(oldManufacturer.includes('db.renovacoes.where("medicamento_id")')&&oldManufacturer.includes('row.user_id === userId && row.person_id === personId'),'leitura historica fabricante mantém isolamento por pessoa');
const agenda=read('components/home/HomeAgendaBreakdown.tsx');const home=read('app/page.tsx');
ok(agenda.includes('onOpenAgenda')&&agenda.includes('Ver compromissos com detalhes')&&home.includes('id="home-compromissos"'),'Home rola para cards reais, em vez de segunda listagem por padrao');
ok(agenda.includes('Abrir seção por tipo')&&agenda.includes('grid grid-cols-1 gap-1.5')&&agenda.includes('onNavigate(item.href)'),'atalhos por categoria permanecem sob demanda');
ok(home.includes('countHomeTodayAppointments(')&&home.includes('retiradasAtrasadas.length')&&home.includes('<HomeDailyHero '),'autoridades operacionais da Home mantidas');
ok(read('components/hoje/TodayAgendaOverview.tsx').includes('min-h-12 w-full min-w-0'),'Hoje: alvos de agenda legiveis no celular');
ok(read('components/saude/SupplyProcessJourney.tsx').includes('min-h-[76px]')&&read('components/saude/SupplyProcessJourney.tsx').includes('text-[11px] leading-relaxed'),'jornada de fornecimento com fontes maiores e quebra de linha');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m138-visual-identity.cjs'),'M138 integra release gate global');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m137-temporary-course-integrity.cjs'),'M137 preservada no gate');
console.log(`VAULT M138: ${checked} verificacoes de identidade, historico, navegação e regressao aprovadas`);
