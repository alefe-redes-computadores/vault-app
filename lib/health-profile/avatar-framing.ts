import type {AvatarStyle} from './avatar-style';
export type AvatarFraming='body'|'face'|'shoes';
/** Fixed visual cameras, independent of weight, mood or clinical records. */
export function avatarCameraFrame(frame:AvatarFraming){
  if(frame==='face')return {height:2.86,distance:1.85};
  if(frame==='shoes')return {height:.27,distance:1.65};
  return {height:1.55,distance:6};
}
/**
 * P5 P3 — margem de enquadramento para telas Android estreitas. A câmera
 * canônica original permanece imutável (V162) e nenhuma geometria é refeita.
 * Não supõe medidas corporais do usuário; só recebe tamanho do canvas.
 */
export function avatarCameraFrameForViewport(frame: AvatarFraming, width: number, height: number, compact: boolean) {
  const base=avatarCameraFrame(frame);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0) return base;
  if(frame==='shoes' && width<420) return {...base,distance:Math.max(base.distance,2.05)};
  if(frame==='face' && width<360) return {...base,distance:Math.max(base.distance,2.1)};
  const verticalRatio=width/height;
  if(frame==='body' && (compact || width<360 || verticalRatio<0.72)) return {...base,distance:Math.max(base.distance,verticalRatio<0.58?7.0:6.4)};
  return base;
}
/** Material colors update in place. Only structural accessory choices rebuild geometry. */
export function avatarStyleGeometryKey(style:AvatarStyle){return JSON.stringify([style.hair,style.facialHair,style.earrings,style.brows,style.lips,style.topStyle,style.hat,style.hatBrand,style.glasses,style.sneakers]);}
