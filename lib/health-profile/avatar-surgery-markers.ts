import type { Cirurgia } from '@/lib/types';
import { SURGERY_REGIONS, readSurgeryRegion, readSurgerySide, type SurgeryRegion } from '@/lib/surgery-body';
import type { avatarSurgeryAgenda } from './avatar-surgeries';

type Agenda = ReturnType<typeof avatarSurgeryAgenda>;
export type SurgeryMarkerTone = 'upcoming' | 'unconfirmed' | 'completed';
export const SURGERY_MARKER_COLORS: Record<SurgeryMarkerTone, string> = {
  upcoming: '#7dd3fc', unconfirmed: '#fbbf24', completed: '#c4b5fd',
};
export const SURGERY_MARKER_LABELS: Record<SurgeryMarkerTone, string> = {
  upcoming: 'Agendada', unconfirmed: 'Conferir status', completed: 'Realizada recente',
};
type Anchor = { x: number; y: number; z: number; svgX: number; svgY: number; paired?: boolean; back?: boolean };
/** Schematic coordinates in the existing models, never inferred from procedure names. */
const ANCHORS: Partial<Record<SurgeryRegion, Anchor>> = {
  cabeca: { x: .14, y: 3.08, z: .36, svgX: 15, svgY: 12 },
  pescoco: { x: .13, y: 2.49, z: .26, svgX: 10, svgY: 61 },
  olho: { x: .09, y: 2.83, z: .39, svgX: 9, svgY: 37, paired: true },
  ouvido: { x: .29, y: 2.78, z: .14, svgX: 24, svgY: 36, paired: true },
  ombro: { x: .46, y: 2.35, z: .16, svgX: 29, svgY: 76, paired: true },
  braco: { x: .57, y: 2.20, z: .14, svgX: 37, svgY: 95, paired: true },
  cotovelo: { x: .61, y: 1.96, z: .14, svgX: 45, svgY: 117, paired: true },
  antebraco: { x: .63, y: 1.82, z: .14, svgX: 55, svgY: 131, paired: true },
  punho: { x: .66, y: 1.65, z: .17, svgX: 70, svgY: 146, paired: true },
  mao: { x: .65, y: 1.47, z: .16, svgX: 60, svgY: 162, paired: true },
  torax: { x: .18, y: 2.31, z: .32, svgX: 15, svgY: 89 },
  abdome: { x: .16, y: 1.73, z: .32, svgX: 15, svgY: 139 },
  pelve: { x: .15, y: 1.46, z: .31, svgX: 13, svgY: 164 },
  coluna: { x: 0, y: 2.05, z: -.29, svgX: 0, svgY: 105, back: true },
  quadril: { x: .34, y: 1.39, z: .15, svgX: 28, svgY: 160, paired: true },
  coxa: { x: .31, y: 1.15, z: .15, svgX: 23, svgY: 182, paired: true },
  joelho: { x: .30, y: .87, z: .16, svgX: 19, svgY: 201, paired: true },
  perna: { x: .30, y: .58, z: .15, svgX: 18, svgY: 218, paired: true },
  tornozelo: { x: .30, y: .30, z: .16, svgX: 17, svgY: 231, paired: true },
  pe: { x: .29, y: .16, z: .30, svgX: 20, svgY: 245, paired: true },
};
export interface AvatarSurgeryMarker {
  key: string;
  region: SurgeryRegion;
  side: 'left' | 'right' | 'center';
  label: string;
  tone: SurgeryMarkerTone;
  surgeryIds: string[];
  position: [number, number, number];
  illustration: [number, number];
  back: boolean;
}

export function avatarSurgeryMarkers(agenda: Agenda): AvatarSurgeryMarker[] {
  const groups = new Map<string, AvatarSurgeryMarker>();
  // Administrative pending status wins the color only; every record remains accessible.
  for (const tone of ['unconfirmed', 'upcoming', 'completed'] as const) {
    for (const surgery of agenda[tone]) {
      const region = readSurgeryRegion(surgery.regiao_corporal), side = readSurgerySide(surgery.lateralidade);
      if (!region || !surgery.id) continue;
      const anchor = ANCHORS[region];
      if (!anchor) continue;
      const sides: AvatarSurgeryMarker['side'][] = anchor.x === 0 ? ['center'] : side === 'bilateral' ? ['right', 'left']
        : side === 'direita' ? ['right'] : side === 'esquerda' ? ['left'] : anchor.paired ? [] : ['center'];
      for (const location of sides) {
        const key = `${region}:${location}`;
        const group = groups.get(key);
        if (group) { if (!group.surgeryIds.includes(surgery.id)) group.surgeryIds.push(surgery.id); continue; }
        const sign = location === 'right' ? -1 : location === 'left' ? 1 : 0;
        groups.set(key, {
          key, region, side: location, tone, surgeryIds: [surgery.id],
          label: `${SURGERY_REGIONS[region]}${anchor.back ? ' · costas' : location === 'center' ? '' : location === 'right' ? ' · lado direito' : ' · lado esquerdo'}`,
          position: [sign * anchor.x, anchor.y, anchor.z],
          illustration: [90 + sign * anchor.svgX, anchor.svgY], back: !!anchor.back,
        });
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function surgeriesForMarker(agenda: Agenda, marker: AvatarSurgeryMarker | undefined): Agenda {
  const ids = new Set(marker?.surgeryIds || []);
  const select = (rows: Cirurgia[]) => rows.filter(row => !!row.id && ids.has(row.id));
  const upcoming = select(agenda.upcoming), unconfirmed = select(agenda.unconfirmed), completed = select(agenda.completed);
  return { upcoming, unconfirmed, completed, total: upcoming.length + unconfirmed.length + completed.length };
}
