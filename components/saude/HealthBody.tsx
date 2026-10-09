import { useId } from "react";
import { Brain, Smartphone } from "lucide-react";
import type { HealthDevice } from "@/lib/health-profile/types";

/** Perfil ilustrado: acessórios canônicos, sem inferir forma corporal pelo IMC. */
export function HealthBody({ skin, devices }: { skin: string; devices: HealthDevice[] }) {
  const shade=(factor: number) => "#" + [1,3,5].map(i => Math.min(255,Math.round(parseInt(skin.slice(i,i+2),16)*factor)).toString(16).padStart(2,"0")).join("");
  const uid=useId().replace(/:/g, ""), skinId=`skin-${uid}`, shirtId=`shirt-${uid}`;
  const worn=devices.filter(d=>d.active && (d.kind==="watch" || d.kind==="ring") && d.side!=="none");
  const hasRightRing=worn.some(d=>d.kind==="ring" && d.side==="right");
  const phoneX=hasRightRing?141:25;
  return <svg viewBox="0 0 180 260" role="img" aria-label="Perfil ilustrado com acessórios cadastrados e celular com o Vault aberto" className="mx-auto h-60 w-full max-w-[180px]">
    <defs>
      <linearGradient id={skinId} x1="0" x2="1"><stop offset="0" stopColor={shade(.8)}/><stop offset=".35" stopColor={shade(1.12)}/><stop offset=".65" stopColor={skin}/><stop offset="1" stopColor={shade(.72)}/></linearGradient>
      <linearGradient id={shirtId} x1="0" x2="1"><stop stopColor="#111b25"/><stop offset=".45" stopColor="#35495c"/><stop offset="1" stopColor="#111b25"/></linearGradient>
    </defs>
    <ellipse cx="90" cy="250" rx="52" ry="7" fill="currentColor" opacity=".05" />
    <circle cx="90" cy="35" r="22" fill={`url(#${skinId})`} />
    <path d="M70 25 Q72 8 90 10 Q110 12 111 27 Q96 16 70 25" fill="#18212a"/>
    <path d="M80 35 h3 M98 35 h3" stroke="#30251f" strokeWidth="2" strokeLinecap="round"/>
    <path d="M86 46 Q91 49 96 46" fill="none" stroke="#30251f" strokeOpacity=".5" strokeLinecap="round"/>
    <path d="M74 61 Q90 69 106 61 L120 113 L117 157 L104 238 Q100 249 91 240 L90 168 L89 240 Q80 249 76 238 L63 157 L60 113Z" fill={`url(#${skinId})`}/>
    <path d="M67 69 Q53 69 47 95 L30 153 Q28 166 38 168 Q44 168 47 155 L67 102 M113 69 Q127 69 133 95 L150 153 Q152 166 142 168 Q136 168 133 155 L113 102" fill={`url(#${skinId})`}/>
    <path d="M66 79 Q90 89 114 79 L117 139 Q90 147 63 139Z" fill={`url(#${shirtId})`}/>
    <path d="M63 145 Q90 154 117 145 L108 185 L92 185 L90 168 L88 185 L72 185Z" fill={`url(#${shirtId})`}/>
    <Brain x="82" y="98" width="16" height="16" stroke="#a78bfa" strokeWidth="1.5" aria-hidden="true"/>
    <g transform={`translate(${phoneX},154) rotate(${phoneX<90?-12:12})`}>
      <title>Celular ilustrativo com Vault aberto</title>
      <rect x="-9" y="-11" width="18" height="30" rx="4" fill="#0b1015" stroke="#45505e"/>
      <Smartphone x="-7" y="-9" width="14" height="26" stroke="#6b7788" strokeWidth="1" aria-hidden="true"/>
      <Brain x="-5" y="-4" width="10" height="10" stroke="#a78bfa" strokeWidth="1.4" aria-hidden="true"/>
      <text x="0" y="10" textAnchor="middle" fontSize="3.7" letterSpacing=".4" fill="#e2e8f0">VAULT</text>
    </g>
    {worn.map(d=>{
      const x=d.side==="right"?38:142;
      return d.kind==="watch"?<g key={d.id} transform={`translate(${x},141)`}>
        <title>{`${d.name} · pulso ${d.side==="right"?"direito":"esquerdo"}`}</title>
        <rect x="-7" y="-11" width="14" height="22" rx="4" fill={d.color} stroke="#cbd5e1" strokeOpacity=".35" opacity=".95"/>
        <rect x="-9" y="-6" width="18" height="12" rx="4" fill={d.color} stroke="#94a3b8" strokeWidth=".8"/>
        <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#0b1015"/>
        <path d="M0 -2 V0 L3 1" fill="none" stroke={d.color} strokeWidth="1.3" strokeLinecap="round"/>
      </g>:<g key={d.id}>
        <title>{`${d.name} · mão ${d.side==="right"?"direita":"esquerda"}`}</title>
        <ellipse cx={d.side==="right"?40:140} cy="163" rx="4" ry="2.6" stroke="#94a3b8" strokeWidth="4" fill="none"/>
        <ellipse cx={d.side==="right"?40:140} cy="163" rx="4" ry="2.6" stroke={d.color} strokeWidth="2.5" fill="none"/>
      </g>;
    })}
  </svg>;
}
