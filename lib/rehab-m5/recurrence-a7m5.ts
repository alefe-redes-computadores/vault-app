/** User-authorized batch scheduling through M5's existing single session writer. */
import {db} from '@/lib/db';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {scheduleRehabSessionM5} from './repository';
import type {RehabSessionMode} from './types';
import {validDayA7} from '@/lib/surgery-a7/types';
export type RecurringRehabInputA7M5={personId:string;programId:string;startDay:string;endDay:string;
 weekdays:readonly number[];clock:string;mode:RehabSessionMode;localId?:string;hospitalId?:string;placeNote?:string;
 notes?:string;timezone:string};
/** Returns explicit civil date/time slots; no notion of performed or clinical progress. */
export function expandRehabSlotsA7M5(input:Pick<RecurringRehabInputA7M5,'startDay'|'endDay'|'weekdays'|'clock'>):string[]{
 if(!validDayA7(input.startDay)||!validDayA7(input.endDay)||input.endDay<input.startDay)throw Error('Informe um intervalo de datas válido');
 const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(input.clock);if(!m)throw Error('Informe horário entre 00:00 e 23:59');
 const days=new Set(input.weekdays);if(!days.size||[...days].some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('Selecione dias da semana válidos');
 const start=new Date(input.startDay+'T12:00:00Z').getTime(),end=new Date(input.endDay+'T12:00:00Z').getTime();
 if((end-start)/86400000>90)throw Error('Limite máximo por confirmação: 91 dias');
 const result:string[]=[];
 for(let ms=start;ms<=end;ms+=86400000){const d=new Date(ms);if(!days.has(d.getUTCDay()))continue;
  const day=d.toISOString().slice(0,10);result.push(day+'T'+input.clock+':00');if(result.length>60)throw Error('Agende até 60 sessões por lote');}
 if(!result.length)throw Error('Não há datas com os dias selecionados');return result;
}
/** Partial success is reported, never hidden. Retry is safe: matching local slots are skipped. */
export async function scheduleRehabSeriesA7M5(input:RecurringRehabInputA7M5){
 const slots=expandRehabSlotsA7M5(input),{data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
 if(error||!uid)throw Error('Sessão autenticada indisponível');
 const person=await db.persons.get(input.personId),program=await db.rehab_programs_m5.get(input.programId);
 if(!person||person.user_id!==uid||!program||program.user_id!==uid||program.person_id!==input.personId||program.deleted_at)throw Error('Programa fora da pessoa ativa');
 if(program.status==='completed'||program.status==='interrupted')throw Error('Reabra um programa ativo antes de criar novas sessões');
 if(input.mode==='home'&&(input.localId||input.hospitalId))throw Error('Domicílio não exige hospital ou clínica');
 const current=await db.rehab_sessions_m5.where('[user_id+person_id]').equals([uid,input.personId]).toArray();
 const duplicates=new Set(current.filter(x=>!x.deleted_at&&x.program_id===input.programId).map(x=>x.scheduled_at));
 let created=0,skipped=0;
 for(const slot of slots){
  const d=new Date(slot);if(!Number.isFinite(d.getTime())||d.getFullYear()!==Number(slot.slice(0,4))||d.getMonth()+1!==Number(slot.slice(5,7))||d.getDate()!==Number(slot.slice(8,10))||`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`!==input.clock)throw Error('Horário civil inválido neste fuso');
  const at=d.toISOString();if(duplicates.has(at)){skipped++;continue;}
  try{await scheduleRehabSessionM5({personId:input.personId,programId:input.programId,scheduledAt:at,timezone:input.timezone,
   mode:input.mode,localId:input.localId,hospitalId:input.hospitalId,placeNote:input.placeNote,notes:input.notes});created++;duplicates.add(at);}
  catch(e){throw Error(`Foram criadas ${created} sessões, ${skipped} já existiam. Falhou em ${slot}: ${e instanceof Error?e.message:'erro não identificado'}. Reabra a agenda antes de tentar novamente.`);}
 }
 return {created,skipped,total:slots.length};
}
