#!/usr/bin/env node
"use strict";
// M149: independent behavioral tests; no medication, stock or diary writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = path => fs.readFileSync(path, 'utf8');
let checked = 0;
const ok = (condition, label) => { assert.ok(condition, 'M149: ' + label); checked++; };
function parse(file) {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const src = ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,kind);
  ok(src.parseDiagnostics.length===0,`${file}: syntax`);
  return read(file);
}
function loadTs(file, mocks={}) {
  const compiled = ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const sandboxModule={exports:{}};
  vm.runInNewContext(compiled,{module:sandboxModule,exports:sandboxModule.exports,require(name){
    if (Object.prototype.hasOwnProperty.call(mocks,name))return mocks[name];
    throw new Error('M149: import inesperado em teste puro: '+name);
  }});
  return sandboxModule.exports;
}
const paths=[
  'app/page.tsx','app/saude/medicamentos/page.tsx','app/saude/central-m144/error.tsx',
  'components/BottomNav.tsx','components/home/HomeCommandCenter.tsx',
  'components/saude/MedicationProvenanceBadge.tsx',
  'lib/health-intelligence/medication-day-sort-m149.ts',
  'lib/health-intelligence/medication-stock-display-m149.ts',
];
for (const path of paths) parse(path);
const home=read(paths[0]),meds=read(paths[1]),central=read(paths[2]),nav=read(paths[3]),center=read(paths[4]),badge=read(paths[5]);
ok(!home.includes('<summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-ink-muted">Acompanhamento de saúde</summary>'),'sem botão solto na primeira dobra');
ok(home.includes('VAULT_M144_HOME_ENTRY')&&home.includes('router.push("/saude/central-m144?return_to=%2F")'),'Home mantém acesso contextual real');
ok(home.includes('onOpenOccurrences={() =>')&&center.includes('onOpenOccurrences?: () => void'),'Home delega destino ao componente existente');
ok(center.includes('label="Ocorrências e ciclos"')&&center.includes('description="Vacinas e histórico"')&&center.includes('Icon={Syringe}'),'Home usa grade e ícone Lucide');
ok(badge.includes('data-provenance={source}')&&badge.includes('aria-label={detail}')&&badge.includes('title={detail}'),'proveniência distinta sem palavras extras visíveis');
ok(badge.includes('{identity.label}')&&!badge.includes('`Etiqueta · ${identity.label}`')&&!badge.includes('`Últ. aquisição · ${identity.label}`'),'texto visível contém somente laboratório');
ok(meds.includes('source="ultima_aquisicao"')&&meds.includes('source="etiqueta"'),'etiqueta e aquisição independentes');
ok(meds.indexOf('source="ultima_aquisicao"')<meds.indexOf('source="etiqueta"'),'prioriza última aquisição ao mostrar rótulos');
ok(meds.includes('setSelectedRegulatoryAuthority(catalogIdentity?.authorityState ?? "unvalidated")'),'modal associa identidade real');
ok(meds.includes('selectedRegulatoryAuthority === "possible_divergence"')&&meds.includes('Identidade farmacêutica ainda não confirmada pelo catálogo'),'modal não afirma confirmação sem fonte');
ok(nav.includes('window.location.assign("/")')&&nav.includes('}, 5000);'),'fallback da Home só após tentativas de SPA');
ok(nav.includes('window.clearTimeout(homeFallbackRef.current)')&&nav.includes('document.visibilityState === "visible"'),'fallback cancelável/escopo visível');
ok(central.includes('onClick={reset}')&&central.includes('href="/saude/minha-saude"'),'central tem recuperação sem roteamento automático');
ok(meds.includes('const hojeString = useLocalDay()'),'data atualiza ao virar o dia/retomar');
ok(meds.includes('medicationStockLabelM149(stockSnapshot, med.estoque_unidade_medida'),'estoque usa quantidade registrada, não status vago');
ok(meds.includes('listaCronologica.slice(0, unifiedVisibleCount)')&&meds.includes('sort(compareDayM149)'),'lista por horário do dia');
const v148=loadTs('lib/health-intelligence/medication-list-sort-m148.ts');
const m149=loadTs('lib/health-intelligence/medication-day-sort-m149.ts',{
  '@/lib/health-intelligence/medication-list-sort-m148':v148,
});
const comp=m149.createMedicationDayComparatorM149([
  {medicamento_id:'tmp',horario:'10:00',dose_kind:'planned'},
  {medicamento_id:'tmp',horario:'08:00',dose_kind:'planned'},
  {medicamento_id:'tmp',horario:'07:00',dose_kind:'ad-hoc'},
]);
const row=(id,nome,hours,tipo)=>({med:{id,nome,estoque_horarios:hours,tipo_uso:tipo}});
const a=row('tmp','Período',['23:00'],'temporario');
const b=row('regular','Contínuo',['09:00'],'continuo');
const c=row('SOS','SOS',[],'sos');
const arr=[c,b,a].sort(comp);
ok(arr.map(x=>x.med.id).join(',')==='tmp,regular,SOS','temporário usa 08h planejado real, não 23h nem 07h avulso');
ok(comp(row('x','Outro',['06:00'],'temporario'),b)>0,'temporário sem slot planejado não inventa 06h');
const stock=loadTs('lib/health-intelligence/medication-stock-display-m149.ts');
const show=stock.medicationStockLabelM149;
ok(show({state:'unknown',registeredQuantity:null},'comprimidos')==='Não informado','desconhecido não vira zero');
ok(show({state:'empty',registeredQuantity:0},'comprimido(s)')==='0 comprimidos','zero real explícito');
ok(show({state:'available',registeredQuantity:13},'comprimido(s)')==='13 comprimidos','contagem positiva explícita');
ok(show({state:'negative',registeredQuantity:-3},'comprimido(s)').includes('-3 comprimidos'),'negativo preservado, não mascarado');
ok(show({state:'available',registeredQuantity:2},'')==='2','unidade ausente não é inventada');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('const contracts = [\n  "scripts/test-vault-m92-medication-premium-2.cjs",'),'M92 continua primeiro');
ok(gate.split('"scripts/test-vault-m149.cjs"').length===2,'M149 entra no gate uma única vez');
console.log(`VAULT M149: ${checked} verificações de identidade, navegação, estoque e horários OK`);
