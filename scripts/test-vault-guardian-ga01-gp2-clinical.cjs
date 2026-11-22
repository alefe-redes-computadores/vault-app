#!/usr/bin/env node
/** GA-01+GP2 focused hermetic regressions; no patient records, network or SQL execution. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');let verified=0;
const ok=(condition,message)=>{assert.ok(condition,message);verified++};
const a8=read('components/saude/VaccinationA8Workspace.tsx');
const m5=read('components/saude/RehabM5Workspace.tsx');
const a9=read('components/saude/A9ClinicalWorkspace.tsx');
const search=read('components/saude/ClinicalEntitySearch360.tsx');
const sql=fs.readFileSync('supabase/migrations/20261122172023_vault_a7_m5_continuity_360.sql');
ok(crypto.createHash('sha256').update(sql).digest('hex')==='29051963217edd7bab6aadfe4b049a5ee6a7d4f4ca66abf1778b5fd2572dcadc','SQL historico corresponde exatamente ao aplicado');
ok(a8.includes('const inFlight=useRef(false)')&&a8.includes('!inFlight.current'),'A8 tem trava sincrona alem de busy');
for(const fn of ['saveCourse','saveEvent','retract','retire','attach']){
 const start=a8.indexOf('async function '+fn+'(');
 ok(start>0,`A8 ${fn} existe`);
 const ends=[a8.indexOf('async function ',start+1),a8.indexOf('function editEvent(',start+1),a8.indexOf('return <main',start+1)].filter(i=>i>start);
 const part=a8.slice(start,Math.min(...ends));
 ok(part.includes('inFlight.current=true'),`A8 ${fn} adquire lock antes da escrita`);
 ok(part.includes('inFlight.current=false'),`A8 ${fn} libera lock no finally`);
}
ok(a8.includes("showToast(msg,'error')")&&a8.includes("trigger('error')"),'A8 feedback de erro');
ok(a8.includes('await recordVaccinationA8')&&a8.includes('await voidVaccinationEventA8')&&a8.includes('await retireVaccinationCourseA8'),'A8 writer e historico originais preservados');
ok(m5.includes('const inFlight=useRef(false)'),'M5 trava por ref sincrona');
ok(m5.includes('if(inFlight.current)return;inFlight.current=true'),'M5 lock adquirido antes de executar writer');
ok(m5.includes('inFlight.current=false'),'M5 lock liberado mesmo com falha');
ok(m5.includes("showToast(success,'success')")&&m5.includes("showToast(reason,'error')"),'M5 toast sucesso e erro');
ok(m5.includes("trigger('success')")&&m5.includes("trigger('error')"),'M5 haptic sucesso e erro');
ok(m5.includes('withReturnTarget(path,searchParams.get'), 'M5 preserva retorno contextual');
for(const x of ["'professional'","'location'","'consultation'","'rehab_session'","'medication'","'vaccination_event'","'procedure_event'"])
 ok(search.includes(x),'Selecao semantica inclui '+x);
for(const val of ['UserRoundCheck','MapPin','CalendarDays','Activity','Pill','Syringe','ClipboardCheck'])ok(search.includes(val),'Icone semantico '+val);
ok(search.includes("professional:{icon:UserRoundCheck,color:'text-sky-300'")&&search.includes("location:{icon:MapPin,color:'text-emerald-300'"),'Profissional azul, local verde');
ok(a9.includes('kind="consultation" label="Consulta relacionada')&&a9.includes('kind="rehab_session" label="Sessão de reabilitação'),'A9 nao representa consulta/sessao como local');
ok(a9.includes('kind={relatedType} label="Selecionar registro existente por ID"'),'A9 tipo de evidencia mantido no seletor');
ok(a9.includes('const inFlight=useRef(false)')&&a9.includes('saveProcedureA9')&&a9.includes('saveSensitivityA9'),'A9 escritor e trava canonicos preservados');
ok(!/ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE/i.test(a8+m5+a9+search),'Nenhum DDL adicionado a telas');
console.log('VAULT_GUARDIAN_GA01_GP2_CLINICO_OK | '+verified+' contratos hermeticos | SEM REDE/SQL/DADOS REAIS');
