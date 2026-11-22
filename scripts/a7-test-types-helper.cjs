'use strict';
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
exports.loadTypes=()=>{
 const name='lib/surgery-a7/types.ts',src=fs.readFileSync(name,'utf8');
 const out=ts.transpileModule(src,{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(out,{module:mod,exports:mod.exports,Date,String,Number,Object,RegExp,Math,Set,Array,Error},{filename:name,timeout:3000});
 return mod.exports;
};
