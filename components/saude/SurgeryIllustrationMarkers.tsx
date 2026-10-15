import { SURGERY_MARKER_COLORS, SURGERY_MARKER_LABELS, type AvatarSurgeryMarker } from '@/lib/health-profile/avatar-surgery-markers';

export function SurgeryIllustrationMarkers({ markers, onSelect }: {
  markers: AvatarSurgeryMarker[]; onSelect: (key: string) => void;
}) {
  return <>{markers.filter(marker => !marker.back).map(marker => {
    const [x, y] = marker.illustration, color = SURGERY_MARKER_COLORS[marker.tone];
    return <g key={marker.key} role="button" tabIndex={0} aria-label={`Abrir cirurgias: ${marker.label}`} className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300" onClick={() => onSelect(marker.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(marker.key); } }}>
      <title>{marker.label} · {SURGERY_MARKER_LABELS[marker.tone]} · {marker.surgeryIds.length} registro(s)</title>
      {x !== 90 ? <line x1={90 + (x - 90) * .74} y1={y} x2={x} y2={y} stroke={color} strokeOpacity=".55" strokeWidth=".8" pointerEvents="none" /> : null}
      <circle cx={x} cy={y} r="9" fill="transparent" />
      <circle cx={x} cy={y} r="5" fill="#0b1520" stroke={color} strokeWidth="1.5" />
      <circle cx={x} cy={y} r="1.8" fill={color} />
    </g>;
  })}</>;
}
