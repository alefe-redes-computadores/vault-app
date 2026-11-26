import {cycleIdentity,explicitStockUnit,type StockCycleFields} from './stock-cycle';
import type {StockContext,Conversion} from './stock-evidence';
export type ScopedStockRow=StockCycleFields&{id?:string;user_id?:string;person_id?:string;updated_at?:string|null};
/** No derived cycle, presentation heuristic or implicit pharmaceutical conversion. */
export function observedStockContext(row:ScopedStockRow,scope:{user_id:string;person_id:string;medicationId:string}):StockContext {
 if(!scope.user_id||!scope.person_id||!scope.medicationId||row.id!==scope.medicationId||row.user_id!==scope.user_id||row.person_id!==scope.person_id)throw Error('Estoque fora da conta ou pessoa ativa.');
 const balance=row.estoque_quantidade;
 return {...scope,basis:cycleIdentity(row.estoque_ciclo_id)??'',unit:explicitStockUnit(row.estoque_unidade_medida),balance:typeof balance==='number'&&Number.isFinite(balance)?balance:null};
}
export function observedStockConversion(row:ScopedStockRow,context:StockContext):Conversion|undefined {
 const factor=row.estoque_gotas_por_ml;
 if(!context.basis||context.unit!=='ml'||typeof factor!=='number'||!Number.isFinite(factor)||factor<=0)return undefined;
 if(row.id!==context.medicationId||row.user_id!==context.user_id||row.person_id!==context.person_id||cycleIdentity(row.estoque_ciclo_id)!==context.basis)return undefined;
 return {kind:'drops_per_ml',factor,source:'declared',medicationId:context.medicationId,basis:context.basis};
}
