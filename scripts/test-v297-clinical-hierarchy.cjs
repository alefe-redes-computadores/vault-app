const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");
const expect=(condition,message)=>{if(!condition)throw new Error(message);console.log(`OK: ${message}`);};

const medications=read("app/saude/medicamentos/page.tsx");
const medicationCreate=read("app/saude/medicamentos/novo/page.tsx");
const treatment=read("app/saude/tratamentos/detalhes/page.tsx");
const renewal=read("app/saude/renovacao/detalhes/page.tsx");
const personalDocument=read("app/documentos/detalhes/page.tsx");
const healthDocument=read("app/saude/documentos/detalhes/page.tsx");
const group=read("components/saude/ClinicalCollectionGroup.tsx");

expect(medications.includes("ClinicalCollectionGroup"),"lista de medicamentos usa hierarquia progressiva compartilhada");
for(const id of ["medicamentos-atencao","medicamentos-em-dia","medicamentos-planejados","medicamentos-sos","medicamentos-suspensos"])expect(medications.includes(id),`grupo ${id} permanece navegável`);
expect(medications.includes("medsSOS.map(renderCard)"),"medicamentos SOS continuam visíveis e separados da rotina");
expect(group.includes("[content-visibility:auto]")&&group.includes("onToggle"),"grupos longos preservam renderização progressiva e abertura controlada");
for(const label of ["Identidade","Rotina","Revisão"])expect(medicationCreate.includes(label),`cadastro nomeia a etapa ${label}`);
for(const id of ["tratamento-visao","tratamento-linha","tratamento-financeiro","tratamento-rede","tratamento-medicamentos"])expect(treatment.includes(id),`detalhe de tratamento expõe ${id}`);
for(const id of ["renovacao-visao","renovacao-sus","renovacao-produto","renovacao-rede","renovacao-historico"])expect(renewal.includes(id),`receita/aquisição expõe ${id}`);
for(const id of ["documento-pessoal-visao","documento-pessoal-info","documento-pessoal-anexos","documento-pessoal-notas","documento-pessoal-registro"])expect(personalDocument.includes(id),`documento pessoal expõe ${id}`);
for(const id of ["documento-saude-visao","documento-saude-vinculo","documento-saude-dados","documento-saude-arquivos","documento-saude-registro"])expect(healthDocument.includes(id),`documento clínico expõe ${id}`);

console.log("VAULT V297 — HIERARQUIA CLÍNICA GLOBAL: OK");
