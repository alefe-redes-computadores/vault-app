/** Presentation-only layout: a trailing unpaired card fills the two-column row. */
export function isTrailingGridItemSTB(index:number,count:number):boolean {
  return Number.isInteger(index)&&Number.isInteger(count)&&count>0&&count%2===1&&index===count-1;
}
