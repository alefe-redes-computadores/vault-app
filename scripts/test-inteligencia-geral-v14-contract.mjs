import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
function expect(condition, label) {
  if (!condition) throw new Error(`FALHA: ${label}`);
  checks.push(label);
  console.log(`OK: ${label}`);
}

const engine = read("lib/vault-intelligence/engine.ts");
const types = read("lib/vault-intelligence/types.ts");
const snapshot = read("lib/repositories/vaultIntelligence.ts");
const page = read("app/inteligencia/page.tsx");
const more = read("app/mais/page.tsx");

for (const name of ["cards", "credentials", "persons", "vaults"]) {
  const source = read(`lib/repositories/${name}.ts`);
  expect(source.includes("getLocalFirstAuthUser") && !source.includes("auth.getUser()"), `${name} usa autenticação local-first`);
}

for (const name of ["cards", "credentials", "vaults"]) {
  const source = read(`lib/repositories/${name}.ts`);
  expect(source.includes("user_id:") && source.includes("person_id:"), `remoção de ${name} preserva proprietário na fila`);
}

expect(snapshot.includes('.where("vault_id").anyOf(ownedVaultIds)') && !snapshot.includes("db.vaultMembers.toArray()"), "snapshot não varre membros de todos os usuários");
expect(snapshot.includes('person.user_id !== safeUserId'), "snapshot valida a pessoa ativa");
expect(engine.includes('item.user_id === snapshot.userId') && engine.includes('item.person_id === snapshot.personId'), "motor reaplica isolamento por usuário e pessoa");
expect(!engine.includes("decryptPassword") && !engine.includes("card_number_encrypted?."), "motor não abre segredos");
expect(engine.includes("metadata.data_validade") && engine.includes("personal-document-expiry"), "documentos pessoais entram nos alertas de validade");
expect(engine.includes("card-expiry-data-quality") && engine.includes("validade(s) não interpretada(s)"), "validade inválida não desaparece silenciosamente");
expect(engine.includes("general-empty-scope") && engine.includes("não conclui que está tudo certo"), "ausência de dados não vira falso estado saudável");
expect(engine.includes('href: "/diagnostico"'), "pendência de sincronização abre diagnóstico real");
expect(engine.includes("vault-sharing-empty") && engine.includes("compartilhar continua opcional"), "organização de cofres não força compartilhamento");
expect(types.includes('"security"') && types.includes('"data_quality"'), "achados mantêm natureza explícita");
expect(page.includes("Central de atenção") && page.includes("kindMeta"), "inteligência possui hierarquia visual por natureza");
expect(page.includes('router.replace("/mais")') && !page.includes("router.back()"), "retorno da inteligência é determinístico");
expect(page.includes("coverage?.credentials") && page.includes("coverage?.accounts"), "cobertura diferencia senhas, cartões e contas");
expect(more.includes('label: "Cartões"') && more.includes('router.push("/cartoes")'), "atalho de cartões descreve o destino correto");
expect(more.includes('label: "Contas bancárias"') && more.includes('router.push("/contas")'), "contas bancárias deixam de ficar escondidas");
expect(engine.includes("não deve ser descrita como cofre zero-knowledge") && page.includes("não promete segurança absoluta"), "postura de segurança permanece honesta");

const db = read("lib/db/index.ts");
expect(!db.includes("version(40)"), "sem migration ou Dexie v40");

console.log(`CONTRATOS INTELIGÊNCIA GERAL V14: OK (${checks.length})`);
