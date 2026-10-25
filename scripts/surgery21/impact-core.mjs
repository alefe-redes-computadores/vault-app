// VAULT SURGERY 2.1 — static impact graph, pure core. No network, no mutation.
import path from 'node:path';

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
export const SURFACES = [
  { path: /(?:^|\/)(?:avatar|health-profile|HealthAvatar|HealthBody)/i, test: /avatar|body|health.profile|surgery/i },
  { path: /health-intelligence|vault-intelligence|inteligencia|brain|insight/i, test: /brain|insight|intelligence|v2[3-6]\d/i },
  { path: /dose|medicament|posologia|sos/i, test: /dose|medic|sos|today|hoje|v2[3-6]\d/i },
  { path: /sync|supabase|repositories|db\//i, test: /sync|offline|reconcil|integrity|v2[3-6]\d/i },
  { path: /documents|documentos|galeria|attachments/i, test: /document|attachment|supply|v2[3-6]\d/i },
  { path: /notification|notific|capacitor|native/i, test: /notific|native|android|pre.apk|v2[3-6]\d/i },
  { path: /treatment|tratament|care.network|timeline/i, test: /treat|care|network|timeline|v2[3-6]\d/i },
];

export function canonical(value) {
  const cleaned = String(value).replace(/\\/g, '/').replace(/^\.\//, '');
  const normalized = path.posix.normalize(cleaned);
  if (normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) throw new Error(`Caminho fora do repositório: ${value}`);
  return normalized;
}

export function resolveImport(from, specifier, known) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/') ? specifier.slice(2) : path.posix.join(path.posix.dirname(from), specifier);
  const normalized = canonical(base);
  const candidates = [normalized, ...SOURCE_EXTENSIONS.map(ext => normalized + ext), ...SOURCE_EXTENSIONS.map(ext => `${normalized}/index${ext}`)];
  return candidates.find(candidate => known.has(candidate)) ?? null;
}

export function buildReverseGraph(fileSpecs, known) {
  const reverse = new Map();
  for (const [file, specs] of Object.entries(fileSpecs)) {
    for (const spec of specs) {
      const dep = resolveImport(file, spec, known);
      if (!dep) continue;
      if (!reverse.has(dep)) reverse.set(dep, new Set());
      reverse.get(dep).add(file);
    }
  }
  return reverse;
}

export function reachableImporters(changed, reverse, limit = 20000) {
  const visited = new Set(changed.map(canonical));
  const queue = [...visited];
  while (queue.length) {
    const node = queue.shift();
    for (const dependent of reverse.get(node) ?? []) {
      if (visited.has(dependent)) continue;
      if (visited.size >= limit) throw new Error('Grafo de impacto atingiu limite de segurança.');
      visited.add(dependent); queue.push(dependent);
    }
  }
  return visited;
}

export function scoreTest(test, text, changed, reachable, imported) {
  const normalizedTest = test.toLowerCase();
  const reasons = [];
  if (changed.has(test)) reasons.push('teste diretamente alterado');
  if ([...imported].some(dep => reachable.has(dep))) reasons.push('dependência importada afetada');
  for (const file of reachable) {
    const withoutExt = file.replace(/\.[cm]?[jt]sx?$/, '');
    if (text.includes(file) || text.includes(withoutExt)) { reasons.push(`referência explícita: ${file}`); break; }
  }
  if (!reasons.length && [...changed].some(file => SURFACES.some(rule => rule.path.test(file) && rule.test.test(normalizedTest)))) reasons.push('afinidade de superfície (heurística)');
  const strong = reasons.some(x => !x.startsWith('afinidade'));
  return { test, score: strong ? 100 : reasons.length ? 15 : 0, reasons, confidence: strong ? 'alta' : reasons.length ? 'heurística' : 'nenhuma' };
}

export function rankTests(tests, textByTest, changed, reachable, importedByTest = {}) {
  const changedSet = new Set(changed.map(canonical));
  return tests.map(test => scoreTest(test, textByTest[test] ?? '', changedSet, reachable, importedByTest[test] ?? [])).filter(x=>x.score>0).sort((a,b)=> b.score-a.score || a.test.localeCompare(b.test));
}
