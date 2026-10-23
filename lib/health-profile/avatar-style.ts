/** VAULT V155 — Personal style is cosmetic, never clinical evidence. */
export type AvatarHat = 'none' | 'baseball' | 'flat';
export type AvatarHatBrand = 'none' | 'nike' | 'new-era' | 'generic';
export type AvatarGlasses = 'none' | 'rectangular' | 'round';
export type AvatarSneakers = 'classic' | 'runner' | 'high-top';
export type AvatarHair = 'short' | 'fade' | 'curly' | 'coily' | 'wavy' | 'long' | 'bob' | 'bun' | 'ponytail' | 'braids' | 'bald';
export type AvatarFacialHair = 'none' | 'stubble' | 'goatee' | 'beard';
export type AvatarEarrings = 'none' | 'stud' | 'hoop';
export type AvatarBrows = 'soft' | 'defined' | 'full';
export type AvatarLips = 'natural' | 'rose' | 'berry';
export type AvatarStyle = {
  topColor: string;
  bottomColor: string;
  hair: AvatarHair;
  hairColor: string;
  facialHair: AvatarFacialHair;
  earrings: AvatarEarrings;
  brows: AvatarBrows;
  lips: AvatarLips;
  hat: AvatarHat;
  hatBrand: AvatarHatBrand;
  hatColor: string;
  glasses: AvatarGlasses;
  glassesColor: string;
  sneakers: AvatarSneakers;
  sneakersColor: string;
};
export const AVATAR_STYLE_COLORS = [
  '#111827', '#e2e8f0', '#64748b', '#2563eb', '#0f766e', '#dc2626', '#9333ea', '#f59e0b',
] as const;
export const DEFAULT_AVATAR_STYLE: AvatarStyle = {
  topColor: '#31465b', bottomColor: '#243447',
  hair: 'short', hairColor: '#17212b', facialHair: 'none', earrings: 'none', brows: 'soft', lips: 'natural',
  hat: 'none', hatBrand: 'none', hatColor: '#111827',
  glasses: 'none', glassesColor: '#111827',
  sneakers: 'classic', sneakersColor: '#111827',
};
const hatValues = ['none', 'baseball', 'flat'] as const;
const brandValues = ['none', 'nike', 'new-era', 'generic'] as const;
const glassesValues = ['none', 'rectangular', 'round'] as const;
const sneakerValues = ['classic', 'runner', 'high-top'] as const;
const hairValues = ['short', 'fade', 'curly', 'coily', 'wavy', 'long', 'bob', 'bun', 'ponytail', 'braids', 'bald'] as const;
const facialHairValues = ['none', 'stubble', 'goatee', 'beard'] as const;
const earringValues = ['none', 'stud', 'hoop'] as const;
const browValues = ['soft', 'defined', 'full'] as const;
const lipValues = ['natural', 'rose', 'berry'] as const;
function oneOf<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && (choices as readonly string[]).includes(value) ? value as T : fallback;
}
function color(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}
/** Unknown/corrupt persisted input is sanitized and cannot inject CSS. */
export function normalizeAvatarStyle(value: unknown): AvatarStyle {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<AvatarStyle> : {};
  return {
    topColor: color(data.topColor, DEFAULT_AVATAR_STYLE.topColor),
    bottomColor: color(data.bottomColor, DEFAULT_AVATAR_STYLE.bottomColor),
    hair: oneOf(data.hair, hairValues, DEFAULT_AVATAR_STYLE.hair),
    hairColor: color(data.hairColor, DEFAULT_AVATAR_STYLE.hairColor),
    facialHair: oneOf(data.facialHair, facialHairValues, DEFAULT_AVATAR_STYLE.facialHair),
    earrings: oneOf(data.earrings, earringValues, DEFAULT_AVATAR_STYLE.earrings),
    brows: oneOf(data.brows, browValues, DEFAULT_AVATAR_STYLE.brows),
    lips: oneOf(data.lips, lipValues, DEFAULT_AVATAR_STYLE.lips),
    hat: oneOf(data.hat, hatValues, DEFAULT_AVATAR_STYLE.hat),
    hatBrand: oneOf(data.hatBrand, brandValues, DEFAULT_AVATAR_STYLE.hatBrand),
    hatColor: color(data.hatColor, DEFAULT_AVATAR_STYLE.hatColor),
    glasses: oneOf(data.glasses, glassesValues, DEFAULT_AVATAR_STYLE.glasses),
    glassesColor: color(data.glassesColor, DEFAULT_AVATAR_STYLE.glassesColor),
    sneakers: oneOf(data.sneakers, sneakerValues, DEFAULT_AVATAR_STYLE.sneakers),
    sneakersColor: color(data.sneakersColor, DEFAULT_AVATAR_STYLE.sneakersColor),
  };
}
export function avatarStyleLabel(style: AvatarStyle): string {
  const hat = style.hat === 'none' ? 'Sem boné' : style.hatBrand === 'nike' ? 'Boné Nike' : style.hatBrand === 'new-era' ? 'Boné New Era' : 'Boné';
  const glasses = style.glasses === 'none' ? 'sem óculos' : style.glasses === 'round' ? 'óculos redondos' : 'óculos retangulares';
  const hair: Record<AvatarHair,string> = {short:'curto',fade:'degradê',curly:'cacheado',coily:'crespo',wavy:'ondulado',long:'longo',bob:'bob',bun:'coque',ponytail:'rabo de cavalo',braids:'tranças',bald:'raspado'};
  return `Cabelo ${hair[style.hair]}, ${hat}, ${glasses}, tênis ${style.sneakers === 'classic' ? 'clássico' : style.sneakers === 'runner' ? 'esportivo' : 'cano alto'}`;
}
