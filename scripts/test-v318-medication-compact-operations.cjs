#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const read = p=>fs.readFileSync(p,'utf8');
const page=read('app/saude/medicamentos/page.tsx');
const card=read('components/list/ListCard.tsx');
for (const [file,code] of [['medicamentos/page.tsx',page],['ListCard.tsx',card]]) {
  const source=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(source.parseDiagnostics.length,0,`${file}: JSX/TSX válido`);
}
assert.match(page,/density="compact"\s+compactTight\s+interactiveContent/);
assert.match(card,/compactTight\?: boolean/);
assert.match(card,/isTight \? "116px"/);
assert.match(page,/VAULT_V318_COMPACT_IDENTITY/);
assert.match(page,/line-clamp-2 break-words font-display/);
assert.doesNotMatch(page,/min-h-\[2\.4rem\]/);
assert.match(page,/VAULT_V318_OPERATIONAL_STRIP/);
assert.doesNotMatch(page,/min-h-\[4\.5rem\]/);
assert.doesNotMatch(page,/Ver pendência/);
assert.match(page,/contextualActionLabel/);
for(const label of ['Abrir retirada','Registrar aquisição','Renovar receita','Preparar documentos'])assert(page.includes(label),`Rótulo operacional ${label}`);
assert.match(page,/router\.push\(careAction\.href\)/,'Ação canônica navega ao destino real');
assert.match(page,/setQuickDoseMedId\(med\.id!\)/,'Tomar e SOS abrem o modal rápido');
assert.match(page,/!isSuspenso && canQuickDose && quickDoseLabel/,'não permitir dose rápida para medicamento suspenso ou sem estoque');
assert.match(page,/setSelectedRegulatory\(regulatoryProfile\)/,'informação regulatória continua acessível');
assert.match(page,/navigationLabel=\{`Ver detalhes de \$\{med\.nome\}`\}/,'ListCard recebe rótulo acessível para detalhes');
assert.match(card,/aria-label=\{navigationLabel\}/,'ListCard aplica rótulo acessível ao botão de navegação');
assert.match(page,/careDecision\.stage !== "stable" && !careAction/,'decisão sem ação ainda tem badge');
assert.match(page,/supplyRoute\?\.mode === "hybrid"/,'rota de fornecimento preservada');
assert.match(page,/humanizeStockText\(textoEstoquePrincipal\)/,'resumo de estoque derivado do estado real');
assert.match(page,/med\.dosagem/,'dosagem visível');
console.log('V318 OK: lista compacta, SOS/Tomar, ação contextual, regulação, estoque, tipagem TSX e detalhes preservados');
