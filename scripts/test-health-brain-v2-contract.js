const fs=require("fs");let failures=0;function check(file,pattern,label){const text=fs.readFileSync(file,"utf8");if(!pattern.test(text)){console.error(`FALHA: ${label}`);failures++}else console.log(`OK: ${label}`)}
check("lib/health-intelligence/hydration-insights.ts",/records\.filter\(\(record\) => record\.tipo === "agua"\)/,"hidratação usa RegistroSaude tipo agua");
check("lib/health-intelligence/hydration-insights.ts",/unidade_medida !== "ml"/,"ml é unidade explícita");
check("lib/health-intelligence/hydration-insights.ts",/dias ausentes não viraram zero/,"ausência não é zero");
check("lib/health-intelligence/hydration-insights.ts",/Isso descreve somente o que foi salvo no Vault/,"linguagem não causal");
check("lib/health-insights.ts",/buildHydrationInsights\(/,"cérebro longitudinal inclui hidratação");
check("components\/health-intelligence\/HealthInsightExplanationSheet\.tsx",/Fontes internas/,"explicação mostra fontes internas");
check("app/saude/medicamentos/page.tsx",/sos\.sort\(/,"SOS possui ordenação determinística");
check("app/saude/medicamentos/page.tsx",/suspensos\.sort\(/,"suspensos possuem ordenação determinística");
if(failures)process.exit(1);console.log("CONTRATOS CÉREBRO/HOME/MEDICAMENTOS V2: OK");
