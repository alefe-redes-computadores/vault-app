"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const load=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const ex=load('app/saude/careflow/exames/page.tsx');
const pdf=load('lib/m3/medical-pdf-p3.ts');
const home=load('app/page.tsx');
const med=load('app/saude/medicamentos/detalhes/page.tsx');
const bp=load('app/saude/careflow/pressao/page.tsx');
const mode=load('app/saude/careflow/modo-medico/page.tsx');
const gate=load('scripts/test-v63-release-gate.mjs');
const check=(truth,message)=>assert.ok(truth,message);
// GA02: no free-text pretending to be foreign-key and no concurrent laboratory fields.
check(ex.includes('if(value)setLab(\'\')'),'GA02: selecting known place clears laboratory draft');
check(ex.includes('!locationId&&lab.trim()?'),'GA02: free laboratory only if no known location selected');
check(ex.includes('referência textual, não vínculo'),'GA02: no invented local FK for exam order');
check(ex.includes('!doctorId&&doctor.trim()?')&&ex.includes('Solicitante informado:')&&ex.includes('(declaração sem cadastro vinculado)'),'GA02: retain legacy label and explicit non-canonical declaration');
check(ex.includes('doctorId:doctorId||null'),'GA02: canonical doctor ID retained');
check(ex.includes('consultationId:consultation||null'),'GA02: canonical consultation ID retained');
check(!ex.includes('Local relacionado (somente se informado no pedido)'),'GA02: misleading local relation label removed');
// GA03: synchronous guard, stable intent, genuine post-write toast/haptic/error.
check(ex.includes('if(examSubmitLock.current||busy)return;'),'GA03: synchronous submit guard');
check(ex.includes('examSubmitLock.current=true'),'GA03: guard is claimed before awaits');
check(ex.includes('finally{examSubmitLock.current=false;setBusy(false);}'),'GA03: release lock on both outcomes');
check(ex.includes('m2CreateIntent.current?.key!==key')&&ex.includes('idempotency:{orderId:'),'GA03: durable intention during retry preserved');
check(ex.indexOf('await createExamOrderM1')<ex.indexOf('showSuccess(total===1?'),'GA03: success toast only after persisted write');
check(ex.includes("trigger('success')")&&ex.includes('showError(reason)'),'GA03: haptic and failure toast');
check(ex.includes('examEventLock.current'),'GA03: independent event write guard');
// GA04: rendering labels and pt-BR, no fake plurals.
for(const tag of ["vaccinations:'Vacinação'","procedures_a9:'Procedimentos não cirúrgicos'","sensitivities_a9:'Alergias, intolerâncias e reações declaradas'"])
  check(pdf.includes(tag),`GA04: missing section ${tag}`);
check(pdf.includes('recordedAtBR(value.registeredAt)'),'GA04: humanize timestamp');
check(pdf.includes("report.rows.length===1?'linha':'linhas'"),'GA04: correct row plural');
check(pdf.includes("report.availableCount===1?'ocorrência elegível':'ocorrências elegíveis'"),'GA04: correct event plural');
check(!pdf.includes('linha(s)')&&!pdf.includes('ocorrência(s)'),'GA04: raw plural forbidden');
// GA05: only cited UI tones; never recolor Brain.
check(!home.includes('bg-violet-400/10 text-violet-400'),'GA05: Home violet leak');
check(!med.includes('border-purple-400/30 bg-purple-400/10 text-purple-400'),'GA05: medication violet leak');
check(home.includes('rounded-xl bg-emerald-400/10 text-emerald-300'),'GA05: treatments green');
// GA06: persist intent and distinct truth about notification status.
check(bp.includes('let remindersCreated=false;')&&bp.includes('remindersCreated=true;'),'GA06: notification success tracked separately');
check(bp.includes('if (editingPlan && remindersCreated)'),'GA06: old plan is not retired if new reminders failed');
check(bp.includes('showToast("Plano salvo; confira os lembretes pendentes", "info")'),'GA06: honest partial feedback');
check(!bp.includes('Plano preservado (ID ${id.slice('),'GA06: no technical ID leaked in UX');
// GA07: all person-scoped consultation options, with existing paged searchable picker.
check(mode.includes('{consultations.map(c=><option'),'GA07: no silent truncation');
check(!mode.includes('consultations.slice(0,120)'),'GA07: no fixed 120 consultation cap');
check(mode.includes('c.user_id===user?.id&&c.person_id===activePersonId'),'GA07: owner and person scope');
check(mode.includes('<HealthRelationPicker title="Selecionar uma consulta"'),'GA07: searchable ID selector');
check(gate.includes('scripts/test-vault-ga02-ga07-guardian.cjs'),'V63: directed contract included');
console.log('GUARDIAN GA02-GA07: contratos semanticos/estruturais aprovados; sem SQL, rede ou dados reais.');
