const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('app/saude/fornecimento/page.tsx','utf8');
for(const token of ['V130 RELATIONAL EXPERIENCE','V131 SUPPLY DOSSIER','V132 VERIFIED RELATIONS','V133 CONTEXTUAL LINKS']) assert.equal(s.split(token).length-1,1,token);
assert.equal((s.match(/const occupiedMedicationIds\s*=/g)||[]).length,1);
assert(s.includes('resolveProcessSelection(processes,'));
assert(s.includes('p.person_id === personId'));
assert(s.includes('Todas as retiradas ↗') && s.includes('Todos os documentos ↗'));
for(const route of ['retiradas','documentos','medicamentos','renovacao','tratamentos/detalhes'])assert(fs.existsSync('app/saude/'+route+'/page.tsx'),route);
console.log('V133: identidade, rotas e contexto OK');
