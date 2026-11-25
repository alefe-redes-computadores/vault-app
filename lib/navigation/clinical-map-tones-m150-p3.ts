/** M150 P3: pure UI colors, never reclassifies medicine/prescriptions. */
const BLUE = 'border-sky-400/20 bg-sky-400/[.075] text-sky-300';
const EMERALD = 'border-emerald-400/20 bg-emerald-400/[.075] text-emerald-300';
const CYAN = 'border-cyan-400/20 bg-cyan-400/[.075] text-cyan-300';
const CORAL = 'border-rose-400/20 bg-rose-400/[.075] text-rose-300';
const TEAL = 'border-teal-400/20 bg-teal-400/[.075] text-teal-300';
const AMBER = 'border-amber-400/20 bg-amber-400/[.075] text-amber-300';
const VIOLET = 'border-violet-400/20 bg-violet-400/[.075] text-violet-300';
const ORANGE = 'border-orange-400/20 bg-orange-400/[.075] text-orange-300';
export type ClinicalMapToneM150P3 = typeof BLUE;
const TONES: Record<string,string> = {
  hoje: AMBER, medicamentos: EMERALD, tratamentos: VIOLET, retiradas: EMERALD,
  renovacao: VIOLET, fornecimento: EMERALD,
  'minha-saude': CORAL, registros: CORAL, consultas: BLUE,
  exames: CYAN, cirurgias: VIOLET, hidratacao: CYAN,
  internacoes: BLUE, reabilitacao: TEAL,
  lembretes: AMBER, rede: BLUE,
  brain: VIOLET, studio: VIOLET, pharmalens: VIOLET,
  ocorrencias: VIOLET, escudo: BLUE, resumo: VIOLET,
  documentos: VIOLET, plano: ORANGE,
};
export function clinicalMapToneM150P3(id: string): string { return TONES[id] ?? BLUE; }
/** P5 P3: grupos expressam domínios, não gravidade clínica. */
export function clinicalMapSectionToneM150P5P3(id: string): string {
  return ({rotina:'text-sky-300',saude:'text-rose-300',evidencias:'text-violet-300',documentos:'text-amber-300'} as Record<string,string>)[id] || 'text-ink-primary';
}
