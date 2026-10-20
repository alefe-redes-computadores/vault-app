const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const privacy = read("components/list/VaultPrivacyToggle.tsx");
const passwords = read("app/senhas/page.tsx");
const accounts = read("app/contas/page.tsx");
const cards = read("app/cartoes/page.tsx");
const favorites = read("app/favoritos/page.tsx");
const documents = read("app/documentos/page.tsx");
const credentialCard = read("components/CredentialCard.tsx");
const passwordDetail = read("app/senhas/detalhes/page.tsx");
const accountDetail = read("app/contas/detalhes/page.tsx");
const cardDetail = read("app/cartoes/detalhes/page.tsx");
const documentDetail = read("app/documentos/detalhes/page.tsx");
const diagnostics = read("app/diagnostico/page.tsx");
const more = read("app/mais/page.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

assert(privacy.includes("aria-pressed={isPrivate}"));
assert(privacy.includes('rounded-xl border transition-all'));
for (const page of [passwords, accounts, cards]) {
  assert(page.includes('import { VaultPrivacyToggle }'));
  assert(page.includes('<VaultPrivacyToggle isPrivate={isPrivate}'));
}

assert(passwords.includes("useBiometric"));
assert(passwords.includes("useSecureScreen"));
assert(credentialCard.includes('contentVisibility: "auto"'));
assert(credentialCard.includes('containIntrinsicSize: "112px"'));
assert(accounts.includes('density="compact"'));
assert(cards.includes('containIntrinsicSize: "118px"'));
assert(favorites.includes("[contain-intrinsic-size:132px]"));
assert((documents.match(/vault-deferred-lg/g) || []).length >= 2);
assert(documents.includes('containIntrinsicSize: "220px"'));

assert(passwordDetail.includes("useSecureScreen"));
assert((accountDetail.match(/vault-deferred/g) || []).length >= 3);
assert((cardDetail.match(/vault-deferred/g) || []).length >= 3);
assert((documentDetail.match(/vault-deferred/g) || []).length >= 4);

assert(diagnostics.includes("const recoveryStep ="));
assert(diagnostics.includes("1 · Liberar"));
assert(diagnostics.includes("2 · Sincronizar após liberar"));
assert(diagnostics.includes("disabled={!isOnline||syncBusy||failed>0}"));
assert(diagnostics.includes("validLocalDose"));
assert(diagnostics.includes("Nada será apagado e o estoque não será movimentado novamente"));

assert(more.includes("Cofre pessoal e inteligência"));
assert(more.includes('item.id === "inteligencia" ? "col-span-2'));
assert(avatar.includes("V198: a orelha deixa de ser uma esfera achatada"));
assert(avatar.includes("const outerEar=mesh(taperedBox"));
assert(avatar.includes("const earRim=mesh(taperedBox"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

console.log("VAULT V198 — PERSONAL VAULT + DIAGNOSTICS + AVATAR EAR CONTRACT OK");
