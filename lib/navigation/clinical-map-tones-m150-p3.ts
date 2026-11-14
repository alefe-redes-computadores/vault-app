/** M150 P3: pure UI colors, never reclassifies medicine/prescriptions. */
const BLUE = 'border-sky-400/20 bg-sky-400/[.075] text-sky-300';
const CORAL = 'border-rose-400/20 bg-rose-400/[.075] text-rose-300';
const TEAL = 'border-teal-400/20 bg-teal-400/[.075] text-teal-300';
const AMBER = 'border-amber-400/20 bg-amber-400/[.075] text-amber-300';
const VIOLET = 'border-violet-400/20 bg-violet-400/[.075] text-violet-300';
const ORANGE = 'border-orange-400/20 bg-orange-400/[.075] text-orange-300';
export type ClinicalMapToneM150P3 = typeof BLUE;
const TONES: Record<string,string> = {
  hoje: AMBER, medicamentos: BLUE, tratamentos: CORAL, retiradas: BLUE,
  renovacao: BLUE, fornecimento: BLUE,
  'minha-saude': CORAL, registros: VIOLET, consultas: TEAL,
  exames: TEAL, cirurgias: CORAL, hidratacao: TEAL,
  lembretes: AMBER, rede: CORAL,
  brain: VIOLET, studio: VIOLET, pharmalens: VIOLET,
  ocorrencias: VIOLET, escudo: BLUE, resumo: VIOLET,
  documentos: ORANGE, plano: ORANGE,
};
export function clinicalMapToneM150P3(id: string): string { return TONES[id] ?? BLUE; }
