'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
let n=0;const read=p=>fs.readFileSync(p,'utf8');
function check(label,fn){fn();console.log('H07_COPY_PASS',++n,label)}
const nav=read('lib/navigation/clinical-directory-m150.ts'),hub=read('lib/health-hub/r5.ts');
check('UI directory and hub labels cleaned, route keys preserved',()=>{for(const s of [nav,hub]){assert(s.includes('Linha Clínica'));assert(!s.includes('Linha Clínica 360'));assert(s.includes('Jornada Cirúrgica'));assert(!s.includes('Jornada Cirúrgica 360'));assert(s.includes('/saude/linha-clinica'));assert(s.includes('/saude/cirurgias/jornada'));}assert(nav.includes("'exames-360'"));});
check('existing medication dialog handlers and technical marker preserved',()=>{const med=read('app/saude/medicamentos/page.tsx'),sheet=read('components/saude/MedicationSheet360R3.tsx');assert(med.includes('Abrir Gaveta de medicamentos de '));assert(sheet.includes('Fechar Gaveta de medicamentos'));assert(med.includes('openMedicationSheet360("ficha")'));assert(med.includes('data-vault-med360-entry'));});
check('PDF heading text only; filename and exporters remain unchanged',()=>{const a=read('lib/clinical-report-360-pdf.ts'),b=read('lib/careflow-m2/pdf-library.ts'),c=read('lib/m3/medical-pdf-p3.ts'),d=read('lib/m3/careflow-timeline.ts');assert(a.includes('pdf.text("Relatorio clinico",'));assert(a.includes('VAULT-relatorio-360-'));assert(b.includes("line('VAULT / RELATORIO CLINICO',"));assert(c.includes("pdf.text('VAULT  /  CAREFLOW',"));assert(d.includes("line('VAULT · CAREFLOW | LINHA DO TEMPO LOCAL',"));});
check('legitimate numerical quantities preserved',()=>{assert(read('lib/notification-brain.ts').includes('minutes: 360'));assert(read('app/diagnostico/a11/page.tsx').includes('320, 360, 390, 412 e 430 dp'));});
for(const p of ['app/saude/linha-clinica/page.tsx','app/saude/careflow/page.tsx','app/saude/medicamentos/page.tsx','lib/navigation/clinical-directory-m150.ts','lib/health-hub/r5.ts'])check('parse '+p,()=>assert.equal(ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
console.log('H07_DIRECTED_PASS='+n);
