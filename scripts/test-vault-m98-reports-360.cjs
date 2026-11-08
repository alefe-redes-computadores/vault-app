"use strict";
/** M98 hermetic: no Dexie, network, emails, PDFs written or native filesystem used in tests. */
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
let count=0;
const check=(ok,label)=>{assert.ok(ok,`M98: ${label}`);console.log(`✓ M98 ${++count}: ${label}`);};
const read=path=>fs.readFileSync(path,"utf8");
function transpile(path){
 const source=read(path),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(ast.parseDiagnostics.length===0,`${path}: sintaxe TS/TSX`);
 return ts.transpileModule(source,{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true}).outputText;
}
function load(path,deps={}){
 const m={exports:{}};new Function("module","exports","require",transpile(path))(m,m.exports,key=>{
  if(Object.prototype.hasOwnProperty.call(deps,key))return deps[key];
  throw new Error(`Importação inesperada ${key}`);
 });return m.exports;
}
const core=load("lib/clinical-report-360.ts");
const safe=load("lib/clinical-report-360-export.ts",{
 "@capacitor/core":{Capacitor:{isNativePlatform:()=>false}},
 "@capacitor/filesystem":{Directory:{Cache:"CACHE"},Encoding:{UTF8:"utf8"},Filesystem:{}},
 "@capacitor/share":{Share:{}},
});
const id="u1",person="p1";
const med=(id,extra={})=>({id,user_id:"u1",person_id:"p1",nome:"Med " + id,dosagem:"2 mg",tipo_uso:"continuo",status:"ativo",...extra});
const dose=(id,date,extra={})=>({id,user_id:"u1",person_id:"p1",medicamento_id:"m1",data:date,horario:"08:00",tomado_em:`${date}T11:00:00Z`,quantidade:1,dose_kind:"scheduled",...extra});
const record=(id,date,extra={})=>({id,user_id:"u1",person_id:"p1",data:date,horario:"09:30",nome:"Medição da pessoa",categoria:"medicao",tipo:"pressao",valor_medicao:"120/80",source:"manual",...extra});
const appointment=(id,date,extra={})=>({id,user_id:"u1",person_id:"p1",data:date,especialidade:"Clínica",medico:"Médico Exemplo",status:"realizada",...extra});
const doc=(id,date,extra={})=>({id,user_id:"u1",person_id:"p1",category_id:"saude",type:"laudo",title:"Laudo sem conteúdo",metadata:{senha:"SECRET"},attachments:[{url:"SECRET"}],created_at:date+"T12:00:00Z",...extra});
const brain=(extra={})=>({key:"brain-one",person_id:"p1",first_detected_at:"2026-11-05T15:00:00Z",last_detected_at:"2026-11-05T15:00:00Z",occurrences:2,state:"resolved",snapshot:{titulo:"Aviso registrado",mensagem:"Conferência local.",confianca:"media",gravidade_seguranca:"atencao",evidencias:["Origem da dose: d1"],fontes_internas:["DoseLog"]},...extra});
const context={userId:id,personId:person,medicamentos:[med("m1"),med("m2",{person_id:"p2"})],doseLogs:[dose("d1","2026-11-05"),dose("d2","2026-11-06",{tomado_em:undefined,ignorado_em:"2026-11-06T08:12:00Z",motivo:"Sem confirmação de estoque"}),dose("pending","2026-11-07",{tomado_em:undefined}),dose("other","2026-11-05",{user_id:"u2"})],registrosSaude:[record("r1","2026-11-05"),record("foreign","2026-11-05",{person_id:"p2"}),record("s1","2026-11-06",{categoria:"sintoma",nome:"Dor relatada",observacoes:"Relato pessoal"})],consultas:[appointment("a1","2026-11-07"),appointment("a2","2026-12-02",{status:"agendada"})],documentos:[doc("doc1","2026-11-05"),doc("secret-doc","2026-11-05",{category_id:"pessoal"})]};
const defaultOptions={context,ledger:[brain()],ownerId:"u1",personId:"p1",personName:"Perfil teste",start:"2026-11-01",end:"2026-11-08",sections:["medications","doses","symptoms","measurements","consultations"],mode:"factual"};
const run=opts=>core.buildClinicalReport360({...defaultOptions,...opts});
const report=run();
check(report.rows.length===6,"6 fatos selecionados, sem dados de outra pessoa ou logs pendentes");
check(report.schemaVersion===1&&report.personName==="Perfil teste","schema e identidade exportável");
check(report.summary.confirmed===1&&report.summary.explicitlyIgnored===1,"tomada e dose ignorada são eventos diferentes");
check(report.summary.brainSnapshots===0,"modo factual nunca inclui Brain");
check(report.summary.sos===0&&report.summary.extra===0,"não infere SOS ou extra");
check(report.summary.healthRecords===2,"medições e sintomas entram conforme os dados");
check(report.rows.some(r=>r.category==="consultations"&&r.detail.includes("realizada")),"status original da consulta preservado");
check(report.rows.filter(r=>r.category==="medications").length===1,"medicamento de outra pessoa excluído");
check(report.rows.some(r=>r.category==="medications"&&r.detail.toLowerCase().includes("cadastro atual")),"não trata estado atual como prescrição histórica");
check(!report.rows.some(r=>r.sourceId==="pending"),"ausência de log não se transforma em dose ignorada");
check(!report.rows.some(r=>r.sourceId==="other"),"isola conta nos logs");
check(run({context:{...context,doseLogs:[dose("orphan","2026-11-05",{medicamento_id:"med-removed"})]},sections:["doses"]}).rows[0].title==="Medicamento sem cadastro acessível","doses históricas permanecem quando o medicamento foi excluído");
check(!report.rows.some(r=>r.sourceId==="foreign"),"isola pessoa nos registros");
check(!report.rows.some(r=>r.sourceId==="a2"),"consulta de outro período excluída");
check(report.rows.every(r=>r.source&&r.sourceId&&r.date),"trilha de proveniência para todos os fatos");
check(report.limitations.some(x=>x.includes("ausência")),"não confunde ausência de dado com falha terapêutica");
check(report.limitations.some(x=>x.includes("nenhum compartilhamento")),"consentimento de exportação explícito");
check(!JSON.stringify(report).includes("SECRET"),"nenhum segredo exportado por padrão");
const withBrain=run({mode:"brain"});
check(withBrain.summary.brainSnapshots===1,"Brain mostra somente snapshot persistido");
check(withBrain.rows.find(r=>r.category==="brain").evidence.includes("Origem da dose: d1"),"evidência original incluída no modo Brain");
check(withBrain.rows.find(r=>r.category==="brain").detail.includes("Ocorrências registradas: 2"),"ocorrências observadas preservadas");
check(withBrain.rows.find(r=>r.category==="brain").detail.includes("Estado atual: resolved"),"estado histórico preservado");
check(run({mode:"consultation"}).summary.brainSnapshots===1,"resumo para consulta inclui anexos Brain persistidos");
check(run({mode:"brain",ledger:[]}).summary.brainSnapshots===0,"sem ledger não há novo alerta retroativo");
check(run({mode:"brain",ledger:[brain({person_id:"p2"})]}).summary.brainSnapshots===0,"Brain de outra pessoa excluído");
check(run({mode:"brain",ledger:[brain({first_detected_at:"2026-10-31T23:00:00Z"})]}).summary.brainSnapshots===0,"detecção anterior não retroage");
check(run({sections:["documents"]}).rows.length===1,"documentos só com inclusão ativa");
check(!JSON.stringify(run({sections:["documents"]})).includes("SECRET"),"documento nunca inclui conteúdo sensível/anexo/metadata");
check(run({sections:["doses"]}).rows.length===2,"filtro de doses limita exatamente as seções");
check(run({sections:["symptoms"]}).rows.length===1,"filtro sintomas independente");
check(run({sections:["measurements"]}).rows.length===1,"filtro de medições independente");
check(run({sections:["consultations"]}).rows.length===1,"filtro de consultas independente");
check(run({sections:["medications"]}).rows.length===1,"filtro de medicamentos independente");
check(run({start:"2026-11-06",end:"2026-11-08",sections:["doses"]}).rows.length===1,"período livre usa data do evento");
check(run({context:{...context,doseLogs:[dose("x","2026-11-06",{dose_kind:"sos"}),dose("y","2026-11-07",{dose_kind:"extra"})]},sections:["doses"]}).summary.sos===1,"SOS somente com tomada efetiva");
check(run({context:{...context,doseLogs:[dose("x","2026-11-06",{dose_kind:"sos"}),dose("y","2026-11-07",{dose_kind:"extra"})]},sections:["doses"]}).summary.extra===1,"extra somente com tomada efetiva");
check(run({context:{...context,registrosSaude:[record("x","2026-02-30")]},sections:["measurements"]}).rows.length===0,"datas impossíveis são descartadas");
for(const options of [{ownerId:""},{personId:""},{ownerId:"u2"},{personId:"p2"},{context:{...context,userId:"u2"}},{context:{...context,personId:"p2"}},{start:"2026-02-30"},{end:"2026-02-30"},{start:"2026-11-09",end:"2026-11-08"},{start:"2025-01-01"},{sections:[]}]) {
 check((()=>{try{run(options);return false}catch{return true}})(),`rejeita identidade, intervalo ou seleção inválidos: ${JSON.stringify(Object.keys(options))}`);
}
check(core.validClinicalDay("2024-02-29")&&!core.validClinicalDay("2025-02-29"),"calendário valida anos bissextos");
const csv=safe.clinicalReport360Csv(withBrain);
check(csv.startsWith("\uFEFFcategoria,data,horario"),"CSV com BOM para planilhas e cabeçalho legível");
check(csv.split("\r\n").length===withBrain.rows.length+2,"CSV tem uma linha por registro, com CRLF");
const danger=run({sections:["measurements"],context:{...context,registrosSaude:[record("risk","2026-11-03",{nome:"  =SOMAR(1;2)",observacoes:"Linha \"quoted\",vírgula"})]}});
const escaped=safe.clinicalReport360Csv(danger);
check(escaped.includes("\"'=SOMAR"),"CSV neutraliza formula injection com espaços iniciais");
check(escaped.includes('""quoted""'),"CSV escapa aspas duplas");
check(safe.clinicalReport360Csv(run({sections:["medications"],context:{...context,medicamentos:[med("m1",{nome:"-HYPERLINK"})]}})).includes("'-HYPERLINK"),"CSV neutraliza hífen em início de célula");
const json=JSON.parse(safe.clinicalReport360Json(withBrain));
check(json.format==="vault.clinical_report_360.v1"&&json.report.schemaVersion===1,"JSON estruturado e versionado");
check(json.report.rows.length===withBrain.rows.length,"JSON preserva quantidade da prévia");
check(!safe.clinicalReport360Json(report).includes("\"metadata\":") && !safe.clinicalReport360Json(report).includes("SECRET"),"JSON não inclui metadados internos");
const page=read("app/saude/relatorios/page.tsx");transpile("app/saude/relatorios/page.tsx");
check(page.includes("<input type=\"checkbox\"")&&page.includes("setSections")&&page.includes("useActivePersonId"),"UI seleciona seções e pessoa real");
check(page.includes("Clipboard.write")&&page.includes("ownDoctors")&&page.includes("user_id===user?.id"),"contatos clínicos isolados por conta");
check(page.includes("Compartilhamento cancelado")&&page.includes("O VAULT não confirma envio"),"compartilhamento nunca confirma entrega de e-mail");
check(page.includes("CustomDatePicker")&&page.includes("maxDate={today}")&&page.includes("preset")&&page.includes("90")&&!/<input\b[^>]*type\s*=\s*["\'](?:date|time|datetime-local)["\']/.test(page)&&!/<select\b/.test(page),"períodos personalizados com calendário Vault e seletores acessíveis, sem inputs nativos");
const pdf=read("lib/clinical-report-360-pdf.ts");transpile("lib/clinical-report-360-pdf.ts");
check(pdf.includes("pdf.addPage()")&&pdf.includes("Página ${i}/${count}"),"PDF pagina e numera corretamente");
check(pdf.includes("report.limitations")&&pdf.includes("report.rows"),"PDF inclui evidências e limites visíveis");
const exportFile=read("lib/clinical-report-360-export.ts");transpile("lib/clinical-report-360-export.ts");
check(exportFile.includes("Capacitor.isNativePlatform()")&&exportFile.includes("Share.share")&&exportFile.includes("Blob"),"Android usa share sheet; navegador baixa diretamente");
check(!/fetch\(|supabase\.from|XMLHttpRequest|sendBeacon/.test([read("lib/clinical-report-360.ts"),pdf,exportFile,page].join("\n")),"geração offline sem envio automático");
const registry=read("lib/health-intelligence/capability-catalog.ts");
check(registry.includes('id:"m98-report-360"')&&registry.includes('status:"included_in_this_build"'),"catálogo registra M98 apenas nesta build");
const gate=read("scripts/test-v63-release-gate.mjs");
check(gate.includes('"scripts/test-vault-m98-reports-360.cjs"')&&gate.indexOf("test-vault-m97-cross-evolutions")<gate.indexOf("test-vault-m98-reports-360"),"gate preserva M97 e inclui M98 na ordem");
const doctorPage=read("app/saude/medicos/detalhes/page.tsx");transpile("app/saude/medicos/detalhes/page.tsx");
check(doctorPage.includes("/saude/relatorios?medico=")&&doctorPage.includes("medico.email"),"médico abre a Central com destino sugerido");
const line=read("app/saude/registros/page.tsx");transpile("app/saude/registros/page.tsx");
check(line.includes("/saude/relatorios")&&line.includes("exportMonth"),"Linha de Cuidado preserva exportação M95");
const current=read("app/saude/registros/relatorio/page.tsx");transpile("app/saude/registros/relatorio/page.tsx");
check(current.includes("/saude/relatorios")&&current.includes("buildClinicalReport"),"relatório legado permanece acessível");
console.log(`VAULT M98: ${count} garantias comportamentais, visuais e de isolamento aprovadas.`);
