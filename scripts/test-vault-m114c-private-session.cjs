const assert=require("node:assert/strict"),fs=require("node:fs"),Module=require("node:module"),ts=require("typescript"),crypto=require("node:crypto").webcrypto;
global.crypto=crypto;global.btoa=value=>Buffer.from(value,"binary").toString("base64");global.atob=value=>Buffer.from(value,"base64").toString("binary");
const read=file=>fs.readFileSync(file,"utf8");
function loadTs(file){const js=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);return mod.exports;}
(async()=>{
  const box=loadTs("lib/private-local-vault-m114.ts"),secret={notes:["sensível"],updatedAt:"2026-11-10T20:00:00.000Z"};
  const envelope=await box.sealPrivateJsonM114("restart-test","account","person",secret,"frase-de-recuperacao-local");
  const persisted=JSON.stringify(envelope);assert(!persisted.includes("sensível"));
  const reopened=JSON.parse(persisted);assert.deepEqual(await box.openPrivateJsonM114("restart-test","account","person",reopened,"frase-de-recuperacao-local"),secret);
  await assert.rejects(()=>box.openPrivateJsonM114("restart-test","account","person",reopened,"frase-errada-continua"));
  const diary=read("app/saude/diario/page.tsx"),plan=read("app/saude/plano-seguranca/page.tsx");
  for(const page of [diary,plan]){assert(page.includes('document.addEventListener("visibilitychange"'));assert(page.includes('window.addEventListener("pagehide"'));assert(page.includes("lockProtectedSession"));}
  assert(diary.includes("Bloquear diário agora")&&diary.includes("salvamento cifrado"));
  assert(plan.includes("Bloquear plano agora")&&plan.includes("Conteúdo cifrado neste aparelho"));
  assert(!diary.includes("texto não criptografado")&&!plan.includes("O armazenamento local não é criptografado"));
  console.log("VAULT M114 C: textos reativos, bloqueio de sessão e recuperação cifrada após reabertura OK.");
})().catch(error=>{console.error(error);process.exit(1);});
