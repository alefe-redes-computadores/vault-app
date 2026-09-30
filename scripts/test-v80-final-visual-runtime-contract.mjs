import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, message) => { if (!value) throw new Error(`V80: ${message}`); console.log(`OK: ${message}`); };

const edit = read("app/saude/medicamentos/editar/page.tsx");
const docs = read("app/documentos/page.tsx");
const withdrawals = read("app/saude/retiradas/page.tsx");
const eruda = read("lib/diagnostics/eruda.ts");
const more = read("app/mais/page.tsx");
const providers = read("components/Providers.tsx");

ok(edit.includes("VAULT_MEDICATION_EDIT_LIVE_PREVIEW_V80") && edit.includes("<AvatarMedicamento"), "edição possui prévia canônica ao vivo");
ok(docs.includes("VAULT_DOCUMENT_TOOLBAR_V80") && docs.includes("VAULT_DOCUMENT_TOOLBAR_V79"), "documentos usa uma única barra compacta");
ok(withdrawals.includes('className="mt-2 flex h-10 items-center justify-end gap-2"'), "retiradas não reserva uma faixa vazia");
ok(eruda.includes('document.getElementById(ERUDA_SCRIPT_ID)?.remove()') && eruda.includes('.eruda-container, .eruda-entry-btn'), "Eruda desligado remove instância e resíduos");
ok(more.includes("else {\n      disableEruda();") && more.includes("Console avançado desativado"), "preferência desligada reconcilia o Eruda");
ok(providers.includes("<GlobalSyncIssueAlert />") && !providers.includes("<SyncStatus") && !providers.includes("<PersonSelector"), "fora de Mais somente falha real de sincronização é global");
console.log("V80 FINAL VISUAL & RUNTIME — CONTRATO OK");
