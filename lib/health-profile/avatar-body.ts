import type {RegistroSaude,Cirurgia} from '@/lib/types';
import type {HealthDevice} from './types';
import {avatarVisualSignature,avatarColor} from "./avatar";
import {validDate} from './metrics';
import {avatarWeightContext} from './avatar-readings';
import {avatarSurgeryAgenda} from './avatar-surgeries';
export const MOOD_CHOICES={muito_bem:'Muito bem',bem:'Bem',neutro:'Neutro',triste:'Triste',muito_triste:'Muito triste'} as const;
export type MoodChoice=keyof typeof MOOD_CHOICES;
export type AvatarBodyPart='mood'|'weight'|'surgery'|'equipment';
export function moodContext(choice:MoodChoice){return `[humor:v1]${choice}`;}
export function readMoodContext(context?:string):MoodChoice|null {const value=typeof context==='string'&&context.startsWith('[humor:v1]')?context.slice(10):'';return Object.hasOwn(MOOD_CHOICES,value)?value as MoodChoice:null;}
export function avatarBraceSlots(devices:HealthDevice[]) {
 const normalized=(name:string)=>name.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return (['right','left'] as const).flatMap(side=>{const own=devices.filter(d=>d.active===true&&d.id&&typeof d.name==='string'&&d.kind==='other'&&d.side===side&&['tala de punho','munhequeira'].includes(normalized(d.name))).sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||'')||a.id.localeCompare(b.id));return own[0]?[own[0]]:[];});
}
export function avatarBodyContext(records:RegistroSaude[],surgeries:Cirurgia[],devices:HealthDevice[],pid:string,uid:string,today:string) {
 const valid=!!pid&&!!uid&&validDate(today),own=(r:{person_id?:string;user_id:string})=>valid&&r.person_id===pid&&r.user_id===uid;
 const start=valid?new Date(Date.parse(today+'T12:00:00Z')-6*86400000).toISOString().slice(0,10):'';
 const seen=new Set<string>();
 const moods=records.filter(r=>own(r)&&r.categoria==='humor'&&r.tipo==='humor'&&validDate(r.data)&&r.data>=start&&r.data<=today&&readMoodContext(r.contexto))
 .sort((a,b)=>`${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`)||(b.id||'').localeCompare(a.id||''))
 .filter(r=>{if(seen.has(r.data))return false;seen.add(r.data);return true;});
 const positive=moods.filter(r=>['bem','muito_bem'].includes(readMoodContext(r.contexto)!)).length;
 const negative=moods.filter(r=>['triste','muito_triste'].includes(readMoodContext(r.contexto)!)).length;
 const expression=moods.length>=3&&positive/moods.length>=2/3?'happy':moods.length>=3&&negative/moods.length>=2/3?'reflective':'neutral';
 const surgeryAgenda=avatarSurgeryAgenda(surgeries,pid,uid,today);
 const surgery=surgeryAgenda.upcoming[0]||surgeryAgenda.unconfirmed[0]||null;
 const moodEvidence={from:start,to:today,days:moods.length,positive,negative,neutral:moods.length-positive-negative,
  reason:expression==='happy'?'positive':expression==='reflective'?'negative':moods.length<3?'insufficient':'mixed'} as const;
 return {today,expression,moods,positive,negative,moodEvidence,weight:avatarWeightContext(records,pid,uid,today).comparison,surgery,surgeryAgenda,supports:avatarBraceSlots(devices.filter(own))} as const;
}
export type AvatarBodyContext=ReturnType<typeof avatarBodyContext>;

export function avatarBodyVisualSignature(skin:string,devices:HealthDevice[]){return JSON.stringify([avatarVisualSignature(skin,devices),avatarBraceSlots(devices).map(d=>[d.id,d.name,d.side,avatarColor(d.color,'#94a3b8')])]);}
