/** Display only: civil dates and declared clocks, never invent missing times or change stored values. */
export function formatMeasurementDaySTB(raw:string|null|undefined):string {
  if(!raw)return 'Data não informada';
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if(!match)return raw;
  const [,year,month,day]=match;
  const d=new Date(0);d.setUTCFullYear(Number(year),Number(month)-1,Number(day));
  if(Number(year)<1||d.getUTCFullYear()!==Number(year)||d.getUTCMonth()!==Number(month)-1||d.getUTCDate()!==Number(day))return raw;
  return `${day}/${month}/${year}`;
}
export function formatMeasurementTimeSTB(raw:string|null|undefined):string|null {
  const m=/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(raw?.trim()||'');
  return m?`${m[1]}:${m[2]}`:null;
}
/** A reading's unit is confirmed only by its source field or an explicit suffix. */
export function formatRecordedPressureSTB(raw:string|null|undefined,unit:string|null|undefined):string {
  if(!raw?.trim())return 'Valor não informado';
  const recorded=raw.trim(), declared=unit?.trim()||'';
  const match=/^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*(mmHg))?$/i.exec(recorded);
  if(!match)return `${recorded} · valor original; conferir formato`;
  if(declared&&declared.toLowerCase()!=='mmhg')return `${recorded} · unidade declarada: ${declared}; conferir`;
  const sys=Number(match[1]),dia=Number(match[2]);
  if(sys<30||sys>300||dia<20||dia>200||dia>=sys)return `${recorded} · valor original; conferir formato`;
  if(!declared&&!match[3])return `${sys}/${dia} · unidade não informada`;
  return `${sys}/${dia} mmHg`;
}
