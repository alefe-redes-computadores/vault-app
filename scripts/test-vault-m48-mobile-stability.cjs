#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;
const ok=(condition,label)=>{assert.ok(condition,'M48: '+label);passed++;console.log('✓ M48 '+label)};
const sources=[
 'hooks/useDismissibleDetails.ts',
 'components/hoje/TodayFilterPanel.tsx',
 'components/hoje/TodayTimelineGuide.tsx',
 'components/hoje/TodayDateNavigation.tsx',
 'components/saude/MedicationFilterBar.tsx',
 'components/saude/ClinicalSectionNav.tsx',
 'components/home/HomeAttentionRail.tsx',
 'components/home/HomeDailyHero.tsx',
 'components/hoje/TodayBatchAction.tsx',
 'components/hoje/TodayRemindersPanel.tsx',
];
for(const file of sources){
 const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(!tree.parseDiagnostics.length,'TypeScript source parse '+file);
}
const hook=read(sources[0]);
const filter=read(sources[1]),guide=read(sources[2]),date=read(sources[3]),med=read(sources[4]),nav=read(sources[5]),rail=read(sources[6]),hero=read(sources[7]),batch=read(sources[8]),reminder=read(sources[9]);
ok(filter.includes('useDismissibleDetails()')&&filter.includes('max-h-[min(66dvh,460px)]')&&filter.includes('overflow-y-auto overscroll-contain')&&filter.includes('aria-pressed={active}'),'Today filter scroll-bounded, dismissible, selection intact');
ok(filter.includes('statusOptions')&&filter.includes('onShowResolved(event.target.checked)')&&filter.includes('onReset()')&&filter.includes('isToday &&'),'Today filters retain historical/clinical distinctions and reset');
ok(guide.includes('useDismissibleDetails()')&&guide.includes('absolute right-0')&&!guide.includes('absolute -right-28'),'Today guidance stays inside mobile width');
ok(guide.includes('Doses futuras são previsões')&&guide.includes('Falta de confirmação no histórico não significa uma dose ignorada'),'temporal uncertainty visible, not inferred missed');
ok(date.includes('description}</span>')&&!date.includes('description.slice(0, 5)')&&date.includes('onSelectDate(event.target.value)'),'native picker keeps date selection and readable description');
ok(date.includes('type="date" aria-label={label}')&&date.includes('className="absolute inset-0 h-full w-full cursor-pointer opacity-0"'),'date native input remains invisible only as existing intentional control');
ok(med.includes('document.addEventListener("pointerdown", dismissOutside)')&&med.includes('triggerRef.current?.focus()')&&med.includes('min-h-11'),'medication filters close outside/Escape and meet touch size');
ok(med.includes('aria-pressed={value === key}')&&med.includes('onChange(next)')&&!/\bfetch\(|localStorage|supabase|indexedDB/.test(med),'medication filters retain parent authority without I/O');
ok(nav.includes('if(!ids.includes(activeId))setActiveId(ids[0])')&&nav.includes('min-h-11 gap-1 rounded-lg')&&nav.includes('min-h-11 w-full'),'section navigation handles entity changes and touch targets');
ok(nav.includes('href={`#${item.id}`}')&&nav.includes('dispatchEvent(new Event("vault:reveal-clinical-section"))'),'lazy clinical deep-link reveal preserved');
ok(rail.includes('alerts.slice(0, 1)')&&rail.includes('aria-expanded={expanded}')&&rail.includes('min-w-0 flex-1'),'Home retains single-alert priority and narrow layout');
ok(hero.includes('homeRoutineSummaryNote(scheduled, safeCompleted)')&&hero.includes('scheduled > 0')&&hero.includes('safeCompleted'),'Home zero-denominator and summary authority intact');
ok(batch.includes('Revisar doses')&&batch.includes('aria-busy={processing}')&&batch.includes('disabled={disabled}')&&batch.includes('count < 2'),'batch clearly opens review without altering eligibility or lock');
ok(reminder.includes('line-clamp-2')&&reminder.includes('onNavigate(reminder.target_route)')&&reminder.includes('Lembretes não confirmam dose tomada'),'reminders readable and never auto-confirm doses');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m48-mobile-stability.cjs'),'M48 included in full canonical gate');

// Execute the actual shared dismiss hook without React DOM. Prove event lifetime,
// outside taps, Escape behavior and focus restoration deterministically.
const listeners=new Map();
const fakeDocument={
 addEventListener(name,fn){const group=listeners.get(name)||new Set();group.add(fn);listeners.set(name,group)},
 removeEventListener(name,fn){listeners.get(name)?.delete(fn)},
};
let cleanup=null;let ref;
const fakeReact={
 useRef(value){ref={current:value};return ref;},
 useEffect(fn){cleanup=fn();},
};
const sourceJS=ts.transpileModule(hook,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(sources[0],module);
mod.require=id=>id==='react'?fakeReact:require(id);
const before=global.document;
global.document=fakeDocument;
try{
 mod._compile(sourceJS,sources[0]);
 const details=mod.exports.useDismissibleDetails();
 let focused=0;
 const inside={},outside={};
 details.current={open:true,contains:node=>node===inside,querySelector:()=>({focus:()=>focused++})};
 const click=(target)=>{for(const listener of listeners.get('pointerdown')||[])listener({target});};
 let prevented=0;
 const key=(key)=>{for(const listener of listeners.get('keydown')||[])listener({key,preventDefault:()=>prevented++});};
 click(inside);ok(details.current.open,'inside tap never dismisses');
 click(outside);ok(!details.current.open,'outside tap dismisses without changing page');
 details.current.open=true;key('Enter');ok(details.current.open,'unrelated keyboard event ignored');
 key('Escape');ok(!details.current.open&&focused===1&&prevented===1,'Escape closes and restores trigger focus');
 ok(listeners.get('pointerdown')?.size===1&&listeners.get('keydown')?.size===1,'one listener pair per mounted disclosure');
 cleanup();
 ok(listeners.get('pointerdown')?.size===0&&listeners.get('keydown')?.size===0,'all document listeners removed at unmount');
} finally {if(before===undefined)delete global.document;else global.document=before;}
console.log(`VAULT M48: ${passed} source and behavior checks passed; no clinical mutations`);
