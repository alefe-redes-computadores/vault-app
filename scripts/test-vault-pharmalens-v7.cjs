'use strict';
/** Executa implementação verdadeira no checkout VAULT; sem mocks nem acesso de rede. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const files = [
  'lib/health-intelligence/pharmalens-v7.ts',
  'components/saude/PharmaLensOverviewV7.tsx',
];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file}: falha TS/TSX sintática`);
}
const resolveOriginal = Module._resolveFilename;
const loadOriginal = require.extensions['.ts'];
// Redirecionamento TEMPORÁRIO no processo do teste, não altera o código real.
Module._resolveFilename = function(request, parent, ...other) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const physical = path.join(root, request.slice(2));
    return resolveOriginal.call(this, fs.existsSync(physical + '.ts') ? physical + '.ts' : physical, parent, ...other);
  }
  return resolveOriginal.call(this, request, parent, ...other);
};
require.extensions['.ts'] = function(mod, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length || 0, 0, filename);
  mod._compile(result.outputText, filename);
};
let build;
try { ({buildPharmaLensReportV7: build} = require(path.join(root, files[0]))); }
finally {
  Module._resolveFilename = resolveOriginal;
  if (loadOriginal) require.extensions['.ts'] = loadOriginal;
  else delete require.extensions['.ts'];
}
const product = (manufacturer, commercialName='') => `[VAULT:PRODUTO]${JSON.stringify({manufacturer,commercialName})}`;
const transition = (id, manufacturer, previous, date, assessment) => `[VAULT:TROCA-FABRICANTE]${JSON.stringify({acquisitionId:id,sourceManufacturer:manufacturer,priorManufacturer:previous,startedAt:date,assessment,recordedAt:'2026-11-10T10:00:00.000Z'})}`;
const checkin = (id, manufacturer, day) => `[VAULT:RELATO-FABRICANTE]${JSON.stringify({acquisitionId:id,manufacturer,day,recordedAt:'2026-11-11T10:00:00.000Z',notes:'Relato informado pelo usuário'})}`;
const row = (id,when,notes,extra={})=>({id,user_id:'user-A',person_id:'person-A',medicamento_id:'med-1',data:'2026-10-01',data_aquisicao:when,tipo_aquisicao:'comprado',observacoes:notes,created_at:'2026-11-10T00:00:00.000Z',updated_at:'2026-11-11T00:00:00.000Z',...extra});
const earlier=row('a','2026-10-02',product('Teuto'));
const current=row('b','2026-11-02',[
  product('Eurofarma Laboratórios'),transition('b','Eurofarma','Teuto','2026-11-03','better'),
  checkin('b','Eurofarma',1),checkin('b','Eurofarma Laboratórios',3),checkin('b','Teuto',7),
].join('\n'));
const noStart=row('c','2026-11-04',product('Germed'));
const incomplete=row('d',null,product('Cristália'));
const prescription=row('rx',null,'Receita sem compra',{tipo_aquisicao:undefined,quantidade:null,preco:null});
const foreignAccount=row('foreign','2026-11-05',product('EMS'),{user_id:'user-B'});
const foreignPerson=row('foreign-person','2026-11-05',product('EMS'),{person_id:'person-B'});
const foreignMedication=row('med-other','2026-11-05',product('EMS'),{medicamento_id:'med-2'});
const future=row('future','2026-12-01',product('Teuto'));
const source=[earlier,current,noStart,incomplete,prescription,foreignAccount,foreignPerson,foreignMedication,future];
const report=build({userId:'user-A',personId:'person-A',medicationId:'med-1',acquisitions:source,todayISO:'2026-11-13'});
assert.equal(report.totalAcquisitions,4,'Apenas aquisições realizadas, não receitas/futuro/outras pessoas');
assert.equal(report.futureAcquisitionsExcluded,1, 'Compra futura não é aquisição realizada');
assert.equal(report.documentedTransitions,1,'Troca com início declarado e fabricante anterior válido');
assert.equal(report.interpretation,'observacional_sem_causalidade');
const b=report.cycles.find(x=>x.acquisitionId==='b');
assert.equal(b.quality,'documentado');
assert.equal(b.manufacturer,'Eurofarma Laboratórios');
assert.equal(b.previousManufacturer,'Teuto');
assert.equal(b.startedAt,'2026-11-03');
assert.equal(b.confirmedManufacturerTransition,true);
assert.equal(b.perceivedChange,'better');
assert.deepEqual(b.checkIns.map(x=>x.day),[1,3]);
assert.deepEqual(b.otherManufacturerCheckIns.map(x=>x.day),[7], 'Não reatribuir relato após fabricante editar');
assert(b.issues.includes('relato_de_outro_fabricante'));
const c=report.cycles.find(x=>x.acquisitionId==='c');
assert.equal(c.quality,'parcial');
assert.equal(c.startedAt,null,'Compra não significa uso iniciado');
const d=report.cycles.find(x=>x.acquisitionId==='d');
assert.equal(d.acquiredAt,null,'NUNCA usar data da receita como compra real');
assert.equal(report.cycles.find(x=>x.acquisitionId==='future'),undefined);
const group=report.manufacturers.find(x=>x.manufacturer==='Eurofarma Laboratórios');
assert.equal(group.personalCheckInCount,2);
assert.equal(group.personalAssessments.better,1);
const edited=row('edit','2026-11-05',[
  product('EMS'),transition('edit','Teuto','Cristália','2026-11-06','worse'),
  checkin('edit','Teuto',1),
].join('\n'));
const editedReport=build({userId:'user-A',personId:'person-A',medicationId:'med-1',acquisitions:[earlier,edited],todayISO:'2026-11-13'});
const editedCycle=editedReport.cycles.find(x=>x.acquisitionId==='edit');
assert.equal(editedCycle.startedAt,null);
assert.equal(editedCycle.perceivedChange,null);
assert.equal(editedCycle.otherManufacturerCheckIns.length,1);
assert(editedCycle.issues.includes('fabricante_editado_apos_relato'));
const duplicateLatest=row('b','2026-11-02',current.observacoes,{updated_at:'2026-11-12T00:00:00.000Z'});
assert.equal(build({userId:'user-A',personId:'person-A',medicationId:'med-1',acquisitions:[current,duplicateLatest]}).totalAcquisitions,1);
assert.equal(build({userId:'',personId:'person-A',medicationId:'med-1',acquisitions:source}).totalAcquisitions,0);
assert.equal(build({userId:'user-A',personId:'',medicationId:'med-1',acquisitions:source}).totalAcquisitions,0);
assert.equal(build({userId:'user-A',personId:'person-B',medicationId:'med-1',acquisitions:source}).totalAcquisitions,1,'Sem vazamento de outra pessoa');
assert.equal(build({userId:'user-A',personId:'person-A',medicationId:'med-99',acquisitions:source}).totalAcquisitions,0);
assert(!fs.readFileSync(path.join(root,files[0]),'utf8').includes('update('), 'Camada de leitura não escreve dados');
console.log('PL7-P1 PHARMALENS V7: CONTRATOS APROVADOS | isolação, datas, aliases, relatos, troca, duplicação, apenas leitura.');
