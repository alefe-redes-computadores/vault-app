#!/usr/bin/env node
'use strict';
/* Execute REAL presentation-only TypeScript: no fake label implementation and no IO clinical. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');
const relative = 'lib/medications/visual-copy.ts';
const file = path.resolve(process.cwd(), relative);
const source = fs.readFileSync(file, 'utf8');
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.equal(parsed.parseDiagnostics.length, 0, 'visual-copy must parse');
const compiled = ts.transpileModule(source, {fileName:file,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}});
assert.equal((compiled.diagnostics || []).filter(x=>x.category===ts.DiagnosticCategory.Error).length, 0);
const mod = new Module(file, module);
mod.filename = file;
mod.require = id => {throw Error('visual-copy pure module unexpectedly imported ' + id)};
mod._compile(compiled.outputText, file);
const copy = mod.exports;
assert.equal(copy.countLabel(0, 'retirada', 'retiradas'), '0 retiradas');
assert.equal(copy.countLabel(1, 'retirada', 'retiradas'), '1 retirada');
assert.equal(copy.countLabel(2, 'retirada', 'retiradas'), '2 retiradas');
assert.equal(copy.countLabel(2, 'pendente', 'pendentes'), '2 pendentes');
module.exports = copy;
