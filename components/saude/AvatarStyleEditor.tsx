"use client";
import { Glasses, Footprints, Shirt, RotateCcw, ChevronDown, Check } from "lucide-react";
import { AVATAR_STYLE_COLORS, DEFAULT_AVATAR_STYLE, avatarStyleLabel, normalizeAvatarStyle, type AvatarStyle } from "@/lib/health-profile/avatar-style";

type Key = keyof AvatarStyle;
type Option = { value: string; label: string };
const sections: { key: Key; title: string; options: Option[] }[] = [
  { key: 'hat', title: 'Modelo do boné', options: [{value:'none',label:'Sem boné'},{value:'baseball',label:'Curvo'},{value:'flat',label:'Aba reta'}] },
  { key: 'hatBrand', title: 'Estilo da marca', options: [{value:'none',label:'Sem marca'},{value:'nike',label:'Nike'},{value:'new-era',label:'New Era'},{value:'generic',label:'Genérico'}] },
  { key: 'glasses', title: 'Óculos de grau', options: [{value:'none',label:'Sem óculos'},{value:'rectangular',label:'Retangular'},{value:'round',label:'Redondo'}] },
  { key: 'sneakers', title: 'Tênis', options: [{value:'classic',label:'Clássico'},{value:'runner',label:'Esportivo'},{value:'high-top',label:'Cano alto'}] },
];
function ColorSelector({value, onChange, label}:{value:string;onChange:(color:string)=>void;label:string}) {
  return <fieldset className="mt-2"><legend className="mb-2 text-[11px] text-ink-muted">{label}</legend>
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {AVATAR_STYLE_COLORS.map(color=><button key={color} type="button" onClick={()=>onChange(color)} aria-label={`${label}: ${color}`} aria-pressed={value===color} className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 ${value===color?'border-violet-300 ring-2 ring-violet-300/25':'border-white/10'}`}><span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/20" style={{backgroundColor:color}}>{value===color?<Check size={14} className="text-white drop-shadow-md" strokeWidth={3}/>:null}</span></button>)}
    </div>
  </fieldset>;
}
export function AvatarStyleEditor({value,onChange}:{value:AvatarStyle;onChange:(next:AvatarStyle)=>void}) {
  const change=(key:Key,next:string)=>onChange(normalizeAvatarStyle({...value,[key]:next}));
  return <details className="group mt-3 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-400/[0.07] to-transparent p-3">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-1 text-left text-violet-200"><span className="rounded-xl bg-violet-400/15 p-2"><Shirt size={19}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Meu estilo</span><span className="mt-1 block truncate text-[11px] text-ink-muted">{avatarStyleLabel(value)} · Toque para personalizar</span></span><ChevronDown size={19} className="shrink-0 transition-transform group-open:rotate-180"/></summary>
    <p className="my-3 rounded-xl bg-surface-raised/50 p-3 text-[11px] leading-relaxed text-ink-muted">Personalize o visual do seu personagem. Acessórios são cosméticos, não aparelhos médicos. A escolha fica salva por pessoa neste dispositivo.</p>
    {sections.map(section=><div key={section.key} className="mb-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-primary">{section.key==='glasses'?<Glasses size={15}/>:section.key==='sneakers'?<Footprints size={15}/>:<Shirt size={15}/>} {section.title}</p>
      <div className="flex flex-wrap gap-2">
        {section.options.map(item=><button key={item.value} type="button" disabled={section.key==='hatBrand'&&value.hat==='none'} aria-pressed={value[section.key]===item.value} onClick={()=>change(section.key,item.value)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${value[section.key]===item.value?'border-violet-400/50 bg-violet-400/15 text-violet-200':'border-surface-border bg-surface-raised text-ink-muted'}`}>{item.label}</button>)}
      </div>
      {section.key==='hat'&&value.hat!=='none'?<ColorSelector label="Cor do boné" value={value.hatColor} onChange={color=>change('hatColor',color)}/>:null}
      {section.key==='glasses'&&value.glasses!=='none'?<ColorSelector label="Cor da armação" value={value.glassesColor} onChange={color=>change('glassesColor',color)}/>:null}
      {section.key==='sneakers'?<ColorSelector label="Cor do tênis" value={value.sneakersColor} onChange={color=>change('sneakersColor',color)}/>:null}
    </div>)}
    <button type="button" onClick={()=>onChange(DEFAULT_AVATAR_STYLE)} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-ink-muted"><RotateCcw size={14}/> Restaurar visual padrão</button>
  </details>;
}
