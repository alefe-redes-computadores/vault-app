'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const head=read('components/list/ListPageHeader.tsx'),detail=read('components/detail/DetailComponents.tsx'),input=read('components/ui/Input.tsx'),area=read('components/ui/TextArea.tsx');
assert(head.includes('break-words font-display') && !head.includes('className="truncate font-display'),'header allows long medical titles');
assert(head.includes('safeReturnTarget('),'return context preserved');
assert(detail.includes('min-w-0 break-words text-sm') && detail.includes('[overflow-wrap:anywhere]'),'details retain long clinical and financial values');
assert(detail.includes('{action && <div className="shrink-0">{action}</div>}'),'section controls remain isolated');
for(const [name,source] of [['Input',input],['TextArea',area]]){
 assert(source.includes('id={inputId}')&&source.includes('aria-invalid={Boolean(error)}')&&source.includes('aria-describedby={error ? [props["aria-describedby"], errorId].filter(Boolean).join(" ") : props["aria-describedby"]}'),`${name}: labelled and accessible error state`);
 assert(source.includes('role="alert"'),`${name}: screen reader error`);
}
assert(area.includes('htmlFor={inputId}'),'textarea label associated');
assert(!area.includes('window.')&&!detail.includes('useEffect('),'no new runtime/data fetch');
console.log('V301 OK: headers, sections, details, values and accessible fields.');
