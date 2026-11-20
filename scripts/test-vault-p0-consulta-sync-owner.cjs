// scripts/test-vault-p0-consulta-sync-owner.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync("lib/sync/consulta-payload-authority.ts", "utf8");
const repository = fs.readFileSync("lib/repositories/consultas.ts", "utf8");
const sync = fs.readFileSync("hooks/useSyncQueue.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
vm.runInNewContext(compiled, { module: moduleBox, exports: moduleBox.exports, Error }, { filename: "consulta-payload-authority.js" });
const { resolveConsultaSyncPayloadP0: resolve } = moduleBox.exports;

let checks = 0;
const ok = (name, fn) => { fn(); checks += 1; console.log(`✓ ${name}`); };
const local = {
  id: "c1", user_id: "u1", person_id: "p1", medico_id: "m1", medico: "Dra.",
  especialidade: "Geral", data: "2026-11-17", status: "agendada",
  created_at: "2026-11-14T16:02:33.690Z", updated_at: "2026-11-20T18:08:00.000Z", synced: false,
};

ok("update parcial legado recupera conta, pessoa e campos canônicos", () => {
  const result = resolve({ id: "c1", motivo: "Retorno", updated_at: "2026-11-20T18:09:00.000Z" }, local);
  assert.equal(result.user_id, "u1"); assert.equal(result.person_id, "p1");
  assert.equal(result.medico_id, "m1"); assert.equal(result.motivo, "Retorno");
});
ok("reconciliação é idempotente", () => {
  const once = resolve({ id: "c1", motivo: "Retorno" }, local);
  assert.deepEqual(resolve(once, local), once);
});
ok("divergência de conta é bloqueada", () => assert.throws(() => resolve({ id: "c1", user_id: "u2" }, local), /outra conta/));
ok("divergência de pessoa é bloqueada", () => assert.throws(() => resolve({ id: "c1", person_id: "p2" }, local), /outra pessoa/));
ok("registro local ausente não é inventado", () => assert.throws(() => resolve({ id: "c1" }, undefined), /não encontrada/));
ok("created_at canônico não é sobrescrito pelo update", () => assert.equal(resolve({ id: "c1", created_at: "2099-01-01" }, local).created_at, local.created_at));
ok("repositório enfileira snapshot completo com titular", () => {
  assert.match(repository, /const consultaAtualizadaP0[\s\S]*user_id:\s*ownerP6\.id[\s\S]*person_id:\s*safePersonId/);
  assert.match(repository, /enfileirarOperacao\([\s\S]*"consultas"[\s\S]*"update"[\s\S]*consultaAtualizadaP0/);
});
ok("sincronizador hidrata fila antiga pela consulta Dexie", () => {
  assert.match(sync, /resolveConsultaSyncPayloadP0/);
  assert.match(sync, /await db\.consultas\.get\([\s\S]*queuedConsultaP0\.id/);
});

console.log(`VAULT P0 CONSULTA SYNC OWNER: ${checks} verificações aprovadas`);
