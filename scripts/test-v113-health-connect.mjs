import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import ts from "typescript";
import { execFileSync } from "node:child_process";
const cache = new Map();
function load(file) {
  if(cache.has(file))return cache.get(file);
  const box = { exports:{},Date,Number,Math,Set,Object,Error,require(name) { return load((name.startsWith("@/") ? name.slice(2) : path.join(path.dirname(file),name))+".ts"); } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);
  cache.set(file,box.exports);return box.exports;
}
const {normalizeConnectRecord:normalize} = load("lib/health-connect/normalize.ts");
const end = new Date(Date.now()-3600000).toISOString(), start = new Date(Date.parse(end)-480*60000).toISOString();
const record = {id:"samsung-night",origin:"com.sec.android.app.shealth",type:"sono",time:end,value:480,start,end};
const n = normalize(record);
assert.equal(n.duracao_minutos,480);assert.equal(n.inicio_em,start);assert.equal(n.fim_em,end);
assert.ok(n.source_record_id.includes("samsung-night"));
assert.throws(()=>normalize({...record,origin:"other.app"}));
assert.throws(()=>normalize({...record,value:479}));
assert.throws(()=>normalize({...record,time:new Date(Date.now()+3600000).toISOString()}));
assert.throws(()=>normalize({...record,value:NaN}));
assert.throws(()=>normalize({...record,type:"__proto__"}));
assert.throws(()=>normalize({...record,start:new Date(Date.parse(end)-2*86400000).toISOString()}));
assert.throws(()=>normalize({...record,id:""}));
const pulse = normalize({id:"daily-test",origin:record.origin,type:"frequencia_cardiaca",value:76,time:end,dailyAverage:true});
assert.match(pulse.nome,/média diária/);assert.equal(pulse.inicio_em,null);
const pressure=normalize({id:"bp",origin:record.origin,type:"pressao_arterial",value:120,second:80,time:end});assert.equal(pressure.valor_medicao,"120/80");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vault-health-connect-"));
try {
  execFileSync("tar",["--no-same-owner","-xzf",path.resolve("node_modules/@capacitor/cli/assets/android-template.tar.gz"),"-C",tmp]);
  const a=path.join(tmp,"android");fs.mkdirSync(a);for(const name of fs.readdirSync(tmp))if(name!=="android")fs.renameSync(path.join(tmp,name),path.join(a,name));
  const original=path.join(a,"app/src/main/java/com/getcapacitor/myapp/MainActivity.java");
  const dir=path.join(a,"app/src/main/java/com/alefejohsefe/vault");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"MainActivity.java"),fs.readFileSync(original,"utf8").replace("com.getcapacitor.myapp","com.alefejohsefe.vault"));fs.rmSync(original);
  fs.cpSync("native",path.join(tmp,"native"),{recursive:true});fs.cpSync("scripts",path.join(tmp,"scripts"),{recursive:true});fs.copyFileSync("capacitor.config.json",path.join(tmp,"capacitor.config.json"));
  execFileSync(process.execPath,["scripts/patch-android-edge-to-edge-v28.mjs"],{cwd:tmp});
  execFileSync(process.execPath,["scripts/patch-android-health-connect-v113.mjs"],{cwd:tmp});
  const files=["app/src/main/AndroidManifest.xml","app/build.gradle","build.gradle","variables.gradle","gradle/wrapper/gradle-wrapper.properties","app/src/main/java/com/alefejohsefe/vault/MainActivity.java"];
  const before=files.map(f=>fs.readFileSync(path.join(a,f),"utf8"));
  execFileSync(process.execPath,["scripts/patch-android-health-connect-v113.mjs"],{cwd:tmp});
  assert.deepEqual(files.map(f=>fs.readFileSync(path.join(a,f),"utf8")),before,"native patch must be idempotent");
  const manifest=before[0];assert.equal((manifest.match(/android\.permission\.health\.READ_/g)||[]).length,6);assert.ok(!manifest.includes("WRITE_") && !manifest.includes("BACKGROUND"));assert.match(manifest,/START_VIEW_PERMISSION_USAGE/);
  const main=before[5];assert.equal((main.match(/void onCreate/g)||[]).length,1);assert.ok(main.indexOf("registerPlugin(")<main.indexOf("super.onCreate("));assert.match(main,/VAULT_EDGE_TO_EDGE_V28/);
  assert.match(before[2],/gradle:8\.9\.1/);assert.match(before[3],/compileSdkVersion = 36/);assert.match(before[4],/gradle-8\.11\.1/);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
console.log("V113: origem Samsung, períodos reais, valores, média diária, permissões somente leitura e patch Android idempotente com edge-to-edge OK.");
