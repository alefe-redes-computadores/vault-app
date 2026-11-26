/** Bind to the existing authenticated Supabase client; never create another auth or sync runtime. */
import type { Scope, TableName } from './model';
import { vitalRemoteFields, vitalTable, type VitalRemote } from './cloud-transport';
import { requireId, requireScope, fail } from './validation';
type Result={data:unknown;error:{message:string;code?:string}|null};
interface Query extends PromiseLike<Result>{select(columns:string):Query;eq(column:string,value:string|number):Query;gt(column:string,value:string):Query;order(column:string,options:{ascending:boolean}):Query;limit(count:number):Query;maybeSingle():Query;single():Query;}
interface Table{select(columns:string):Query;insert(payload:Record<string,unknown>):Query;update(payload:Record<string,unknown>):Query;}
export interface SupabaseVitalClient{from(table:string):Table;}
export function createSupabaseVitalTransport(client:SupabaseVitalClient,authenticatedUser:()=>Promise<string|null>):VitalRemote{
 const checked=async(table:TableName,scope:Scope)=>{if(!vitalTable(table))fail('Tabela não autorizada.');const s=requireScope(scope);if(await authenticatedUser()!==s.user_id)fail('Conta de sincronização mudou.');return s;};
 const fields=(t:TableName)=>vitalRemoteFields(t).join(',');
 const read=async(q:Query,s:Scope)=>{const result=await q;if(await authenticatedUser()!==s.user_id)fail('Conta mudou durante sincronização.');if(result.error)throw Error(`Sincronização Vital indisponível (${result.error.code??'erro remoto'}).`);return result.data;};
 const scoped=(q:Query,s:Scope)=>q.eq('user_id',s.user_id).eq('person_id',s.person_id);
 return {
  async get(t,scope,id){const s=await checked(t,scope);return (await read(scoped(client.from(t).select(fields(t)),s).eq('id',requireId(id)).maybeSingle(),s))??null;},
  async insert(t,payload){const s=await checked(t,{user_id:String(payload.user_id??''),person_id:String(payload.person_id??'')});return read(client.from(t).insert(payload).select(fields(t)).single(),s);},
  async cas(t,scope,id,expected,payload){const s=await checked(t,scope);if(Object.keys(payload).some(k=>['id','user_id','person_id','created_at'].includes(k)))fail('Identidade não pode ser atualizada.');if(!Number.isSafeInteger(expected)||expected<1)fail('Revisão esperada inválida.');return (await read(scoped(client.from(t).update(payload),s).eq('id',requireId(id)).eq('revision',expected).select(fields(t)).maybeSingle(),s))??null;},
  async page(t,scope,afterId,limit){const s=await checked(t,scope);if(!Number.isInteger(limit)||limit<1||limit>1000)fail('Limite inválido.');let q=scoped(client.from(t).select(fields(t)),s).order('id',{ascending:true}).limit(limit);if(afterId!==null)q=q.gt('id',requireId(afterId));const rows=await read(q,s);if(!Array.isArray(rows))fail('Página inválida.');return rows;}
 };
}
