import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V93: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const acquisition = read("app/saude/renovacao/nova/page.tsx");
const prescription = read("app/saude/renovacao/nova-receita/page.tsx");
const repository = read("lib/repositories/renovacoes.ts");
const intelligence = read("lib/vault-intelligence/engine.ts");
const intelligenceTypes = read("lib/vault-intelligence/types.ts");
const intelligenceRepo = read("lib/repositories/vaultIntelligence.ts");

ok(detail.includes('label: "Adicionar nova receita"'), "detalhes oferece nova receita quando aplicável");
ok(detail.includes('label:\n        "Registrar aquisição"'), "detalhes mantém aquisição para todos");
ok(detail.includes("med?.tipo_uso === \"continuo\""), "uso contínuo possui ação clínica");
ok(detail.includes('med.tipo_receita !== "comum"'), "controlado SOS também pode registrar receita");
ok(acquisition.includes("VAULT_ACQUISITION_ONLY_V93"), "formulário de aquisição não exibe prescrição");
ok(acquisition.includes("somenteAquisicao:\n                  true"), "aquisição declara intenção ao domínio");
ok(acquisition.includes("Não herdamos silenciosamente o médico"), "médico do cadastro não vira evidência do evento");
ok(acquisition.includes("document_id:\n                  undefined"), "receita atual não é herdada silenciosamente");
ok(!acquisition.includes("proximaRenovacao:\n                  proximaISO"), "aquisição não agenda renovação");
ok(repository.includes("somenteAquisicao?: boolean"), "repository possui contrato explícito de aquisição");
ok(repository.includes("...(!somenteAquisicao"), "estado clínico protegido da aquisição");
ok(repository.includes("!somenteAquisicao &&\n      options.proximaRenovacao"), "planejamento protegido da aquisição");
ok(prescription.includes("somenteReceita:\n              true"), "receita continua sem alterar estoque");
ok(prescription.includes("router.replace(\n          returnTo"), "receita retorna ao medicamento de origem");
ok(detail.includes("VAULT_CANONICAL_ACQUISITION_NAVIGATION_V92_2"), "navegação V92.2 preservada");
ok(intelligence.includes("VAULT_MEDICATION_ACQUISITION_CONTEXT_V93"), "cérebro interpreta aquisição controlada sem vínculo");
ok(intelligence.includes('kind: repeated ? "attention" : "data_quality"'), "recorrência aumenta prioridade sem diagnosticar");
ok(intelligence.includes("não prova ausência de prescrição"), "linguagem clínica não punitiva preservada");
ok(intelligenceTypes.includes("medicamentos: Medicamento[]"), "snapshot conhece o perfil regulatório");
ok(intelligenceRepo.includes("db.medicamentos.where"), "cérebro coleta medicamentos da pessoa ativa");

console.log("V93 RECIPE / ACQUISITION SEPARATION — CONTRATO OK");
