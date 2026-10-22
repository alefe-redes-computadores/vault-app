const assert = require("node:assert/strict");
const fs = require("node:fs");

const hydration = fs.readFileSync("components/saude/HydrationPanel.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

assert(hydration.includes('useReturnContext("/saude/minha-saude")'), "hidratação deve ter retorno contextual");
assert(hydration.includes('preserveReturn("/saude/lembretes")'), "lembretes devem preservar a origem");
assert(hydration.includes("queuedAdds>0"), "fila de registros rápidos deve ficar visível");
assert(hydration.includes("todayOpen") && hydration.includes("historyOpen"), "históricos densos devem ser recolhíveis");
assert(hydration.includes("total} ml somados"), "soma diária deve ser explícita");
assert(hydration.includes("right.created_at||right.id"), "desfazer deve resolver empates de horário de forma estável");
assert(hydration.includes("Dias sem registro não são tratados como consumo zero"), "ausência continua sem virar consumo zero");
assert(hydration.includes("O Vault não recomenda nem presume uma meta"), "meta continua manual e não clínica");
assert(avatar.includes('appearance.hat==="flat"?.258:.246'), "aba frontal deve respeitar a largura da cabeça sem cobrir o rosto");
assert(avatar.includes("materials.capShade,0,3.002,.253"), "borda da aba deve permanecer contida sem formar faixa flutuante");
assert(avatar.includes("brimStitch"), "acabamento de costura do boné deve ser preservado");

console.log("VAULT V181 — HYDRATION COMMAND + AVATAR CAP CONTRACT OK");
