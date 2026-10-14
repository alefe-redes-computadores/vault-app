/** Bottle arithmetic is only informative until the user confirms the label values.
 * Never assume a universal drops-per-ml conversion or package volume.
 */
export type BottleReference = { totalMl:number; totalDrops:number; monthlyMl:number; monthlyDrops:number };
export function calculateBottleReference(bottles:number,mlPerBottle:number,dropsPerMl:number,months:number):BottleReference|null {
  if (![bottles,mlPerBottle,dropsPerMl,months].every(Number.isFinite) ||
    !Number.isInteger(bottles) || bottles<1 || bottles>1000 ||
    mlPerBottle<=0 || mlPerBottle>1000 || dropsPerMl<=0 || dropsPerMl>100 ||
    !Number.isInteger(months) || months<1 || months>24) return null;
  const totalMl=bottles*mlPerBottle;
  const totalDrops=totalMl*dropsPerMl;
  return {totalMl,totalDrops,monthlyMl:totalMl/months,monthlyDrops:totalDrops/months};
}
