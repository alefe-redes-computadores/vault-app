#!/usr/bin/env node
'use strict';
/** UX360: public nomenclature and non-regression guard — pure read only. */
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let n=0;const ok=(condition,label)=>{assert.ok(condition,'UX360: '+label);console.log('✓ UX360 '+(++n)+' '+label)};
const pages=['app/saude/careflow/page.tsx','app/saude/careflow/dossie/page.tsx',
'app/saude/careflow/modo-medico/page.tsx','app/saude/careflow/linha-do-tempo/page.tsx',
'app/saude/mapa/page.tsx','app/mais/page.tsx','app/page.tsx',
'components/home/HomeActionNowCardP7R3.tsx','components/saude/CareFlowSummaryM2.tsx'];
for(const path of pages){const text=read(path),ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(ast.parseDiagnostics.length===0,'TSX '+path);
}
for(const path of ['app/saude/careflow/page.tsx','app/saude/careflow/dossie/page.tsx',
 'app/saude/careflow/modo-medico/page.tsx','app/saude/careflow/linha-do-tempo/page.tsx']){
 const source=read(path),start=source.indexOf('<header'),end=source.indexOf('</header>',start);
 ok(start>=0&&end>start,'cabeçalho clínico existente '+path);
 const header=source.slice(start,end);
 ok(!/(?:CI360|\bM\d+\s+P\d+\b|\bP\d+\s+P\d+\s+M\d+\b)/i.test(header),'sem siglas internas visíveis '+path);
}
const map=read('app/saude/mapa/page.tsx'),dir=read('lib/navigation/clinical-directory-m150.ts');
ok(map.includes('aria-label="Favoritos"')&&map.includes('aria-label="Em foco agora"'),'Explorar reaproveita favoritos/foco reais');
ok(map.includes('HEALTH_MODULES_R5')&&map.includes('toggleHubFavoriteR5')&&map.includes('Star size={17}'),'fixação compartilha o Hub R5');
ok(map.includes('const total=clinicalDirectoryM150.reduce')&&dir.includes("id: 'careflow'"),'catálogo dinâmico e CareFlow completo');
ok(map.includes('const remaining=searching?[]:defaultItems.filter')&&!map.includes('!collapsed || searching'),'áreas visíveis sem gavetas ocultas');
ok(!map.includes('<BottomNav'),'barra gerida pelo layout, sem segunda barra');
const bottom=read('components/BottomNav.tsx');
ok(bottom.includes('"/saude/careflow"')&&bottom.includes('"/saude/mapa"'),'hubs com navegação inferior');
const home=read('app/page.tsx'),card=read('components/home/HomeActionNowCardP7R3.tsx');
ok(home.includes('<ClinicalEpisodePulseP4 />')&&home.includes('<CareFlowSummaryM2 />'),'Brain D3 real preservado na Home');
ok(home.includes('homeContextKind360')&&card.includes('shortHomeEvidenceUX360')&&card.includes('kind === "documento"'),'card contextual único, SUS com semântica documental');
ok(!card.includes('<Icon size={13} aria-hidden="true"/>{eyebrow}')&&card.includes('<Icon size={20}/>'),'ícone contextual não duplicado');
ok(!card.includes('line-clamp-2 break-words text-[11px]'),'descrição não corta a frase no card contextual');
const more=read('app/mais/page.tsx');
ok(more.includes('aria-label="Pessoa ativa no Vault"')&&more.includes('grid grid-cols-[minmax(0,1fr)_auto] items-end'),'seletor e edição alinhados');
ok(more.includes('Prontidão, backup, recuperação, exportação e limpeza')&&more.includes('grid grid-cols-1 gap-2 border-t border-surface-border/35 pb-3 pt-3'),'Ferramentas avançadas em coluna única');
ok(!more.includes('className="truncate text-xs text-ink-muted">Sync, fila'),'segurança sem reticências artificiais');
ok(read('app/saude/careflow/page.tsx').includes('ClinicalBackLinkP0'),'retorno seguro no hub');
// D3 published independently — reject a parallel second engine.
ok(fs.existsSync('lib/m3/brain-return-d3.ts')&&fs.existsSync('components/saude/BrainReturnCardD3.tsx'),'D3 canônica do HEAD presente');
ok(!home.includes('BrainNextStepD3')&&!read('app/saude/careflow/page.tsx').includes('BrainNextStepD3'),'não duplica motor ou cartão Brain');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-ci360-p6-p3-d3.cjs"').length===2,'D3 publicada registrada uma vez');
ok(gate.split('"scripts/test-vault-ux360-public-identity-r2.cjs"').length===2,'contrato de nomenclatura pública registrado uma vez');
console.log('VAULT UX360 QUALIDADE PUBLICA: '+n+' garantias aprovadas');
