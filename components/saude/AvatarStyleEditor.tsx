"use client";
import { useState } from "react";
import { Glasses, Footprints, Shirt, RotateCcw, ChevronDown, Check, Palette, UserRound, BadgeCheck } from "lucide-react";
import { AVATAR_STYLE_COLORS, DEFAULT_AVATAR_STYLE, avatarStyleLabel, normalizeAvatarStyle, type AvatarStyle } from "@/lib/health-profile/avatar-style";

type Key = keyof AvatarStyle;
type Option = { value: string; label: string };
const sections: { key: Key; title: string; options: Option[] }[] = [
  { key: 'hair', title: 'Cabelo', options: [{value:'short',label:'Curto'},{value:'fade',label:'Degradê'},{value:'curly',label:'Cacheado'},{value:'coily',label:'Crespo'},{value:'wavy',label:'Ondulado'},{value:'long',label:'Longo'},{value:'bob',label:'Bob'},{value:'bun',label:'Coque'},{value:'ponytail',label:'Rabo de cavalo'},{value:'braids',label:'Tranças'},{value:'bald',label:'Raspado'}] },
  { key: 'facialHair', title: 'Barba', options: [{value:'none',label:'Sem barba'},{value:'stubble',label:'Rala'},{value:'goatee',label:'Cavanhaque'},{value:'beard',label:'Cheia'}] },
  { key: 'earrings', title: 'Brincos', options: [{value:'none',label:'Sem brincos'},{value:'stud',label:'Ponto de luz'},{value:'hoop',label:'Argola'}] },
  { key: 'hat', title: 'Modelo do boné', options: [{value:'none',label:'Sem boné'},{value:'baseball',label:'Curvo'},{value:'flat',label:'Aba reta'}] },
  { key: 'hatBrand', title: 'Estilo da marca', options: [{value:'none',label:'Sem marca'},{value:'nike',label:'Nike'},{value:'new-era',label:'New Era'},{value:'generic',label:'Genérico'}] },
  { key: 'glasses', title: 'Óculos de grau', options: [{value:'none',label:'Sem óculos'},{value:'rectangular',label:'Retangular'},{value:'round',label:'Redondo'}] },
  { key: 'sneakers', title: 'Tênis', options: [{value:'classic',label:'Clássico'},{value:'runner',label:'Esportivo'},{value:'high-top',label:'Cano alto'}] },
];
function ColorSelector({value, onChange, label}:{value:string;onChange:(color:string)=>void;label:string}) {
  return <fieldset className="mt-2"><legend className="mb-2 text-[11px] text-ink-muted">{label}</legend>
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {AVATAR_STYLE_COLORS.map(color=><button key={color} type="button" onClick={()=>onChange(color)} aria-label={`${label}: ${color}`} aria-pressed={value===color} className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 ${value===color?'border-emerald-300 ring-2 ring-emerald-300/20':'border-white/10'}`}><span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/20" style={{backgroundColor:color}}>{value===color?<Check size={14} className="text-white drop-shadow-md" strokeWidth={3}/>:null}</span></button>)}
    </div>
  </fieldset>;
}
export function AvatarStyleEditor({value,onChange,onPreview,name,onNameChange}:{value:AvatarStyle;onChange:(next:AvatarStyle)=>void;onPreview?:(frame:"face"|"shoes")=>void;name:string;onNameChange:(name:string)=>void}) {
  const [category,setCategory]=useState<'outfit'|'face'|'hat'|'glasses'|'sneakers'>('outfit');
  const change=(key:Key,next:string)=>onChange(normalizeAvatarStyle({...value,[key]:next}));
  return <details onToggle={event=>{if(event.currentTarget.open)onPreview?.(category==='sneakers'?'shoes':'face');}} className="group mt-3 rounded-2xl border border-surface-border bg-gradient-to-br from-emerald-400/[0.035] to-transparent p-3">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-1 text-left text-emerald-200"><span className="rounded-xl bg-emerald-400/10 p-2"><Shirt size={19}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Meu estilo</span><span className="mt-1 block truncate text-[11px] text-ink-muted">{avatarStyleLabel(value)} · Toque para personalizar</span></span><ChevronDown size={19} className="shrink-0 transition-transform group-open:rotate-180"/></summary>
    <p className="my-3 rounded-xl bg-surface-raised/50 p-3 text-[11px] leading-relaxed text-ink-muted">Escolha livremente o visual que representa você. Não há modelo masculino ou feminino: cabelo, barba e acessórios são independentes. São escolhas cosméticas, nunca dados de saúde, e ficam salvas por pessoa neste dispositivo.</p>
    <label className="mb-4 block rounded-xl border border-surface-border/70 bg-surface-raised/30 p-3">
      <span className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><BadgeCheck size={15}/> Como chamar seu Avatar</span>
      <span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">É apenas um apelido visual. Não altera o nome da pessoa nem qualquer registro de saúde.</span>
      <input value={name} maxLength={32} onChange={event=>onNameChange(event.target.value)} placeholder="Meu Avatar" aria-label="Nome do Avatar" className="mt-3 min-h-11 w-full rounded-xl border border-surface-border bg-void px-3 text-sm text-ink-primary outline-none focus:border-emerald-300/50"/>
    </label>
    <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Parte do visual para personalizar">
      {([['outfit','Roupa',Palette],['face','Rosto',UserRound],['hat','Boné',Shirt],['glasses','Óculos',Glasses],['sneakers','Tênis',Footprints]] as const).map(([key,label,Icon])=><button key={key} type="button" aria-pressed={category===key} onClick={()=>{setCategory(key);if(key!=='outfit')onPreview?.(key==='sneakers'?'shoes':'face');}} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[11px] ${category===key?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}><Icon size={19}/>{label}</button>)}
    </div>
    {category==='outfit'?<div className="mb-4 rounded-xl border border-surface-border/70 bg-surface-raised/30 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><Palette size={15}/> Cores da roupa</p>
      <ColorSelector label="Camiseta" value={value.topColor} onChange={color=>change('topColor',color)}/>
      <ColorSelector label="Parte de baixo" value={value.bottomColor} onChange={color=>change('bottomColor',color)}/>
    </div>:null}
    {category==='face'?<div className="mb-4 rounded-xl border border-surface-border/70 bg-surface-raised/30 p-3">
      {sections.filter(section=>section.key==='hair'||section.key==='facialHair'||section.key==='earrings').map(section=><div key={section.key} className="mb-4 last:mb-0">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-primary"><UserRound size={15}/> {section.title}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{section.options.map(item=><button key={item.value} type="button" aria-pressed={value[section.key]===item.value} onClick={()=>change(section.key,item.value)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold ${value[section.key]===item.value?'border-emerald-300/40 bg-emerald-400/10 text-emerald-200':'border-surface-border bg-surface-raised text-ink-muted'}`}>{item.label}</button>)}</div>
        {section.key==='hair'&&value.hair!=='bald'?<ColorSelector label="Cor do cabelo e barba" value={value.hairColor} onChange={color=>change('hairColor',color)}/>:null}
      </div>)}
    </div>:null}
    {sections.filter(section=>section.key===category||(category==='hat'&&section.key==='hatBrand'&&value.hat!=='none')).map(section=><div key={section.key} className="mb-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-primary">{section.key==='glasses'?<Glasses size={15}/>:section.key==='sneakers'?<Footprints size={15}/>:<Shirt size={15}/>} {section.title}</p>
      <div className="flex flex-wrap gap-2">
        {section.options.map(item=><button key={item.value} type="button" disabled={section.key==='hatBrand'&&value.hat==='none'} aria-pressed={value[section.key]===item.value} onClick={()=>change(section.key,item.value)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${value[section.key]===item.value?'border-emerald-300/40 bg-emerald-400/10 text-emerald-200':'border-surface-border bg-surface-raised text-ink-muted'}`}>{item.label}</button>)}
      </div>
      {section.key==='hat'&&value.hat!=='none'?<ColorSelector label="Cor do boné" value={value.hatColor} onChange={color=>change('hatColor',color)}/>:null}
      {section.key==='glasses'&&value.glasses!=='none'?<ColorSelector label="Cor da armação" value={value.glassesColor} onChange={color=>change('glassesColor',color)}/>:null}
      {section.key==='sneakers'?<ColorSelector label="Cor do tênis" value={value.sneakersColor} onChange={color=>change('sneakersColor',color)}/>:null}
    </div>)}
    <button type="button" onClick={()=>onChange(DEFAULT_AVATAR_STYLE)} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs text-ink-muted"><RotateCcw size={14}/> Restaurar visual padrão</button>
  </details>;
}
