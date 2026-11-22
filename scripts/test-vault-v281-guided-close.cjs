const fs = require("node:fs");
const assert = require("node:assert/strict");

const read = (path) => fs.readFileSync(path, "utf8");
const pressure = read("app/saude/careflow/pressao/page.tsx");
const careflow = read("app/saude/careflow/page.tsx");
const homeViva = read("components/home/HomeVivaP4.tsx");
const homeProjection = read("lib/home/home-viva-p4.ts");
const careLine = read("app/saude/registros/page.tsx");
const medical = read("app/saude/careflow/modo-medico/page.tsx");
const parser = read("lib/health/pressure-input.ts");
const timePicker = read("components/saude/HealthTimePicker.tsx");

const checks = [
  [() => assert.match(parser, /digits\.length === 5[\s\S]*digits\.slice\(0, 3\)/), "14682 deve separar 146/82"],
  [() => assert.match(parser, /abbreviated \? Number\(left\) \* 10/), "14/9 deve virar 140/90"],
  [() => assert.doesNotMatch(timePicker, /\.focus\(\)/), "horário não pode saltar foco em 1500"],
  [() => assert.match(pressure, /useState\(\[""\]\)/), "plano deve nascer com um único horário vazio"],
  [() => assert.match(pressure, /setShowPlanForm\(\(v\) => !v\); setShowReadingForm\(false\)/), "abrir plano deve recolher medição"],
  [() => assert.match(pressure, /setShowReadingForm\(\(v\) => !v\); setShowPlanForm\(false\)/), "abrir medição deve recolher plano"],
  [() => assert.match(pressure, /setShowReadingForm\(false\);[\s\S]*Medição de pressão salva/), "salvar deve recolher formulário e emitir toast"],
  [() => assert.doesNotMatch(pressure, /title:\s*`Registrar pressão · \$\{clock\}`/), "lembrete não pode repetir horário no título"],
  [() => assert.match(pressure, /href="\/saude\/registros\?foco=pressao"/), "Linha de cuidado deve abrir já filtrada"],
  [() => assert.match(pressure, /pb-\[calc\(8rem\+env\(safe-area-inset-bottom,0px\)\)\]/), "rodapé deve respeitar Safe Area e navegação"],
  [() => assert.match(careflow, /group\.cards\.length%2===1&&index===group\.cards\.length-1/), "grade ímpar não pode deixar card órfão"],
  [() => assert.match(homeViva, /\/saude\/registros\/novo\?preset=sintoma/), "Registrar sintoma deve abrir formulário direcionado"],
  [() => assert.match(homeProjection, /\/saude\/registros\?foco=pressao/), "Acompanhamento de pressão deve abrir o recorte real"],
  [() => assert.match(homeProjection, /\/saude\/consultas\/detalhes\?id=/), "consulta recente deve abrir o registro por ID"],
  [() => assert.doesNotMatch(careLine, /\+ Humor|\+ Ansiedade|\+ Fadiga/), "Linha de cuidado não deve restaurar chips fixos"],
  [() => assert.match(careLine, /activeSymptomCount > 0/), "atalho de sintoma deve depender do contexto"],
  [() => assert.match(medical, /includeBrain\?'border-violet-300/), "violeta deve continuar identificando o Brain"],
  [() => assert.doesNotMatch(medical, /bg-violet-300 px-3 text-xs font-bold text-void/), "CTA principal do PDF não deve usar violeta"],
];

let passed = 0;
for (const [run, label] of checks) {
  run();
  passed += 1;
  console.log(`✓ ${label}`);
}
console.log(`VAULT V28.1 FECHAMENTO GUIADO: ${passed} verificações aprovadas`);
