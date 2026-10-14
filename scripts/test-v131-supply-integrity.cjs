const fs=require('node:fs');const assert=require('node:assert/strict');
const p=fs.readFileSync('app/saude/fornecimento/page.tsx','utf8');
assert.equal((p.match(/const occupiedMedicationIds =/g)||[]).length,1,'occupiedMedicationIds duplicado');
assert.equal((p.match(/V130 RELATIONAL EXPERIENCE/g)||[]).length,1,'card de tratamento duplicado');
assert.equal((p.match(/V131 SUPPLY DOSSIER/g)||[]).length,1,'resumo relacional ausente');
assert(p.includes('r.fornecimento_id === process.id'),'retiradas precisam vínculo explícito');
assert(p.includes('Compare somente apresentações equivalentes'),'comparação de preços deve indicar limite');
console.log('V131: 5 contratos de integridade OK');
