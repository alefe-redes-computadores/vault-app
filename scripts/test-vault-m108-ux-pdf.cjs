"use strict";
const fs=require("node:fs");
const assert=require("node:assert/strict");
const ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");
const paths=[
  "lib/pdfExport.ts","lib/document-summary-pdf.ts","components/ExportCardButton.tsx",
  "app/documentos/page.tsx","app/saude/medicamentos/page.tsx",
  "components/home/HomeDoseQuantityFollowUp.tsx","app/page.tsx",
  "components/notifications/VaultNotificationHub.tsx","app/mais/page.tsx",
];
for(const file of paths){
  const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,`${file} deve ter sintaxe valida`);
}
const pdf=read(paths[0]),summary=read(paths[1]),btn=read(paths[2]),docs=read(paths[3]);
assert(pdf.includes('Share.share({ title, files: [uri]'),"Android deve compartilhar arquivo fisico, nao URL textual");
assert(pdf.includes('directory: Directory.Cache')&&pdf.includes('pdf.save(filename)'),"PWA e cache Android preservados");
assert(summary.includes('exportDocumentSummariesToPDF')&&summary.includes('await deliverPdf('),"Lista de documentos possui PDF independente de DOM");
assert(summary.includes('Nao substitui documento original')&&summary.includes('nao incorporados'),"PDF sinaliza limites dos anexos");
assert(btn.includes('if (onExport) {')&&btn.includes('await onBeforeExport?.()')&&btn.includes('onAfterExport?.()'),"Ciclo de exportacao preservado");
assert(docs.includes('onExport={() => exportDocumentSummariesToPDF(filteredDocs)}')&&docs.includes('getExportCards()'),"Escopo filtrado preservado; cards legados intactos");
const med=read(paths[4]);
assert(med.includes('statsProgresso.completados}/{statsProgresso.total}')&&med.includes('if (item.isSOS || item.isSuspenso) continue;'),"Doses oficiais e SOS fora do total");
assert(med.includes('role="progressbar"')&&med.includes('density="compact"')&&med.includes('compactTight'),"Progresso e base compacta dos cards");
assert(med.includes('catalogIdentity?.activeIngredient')&&med.includes('Princípio ativo · confirmar referência nos detalhes'),"Sem inferir principio ativo inexistente");
assert(med.includes('aria-label="Ações do medicamento"')&&med.includes('regulatoryBorderColor')&&med.includes('MedicationOperationalStrip'),"Acoes, identidade regulatoria e estoque continuam");
const follow=read(paths[5]);
assert(follow.includes('hasToggledDetails ? expanded : !checked')&&follow.includes('insight.titulo')&&follow.includes('onMarkChecked(insight)'),"Aviso revisado compacto, nao revisado acessivel");
assert(follow.includes('não equivale a avaliação profissional')&&follow.includes('procure orientação médica'),"Ressalvas clinicas preservadas");
const home=read(paths[6]);
assert(home.includes('HomeDoseQuantityFollowUp')&&home.includes('MedicationCareOpportunityQueue')&&home.includes('id="home-continuity-other"'),"Acompanhamento e outras prioridades permanecem");
assert(home.includes('router.push(primaryMedicationCareOpportunity.actionHref')||home.includes('primaryMedicationCareOpportunity.actionHref'),"Atalho principal de retirada preservado");
const hub=read(paths[7]);
assert(hub.includes('getVaultNotificationPreferences()')&&hub.includes('isNotificationPreferenceEnabled()'),"Autoridade de categorias preservada");
assert(hub.includes('onConfigure')&&hub.includes('onUpdates')&&hub.includes('PWA')&&hub.includes('APK')&&hub.includes('não são garantidos'),"Limites de ambiente e contrato legado preservados");
assert(!hub.includes('<Download size=')&&hub.includes('Atualizações do APK ficam na aba Mais.'),"Atualizacoes fora da central de notificacoes");
const more=read(paths[8]);
assert(more.includes('<VaultUpdateCenter />')&&more.includes('Conheça o Vault')&&more.includes('Ajuda e guias por área'),"Atualizacoes e ajuda continuam na aba Mais");
assert(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m108-ux-pdf.cjs"'),"Contrato M108 presente no gate global");
console.log('VAULT M108 — UX REAL, PDF DO COFRE E AVISOS SEPARADOS: CONTRATOS OK');
