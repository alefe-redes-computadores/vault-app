// VAULT M148 P1 — miniatura ilustrativa compartilhada, sem mutações clínicas.
// Mantém a assinatura pública do ícone que já alimenta mapas, vínculos,
// doses, tratamentos, fornecimento, documentos e retiradas.
"use client";

import { useId } from "react";
import { normalizedPillV8 } from "@/lib/health-intelligence/visual-studio-v8";

interface MedicationFormatIconProps {
  formato?: string | null;
  cores?: string[] | null;
  size?: number;
  className?: string;
}

export function MedicationFormatIcon({
  formato,
  cores,
  size = 20,
  className,
}: MedicationFormatIconProps) {
  const raw = String(formato || "").trim().toLowerCase();
  const canonFormat = raw === "cápsula" ? "capsula" :
    raw === "gotas" ? "gota" :
    raw === "injeção" ? "injecao" :
    raw === "inteiro" ? "comprimido" : raw;
  const p = normalizedPillV8({ formato: canonFormat, cores: cores || undefined });
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const front = `vault-m148-front-${id}`;
  const side = `vault-m148-side-${id}`;
  const shine = `vault-m148-shine-${id}`;
  const shadow = `vault-m148-shadow-${id}`;
  const two = p.twoColors;
  const normalizedFormat = p.kind;
  const elongated = normalizedFormat === "capsula" || normalizedFormat === "oblongo" || normalizedFormat === "oblongo_sulcado";
  const scored = normalizedFormat === "partido" || normalizedFormat === "oblongo_sulcado";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={front} x1="10%" y1="3%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.58" />
          <stop offset="24%" stopColor={p.first} />
          <stop offset="70%" stopColor={p.first} />
          <stop offset="100%" stopColor="#0b1220" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={side} x1="5%" y1="0%" x2="95%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.40" />
          <stop offset="38%" stopColor={p.second} />
          <stop offset="85%" stopColor={p.second} />
          <stop offset="100%" stopColor="#0b1220" stopOpacity="0.33" />
        </linearGradient>
        <radialGradient id={shine} cx="36%" cy="18%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shadow}>
          <stop offset="0%" stopColor="#020617" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="52" cy="82" rx="34" ry="9" fill={`url(#${shadow})`} />
      {elongated && (
        <g transform="rotate(-24 50 49)">
          <rect x="9" y="30" width="82" height="39" rx="19.5" fill={`url(#${front})`} stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.4" />
          {two && <path d="M50 30H71.5a19.5 19.5 0 0 1 0 39H50Z" fill={`url(#${side})`} />}
          {p.kind === "capsula" && <path d="M50 30V69" stroke="#0f172a" strokeWidth="2.5" strokeOpacity="0.55" />}
          {scored && <path d="M50 35V64" stroke="#0f172a" strokeOpacity="0.6" strokeWidth="3.5" strokeLinecap="round" />}
          <path d="M25 37C37 33 44 34 49 35" fill="none" stroke="#ffffff" strokeOpacity="0.48" strokeWidth="4" strokeLinecap="round" />
          <rect x="9" y="30" width="82" height="39" rx="19.5" fill={`url(#${shine})`} opacity="0.45" />
        </g>
      )}
      {(p.kind === "comprimido" || p.kind === "partido") && (
        <g transform="rotate(-19 50 48)">
          <ellipse cx="50" cy="48" rx="34" ry="31" fill={`url(#${front})`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
          {two && <path d="M50 17A34 31 0 0 1 50 79Z" fill={`url(#${side})`} />}
          <ellipse cx="43" cy="39" rx="26" ry="23" fill={`url(#${shine})`} opacity="0.6" />
          {scored && <><path d="M50 24V72" stroke="#0f172a" strokeOpacity="0.58" strokeWidth="4" strokeLinecap="round"/><path d="M52 25V71" stroke="#ffffff" strokeOpacity="0.33" strokeWidth="1" /></>}
        </g>
      )}
      {p.kind === "gota" && (
        <g>
          <path d="M50 10C39 27 22 49 22 62a28 28 0 0 0 56 0C78 49 61 27 50 10Z" fill={`url(#${front})`} stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M36 51C32 60 32 65 36 70" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {p.kind === "adesivo" && (
        <g transform="rotate(-14 50 50)">
          <rect x="20" y="19" width="60" height="60" rx="10" fill={`url(#${front})`} stroke="#ffffff" strokeOpacity="0.42" strokeWidth="1.5" />
          <rect x="28" y="27" width="44" height="44" rx="7" fill={`url(#${side})`} stroke="#ffffff" strokeOpacity="0.45" strokeDasharray="4 4" />
        </g>
      )}
      {p.kind === "injecao" && (
        <g transform="rotate(-35 50 50)">
          <rect x="38" y="23" width="24" height="51" rx="5" fill={`url(#${front})`} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.5" />
          <path d="M45 23V12M55 23V12M42 12H58M50 74V92" fill="none" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44 39H56M44 48H56M44 57H56" stroke="#ffffff" strokeOpacity="0.56" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
