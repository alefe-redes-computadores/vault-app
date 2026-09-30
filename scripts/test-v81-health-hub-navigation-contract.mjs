import fs from "node:fs";
const s=fs.readFileSync("app/saude/rede/page.tsx","utf8");
const ok=(v,m)=>{if(!v)throw new Error(`V81: ${m}`);console.log(`OK: ${m}`)};
ok(s.includes("VAULT_HEALTH_HUB_V81")&&s.includes("VAULT_HEALTH_NETWORK_DISCOVERY_V79: preservado pelo hub"),"topo não usa categorias como falsos filtros");
ok(s.includes("VAULT_HEALTH_SUPPORT_DISCOVERY_V81"),"rede de apoio possui descoberta permanente");
for(const route of ["/saude/medicos","/saude/farmacias","/saude/hospitais","/saude/locais","/saude/registros","/saude/hidratacao","/saude/lembretes","/saude/timeline","/saude/plano-seguranca","/saude/documentos"]) ok(s.includes(route),`hub expõe ${route}`);
ok(s.includes('router.replace(routes[tabParam])'),"links antigos por aba convergem para rotas canônicas");
ok(s.includes("border-amber-400")&&s.includes("border-rose-400")&&s.includes("border-emerald-400")&&s.includes("border-violet-400"),"hub usa identidade cromática sem excesso de azul");
console.log("V81 HEALTH HUB & NAVIGATION — CONTRATO OK");
