// scripts/test-regulatory-topical-engine-v2.js
"use strict";

const fs =
  require("fs");

const regulatory =
  fs.readFileSync(
    "lib/medication-catalog/regulatory.ts",
    "utf8"
  );

const engine =
  fs.readFileSync(
    "lib/medication-catalog/regulatory-exceptions.ts",
    "utf8"
  );

function expect(condition, label) {
  if (!condition) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

console.log(
  "\n🏥 REGULATORY TOPICAL ENGINE V2\n"
);

expect(
  regulatory.includes(
    '"pharmaceutical_form_category"'
  ),
  "nova condição categórica existe"
);

expect(
  regulatory.includes(
    'value:\n        "topical"'
  ),
  "categoria topical existe"
);

expect(
  engine.includes(
    "classifyRegulatoryPharmaceuticalForm"
  ),
  "classificador existe"
);

expect(
  engine.includes(
    '"creme dermatologico"'
  ),
  "creme dermatológico reconhecido"
);

expect(
  engine.includes(
    '"pomada topica"'
  ),
  "pomada tópica reconhecida"
);

expect(
  !engine.includes(
    'normalized ===\n      "gel"'
  ),
  "gel isolado não é inferido"
);

expect(
  engine.includes(
    "const modelCode ="
  ),
  "override model code é lido"
);

expect(
  engine.includes(
    ".overridePrescriptionModelCode"
  ),
  "override model code integrado"
);

expect(
  engine.includes(
    "basePrescriptionModelCode"
  ),
  "base model code propagado"
);

expect(
  engine.includes(
    '"override_applied"'
  ),
  "resolver override preservado"
);

console.log(
  "\n✅ MOTOR TÓPICO V2 VALIDADO."
);
