import type {StockUnit} from './stock-evidence';
/** A cycle starts only from a deliberate, scoped count, never from a legacy balance or date. */
export type StockCycleFields={estoque_ciclo_id?:string|null;estoque_quantidade?:number|null;estoque_unidade_medida?:string|null;estoque_gotas_por_ml?:number|null;estoque_ml_total?:number|null;estoque_data_referencia?:string|null;estoque_unidade_por_dose?:number|null};
export type StockCountSnapshot=StockCycleFields&{updated_at?:string|null};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const units:Record<string,StockUnit>={comprimido:'tablet',comprimidos:'tablet','comprimido(s)':'tablet',capsula:'capsule',capsulas:'capsule','capsula(s)':'capsule',gota:'drop',gotas:'drop','gota(s)':'drop',ml:'ml',unidade:'unit',unidades:'unit','unidade(s)':'unit',aplicacao:'application',aplicacoes:'application','aplicacao(oes)':'application',inalacao:'inhalation',inalacoes:'inhalation',mg:'mg',mcg:'mcg',g:'g',ui:'iu',jato:'spray',jatos:'spray',adesivo:'patch',adesivos:'patch',sache:'sachet',saches:'sachet'};
export function explicitStockUnit(value:unknown):StockUnit|null {
 if(typeof value!=='string')return null;
 const key=value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return Object.prototype.hasOwnProperty.call(units,key)?units[key]:null;
}
export const cycleIdentity=(value:unknown):string|null=>typeof value==='string'&&uuid.test(value)?value:null;
const keys=['estoque_quantidade','estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_data_referencia','estoque_unidade_por_dose'] as const;
const normal=(x:unknown)=>x??null;
export function captureStockCount(row:StockCountSnapshot):StockCountSnapshot {
 return {...Object.fromEntries(keys.map(key=>[key,normal(row[key])])),estoque_ciclo_id:cycleIdentity(row.estoque_ciclo_id),updated_at:row.updated_at??null} as StockCountSnapshot;
}
export function assertCountSnapshot(current:StockCountSnapshot,expected:StockCountSnapshot){
 const a=captureStockCount(current),b=captureStockCount(expected);
 if([...keys,'estoque_ciclo_id','updated_at'].some(k=>a[k as keyof StockCountSnapshot]!==b[k as keyof StockCountSnapshot]))throw Error('O estoque mudou. Confira novamente a contagem antes de confirmar.');
}
export function stockFieldsChanged(before:StockCycleFields,after:StockCycleFields):boolean {
 return keys.some(k=>normal(before[k])!==normal(after[k]));
}
/** Ordinary updates may invalidate a cycle, never create one. Date alone is not proof of a new cycle. */
export function cycleAfterOrdinaryUpdate(current:StockCycleFields,patch:StockCycleFields):string|null {
 const invalidates=keys.some(k=>patch[k]!==undefined&&normal(patch[k])!==normal(current[k]));
 return invalidates?null:cycleIdentity(current.estoque_ciclo_id);
}
/** Must be called by the canonical writer inside the same transaction as the confirmed count. */
export function cycleAfterConfirmedCount(current:StockCycleFields,count:number,newId:()=>string):string|null {
 if(!finite(count))throw Error('Contagem inválida.');
 if(!explicitStockUnit(current.estoque_unidade_medida))return null;
 const id=cycleIdentity(newId());if(!id||id===cycleIdentity(current.estoque_ciclo_id))throw Error('Identidade de ciclo inválida.');return id;
}
/** Additive acquisition preserves an existing basis; only a separately confirmed count can start another. */
export function cycleAfterAcquisition(current:StockCycleFields,input:{countedCurrentStock?:number;initialStockQuantity?:number;added:number;countProof?:StockCountSnapshot},newId:()=>string):string|null {
 if(!finite(input.added)||input.added===0)throw Error('Aquisição inválida.');
 if(input.countedCurrentStock!==undefined){
   if(!input.countProof)return null; // Older callers do not supply a revisioned count proof.
   assertCountSnapshot(current,input.countProof);return cycleAfterConfirmedCount(current,input.countedCurrentStock,newId);
 }
 if(typeof current.estoque_quantidade==='number'&&Number.isFinite(current.estoque_quantidade)){
   return input.initialStockQuantity!==undefined?null:cycleIdentity(current.estoque_ciclo_id);
 }
 if(input.initialStockQuantity!==undefined&&input.countProof){assertCountSnapshot(current,input.countProof);return cycleAfterConfirmedCount(current,input.initialStockQuantity,newId);}
 return null;
}
