const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
function load(file, imports = {}) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }, reportDiagnostics: true });
  assert.equal(output.diagnostics.length, 0, file);
  const instance = new Module(path.resolve(file), module);
  instance.require = id => Object.hasOwn(imports, id) ? imports[id] : require(id);
  instance._compile(output.outputText, path.resolve(file));
  return instance.exports;
}
const catalog = load("lib/help/catalog.ts");
const prefs = load("lib/help/preferences.ts");
const ids = new Set();
for (const topic of catalog.helpTopics) {
  check(!ids.has(topic.id), `Identificador único ${topic.id}`); ids.add(topic.id);
  check(topic.steps.length >= 2 && topic.steps.every(step => step.title && step.text), `Guia completo ${topic.id}`);
  check(topic.destination.startsWith("/") && !topic.destination.startsWith("//"), `Destino local ${topic.id}`);
  check(fs.existsSync(path.join("app", topic.destination, "page.tsx")), `Destino existente ${topic.id}`);
  for (const route of topic.routes) check(catalog.findHelpTopic(route)?.id === topic.id, `Rota aponta ao próprio guia ${route}`);
}
check(catalog.findHelpTopic("/saude/medicamentos/editar").id === "medication-form", "Edição recebe explicação específica");
check(catalog.findHelpTopic("/saude/medicamentos/detalhes").id === "medication-detail", "Detalhes não usam guia genérico");
check(catalog.findHelpTopic("/saude/exames/novo").id === "exams", "Subrota herda a área");
check(catalog.findHelpTopic("/saude/exames-invalido").id === "health-hub", "Prefixos parciais não capturam outra área");
check(catalog.findHelpTopic("/login") === undefined, "Login não recebe convite");
check(catalog.findHelpTopic("/onboarding") === undefined, "Cadastro inicial não recebe outro guia");
check(catalog.searchHelpTopics("SINCRONIZACAO").some(topic => topic.id === "sync"), "Busca ignora acentos e caixa");
check(catalog.searchHelpTopics("retirada realizada").some(topic => topic.id === "prescriptions"), "Busca combina termos de um fluxo");
check(catalog.searchHelpTopics("xxxxnaoexiste").length === 0, "Sem resultados não inventa destino");
check(catalog.searchHelpTopics("  ").length === catalog.helpTopics.length, "Busca vazia permite rever todos");
const data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
check(!prefs.hasSeenHelp(storage, "account-a", "today"), "Primeira visita oferece guia");
check(prefs.markHelpSeen(storage, "account-a", "today"), "Dispensa salva preferência");
check(prefs.hasSeenHelp(storage, "account-a", "today"), "Guia dispensado não se repete");
check(!prefs.hasSeenHelp(storage, "account-b", "today"), "Contas isoladas");
check(!prefs.hasSeenHelp(storage, "account-a", "medications"), "Outras áreas continuam disponíveis");
check(prefs.hasSeenHelp(storage, "", "today"), "Conta ausente não recebe convite");
check(!prefs.markHelpSeen(storage, "", "today"), "Conta ausente não grava preferência");
const denied = { getItem() { throw Error("denied"); }, setItem() { throw Error("quota"); } };
check(prefs.hasSeenHelp(denied, "a", "today"), "Storage bloqueado não causa loop de convites");
check(!prefs.markHelpSeen(denied, "a", "today"), "Quota não derruba interface");
check(prefs.helpPreferenceKey("a:b", "c") !== prefs.helpPreferenceKey("a", "b:c"), "Chave não colide com separadores");

// Execute guide navigation callbacks, including skip and completion, without writing clinical data.
let stepIndex = 0;
let closed = 0;
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const component = load("components/help/HelpTopicGuide.tsx", {
  react: { useState: () => [stepIndex, update => { stepIndex = typeof update === "function" ? update(stepIndex) : update; }] },
  "react/jsx-runtime": jsx,
  "lucide-react": { ArrowLeft: "left", ArrowRight: "right", Check: "check", Compass: "compass" },
  "@/components/ui/BottomSheet": { BottomSheet: "sheet" },
});
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === "object" ? [node, ...nodes(node.props?.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join("") : node && typeof node === "object" ? text(node.props?.children) : node == null ? "" : String(node);
const render = () => component.HelpTopicGuide({ topic: catalog.helpTopics[0], onClose: () => closed++ });
let view = render();
check(!nodes(view).some(node => node.type === "button" && text(node).includes("Voltar")), "Primeiro passo não volta para índice negativo");
nodes(view).find(node => node.type === "button" && text(node).includes("Avançar")).props.onClick();
check(stepIndex === 1, "Avançar abre segundo passo");
view = render();
nodes(view).find(node => node.type === "button" && text(node).includes("Voltar")).props.onClick();
check(stepIndex === 0, "Voltar recupera primeiro passo");
view = render();
nodes(view).find(node => node.type === "button" && text(node).includes("Pular")).props.onClick();
check(closed === 1, "Pular fecha guia");
stepIndex = 2; view = render();
nodes(view).find(node => node.type === "button" && text(node).includes("Entendi")).props.onClick();
check(closed === 2 && stepIndex === 2, "Conclusão fecha sem ultrapassar passos");
view.props.onClose(); check(closed === 3, "Fechamento compartilhado funciona");
const commands = load("lib/health-intelligence/vault-brain-commands.ts", {
  "@/lib/local-search": load("lib/local-search.ts"),
  "@/lib/health-intelligence/medication-restock-navigation": load("lib/health-intelligence/medication-restock-navigation.ts"),
});
const commandData = { userId: "a", personId: "p", medications: [], documents: [], treatments: [], appointments: [], exams: [], renewals: [] };
for (const query of ["ajuda", "como usar", "abrir tutorial", "guias", "conhecer o vault"]) {
  check(commands.searchVaultBrainCommands(query, commandData).some(item => item.href === "/ajuda"), `Comando local de ajuda ${query}`);
}
check(commands.searchVaultBrainCommands("ajuda", { ...commandData, personId: null }).length === 0, "Ajuda pelo comando respeita contexto de pessoa");
console.log(`VAULT M61: ${checks} verificações de guias, rotas, busca, contas, storage e navegação aprovadas.`);
