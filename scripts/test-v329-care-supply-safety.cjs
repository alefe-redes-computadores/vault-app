#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript"),path=require("node:path"),Module=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
const dec=read("lib/health-intelligence/medication-care-decision.ts");
const sup=read("app/saude/fornecimento/page.tsx");
const over=read("components/saude/AccessCommandOverview.tsx");
const safety=read("app/saude/plano-seguranca/page.tsx");
for(const [p,s] of [["decision.ts",dec],["supply.tsx",sup],["overview.tsx",over],["safety.tsx",safety]]){
 const tree=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,p.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,`${p}: TSX/TS válido`);
}
const root=process.cwd(),cache=new Map();
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith("@/lib/")?load(id.slice(2)+".ts"):id.startsWith(".")?load(path.resolve(path.dirname(file),id)+".ts"):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const decide=load("lib/health-intelligence/medication-care-decision.ts").decideMedicationCarePath;
const m={id:"med",user_id:"u",person_id:"p",nome:"Remédio",estoque_quantidade:0};
const rx={id:"rx",user_id:"u",person_id:"p",medicamento_id:"med",data:"2026-09-12",document_id:"doc"};
const buy={id:"buy",user_id:"u",person_id:"p",medicamento_id:"med",data:"2026-09-23",data_aquisicao:"2026-09-23",tipo_aquisicao:"comprado",quantidade:20};
let d=decide({medication:m,renewals:[rx,buy],today:"2026-10-29",needsPrescription:true,needsStock:true});
assert.equal(d.stage,"acquisition_needed");assert.equal(d.actionLabel,"Conferir aquisição");assert.equal(d.prescriptionOnFile,false);assert.match(d.explanation,/não comprova que esteja válida/);
d=decide({medication:m,renewals:[rx,buy],today:"2026-10-29",needsPrescription:true,needsStock:false});
assert.equal(d.stage,"stock_review");assert.equal(d.actionLabel,"Conferir receita");
d=decide({medication:m,renewals:[rx],today:"2026-10-29",needsPrescription:true,needsStock:true});
assert.equal(d.stage,"acquisition_needed");assert.equal(d.actionLabel,"Registrar aquisição");
d=decide({medication:m,renewals:[],today:"2026-10-29",needsPrescription:true,needsStock:false});assert.equal(d.stage,"prescription_needed");
const foreign={...rx,user_id:"outside",id:"foreign"};
d=decide({medication:m,renewals:[foreign],today:"2026-10-29",needsPrescription:true,needsStock:false});assert.equal(d.stage,"prescription_needed");
assert(sup.includes('id="documentos-pendentes"')&&sup.includes('requirement.status === "missing"'));
assert(sup.includes('onNavigate={navigateSupplyAction}')&&sup.includes('id="processo-atual"'));
assert(sup.includes('item.href.startsWith("/saude/fornecimento")'));
assert(sup.includes('Conferir vínculo documental'));
assert(!sup.includes('data-process-fake'));
assert(over.includes('/saude/fornecimento#documentos-pendentes'));
assert(over.includes("Somente exigência explícita"));
assert(safety.includes('VAULT_SAFETY_PLAN_PROGRESSIVE_V70'));
for(const key of ["warningSigns","copingSteps","reasonsToStay","trustedPeople","professionalContacts","saferEnvironment"])assert(safety.includes(key),key);
assert(safety.includes('readSafetyPlan(activePersonId)')&&safety.includes('saveSafetyPlan(activePersonId, plan)'));
assert(safety.includes('SAMU 192')&&safety.includes('CVV 188'));
assert(safety.includes('mode === "consultar"')&&safety.includes('Alterações não salvas'));
assert(!safety.includes("localStorage.clear("));
console.log("V329 OK: receita vs aquisição com validade incerta, documentos SUS focados, plano de segurança local e consultável");
