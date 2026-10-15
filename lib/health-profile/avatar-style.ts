/** VAULT V155 — Personal style is cosmetic, never clinical evidence. */
export type AvatarHat = 'none' | 'baseball' | 'flat';
export type AvatarHatBrand = 'none' | 'nike' | 'new-era' | 'generic';
export type AvatarGlasses = 'none' | 'rectangular' | 'round';
export type AvatarSneakers = 'classic' | 'runner' | 'high-top';
export type AvatarStyle = {
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
  hat: 'none', hatBrand: 'none', hatColor: '#111827',
  glasses: 'none', glassesColor: '#111827',
  sneakers: 'classic', sneakersColor: '#111827',
};
const hatValues = ['none', 'baseball', 'flat'] as const;
const brandValues = ['none', 'nike', 'new-era', 'generic'] as const;
const glassesValues = ['none', 'rectangular', 'round'] as const;
const sneakerValues = ['classic', 'runner', 'high-top'] as const;
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
  return `${hat}, ${glasses}, tênis ${style.sneakers === 'classic' ? 'clássico' : style.sneakers === 'runner' ? 'esportivo' : 'cano alto'}`;
}
