/** Coverage is documented calendar days, never a clinical adherence score. */
export function documentedDayCount(doseDates:string[],recordDates:string[]):number{
  const days=new Set<string>();
  for(const date of [...doseDates,...recordDates]){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    const parsed=new Date(date+"T12:00:00Z");
    if(Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date)days.add(date);
  }
  return days.size;
}
