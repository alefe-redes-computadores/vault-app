import type {AvatarStyle} from './avatar-style';
export type AvatarFraming='body'|'face'|'shoes';
/** Fixed visual cameras, independent of weight, mood or clinical records. */
export function avatarCameraFrame(frame:AvatarFraming){
  if(frame==='face')return {height:2.86,distance:1.85};
  if(frame==='shoes')return {height:.27,distance:1.65};
  return {height:1.55,distance:6};
}
/** Material colors update in place. Only structural accessory choices rebuild geometry. */
export function avatarStyleGeometryKey(style:AvatarStyle){return JSON.stringify([style.hair,style.facialHair,style.hat,style.hatBrand,style.glasses,style.sneakers]);}
