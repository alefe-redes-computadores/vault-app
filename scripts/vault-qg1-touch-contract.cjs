/* QG1: test-only structural and viewport tactile rules; never writes clinical data. */
'use strict';
const WIDTHS=Object.freeze([320,360,393,430]);
function classMinHeightAtLeastQG1(input,min=84,widths=WIDTHS){
  if(typeof input!=='string'||!Number.isFinite(min)||min<44)return false;
  const tokens=input.split(/\s+/).map(token=>token.trim()).filter(Boolean);
  for(const width of widths){
    const values=[];
    for(const token of tokens){
      const m=/^(?:(min|max)-\[(\d+)px\]:)?(!?)min-h-\[(\d+)px\]$/.exec(token);
      if(!m)continue;
      const boundary=m[2]?Number(m[2]):0;
      if(m[1]==='min'&&width<boundary)continue;
      if(m[1]==='max'&&width>boundary)continue;
      values.push({important:!!m[3],px:Number(m[4])});
    }
    if(!values.length)return false;
    // Strict lower bound. Conflicting classes are rejected conservatively;
    // no CSS-order guess that could hide a clipped card on Android.
    const important=values.filter(v=>v.important);
    if(Math.min(...(important.length?important:values).map(v=>v.px))<min)return false;
  }
  return true;
}
function extractClassAfter(source,anchor){
  if(typeof source!=='string')return '';
  const at=source.indexOf(anchor);if(at<0)return '';
  const next=source.indexOf('className=',at);if(next<0||next>at+700)return '';
  const start=next+'className='.length;
  const quote=source[start]==='"'? '"' : source.slice(start,start+2)==='{`'?'`':'';
  if(!quote)return '';
  const pos=quote==='"'?start+1:start+2,end=source.indexOf(quote,pos);
  return end>pos?source.slice(pos,end):'';
}
function homePrimaryMinHeightQG1(source,min=84){
  const anchor='onClick={() => go("/saude/medicamentos")}';
  const classes=extractClassAfter(source,anchor);
  return Boolean(classes&&classMinHeightAtLeastQG1(classes,min)&&
    classes.includes('touch-manipulation')&&classes.includes('h-full')&&
    source.includes('path="/saude/minha-saude"'));
}
function clinicalTileMinHeightQG1(source,min=84){
  const anchor='<button type="button" onClick={() => onNavigate(path)}';
  const classes=extractClassAfter(source,anchor);
  return Boolean(classes&&classMinHeightAtLeastQG1(classes,min)&&
    classes.includes('touch-manipulation')&&classes.includes('h-full')&&
    source.includes('aria-label={`${label}: ${description}`}')&&
    source.includes('onNavigate(path)')&&source.includes('${tone}'));
}
module.exports={WIDTHS,classMinHeightAtLeastQG1,homePrimaryMinHeightQG1,clinicalTileMinHeightQG1,extractClassAfter};
