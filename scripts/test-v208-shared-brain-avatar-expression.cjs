const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = (file) => fs.readFileSync(file, 'utf8');

const provider = read('contexts/HealthIntelligenceContext.tsx');
const shell = read('components/Providers.tsx');
const avatar = read('components/saude/HealthAvatar3D.tsx');

assert(provider.includes('const HealthIntelligenceContext = createContext<HealthIntelligenceValue | null>(null)'));
assert(provider.includes('const value = useHealthIntelligenceEngine()'), 'shared provider must own the single engine');
assert(provider.includes('useSharedHealthIntelligence precisa estar dentro de HealthIntelligenceProvider'));
assert(shell.includes('<HealthIntelligenceProvider>'));
assert(shell.indexOf('<HealthIntelligenceProvider>') < shell.indexOf('<InsightNotificationReconciler />'));
assert(shell.lastIndexOf('</HealthIntelligenceProvider>') > shell.lastIndexOf('children'));

const consumers = [
  'app/inteligencia/page.tsx',
  'app/inteligencia/saude/page.tsx',
  'app/page.tsx',
  'app/saude/minha-saude/page.tsx',
  'app/saude/registros/relatorio/page.tsx',
  'app/saude/timeline/page.tsx',
  'components/InsightNotificationReconciler.tsx',
  'components/vault-intelligence/ContextualHealthIntelligence.tsx',
  'hooks/useBrainV5Alerts.ts',
];
for (const file of consumers) {
  const source = read(file);
  assert(source.includes('useSharedHealthIntelligence as useHealthIntelligence'), `${file} must consume the shared snapshot`);
  assert(!source.includes('from "@/hooks/useHealthIntelligence"'), `${file} must not instantiate another engine`);
}

for (const marker of [
  'V208: expression controls reuse',
  'const expressionBrows:',
  'const expressionLids:',
  'expressionBrows.push({object:brow,sign})',
  'expressionLids.push({object:upperLid,sign})',
  'value==="happy"?-sign*.17',
  'value==="reflective"?.72',
]) assert(avatar.includes(marker), `Avatar expression marker missing: ${marker}`);
assert(!avatar.includes('requestAnimationFrame(animate)'), 'Avatar must remain demand-rendered');

for (const file of ['contexts/HealthIntelligenceContext.tsx', 'components/Providers.tsx', ...consumers, 'components/saude/HealthAvatar3D.tsx']) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0, `syntax error: ${file}`);
}

console.log('V208 OK: one shared Brain engine feeds every consumer and Avatar expressions reuse static face meshes');
