import { normalizedMedicationSchedules } from "@/lib/medication-dose-history";
/** Leitura visual do proximo slot de continuos. Não cria dose nem altera registros. */
export function nextHomeRoutineDoseP71(meds:readonly {
  id?:string|null; nome?:string|null; tipo_uso?:string|null; status?:string|null;
  estoque_horarios?:string[]|null; horarios?:string[]|null;
}[], logs:readonly {medicamento_id?:string|null; horario?:string|null; dose_kind?:string|null; tomado_em?:string|null; ignorado_em?:string|null}[], now:string) {
  const valid=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const slots:Array<{name:string;time:string;overdue:boolean}>=[];
  if (!valid.test(now)) return null;
  for(const med of meds){
    if(!med.id || med.tipo_uso!=="continuo" || med.status==="descontinuado")continue;
    for(const time of normalizedMedicationSchedules(med as Parameters<typeof normalizedMedicationSchedules>[0])){
      if(!valid.test(time))continue;
      const resolved=logs.some(log=>log.medicamento_id===med.id && log.horario===time &&
        log.dose_kind!=="sos" && log.dose_kind!=="extra" && Boolean(log.tomado_em||log.ignorado_em));
      if(!resolved)slots.push({name:med.nome?.trim()||"Medicamento",time,overdue:time<now});
    }
  }
  // Primeira pendência vencida ou proxima pendência futura, sempre com horário real.
  return slots.sort((a,b)=>a.time.localeCompare(b.time)||a.name.localeCompare(b.name,'pt-BR'))[0]||null;
}
