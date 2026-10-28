'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const cases={
 'app/saude/consultas/nova/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/consultas/editar/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/exames/novo/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/exames/editar/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/documentos/novo/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/documentos/editar/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/documentos/novo/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/documentos/editar/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/renovacao/nova/page.tsx':['max-w-3xl','min-[380px]:grid-cols-2','break-words'],
 'app/saude/renovacao/nova-receita/page.tsx':['break-words','break-all'],
};
for(const [name,parts] of Object.entries(cases)){
 const source=fs.readFileSync(name,'utf8');
 for(const token of parts)assert(source.includes(token),`${name}: ${token}`);
 console.log('V305 OK:',name);
}
