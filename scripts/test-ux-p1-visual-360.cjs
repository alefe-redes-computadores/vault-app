#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");
const read = file => fs.readFileSync(path.join(process.cwd(), file),"utf8");
const files = [
  "components/list/ListPageHeader.tsx",
  "components/list/ListSearch.tsx",
  "components/list/ListFilters.tsx",
  "components/list/ListSort.tsx",
  "components/list/ListCard.tsx",
  "components/list/ListIcon.tsx",
  "components/saude/ClinicalListSummary.tsx",
  "components/saude/ClinicalSectionNav.tsx",
];
for (const file of files) {
  const code = read(file);
  const parsed = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length,0,`${file}: TSX parse error: ${parsed.parseDiagnostics.map(d=>d.messageText).join('; ')}`);
  console.log("OK: TSX",file);
}
const [header,search,filters,sort,card,icon,summary,nav]=files.map(read);
const all=(source,parts,label)=>parts.forEach(part=>assert(source.includes(part),`${label}: missing ${part}`));
all(header,['safeReturnTarget(','break-words font-display','header-safe-top','aria-label={`Ferramentas de ${title}`}','focus-visible:ring-2'],'header');
all(search,['role="search"','aria-label="Abrir busca"','V334_VISIBLE_SEARCH_TRIGGER','enterKeyHint="search"','onChange(event.target.value)','onKeyDown=','h-10 w-10','>Buscar</span>'],'search');
all(filters,['V334_VISIBLE_FILTER_TRIGGER','aria-haspopup="dialog"','<span>Filtros</span>','if (onClear) clearRef.current?.focus','else applyRef.current?.focus','document.body.style.overflow = previous','triggerRef.current.focus','role="dialog"','aria-modal="true"','Aplicar filtros','onClear ? <button','col-span-2'],'filters');
all(sort,['role="dialog"','role="radiogroup"','aria-checked={isSelected}','document.body.style.overflow = previous','triggerRef.current.focus','onChange(selectedValue)','min-h-12'],'sort');
all(card,['initial={false}','reducedMotion','contentVisibility: "auto"','interactiveContent','aria-label={navigationLabel}','density','compactTight','hover:shadow-lg','focus-visible:ring-2'],'card');
all(icon,['--vault-list-icon-size','Math.max(12, Math.min(40, size))','isGradient','color2'],'icon');
all(summary,['break-words text-sm font-semibold','divide-x divide-surface-border','break-all font-mono','text-[11px]','grid-cols-2 sm:grid-cols-4','tabular-nums'],'summary');
all(nav,['layout="grid"','layout?:"scroll"|"grid"','min-[480px]:grid-cols-4','break-words text-center','hashchange','IntersectionObserver','aria-current','min-h-12'],'nav');
assert(!search.includes('h-7 w-7'), 'search clear target too small');
assert(!summary.includes('text-[8px]'), 'summary eyebrow too small');
assert(!summary.includes('text-[9px]'), 'summary metric label too small');
console.log("VAULT UX-P1: 8 COMPONENTS + RESPONSIVE + A11Y + UX CONTRACTS OK");
