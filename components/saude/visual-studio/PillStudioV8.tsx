'use client';
import { useId } from 'react';
import type { Medicamento } from '@/lib/types';
import { normalizedPillV8 } from '@/lib/health-intelligence/visual-studio-v8';

type Props={medication:Pick<Medicamento,'formato'|'forma_farmaceutica'|'cores'|'cor_principal'|'cor_secundaria'>;large?:boolean};
/** A high-quality SVG illustration of the *declared* presentation. Not a photo of a real tablet. */
export function PillStudioV8({medication,large=false}:Props){
  const p=normalizedPillV8(medication);
  const id=useId().replace(/[^a-zA-Z0-9]/g,'');
  const a=`pillA-${id}`,b=`pillB-${id}`,light=`pillL-${id}`,shadow=`pillS-${id}`;
  const elongated=['oblongo','oblongo_sulcado','capsula'].includes(p.kind);
  const scored=['partido','oblongo_sulcado'].includes(p.kind);
  return <div className={`relative mx-auto grid aspect-square place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_45%_34%,rgba(148,163,184,.13),rgba(15,23,42,.8)_65%,rgba(5,9,21,.96))] ${large?'max-w-[280px]':'max-w-[160px]'}`} role="img" aria-label={`Ilustração de apresentação ${p.kind}; aparência declarada, não imagem da embalagem real`}>
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".36"/><stop offset=".27" stopColor={p.first}/><stop offset=".73" stopColor={p.first}/><stop offset="1" stopColor="#000" stopOpacity=".27"/></linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".25"/><stop offset=".4" stopColor={p.second}/><stop offset="1" stopColor="#000" stopOpacity=".18"/></linearGradient>
        <linearGradient id={light} x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".44"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
        <radialGradient id={shadow}><stop offset="0" stopColor="#000" stopOpacity=".5"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="122" cy="188" rx="80" ry="17" fill={`url(#${shadow})`}/>
      {p.kind==='capsula'?<g transform="rotate(-23 120 112)">
        <rect x="43" y="83" width="155" height="68" rx="34" fill={`url(#${a})`} stroke="#fff" strokeOpacity=".18" strokeWidth="1.2"/>
        <path d="M120 83H164A34 34 0 0 1 164 151H120Z" fill={`url(#${b})`}/>
        <path d="M120 83V151" stroke="#0f172a" strokeOpacity=".35" strokeWidth="2"/>
        <path d="M63 93C80 86 94 88 106 91" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round"/>
        <path d="M135 91C151 86 173 90 183 105" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="4" strokeLinecap="round"/>
      </g>:null}
      {['comprimido','partido'].includes(p.kind)?<g transform="rotate(-20 120 115)">
        <ellipse cx="120" cy="115" rx="69" ry="63" fill={`url(#${a})`} stroke="#fff" strokeOpacity=".22" strokeWidth="1.5"/>
        {p.twoColors?<path d="M120 52A69 63 0 0 1 120 178Z" fill={`url(#${b})`}/>:null}
        <ellipse cx="112" cy="102" rx="55" ry="49" fill={`url(#${light})`} opacity=".33"/>
        {scored?<><path d="M120 58V172" stroke="#0f172a" strokeOpacity=".46" strokeWidth="6" strokeLinecap="round"/><path d="M122 60V170" stroke="#fff" strokeOpacity=".28" strokeWidth="1.5"/></>:null}
      </g>:null}
      {['oblongo','oblongo_sulcado'].includes(p.kind)?<g transform="rotate(-23 120 115)">
        <rect x="36" y="79" width="168" height="72" rx="36" fill={`url(#${a})`} stroke="#fff" strokeOpacity=".22" strokeWidth="1.3"/>
        {p.twoColors?<path d="M120 79H168A36 36 0 0 1 168 151H120Z" fill={`url(#${b})`}/>:null}
        <path d="M56 91C82 81 108 88 119 87" stroke="#fff" strokeOpacity=".28" strokeWidth="4" strokeLinecap="round" fill="none"/>
        {scored?<path d="M120 86V144" stroke="#172033" strokeOpacity=".48" strokeWidth="4" strokeLinecap="round"/>:null}
      </g>:null}
      {p.kind==='gota'?<g><path d="M120 41C102 71 69 116 69 141a51 51 0 0 0 102 0c0-25-33-70-51-100Z" fill={`url(#${a})`} stroke="#fff" strokeOpacity=".22" strokeWidth="1.5"/><path d="M101 101C91 118 85 132 86 146" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="8" strokeLinecap="round"/></g>:null}
      {p.kind==='adesivo'?<g transform="rotate(-15 120 115)"><rect x="57" y="53" width="128" height="128" rx="21" fill={`url(#${a})`} stroke="#fff" strokeOpacity=".33" strokeWidth="2"/><rect x="72" y="68" width="98" height="98" rx="15" fill={`url(#${b})`} stroke="#fff" strokeOpacity=".25" strokeDasharray="4 5"/></g>:null}
      {p.kind==='injecao'?<g transform="rotate(-42 120 120)"><rect x="96" y="61" width="48" height="119" rx="10" fill={`url(#${a})`} stroke="#fff" strokeOpacity=".3" strokeWidth="2"/><path d="M111 60V27M129 60V27M108 27H132M120 180V212" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round"/><path d="M108 90H131M108 112H131M108 134H131" stroke="#fff" strokeOpacity=".4" strokeWidth="2"/></g>:null}
    </svg>
    <span className="pointer-events-none absolute bottom-2 left-2 right-2 text-center text-[9px] font-semibold uppercase tracking-[.16em] text-slate-400">Prévia ilustrativa · não é foto do produto</span>
  </div>;
}
