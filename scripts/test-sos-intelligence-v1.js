// scripts/test-sos-intelligence-v1.js
const fs = require("fs");

const analyzer = fs.readFileSync(
  "lib/health-intelligence/sos-patterns.ts",
  "utf8"
);
const brain = fs.readFileSync(
  "lib/health-insights.ts",
  "utf8"
);

function expect(condition, message) {
  if (!condition) {
    throw new Error("SOS V1: " + message);
  }
}

expect(analyzer.includes('medication.tipo_uso === "sos"'), "analisa somente medicamento SOS/esporádico");
expect(analyzer.includes("current.count >= 21"), "possui nível forte para mudança de grande volume");
expect(analyzer.includes("ratio >= 3"), "compara com linha de base própria");
expect(analyzer.includes("longestConsecutiveRun"), "mede dias consecutivos");
expect(analyzer.includes("intervals.shortIntervals"), "mede concentração temporal");
expect(analyzer.includes("current.quantityComplete"), "distingue quantidade completa de parcial");
expect(analyzer.includes("não determina risco clínico"), "mantém limite clínico explícito");
expect(brain.includes("analyzeSosPattern"), "cérebro usa o analisador novo");
expect(brain.includes("padrao-sos-v1-"), "insight possui identidade estável");
expect(brain.includes('/saude/medicamentos/historico?id='), "ação abre evidência detalhada");
expect(!brain.includes("const tendenciaSOS =\n        analisarTendenciaSOS("), "card longitudinal antigo foi substituído");

console.log("SOS INTELLIGENCE V1 CONTRACT: OK");
