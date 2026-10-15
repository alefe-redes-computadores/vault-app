export const SURGERY_REGIONS = {
  cabeca: 'Cabeça', pescoco: 'Pescoço', olho: 'Olho', ouvido: 'Ouvido',
  ombro: 'Ombro', braco: 'Braço', cotovelo: 'Cotovelo', antebraco: 'Antebraço',
  punho: 'Punho', mao: 'Mão', torax: 'Tórax', abdome: 'Abdome',
  pelve: 'Pelve', coluna: 'Coluna', quadril: 'Quadril', coxa: 'Coxa',
  joelho: 'Joelho', perna: 'Perna', tornozelo: 'Tornozelo', pe: 'Pé', outro: 'Outra região',
} as const;
export const SURGERY_SIDES = {
  direita: 'Lado direito', esquerda: 'Lado esquerdo', bilateral: 'Ambos os lados', nao_aplicavel: 'Não se aplica',
} as const;
export type SurgeryRegion = keyof typeof SURGERY_REGIONS;
export type SurgerySide = keyof typeof SURGERY_SIDES;
export interface SurgeryBody {
  regiao_corporal?: SurgeryRegion | null;
  lateralidade?: SurgerySide | null;
}
export function readSurgeryRegion(value: unknown): SurgeryRegion | null {
  return typeof value === 'string' && Object.hasOwn(SURGERY_REGIONS, value) ? value as SurgeryRegion : null;
}
export function readSurgerySide(value: unknown): SurgerySide | null {
  return typeof value === 'string' && Object.hasOwn(SURGERY_SIDES, value) ? value as SurgerySide : null;
}
/** undefined preserves the previous value; null explicitly clears it in the queue and remote row. */
export function normalizeSurgeryBody(input: SurgeryBody, current: SurgeryBody = {}) {
  const region = input.regiao_corporal === undefined ? current.regiao_corporal ?? null : input.regiao_corporal;
  let side = input.lateralidade === undefined ? current.lateralidade ?? null : input.lateralidade;
  if (region !== null && !readSurgeryRegion(region)) throw new Error('Confira a região do corpo.');
  if (side !== null && !readSurgerySide(side)) throw new Error('Confira o lado da cirurgia.');
  if (input.regiao_corporal !== undefined && input.regiao_corporal !== current.regiao_corporal && input.lateralidade === undefined) side = null;
  if (side !== null && region === null) throw new Error('Selecione a região do corpo antes do lado.');
  return { regiao_corporal: region, lateralidade: side };
}
export function surgeryBodyLabel(input: SurgeryBody): string | null {
  const region = readSurgeryRegion(input.regiao_corporal), side = readSurgerySide(input.lateralidade);
  return region ? SURGERY_REGIONS[region] + (side ? ` · ${SURGERY_SIDES[side].toLocaleLowerCase('pt-BR')}` : ' · lado não informado') : null;
}
