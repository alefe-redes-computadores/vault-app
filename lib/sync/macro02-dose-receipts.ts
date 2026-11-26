import {supabase} from '@/lib/supabase/client';
import type {RemoteDoseReceipt} from '@/lib/dose-premium/ingress-guard';
/** Bounded on-demand proof lookup. Missing RPC is not permission to accept a conflict. */
export async function readMacro02DoseReceipts(userId:string,ids:readonly string[]):Promise<Map<string,RemoteDoseReceipt>>{
 const result=new Map<string,RemoteDoseReceipt>();if(!userId)return result;
 const unique=[...new Set(ids)].filter(id=>typeof id==='string'&&id.length>0);
 for(let offset=0;offset<unique.length;offset+=100){const batch=unique.slice(offset,offset+100);try{
   const {data,error}=await supabase.rpc('vault_macro02_read_dose_receipts',{p_ids:batch});if(error||!Array.isArray(data))continue;
   const seen=new Set<string>(),bad=new Set<string>();for(const row of data){if(!row||typeof row!=='object'||row.user_id!==userId||!batch.includes(row.id))continue;if(seen.has(row.id)){bad.add(row.id);result.delete(row.id);continue;}seen.add(row.id);if(!bad.has(row.id))result.set(row.id,row as RemoteDoseReceipt);}
 }catch{/* existing conflict path preserves facts */}}
 return result;
}
