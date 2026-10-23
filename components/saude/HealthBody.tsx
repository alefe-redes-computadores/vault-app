import { memo, useId, useState } from "react";
import { createPortal } from "react-dom";
import { SurgeryIllustrationMarkers } from "./SurgeryIllustrationMarkers";
import { Brain } from "lucide-react";
import { BRAIN_BRAND } from "@/lib/health-intelligence/version";
import type { HealthDevice } from "@/lib/health-profile/types";
import {avatarBraceSlots,type AvatarBodyContext,type AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { avatarColor, avatarLayout, avatarShade } from "@/lib/health-profile/avatar";
import { DEFAULT_AVATAR_STYLE, type AvatarStyle } from "@/lib/health-profile/avatar-style";

/** VAULT_AVATAR_V118: illustration and registered devices, independent of BMI. */
export const HealthBody = memo(function HealthBody({ skin, devices, appearance=DEFAULT_AVATAR_STYLE, expanded = false, showControls = true, controlsContainer, expression="neutral", surgeryMarkers=[], onBodySelect, onDeviceSelect }: { skin: string; devices: HealthDevice[]; appearance?:AvatarStyle; expanded?: boolean; showControls?: boolean; controlsContainer?:HTMLElement|null; surgeryMarkers?:AvatarBodyContext["surgeryMarkers"];expression?:AvatarBodyContext["expression"];onBodySelect?:(part:AvatarBodyPart,markerKey?:string)=>void;onDeviceSelect?:(id:string)=>void }) {
  const [view,setView]=useState<"front"|"left"|"right">("front");
  const angle=view==="front"?0:view==="left"?-18:18;
  const uid = useId().replace(/:/g, "");
  const ids = { skin: `skin-${uid}`, cloth: `cloth-${uid}`, halo: `halo-${uid}`, metal: `metal-${uid}`, glass: `glass-${uid}`, title: `title-${uid}`, description: `description-${uid}` };
  const color = avatarColor(skin);
  const faceDetail = [1, 3, 5].reduce((sum, offset) => sum + parseInt(color.slice(offset, offset + 2), 16), 0) / 3 < 70 ? "#b28e72" : "#30251f";
  const { slots, phoneSide, description } = avatarLayout(devices);
  const phoneX = phoneSide === "right" ? 24 : 156;

  const perspective=<>
      <div aria-label="Perspectiva da ilustração" className={expanded ? "mt-3 grid grid-cols-3 gap-1" : "hidden"}>
        {([["left","Girar à esquerda"],["front","Frente"],["right","Girar à direita"]] as const).map(([key,label])=><button type="button" key={key} aria-pressed={view===key} onClick={event=>{event.preventDefault();event.stopPropagation();setView(key);}} className={"min-h-11 rounded-xl border text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 "+(view===key?"border-violet-300/50 bg-violet-400/15 text-violet-200":"border-surface-border text-ink-secondary")}>{label}</button>)}
      </div>
      <p className={expanded ? "mt-2 text-center text-[10px] text-ink-muted" : "hidden"}>Perspectiva ilustrativa · acessórios cadastrados</p>
  </>;
  return (
    <div className={"mx-auto w-full " + (expanded ? "max-w-[320px]" : "max-w-[180px]")}>
      <svg viewBox="0 0 180 260" role={onBodySelect?"group":"img"} aria-labelledby={`${ids.title} ${ids.description}`} className={"w-full motion-safe:transition-transform motion-safe:duration-300 " + (expanded ? "h-auto" : "h-60")} style={{transform:`perspective(700px) rotateY(${angle}deg)`,transformOrigin:"50% 55%"}}>
        <title id={ids.title}>{`Avatar Vault com emblema ${BRAIN_BRAND}`}</title>
        <desc id={ids.description}>Ilustração de perfil. {description} Celular ilustrativo com Vault aberto. Acessórios cosméticos são independentes dos aparelhos cadastrados; o desenho não indica conexão nem estado de saúde.</desc>
        <defs>
          <linearGradient id={ids.skin} x1="0" x2="1">
            <stop offset="0" stopColor={avatarShade(color, .78)} />
            <stop offset=".35" stopColor={avatarShade(color, 1.12)} />
            <stop offset=".7" stopColor={color} />
            <stop offset="1" stopColor={avatarShade(color, .74)} />
          </linearGradient>
          <linearGradient id={ids.cloth} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#152330" /><stop offset=".45" stopColor="#3e5265" /><stop offset="1" stopColor="#14212e" />
          </linearGradient>
          <radialGradient id={ids.halo}>
            <stop stopColor="#a78bfa" stopOpacity=".14" /><stop offset=".65" stopColor="#22d3ee" stopOpacity=".055" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ids.metal} x1="0" x2="1">
            <stop stopColor="#475569" /><stop offset=".45" stopColor="#e2e8f0" /><stop offset="1" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id={ids.glass} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f8fafc" stopOpacity=".5" /><stop offset=".5" stopColor="#f8fafc" stopOpacity=".02" /><stop offset="1" stopColor="#38bdf8" stopOpacity=".1" />
          </linearGradient>
        </defs>
        <ellipse cx="90" cy="128" rx="77" ry="114" fill={`url(#${ids.halo})`} />
        <ellipse cx="90" cy="249" rx="49" ry="6" fill="#94a3b8" opacity=".11" />
        <ellipse cx="90" cy="248" rx="29" ry="3" fill="#020617" opacity=".35" />

        {/* Face, ears and subtle highlights. */}
        <ellipse cx="69" cy="36" rx="3.5" ry="6" fill={avatarShade(color, .86)} />
        <ellipse cx="111" cy="36" rx="3.5" ry="6" fill={avatarShade(color, .86)} />
        <path d="M77 48 L103 48 L102 62 L97 70 L90 74 L83 70 L78 62Z" fill={`url(#${ids.skin})`} />
        <path d="M81 52 Q90 62 99 52 L99 58 Q90 64 81 58Z" fill="#241b18" opacity=".16" />
        <path d="M68 30 Q68 10 90 11 Q112 12 112 32 L110 44 Q106 58 90 60 Q74 58 70 44Z" fill={`url(#${ids.skin})`} />
        {appearance.hair==='short'?<path d="M69 28 Q66 13 80 10 Q103 3 112 21 L112 30 Q103 21 94 21 Q82 24 69 28Z" fill={appearance.hairColor}/>:null}
        {appearance.hair==='fade'?<><path d="M70 27 Q72 12 90 10 Q108 11 111 27 Q100 20 90 21 Q80 20 70 27Z" fill={appearance.hairColor}/><path d="M69 24 L72 36 M111 24 L108 36" stroke={appearance.hairColor} strokeWidth="3"/></>:null}
        {appearance.hair==='curly'?<g fill={appearance.hairColor}>{[72,79,86,93,100,107].map((x,index)=><circle key={x} cx={x} cy={index%2?13:16} r="7"/>)}<circle cx="69" cy="23" r="6"/><circle cx="111" cy="23" r="6"/></g>:null}
        {appearance.hair==='coily'?<g fill={appearance.hairColor}>{[69,76,83,90,97,104,111].map((x,index)=><circle key={x} cx={x} cy={index%2?12:16} r="6.2"/>)}<circle cx="68" cy="24" r="5.5"/><circle cx="112" cy="24" r="5.5"/></g>:null}
        {(appearance.hair==='wavy'||appearance.hair==='long'||appearance.hair==='bob')?<g fill={appearance.hairColor}><path d="M68 29 Q66 7 90 6 Q114 7 112 30 Q105 20 90 20 Q75 20 68 29Z"/><path d={appearance.hair==='long'?"M68 24 Q62 48 68 79 L78 74 L75 31Z M112 24 Q118 48 112 79 L102 74 L105 31Z":appearance.hair==='bob'?"M68 24 Q64 42 69 55 L78 52 L75 30Z M112 24 Q116 42 111 55 L102 52 L105 30Z":"M68 24 Q61 43 70 65 Q77 58 74 31Z M112 24 Q119 43 110 65 Q103 58 106 31Z"}/></g>:null}
        {appearance.hair==='bun'?<g fill={appearance.hairColor}><ellipse cx="90" cy="18" rx="22" ry="14"/><circle cx="90" cy="3" r="10"/></g>:null}
        {appearance.hair==='ponytail'?<g fill={appearance.hairColor}><ellipse cx="90" cy="18" rx="22" ry="14"/><path d="M108 17 Q127 22 119 59 Q111 48 111 28Z"/></g>:null}
        {appearance.hair==='braids'?<g fill={appearance.hairColor}><ellipse cx="90" cy="18" rx="22" ry="14"/><path d="M72 24 Q66 48 72 78 M77 25 Q71 49 77 79 M108 24 Q114 48 108 78 M103 25 Q109 49 103 79" fill="none" stroke={appearance.hairColor} strokeWidth="4.2" strokeLinecap="round"/></g>:null}
        {appearance.hat!=='none'&&<g aria-label="Boné decorativo">
          <path d="M65 28 Q65 1 90 3 Q115 1 115 28 L108 30 Q89 22 70 30Z" fill={appearance.hatColor} stroke="#f8fafc" strokeOpacity=".13" strokeWidth=".9"/>
          <path d={appearance.hat==='flat'?"M64 26 L117 26 L137 30 L137 35 Q96 37 63 31Z":"M65 27 Q99 21 121 28 Q135 30 122 35 Q96 39 63 31Z"} fill={appearance.hatColor} stroke="#e2e8f0" strokeOpacity=".3" strokeWidth=".9" />
          <path d="M66 31 Q99 38 132 33" fill="none" stroke="#07101a" strokeOpacity=".55" strokeWidth="1.2"/>
          <path d="M81 13 Q91 8 99 13" stroke="#fff" strokeOpacity=".22" strokeWidth="1.1" fill="none"/>
          {(appearance.hatBrand==='nike'||appearance.hatBrand==='new-era')&&<text x="90" y="19" textAnchor="middle" fontSize="6" fontWeight="800" fill="#f8fafc">{appearance.hatBrand==='nike'?'N':'NE'}</text>}
        </g>}
        {appearance.glasses!=='none'&&<g aria-label="Óculos decorativos" stroke={appearance.glassesColor} strokeWidth="2.2" fill="#a5f3fc" fillOpacity=".035">
          {appearance.glasses==='round'?<><ellipse cx="81" cy="37" rx="8.2" ry="7.2"/><ellipse cx="99" cy="37" rx="8.2" ry="7.2"/></>:<><rect x="73" y="32" width="16" height="10.5" rx="2.5"/><rect x="91" y="32" width="16" height="10.5" rx="2.5"/></>}
          <path d="M89 36 Q90 34 91 36 M73 34 L68 32 M107 34 L112 32" fill="none" />
        </g>}
        {appearance.earrings==='stud'?<g fill="#e2e8f0"><circle cx="68" cy="42" r="1.6"/><circle cx="112" cy="42" r="1.6"/></g>:appearance.earrings==='hoop'?<g fill="none" stroke="#e2e8f0" strokeWidth="1.3"><circle cx="67" cy="44" r="3.5"/><circle cx="113" cy="44" r="3.5"/></g>:null}
        <path d="M74 17 Q88 9 101 15" fill="none" stroke="#526273" strokeOpacity=".32" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M79 33 Q82 31 85 33 M96 33 Q99 31 102 33" fill="none" stroke={appearance.hairColor} strokeOpacity={appearance.brows==='soft'?.65:.9} strokeWidth={appearance.brows==='full'?2.4:appearance.brows==='defined'?1.8:1.3} strokeLinecap="round" />
        <path d="M80 37 h3 M97 37 h3" stroke="#231f1e" strokeWidth="2" strokeLinecap="round" />
        <circle cx="81" cy="36.7" r=".45" fill="#f1f5f9" fillOpacity=".6" />
        <circle cx="98" cy="36.7" r=".45" fill="#f1f5f9" fillOpacity=".6" />
        <path d="M90 38 L88 44 Q90 45 92 44" fill="none" stroke="#30251f" strokeOpacity=".3" strokeWidth="1" strokeLinecap="round" />
        <path d="M76 43 Q80 47 84 46 M104 43 Q100 47 96 46" fill="none" stroke={avatarShade(color, 1.18)} strokeOpacity=".24" strokeWidth="1.2" strokeLinecap="round" />
        {appearance.facialHair==='stubble'?<path d="M75 46 Q76 59 90 62 Q104 59 106 46 Q101 58 90 59 Q79 58 75 46Z" fill={appearance.hairColor} opacity=".32"/>:null}
        {appearance.facialHair==='goatee'?<><path d="M85 51 Q90 55 96 51 L95 61 Q90 65 85 61Z" fill={appearance.hairColor} opacity=".9"/><path d="M84 47 Q90 44 97 47" stroke={appearance.hairColor} strokeWidth="2"/></>:null}
        {appearance.facialHair==='beard'?<><path d="M73 43 Q74 60 90 66 Q106 60 108 43 Q103 56 90 61 Q77 56 73 43Z" fill={appearance.hairColor} opacity=".92"/><path d="M83 47 Q90 43 98 47" stroke={appearance.hairColor} strokeWidth="2.4"/></>:null}
        <path d={expression==='happy'?"M84 49 Q90 53 97 49":expression==='reflective'?"M84 49 Q90 45 97 49":"M84 49 L97 49"} fill="none" stroke={appearance.lips==='berry'?'#71324d':appearance.lips==='rose'?'#a85e6d':faceDetail} strokeOpacity={appearance.lips==='natural'?.72:.95} strokeWidth={appearance.lips==='natural'?1.2:1.7} strokeLinecap="round" />

        {/* V122: cheek light, hair texture and a more defined jaw. */}
        <path d="M73 32 Q70 44 78 50 M107 32 Q110 44 102 50" fill="none" stroke={avatarShade(color, 1.35)} strokeOpacity=".28" strokeWidth="2" strokeLinecap="round" />
        <path d="M78 54 Q90 62 103 53" fill="none" stroke={avatarShade(color, .65)} strokeOpacity=".3" strokeWidth="1" />
        <path d="M78 15 L83 13 M87 12 L93 12 M98 14 L103 17" stroke="#64748b" strokeOpacity=".35" strokeWidth="1" strokeLinecap="round" />
        {/* Same illustrative proportions, with layered clothing. */}
        <path d="M74 64 Q90 71 106 64 L120 113 L117 157 L104 237 Q100 247 92 239 L90 169 L88 239 Q80 247 76 237 L63 157 L60 113Z" fill={`url(#${ids.skin})`} />
        <path d="M67 70 Q53 69 47 95 L30 153 Q28 166 38 168 Q44 168 47 155 L67 102 M113 70 Q127 69 133 95 L150 153 Q152 166 142 168 Q136 168 133 155 L113 102" fill={`url(#${ids.skin})`} />
        <path d="M65 76 Q90 87 115 76 L117 140 Q90 147 63 140Z" fill={appearance.topColor} />
        <path d="M65 77 Q90 89 115 77" fill="none" stroke="#94a3b8" strokeOpacity=".38" strokeWidth="1.5" />
        <path d="M67 88 L66 132 M113 88 L114 132" stroke="#94a3b8" strokeOpacity=".15" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M63 146 Q90 155 117 146 L108 185 L94 185 L90 169 L86 185 L72 185Z" fill={appearance.bottomColor} />
        <path d="M66 149 Q90 158 114 149 M90 157 L90 169" fill="none" stroke="#94a3b8" strokeOpacity=".23" strokeWidth="1" />
        <path d="M76 230 L88 231 L88 242 Q80 250 71 246 L72 239Z M92 231 L104 230 L108 239 L109 246 Q100 250 92 242Z" fill="#182634" stroke="#607083" strokeOpacity=".35" strokeWidth=".8" />
        <path d="M73 245 Q80 248 88 242 M92 242 Q100 248 107 245" fill="none" stroke="#a8b5c4" strokeOpacity=".6" strokeWidth="1.4" />
        <g aria-label="Tênis decorativos">
          <path d="M76 231 L88 232 L90 241 Q81 248 69 245 L71 238 Q73 234 76 231Z M92 232 L103 230 Q108 233 111 239 L110 245 Q99 248 90 242Z" fill={appearance.sneakersColor} stroke="#cbd5e1" strokeOpacity=".42" strokeWidth=".7"/>
          <path d="M72 239 Q80 236 88 239 M92 239 Q100 236 108 239" fill="none" stroke="#0b1520" strokeOpacity=".55" strokeWidth="1.5"/>
          <path d="M70 242 Q80 246 90 241 M90 241 Q101 246 110 242" fill="none" stroke="#f8fafc" strokeOpacity=".32" strokeWidth="1"/>
          {appearance.sneakers==='runner'&&<path d="M76 236 L84 239 M97 239 L103 235" stroke="#f8fafc" strokeWidth="2.2"/>}
          {appearance.sneakers==='high-top'&&<path d="M75 230 L75 219 L88 219 L88 232 M92 232 L92 219 L104 219 L104 230" fill={appearance.sneakersColor} stroke="#cbd5e1" strokeOpacity=".4"/>}
          <path d="M72 245 Q79 249 88 244 M92 244 Q100 249 108 245" stroke="#f8fafc" strokeWidth="1.6" fill="none"/>
        </g>

        {/* V121: cloth folds, shoulder volume, shoe laces and fingers. */}
        <path d="M65 77 L69 88 L68 137 M115 77 L111 88 L112 137" fill="none" stroke="#dbeafe" strokeOpacity=".2" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M73 83 Q90 90 107 83 M69 136 Q90 142 111 136" fill="none" stroke="#020617" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
        <path d="M67 150 L76 178 M113 150 L104 178" fill="none" stroke="#dbeafe" strokeOpacity=".14" strokeWidth="1.1" />
        <path d="M78 236 L84 237 M77 239 L83 240 M96 237 L102 236 M97 240 L103 239" stroke="#cbd5e1" strokeOpacity=".6" strokeWidth=".9" strokeLinecap="round" />
        <path d="M34 158 L40 160 M33 161 L39 163 M140 160 L146 158 M141 163 L147 161" stroke={avatarShade(color, .62)} strokeOpacity=".5" strokeWidth=".8" strokeLinecap="round" />
        {/* Embroidered emblem, not an overlay across the body. */}
        <g aria-hidden="true">
          <rect x="69" y="91" width="42" height="42" rx="10" fill="#0b1520" fillOpacity=".75" stroke="#a78bfa" strokeOpacity=".4" strokeWidth=".7" />
          <path d="M78 93 H102" stroke="#c4b5fd" strokeOpacity=".3" strokeWidth=".7" />
          <Brain x="82" y="96" width="16" height="16" stroke="#c4b5fd" strokeWidth="1.4" />
          <text x="90" y="120" textAnchor="middle" fontSize="7.2" fontFamily="Arial, sans-serif" fontWeight="800" letterSpacing="1.15" fill="#f1f5f9">VAULT</text>
          <text x="90" y="127" textAnchor="middle" fontSize="4.4" fontFamily="Arial, sans-serif" fontWeight="600" letterSpacing=".8" fill="#c4b5fd">{BRAIN_BRAND}</text>
        </g>

        {/* Phone is lower than the wrist and on the less occupied side. */}
        <g transform={`translate(${phoneX},174) rotate(${phoneSide === "right" ? -10 : 10})`}>
          <title>Celular ilustrativo com o Vault aberto</title>
          <rect x="-8.5" y="-13" width="17" height="30" rx="4" fill="#0b1019" stroke={`url(#${ids.metal})`} strokeWidth="1.1" />
          <rect x="-6.5" y="-10.5" width="13" height="24" rx="2" fill="#172333" />
          <rect x="-2.5" y="-10" width="5" height="1.2" rx=".6" fill="#020617" />
          <Brain x="-5" y="-5" width="10" height="10" stroke="#c4b5fd" strokeWidth="1.3" aria-hidden="true" />
          <text x="0" y="9" textAnchor="middle" fontSize="3.7" fontFamily="Arial, sans-serif" letterSpacing=".4" fill="#e2e8f0">VAULT</text>
          <path d="M-6 -9 H5 L-6 6Z" fill={`url(#${ids.glass})`} opacity=".2" />
          <path d="M-4 12 H4" stroke="#64748b" strokeWidth=".7" strokeLinecap="round" />
        </g>

        <g aria-hidden="true" transform={`translate(${phoneX},174) rotate(${phoneSide === "right" ? -10 : 10})`}>
          <path d={phoneSide === "right" ? "M8 -8 Q15 -13 16 -16 Q19 -8 12 -4 L8 0Z" : "M-8 -8 Q-15 -13 -16 -16 Q-19 -8 -12 -4 L-8 0Z"} fill={`url(#${ids.skin})`} stroke={avatarShade(color, .7)} strokeWidth=".6" />
          {[ -7,-1,5,11 ].map(y=><path key={y} d={phoneSide === "right" ? `M7 ${y} Q13 ${y+1} 15 ${y+4}` : `M-7 ${y} Q-13 ${y+1} -15 ${y+4}`} fill="none" stroke={avatarShade(color,.72)} strokeWidth="2.2" strokeLinecap="round"/>)}
        </g>
        {slots.map(({ kind, side, device, count }) => {
          const supported=kind==="watch"&&avatarBraceSlots(devices).some(d=>d.side===side);
          const x = side === "right" ? (supported?45:38) : (supported?135:142),watchY=supported?126:141;
          const deviceColor = avatarColor(device.color, "#94a3b8");
          return (
            <g key={`${side}-${kind}`}>
              <title>{`${device.name} · ${side === "right" ? "lado direito" : "lado esquerdo"}${count > 1 ? ` · ${count} aparelhos cadastrados nesta posição; mostrando o atualizado mais recentemente` : ""}`}</title>
              {kind === "watch" ? (
                <g transform={`translate(${x},${watchY}) rotate(${side === "right" ? 17 : -17})`}>
                  <rect x="-5" y="-12" width="10" height="25" rx="3" fill={deviceColor} stroke="#94a3b8" strokeOpacity=".55" strokeWidth=".6" />
                  <path d="M-2 -10 H2 M-2 10 H2" stroke="#020617" strokeOpacity=".35" strokeWidth=".7" />
                  <rect x="-8" y="-7.5" width="16" height="16" rx="5" fill={deviceColor} stroke={`url(#${ids.metal})`} strokeWidth="1.1" />
                  <rect x="7.8" y="-2" width="1.8" height="4" rx=".7" fill="#a8b5c4" />
                  <path d="M-3 -9 H3 M-3 11 H3" stroke="#e2e8f0" strokeOpacity=".45" strokeWidth=".7" />
                  <path d="M-6 -5 Q-4 -7 -2 -7" fill="none" stroke="#f8fafc" strokeOpacity=".65" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="0" cy=".5" r="5.8" fill="#09121d" stroke="#cbd5e1" strokeOpacity=".25" strokeWidth=".6" />
                  <path d="M0 -3 V.5 L3 2" fill="none" stroke="#e2e8f0" strokeWidth="1.1" strokeLinecap="round" />
                  <path d="M0 -4.5 V-3.7 M4.5 .5 H3.7 M0 5.5 V4.7 M-4.5 .5 H-3.7" stroke="#cbd5e1" strokeOpacity=".55" strokeWidth=".6" strokeLinecap="round" />
                  <circle cx="0" cy=".5" r="5.6" fill={`url(#${ids.glass})`} opacity=".32" />
                  <circle cx="0" cy=".5" r="1" fill="#c4b5fd" />
                  <path d="M-3.5 4 Q0 6 3.5 4" fill="none" stroke={deviceColor} strokeWidth=".9" />
                </g>
              ) : (
                <g transform={`translate(${side === "right" ? 41 : 139},163) rotate(${side === "right" ? 12 : -12})`}>
                  <ellipse rx="4" ry="2.5" stroke={`url(#${ids.metal})`} strokeWidth="3.4" fill="none" />
                  <ellipse rx="4" ry="2.5" stroke={deviceColor} strokeWidth="1.8" fill="none" />
                  <path d="M-2.5 -2 Q0 -3 2 -2" fill="none" stroke="#f8fafc" strokeOpacity=".6" strokeWidth=".7" />
                </g>
              )}
              {count > 1 && (
                <g transform={`translate(${side === "right" ? x - 13 : x + 13},${kind === "watch" ? watchY-3 : 163})`}>
                  <rect x="-6" y="-4" width="12" height="8" rx="4" fill="#182332" stroke="#64748b" strokeWidth=".5" />
                  <text textAnchor="middle" y="1.7" fontSize="4.2" fontFamily="Arial, sans-serif" fill="#e2e8f0">+{count - 1}</text>
                </g>
              )}
            </g>
          );
        })}
        {onBodySelect?<g role="button" tabIndex={0} aria-label="Ver humor informado" onClick={()=>onBodySelect('mood')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onBodySelect('mood');}}}><rect x="65" y="6" width="50" height="56" fill="transparent" className="cursor-pointer"/></g>:null}
        {avatarBraceSlots(devices).map(d=>{const x=d.side==='right'?32:134;return <g key={d.id} role="button" tabIndex={0} aria-label={`Abrir equipamento ${d.name}`} onClick={()=>onDeviceSelect?.(d.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDeviceSelect?.(d.id);}}}><rect x={x} y="147" width="14" height="18" rx="4" fill={avatarColor(d.color,'#7dd3fc')}/><path d={`M${x} 151 h14 M${x} 160 h14`} stroke="#17212b" strokeWidth="2"/></g>;})}
        {onBodySelect?<SurgeryIllustrationMarkers markers={surgeryMarkers} onSelect={key=>onBodySelect("surgery",key)}/>:null}
      </svg>
      <p aria-hidden="true" className="-mt-1 text-center font-mono text-[9px] tracking-[.14em] text-violet-300/80">VAULT · {BRAIN_BRAND}</p>
      {controlsContainer===undefined?(showControls?perspective:null):controlsContainer?createPortal(perspective,controlsContainer):null}
      {slots.length>0 && <ul aria-label="Aparelhos representados no avatar" className={expanded && showControls ? "mt-3 space-y-2" : "hidden"}>
        {slots.map(({kind,side,device,count})=><li key={`${side}-${kind}`} className="rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-left text-xs text-ink-primary">
          <span className="font-semibold">{device.name}</span><span className="mt-1 block text-[10px] text-ink-muted">{kind==="watch"?"Relógio":"Anel"} · {side==="right"?"lado direito":"lado esquerdo"}{count>1?` · +${count-1} nesta posição`:""}</span>
        </li>)}
      </ul>}
    </div>
  );
});
