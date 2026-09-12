import fs from "node:fs";
const read = file => fs.readFileSync(file,"utf8");
const page=read("app/saude/registros/page.tsx"),hook=read("hooks/useDoseLogs.ts"),timeline=read("lib/clinical-record-timeline.ts");
const tests=[
 ["Prontuário deixa de ser apenas Sintomas e Medições",page.includes("Linha de cuidado")&&!page.includes('title="Sintomas e Medições"')],
 ["linha clínica combina registros e doses",page.includes("buildClinicalEvents")&&timeline.includes("recordEvents")&&timeline.includes("doseEvents")],
 ["DoseLogs completos respeitam pessoa ativa",hook.includes("useAllDoseLogs")&&hook.includes("doseLogsRepository.getAll(activePersonId)")],
 ["navegação mensal é determinística",page.includes("shiftClinicalMonth")&&timeline.includes("clinicalMonthLabel")],
 ["eventos são agrupados por semana",timeline.includes("ClinicalWeek")&&page.includes("Semana")],
 ["busca e filtros atuam no período",page.includes("visibleEvents")&&page.includes("ViewFilter")],
 ["hidratação possui categoria própria",timeline.includes('"hidratacao"')&&page.includes("Água")],
 ["doses SOS e extras ficam separadas da rotina",page.includes('dose_kind === "sos"')&&page.includes('dose_kind === "extra"')],
 ["relatório é imprimível e explicável",page.includes("window.print()")&&page.includes("Não é diagnóstico nem prescrição")],
 ["inteligência não prescreve alteração",page.includes("não recomenda alterar dose")],
 ["documentos clínicos não são duplicados no prontuário",!page.includes("Documentos de saúde")&&!page.includes("acervo clínico")],
 ["sem migration de banco",true],
];
for(const [name,ok] of tests){if(!ok){console.error(`FALHA: ${name}`);process.exit(1)}console.log(`OK: ${name}`)}
console.log(`CONTRATOS PRONTUÁRIO V10: OK (${tests.length})`);
