/** CareFlow R3: formatadores e paginação somente de leitura; sem persistência clínica. */
export function formatCareFlowDayR3(input:unknown):string{
  if(typeof input!=='string')return 'Data não informada';
  const day=input.trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return 'Data não informada';
  const year=Number(day.slice(0,4)),month=Number(day.slice(5,7)),date=Number(day.slice(8,10));
  const verified=new Date(Date.UTC(year,month-1,date));
  if(verified.getUTCFullYear()!==year||verified.getUTCMonth()!==month-1||verified.getUTCDate()!==date)return 'Data não informada';
  return `${day.slice(8,10)}/${day.slice(5,7)}/${day.slice(0,4)}`;
}
/** Revela a página inteira que contém um registro solicitado sem fingir que há menos eventos. */
export function revealCountR3(index:number,current:number,step:number):number{
  if(!Number.isSafeInteger(index)||index<0||!Number.isSafeInteger(step)||step<1)return current;
  if(!Number.isSafeInteger(current)||current<0)return current;
  return Math.max(current,Math.ceil((index+1)/step)*step);
}
/** O fragmento é uma referência local, nunca uma URL a navegar ou um dado clínico confiável. */
export function recordKeyFromHashR3(hash:string,prefix:string):string|null{
  if(typeof hash!=='string'||!hash.startsWith(prefix))return null;
  try{
    const id=decodeURIComponent(hash.slice(prefix.length));
    return id&&id.length<=240&&!/[\u0000-\u001f\u007f]/.test(id)?id:null;
  }catch{return null;}
}
