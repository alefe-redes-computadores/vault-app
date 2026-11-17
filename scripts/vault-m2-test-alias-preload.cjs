/**
 * CI360 M2 — ONLY for V63's legacy pure-TS Node scripts.
 * Older tests transpile TS to CJS and call require() without Next.js alias resolution.
 * Resolve exactly the new M2 pure modules using their REAL implementations.
 * No mocks, no application/runtime modifications, no global JS/TS compiler hook.
 */
'use strict';
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const allowed = new Map([
  ['@/lib/careflow-m2/reminder-window', 'lib/careflow-m2/reminder-window.ts'],
  ['@/lib/careflow-m2/withdrawal-coherence', 'lib/careflow-m2/withdrawal-coherence.ts'],
]);
const original = Module.prototype.require;
const cache = new Map();
function loadPure(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (!filename.startsWith(root + path.sep)) throw Error('M2 test module outside checkout');
  if (cache.has(filename)) return cache.get(filename).exports;
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, m);
  try {
    const source = fs.readFileSync(filename, 'utf8');
    const js = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    m._compile(js, filename);
    return m.exports;
  } catch (err) {
    cache.delete(filename);
    throw err;
  }
}
Module.prototype.require = function vaultM2TestRequire(id) {
  if (allowed.has(id)) return loadPure(allowed.get(id));
  if (id === './domain' && this.filename === path.join(root,'lib/careflow-m2/reminder-window.ts'))
    return loadPure('lib/careflow-m2/domain.ts');
  return original.apply(this, arguments);
};
