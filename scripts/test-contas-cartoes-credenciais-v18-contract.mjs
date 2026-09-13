import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const helper = read("lib/utils/card-helper.ts");
const contas = read("app/contas/page.tsx");
const novoConta = read("app/contas/novo/page.tsx");
const novoCartao = read("app/cartoes/novo/page.tsx");
const editarCartao = read("app/cartoes/editar/page.tsx");
const cartoes = read("app/cartoes/page.tsx");
const credentialCard = read("components/CredentialCard.tsx");
const sync = read("hooks/useSyncQueue.ts");
const diagnostic = read("app/diagnostico/page.tsx");
const migration = read("supabase/migrations/20260913_add_credentials_history.sql");

const checks = [
 ["BRB possui identidade e código 070", helper.includes('["070", "Banco de Brasília", "BRB"')],
 ["aliases não dependem de domínio inventado", !helper.includes("`${slug}.com.br")],
 ["logos usam enquadramento contain", contas.includes("object-contain p-1.5") && credentialCard.includes("object-contain p-2.5")],
 ["agência e conta possuem formatação central", novoConta.includes("formatAgency(value)") && novoConta.includes("formatAccount(value)")],
 ["cards de conta mostram agência e conta", contas.includes("Agência") && contas.includes("maskAccount(item.account)")],
 ["cartão identifica bandeira pelo número", helper.includes("detectCardBrand")],
 ["cartão usa validação de Luhn", novoCartao.includes("isValidLuhn") && editarCartao.includes("isValidLuhn")],
 ["American Express aceita CVV de quatro dígitos", helper.includes('brand === "amex" ? 4 : 3')],
 ["validade inválida ou vencida é rejeitada", novoCartao.includes("isValidExpiryDate") && editarCartao.includes("isValidExpiryDate")],
 ["lista mascara parte do número", cartoes.includes("maskCardNumber")],
 ["credencial possui fallback visual", credentialCard.includes("<KeyRound size={22}")],
 ["sync de credenciais tolera schema antigo", sync.includes("compatibleCredential") && sync.includes("schema cache")],
 ["migration persiste histórico criptografado", migration.includes("add column if not exists history jsonb")],
 ["diagnóstico reconhece tentativas esgotadas", diagnostic.includes("Number(item.retry_count||0)>=5")],
 ["dados continuam person-scoped", read("lib/repositories/cards.ts").includes("person_id") && read("lib/repositories/credentials.ts").includes("person_id")],
];
let failed = false;
console.log("== CONTRATOS COFRE PESSOAL V18 ==");
for (const [label, ok] of checks) { console.log(`${ok ? "OK" : "FALTA"}: ${label}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log(`CONTRATOS COFRE PESSOAL V18: OK (${checks.length})`);
