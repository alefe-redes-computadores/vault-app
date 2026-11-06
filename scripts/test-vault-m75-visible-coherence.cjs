#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache=new Map();
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;const m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,m);m.require=id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(filename),id)+'.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const eq=load('lib/medication-catalog/pharmaceutical-equivalence.ts').isPharmaceuticallyEquivalentName;
assert.equal(eq('Metadona','Cloridrato de metadona'),true);
assert.equal(eq('Metadona','Cloridrato de morfina'),false);
assert.equal(eq('Metadona',''),false);
for(const file of ['app/page.tsx','app/inteligencia/page.tsx','app/saude/renovacao/page.tsx','app/saude/medicamentos/detalhes/page.tsx','app/saude/documentos/page.tsx','app/saude/tratamentos/page.tsx','components/saude/ClinicalSectionNav.tsx','components/saude/CareJourney360.tsx','components/saude/MedicationRoutineSummary.tsx','components/saude/HealthAvatar.tsx']) {const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(ast.parseDiagnostics.length,0,`${file}: sintaxe`);}
console.log('M75: nomes, sintaxe e preservação de equivalência OK');
