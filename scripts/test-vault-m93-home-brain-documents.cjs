"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
let tested = 0;
const ok = (value, label) => { assert.ok(value, `M93: ${label}`); tested += 1; console.log(`✓ M93 ${tested}: ${label}`); };
const read = p => fs.readFileSync(p, "utf8");
function parse(path) {
  const source = read(path);
  const output = ts.transpileModule(source, { fileName: path,
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  ok(!output.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error), `${path}: sintaxe TS/TSX`);
  return source;
}
const agenda = parse("components/home/HomeAgendaBreakdown.tsx");
ok(agenda.includes('grid grid-cols-1 gap-1.5') && !agenda.includes('grid grid-cols-2 gap-1.5'), "agenda ocupa largura inteira sem meia coluna vazia");
ok(agenda.includes('onNavigate(item.href)') && agenda.includes('overdueWithdrawals'), "destinos e semântica de retiradas vencidas preservados");
const home = parse("app/page.tsx");
ok(home.includes('HomeDoseQuantityFollowUp') && home.includes('healthIntelligence.insights.find(item => item.id.startsWith("quantidade-confirmada-"))'), "Home acompanha SOMENTE alerta de quantidade confirmada no Brain existente");
ok(home.includes('healthIntelligence.sendExperienceFeedback(insight, "already_knew")'), "revisão delegada à autoridade de feedback já sincronizada");
ok(home.includes('item.status === "agendada" && item.data && item.data >= hoje'), "só consultas futuras e agendadas da pessoa ativa");
const review = parse("components/home/HomeDoseQuantityFollowUp.tsx");
ok(review.includes('insight.id.startsWith("quantidade-confirmada-")') && review.includes('!insight'), "sem novo alerta quando o Brain não tem registro confirmado");
ok(review.includes('Conferência pessoal registrada') && review.includes('não equivale a avaliação profissional'), "sem diagnóstico ou falsa segurança");
ok(!/\b(fetch\(|\.insert\(|\.delete\(|db\.|supabase)\b/.test(review), "componente de seguimento não grava dados clínicos");
ok(review.includes('"/saude/consultas"') && review.includes('insight.link'), "acesso ao histórico e à consulta existente");
const personal = parse("app/documentos/page.tsx");
ok(personal.includes('VAULT_DOCUMENT_TOOLBAR_V80') && personal.includes('openNewDocument') && !personal.includes('className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-ice/20 bg-ice/10 px-4'), "ação duplicada do Cofre removida, criação contextual mantida");
const exportButton = parse("components/ExportCardButton.tsx");
ok(exportButton.includes('const iconOnly = compact || label.trim().length === 0') && exportButton.includes('!w-10') && exportButton.includes('role="alert" className="fixed'), "PDF não expande nem deforma a toolbar em erro/progresso");
ok(exportButton.includes('await onBeforeExport?.()') && exportButton.includes('onAfterExport?.()'), "ciclo de preparação e limpeza dos cards preservado");
const pdf = parse("lib/pdfExport.ts");
ok(pdf.includes('Capacitor.isNativePlatform()') && pdf.includes('import("@capacitor/filesystem")') && pdf.includes('import("@capacitor/share")'), "Android usa plugins nativos de Cache e chooser");
ok(pdf.includes('directory: Directory.Cache') && pdf.includes('Share.share({') && pdf.includes('recursive: true'), "compartilhamento não exige permissão geral de armazenamento");
ok(pdf.includes('pdf.save(filename)') && pdf.includes('addTextSummary') && pdf.includes('Anexos não incorporados'), "PWA preservado e fallback textual explicita limites");
ok(pdf.includes('await deliverPdf(pdf, filename, title)') && pdf.includes('await renderCardPage(pdf, element)'), "exportação única e múltipla usam o mesmo caminho")
const clinical = parse("app/saude/documentos/page.tsx");
ok(clinical.includes('useState(() => format(new Date(), "yyyy-MM"))') && clinical.includes('setSelectedMonth(format(new Date(), "yyyy-MM"))'), "acervo inicia e reinicia no mês atual");
ok(clinical.includes('if (futureA !== futureB) return futureA ? 1 : -1;') && clinical.includes('Data futura · conferir'), "datas futuras preservadas e ordenadas por último com ressalva");
ok(clinical.includes('getMonthKey(') && clinical.includes('selectedMonth ===') && clinical.includes('formatMonthLabel('), "autoridade de mês/documento e filtros originais preservados");
const release = read("scripts/test-v63-release-gate.mjs");
ok(release.includes('"scripts/test-vault-m93-home-brain-documents.cjs"'), "contrato novo entra na suíte global");
const pkg = JSON.parse(read("package.json"));
ok(Boolean(pkg.dependencies?.["@capacitor/filesystem"] && pkg.dependencies?.["@capacitor/share"]), "dependências nativas declaradas");
const lock = JSON.parse(read("package-lock.json"));
ok(Boolean(lock.packages?.["node_modules/@capacitor/filesystem"] && lock.packages?.["node_modules/@capacitor/share"]), "lockfile reprodutível para Actions Android");
console.log(`M93: ${tested} verificações de sintaxe, integridade, comportamento e preservação OK.`);
