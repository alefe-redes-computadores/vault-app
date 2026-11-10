const assert=require("node:assert/strict"),fs=require("node:fs"),Module=require("node:module"),ts=require("typescript");
const read=f=>fs.readFileSync(f,"utf8");
function loadTs(file){const source=read(file),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);return mod.exports;}
(async()=>{
 const cryptoModule=loadTs("lib/private-local-vault-m114.ts");
 const envelope=await cryptoModule.sealPrivateJsonM114("journal","u1","p1",{text:"conteudo sensivel"},"frase-secreta-forte");
 assert.equal(envelope.v,1);assert.equal(envelope.iterations,310000);assert.ok(!JSON.stringify(envelope).includes("conteudo sensivel"));
 assert.deepEqual(await cryptoModule.openPrivateJsonM114("journal","u1","p1",envelope,"frase-secreta-forte"),{text:"conteudo sensivel"});
 await assert.rejects(()=>cryptoModule.openPrivateJsonM114("journal","u1","p2",envelope,"frase-secreta-forte"));
 await assert.rejects(()=>cryptoModule.openPrivateJsonM114("journal","u1","p1",envelope,"frase-incorreta"));
 const journal=read("lib/private-journal-m113.ts"),safety=read("lib/safety-plan.ts"),journalPage=read("app/saude/diario/page.tsx"),safetyPage=read("app/saude/plano-seguranca/page.tsx"),home=read("app/page.tsx"),command=read("components/home/HomeCommandCenter.tsx");
 const journalVerify=journal.indexOf("const verified=fresh"),journalPromote=journal.indexOf("localStorage.setItem(finalKey"),journalRemove=journal.indexOf("localStorage.removeItem(journalKeyM113",journalPromote);
 const safetyVerify=safety.indexOf("const verified=await"),safetyPromote=safety.indexOf("localStorage.setItem(finalKey"),safetyRemove=safety.indexOf("localStorage.removeItem(ownerKey",safetyPromote);
 assert.ok(journal.includes(":pending")&&journalVerify>=0&&journalVerify<journalPromote&&journalPromote<journalRemove&&journal.includes("finally{localStorage.removeItem(temporaryKey)"));
 assert.ok(safety.includes(":pending")&&safetyVerify>=0&&safetyVerify<safetyPromote&&safetyPromote<safetyRemove&&safety.includes("finally{localStorage.removeItem(temporaryKey)"));
 assert.ok(journalPage.includes("A frase não é armazenada")&&safetyPage.includes("não existe recuperação automática")||safetyPage.includes("não há recuperação automática"));
 assert.ok(home.includes("Nenhuma pendência foi identificada nos registros disponíveis")&&!home.includes('"Seu dia está tranquilo"'));
 assert.ok(command.includes("Apoio humano e plano pessoal")&&command.includes("CVV 188")&&command.includes("SAMU 192"));
 assert.ok(journalPage.includes("interpreta, diagnostica ou envia este texto automaticamente"));
 console.log("VAULT M114 A: proteção local, isolamento, migração verificada, linguagem factual e acesso humano OK.");
})().catch(error=>{console.error(error);process.exit(1);});
