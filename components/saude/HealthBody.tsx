import { Brain, Smartphone } from "lucide-react";
import type { HealthDevice } from "@/lib/health-profile/types";

/** Perfil ilustrado: acessórios canônicos, sem inferir forma corporal pelo IMC. */
export function HealthBody({ skin, devices }: { skin: string; devices: HealthDevice[] }) {
  const worn=devices.filter(d=>d.active && (d.kind==="watch" || d.kind==="ring") && d.side!=="none");
  const hasRightRing=worn.some(d=>d.kind==="ring" && d.side==="right");
  const phoneX=hasRightRing?141:25;
  return <svg viewBox="0 0 180 260" role="img" aria-label="Perfil ilustrado com acessórios cadastrados e celular com o Vault aberto" className="mx-auto h-60 w-full max-w-[180px]">
    <ellipse cx="90" cy="250" rx="52" ry="7" fill="currentColor" opacity=".05" />
    <circle cx="90" cy="35" r="22" fill={skin} />
    <path d="M74 61 Q90 69 106 61 L120 113 L117 157 L104 238 Q100 249 91 240 L90 168 L89 240 Q80 249 76 238 L63 157 L60 113Z" fill={skin}/>
    <path d="M67 69 Q53 69 47 95 L30 153 Q28 166 38 168 Q44 168 47 155 L67 102 M113 69 Q127 69 133 95 L150 153 Q152 166 142 168 Q136 168 133 155 L113 102" fill={skin}/>
    <path d="M66 79 Q90 89 114 79 L117 139 Q90 147 63 139Z" fill="#1a2630"/>
    <path d="M63 145 Q90 154 117 145 L108 185 L92 185 L90 168 L88 185 L72 185Z" fill="#263441"/>
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
        <rect x="-7" y="-11" width="14" height="22" rx="4" fill={d.color} opacity=".75"/>
        <rect x="-9" y="-6" width="18" height="12" rx="4" fill={d.color}/>
        <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#0b1015"/>
        <path d="M0 -2 V0 L3 1" fill="none" stroke={d.color} strokeWidth="1.3" strokeLinecap="round"/>
      </g>:<g key={d.id}>
        <title>{`${d.name} · mão ${d.side==="right"?"direita":"esquerda"}`}</title>
        <ellipse cx={d.side==="right"?40:140} cy="163" rx="4" ry="2.6" stroke={d.color} strokeWidth="2.5" fill="none"/>
      </g>;
    })}
  </svg>;
}
