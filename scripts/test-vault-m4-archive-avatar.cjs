#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const read = path => fs.readFileSync(path, 'utf8');
let checks=0;
function ok(value, name) { assert(value, `VAULT M4: ${name}`); console.log(`✓ ${++checks}: ${name}`); }

const paths = [
  'app/saude/documentos/page.tsx',
  'components/saude/HealthAvatar3D.tsx',
  'lib/health-documents/archive-presentation.ts',
  'lib/health-profile/avatar-scene-geometry.ts',
  'scripts/test-v63-release-gate.mjs',
];
const [page, avatar, archive, geometry, gate] = paths.map(read);
for (const [i, path] of paths.entries()) {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(path, [page,avatar,archive,geometry,gate][i], ts.ScriptTarget.Latest, true, kind);
  ok(tree.parseDiagnostics.length === 0, `sintaxe TS/TSX válida: ${path}`);
}
ok(page.includes('from "@/lib/health-documents/archive-presentation"') && !page.includes('function getPrescriptionAlert('),
  'acervo delega apresentações, sem duplicar a decisão');
ok(archive.includes('export function getPrescriptionAlert(') && archive.includes('export function documentSearchFields(')
  && archive.includes('export const DOMAIN_CONFIG:'), 'domínios e helpers exportados para a mesma tela');
ok(page.includes('document.user_id ===') && page.includes('item.user_id === user?.id')
  && page.includes('buildDocumentMedicationIndexesByOwner('), 'escopos de usuário/pessoa e relações permanecem na página');
ok(page.includes('const resolvedViewModels =') && page.includes('const uniqueDocumentViewModels')
  && page.includes('onBeforeExport={prepareExportSurface}') && page.includes('onAfterExport={releaseExportSurface}'),
  'árvore clínica e ciclo de exportação permanecem canônicos');
ok(archive.includes('matches.length === 1') && archive.includes('document.entidade_tipo ||')
  && archive.includes('renewalsByMedication.get('), 'receita legada exige vínculo único e não inventa renovação');
ok(archive.includes('isReceitaVencidaSegura(') && archive.includes('getDaysUntil(')
  && archive.includes('getDocumentDate('), 'validade e datas mantêm as autoridades anteriores');
ok(!/(?:\bdb\.|\bsupabase\b|safeAdd\(|safeUpdate\(|\.put\(|\.delete\(|\.insert\(|fetch\()/i.test(archive),
  'módulo de acervo não consulta nem grava registros');

// Behavioral tests of the actual extracted functions with deterministic mocks,
// independent of app data, network, locale and today's current date.
const symbols = new Proxy({}, { get: (_target, key) => key });
const dependencies = {
  'lucide-react': symbols,
  'date-fns': { format: (_date, pattern) => pattern, parseISO: date => new Date(`${date}T12:00:00Z`) },
  'date-fns/locale': { ptBR: {} },
  '@/lib/health-insights': { isReceitaVencidaSegura: value => value < '2026-11-01' },
  '@/lib/health-utils': { getDaysUntil: () => 4 },
};
const archiveJs = ts.transpileModule(archive, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const box = { exports: {} };
new Function('module','exports','require',archiveJs)(box,box.exports,id=>{
  if (!(id in dependencies)) throw Error(`Import não previsto no módulo clínico: ${id}`);
  return dependencies[id];
});
const model = box.exports;
ok(model.normalizeSearch('Ácido Úrico') === 'acido urico', 'busca sem acentos preservada');
const legacy = { type:'receita', title:'Receita — Fenergan', created_at:'2026-10-12', metadata:{} };
ok(model.extractLegacyPrescriptionMedicationName(legacy) === 'Fenergan', 'título histórico explicitamente reconhecido');
ok(model.findUniqueLegacyPrescriptionMedication(legacy,[{id:'m1',nome:'Fenergan'}])?.id === 'm1',
  'vínculo histórico único encontrado sem gravação');
ok(model.findUniqueLegacyPrescriptionMedication(legacy,[{id:'m1',nome:'Fenergan'},{id:'m2',nome:'FENERGAN'}]) === null,
  'ambiguidade de receita histórica não vira vínculo fictício');
ok(model.findUniqueLegacyPrescriptionMedication({...legacy,entidade_tipo:'consulta'},[{id:'m1',nome:'Fenergan'}]) === null,
  'entidade canônica não é sobrescrita por inferência legada');
ok(model.getPrescriptionAlert({...legacy,metadata:{medicamento_id:'m1',prescription_date:'2026-10-12'}},
  new Map([['m1',[{data:'2026-10-20'}]]]))?.status === 'renovada',
  'renovação comprovada após a receita tem prioridade');
ok(model.getPrescriptionAlert(legacy,new Map()) === null, 'sem vínculo e sem validade não inventa alerta');
ok(model.getMedicationColors({cores:[' #123456 ','#abcdef','#987654']}).join('|') === '#123456|#abcdef',
  'cores documentais limitadas às duas originais');
ok(model.getDocumentTypeLabel('receita') === 'Receita' && model.getDocumentTypeLabel('lme') === 'LME',
  'rótulos de receita e LME mantidos');

ok(avatar.includes('const softBox=avatarSoftBoxGeometry;') && avatar.includes('const taperedBox=avatarSafeTaperedBoxGeometry;')
  && avatar.includes('const shadowTexture=createAvatarGroundShadowTexture();textures.push(shadowTexture);'),
  'geometria e sombra usam fábricas compartilhadas e continuam descartáveis');
ok(geometry.includes('new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:3})')
  && geometry.includes('new THREE.BoxGeometry(Math.max(backWidth,frontWidth),height,depth)')
  && geometry.includes('shadowCanvas.width=128;shadowCanvas.height=128'),
  'malhas V230 e resolução da sombra preservadas sem GPU adicional');
ok(avatar.includes('const noseBridge=mesh(taperedBox(')
  && avatar.includes('const brow=mesh(softBox(')
  && avatar.includes('expressionEyeScaleY') && avatar.includes('expressionLidScaleY'),
  'malha facial, olhos e expressão não são reconstruídos');
ok(avatar.includes('renderer.forceContextLoss()') && avatar.includes('renderer.dispose()')
  && avatar.includes('const visibilityObserver=new IntersectionObserver')
  && !avatar.includes('requestAnimationFrame(animate)')
  && !geometry.includes('requestAnimationFrame'),
  'orçamento GPU e cleanup continuam operacionais');
ok(gate.includes('"scripts/test-vault-m4-archive-avatar.cjs"')
  && gate.includes('"scripts/test-vault-m3-medication-forms.cjs"')
  && gate.includes('"scripts/test-vault-m2-pure-projections.cjs"'),
  'gate M1/M2/M3/M4 preservado');
console.log(`VAULT M4: ${checks} contratos de acervo, identidade, Avatar 3D e estrutura aprovados.`);
