/** M102 P2 — detalhes ilustrativos, NÃO estimativa de emoção ou dado fisiológico.
 * As três opções são escolhidas EXCLUSIVAMENTE pelo contexto de humor já declarado.
 * Não usa wearables, medicamentos, diagnósticos, sensores nem tempo de tela.
 */
export type AvatarFaceExpressionM102P2 = 'neutral' | 'happy' | 'reflective';
export type AvatarFaceIllustrationM102P2 = {
  eyebrows: string;
  mouth: string;
  upperLids: string;
  eyeHeight: number;
  highlightOpacity: number;
};

const PROFILES: Record<AvatarFaceExpressionM102P2, Readonly<AvatarFaceIllustrationM102P2>> = {
  neutral: {
    eyebrows: 'M79 33 Q82 31 85 33 M96 33 Q99 31 102 33',
    mouth: 'M84 49 L97 49',
    upperLids: 'M78.5 36 Q81.5 34.7 84.5 36 M95.5 36 Q98.5 34.7 101.5 36',
    eyeHeight: 1.75, highlightOpacity: 0.54,
  },
  happy: {
    eyebrows: 'M79 32.5 Q82 30.5 85 32.7 M96 32.7 Q99 30.5 102 32.5',
    mouth: 'M84 49 Q90 53 97 49',
    upperLids: 'M78.5 36 Q81.5 35.2 84.5 36 M95.5 36 Q98.5 35.2 101.5 36',
    eyeHeight: 1.45, highlightOpacity: 0.58,
  },
  reflective: {
    eyebrows: 'M79 32.7 Q82 31.7 85 33.4 M96 33.4 Q99 31.7 102 32.7',
    mouth: 'M84 49 Q90 45 97 49',
    upperLids: 'M78.5 36 Q81.5 35.6 84.5 36 M95.5 36 Q98.5 35.6 101.5 36',
    eyeHeight: 1.3, highlightOpacity: 0.4,
  },
};
/** Total function: unknown/invalid input is NOT interpreted as reported mood. */
export function avatarFaceIllustrationM102P2(expression: unknown): Readonly<AvatarFaceIllustrationM102P2> {
  return expression === 'happy' || expression === 'reflective' ? PROFILES[expression] : PROFILES.neutral;
}
/** 3D: existing iris mesh only. Dimensions smaller than the sclera and above the pupil.
 * Never scale expression eyes or move the pupil; V234 baseline is inviolable.
 */
export const AVATAR_IRIS_3D_M102P2: [number, number, number] = [0.0115, 0.0105, 0.004];
