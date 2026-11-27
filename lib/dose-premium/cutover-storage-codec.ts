import {CUTOVER_TABLES,cutoverCanonical,cutoverLocalIdentity,type CutoverLocal,type CutoverRows,type CutoverTable} from './cutover-recovery';
import {validInstant} from './center-view';

type Row=Record<string,unknown>;
const plain=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const fail=(s:string):never=>{throw Error('M02_CUTOVER_STORAGE_'+s);};
// A typed, collision-free encoding for the exact IndexedDB representation.
// Undefined is NOT null, absent, or an empty string. Unknown non-JSON values
// are rejected (not stringified). Object order is irrelevant; array order is
// preserved. This encoding never goes to PostgreSQL or the clinical queue.
type Encoded=['u']|['n']|['s',string]|['b',boolean]|['d',number]|['a',Encoded[]]|['o',[string,Encoded][]];
function encode(x:unknown):Encoded{
 if(x===undefined)return ['u'];if(x===null)return ['n'];
 if(typeof x==='string')return ['s',x];if(typeof x==='boolean')return ['b',x];
 if(typeof x==='number'&&Number.isFinite(x)&&!Object.is(x,-0))return ['d',x];
 if(Array.isArray(x)){if(Object.keys(x).length!==x.length||Object.getOwnPropertySymbols(x).length)return fail('ARRAY');for(let i=0;i<x.length;i++)if(!Object.prototype.hasOwnProperty.call(x,i))return fail('ARRAY');return ['a',x.map(encode)];}
 if(!plain(x)||Object.getOwnPropertySymbols(x).length)return fail('VALUE');
 return ['o',Object.keys(x).sort().map(k=>[k,encode(x[k])])];
}
/** Exact local equality, including undefined and absence. */
export function exactMacro02ValueIdentity(value:unknown){return JSON.stringify(encode(value));}
function decode(x:unknown):unknown{
 if(!Array.isArray(x))return fail('ENCODING');
 if(x.length===1&&x[0]==='u')return undefined;if(x.length===1&&x[0]==='n')return null;
 if(x.length!==2)return fail('ENCODING');
 const [tag,v]=x;
 if(tag==='s'&&typeof v==='string'||tag==='b'&&typeof v==='boolean'||tag==='d'&&typeof v==='number'&&Number.isFinite(v)&&!Object.is(v,-0))return v;
 if(tag==='a'&&Array.isArray(v))return v.map(decode);
 if(tag==='o'&&Array.isArray(v)){
  const entries:[string,unknown][]=[];let prev:string|undefined;
  for(const pair of v){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||prev!==undefined&&pair[0]<=prev)return fail('OBJECT_ORDER');prev=pair[0];entries.push([pair[0],decode(pair[1])]);}
  return Object.fromEntries(entries);
 }
 return fail('ENCODING');
}
// Nullable fields from the 2026-11-27 production catalog read (no row data).
// This is only a comparison projection of an independently verified snapshot.
// It is never a patch. No non-null value is changed or defaulted. Scope fields
// remain subject to the original strict dependency and account validators.
const nullable:Readonly<Record<CutoverTable,string>>={
 a1_prescription_links:'observacoes,deleted_at',a1_supply_locations:'farmacia_id,local_id,observacoes,deleted_at,a3_location_snapshot',a1_treatment_phases:'profissional_id,observacoes,deleted_at,regime_a4',
 cids:'person_id,data_diagnostico,medico_id,hospital_id,local_id,observacoes,anexo_url,created_at,updated_at',documents:'person_id,category_id,type,description,metadata,attachments,is_favorite,vault_id,hospital_id,medico_id,created_at,updated_at,entidade_tipo,entidade_id',
 doseLogs:'person_id,medicamento_id,tomado_em,ignorado_em,quantidade,created_at,updated_at,observacoes,synced,dose_kind,motivo,unidade_dose,unidade_dose_rotulo,fonte_unidade,estoque_movimento,farmaco_snapshot',
 farmacias:'endereco,telefone,observacoes,created_at,updated_at,tipo',fornecimento_ciclos:'inicio,fim,protocolado_em,autorizado_em,observacoes,uf_snapshot,indicacao_snapshot,origem_snapshot,motivo,preparar_ate,consulta_id,exigencia_local,regra_versao',fornecimento_documentos:'retirada_id,entregue_em',fornecimento_itens:'quantidade_mensal,catalogo_id',fornecimentos:'farmacia_id,medico_id,local_id,protocolo,renovacao_meses,observacoes,uf,indicacao,catalogo_versao',
 hospitais:'endereco,telefone,tipo,observacoes,created_at,updated_at,medico_ids',locais:'endereco,telefone,tipo,observacoes,created_at,updated_at,medico_ids',medicamento_tratamentos:'',
 medicamentos:'person_id,document_id,medico_id,farmacia_id,hospital_id,local_id,medico,farmacia,data_receita,proxima_renovacao,tipo_receita,tipo_uso,forma_farmaceutica,cor_principal,cor_secundaria,status,estoque_quantidade,estoque_data_referencia,estoque_horarios,estoque_unidade_por_dose,estoque_unidade_medida,estoque_ml_total,estoque_gotas_por_ml,formato,cores,preco,motivo_descontinuacao,medico_descontinuacao_id,medico_descontinuacao_nome,substituido_por_id,data_descontinuacao,historico_dosagens,observacoes,created_at,updated_at,cid_ids,tratamento_ids,tipo_aquisicao,data_retorno_sus,lembrete_receita_data,catalog_snapshot,contexto_clinico_m1,estoque_ciclo_id',
 medicos:'especialidade,crm,telefone,email,observacoes,created_at,updated_at,categoria_profissional,conselho_tipo,conselho_numero,conselho_uf',persons:'email,phone,avatar_url,color,created_at,updated_at',
 renovacoes:'person_id,document_id,medicamento_id,medico_id,farmacia_id,hospital_id,local_id,quantidade,preco,lote,validade_produto,anexo_url,observacoes,created_at,updated_at,tipo_aquisicao,data_retorno_sus,data_proxima_retirada,exige_nova_receita,data_aquisicao,medicamento_nome,medicamento_dosagem,a3_location_snapshot',
 retiradas:'renovacao_origem_id,renovacao_realizada_id,medico_id,farmacia_id,hospital_id,local_id,medicamento_nome,medicamento_dosagem,horario,quantidade_prevista,quantidade_retirada,observacoes,realizada_em,fornecimento_id,fornecimento_ciclo_id,a3_location_snapshot',tratamentos:'person_id,cor,observacoes,created_at,updated_at,cid_ids,hospital_ids,local_ids,medico_ids,data_inicio,condicao,visual_icon,visual_icon_updated_at,visual_icon_operation_id',
};
export const MACRO02_R3_REMOTE_COLUMNS:Readonly<Record<CutoverTable,string>>={
 a1_prescription_links:'id,user_id,person_id,medicamento_id,renovacao_anterior_id,renovacao_atual_id,tipo,origem,observacoes,created_at,updated_at,deleted_at',
 a1_supply_locations:'id,user_id,person_id,fornecimento_id,farmacia_id,local_id,inicio_vigencia,origem,observacoes,created_at,updated_at,deleted_at,a3_location_snapshot',
 a1_treatment_phases:'id,user_id,person_id,tratamento_id,tipo,data_efetiva,origem,profissional_id,titulo,observacoes,created_at,updated_at,deleted_at,regime_a4',
 cids:'id,user_id,person_id,codigo,descricao,data_diagnostico,medico_id,hospital_id,local_id,observacoes,anexo_url,created_at,updated_at',
 documents:'id,user_id,person_id,category_id,type,title,description,metadata,attachments,is_favorite,vault_id,hospital_id,medico_id,created_at,updated_at,entidade_tipo,entidade_id',
 doseLogs:'id,user_id,person_id,medicamento_id,data,horario,tomado_em,ignorado_em,quantidade,created_at,updated_at,observacoes,synced,dose_kind,motivo,unidade_dose,unidade_dose_rotulo,fonte_unidade,estoque_movimento,farmaco_snapshot',
 farmacias:'id,user_id,nome,endereco,telefone,observacoes,created_at,updated_at,tipo,is_sus',
 fornecimento_ciclos:'id,user_id,person_id,processo_id,status,inicio,fim,protocolado_em,autorizado_em,observacoes,created_at,updated_at,uf_snapshot,indicacao_snapshot,origem_snapshot,motivo,preparar_ate,consulta_id,documentos_pessoais_conferidos,exigencia_local,regra_versao',
 fornecimento_documentos:'id,user_id,person_id,processo_id,ciclo_id,document_id,retirada_id,tipo,estado,entregue_em,created_at,updated_at',
 fornecimento_itens:'id,user_id,person_id,processo_id,ciclo_id,medicamento_id,dosagem,quantidade_mensal,created_at,updated_at,catalogo_id',
 fornecimentos:'id,user_id,person_id,titulo,origem,status,farmacia_id,medico_id,local_id,protocolo,renovacao_meses,antecedencia_dias,receita_cada_retirada,observacoes,created_at,updated_at,uf,indicacao,catalogo_versao',
 hospitais:'id,user_id,nome,endereco,telefone,tipo,observacoes,created_at,updated_at,medico_ids',
 locais:'id,user_id,nome,endereco,telefone,tipo,observacoes,created_at,updated_at,medico_ids',
 medicamento_tratamentos:'id,medicamento_id,tratamento_id',
 medicamentos:'id,user_id,person_id,document_id,medico_id,farmacia_id,hospital_id,local_id,nome,dosagem,medico,farmacia,data_receita,proxima_renovacao,tipo_receita,tipo_uso,forma_farmaceutica,cor_principal,cor_secundaria,status,estoque_quantidade,estoque_data_referencia,estoque_horarios,estoque_unidade_por_dose,estoque_unidade_medida,estoque_ml_total,estoque_gotas_por_ml,formato,cores,preco,motivo_descontinuacao,medico_descontinuacao_id,medico_descontinuacao_nome,substituido_por_id,data_descontinuacao,historico_dosagens,observacoes,created_at,updated_at,cid_ids,tratamento_ids,tipo_aquisicao,data_retorno_sus,lembrete_receita_modo,lembrete_receita_data,catalog_snapshot,contexto_clinico_m1,estoque_ciclo_id,macro02_stock_managed',
 medicos:'id,user_id,nome,especialidade,crm,telefone,email,observacoes,created_at,updated_at,categoria_profissional,conselho_tipo,conselho_numero,conselho_uf,a1_identity_revision',
 persons:'id,user_id,name,email,phone,avatar_url,color,is_default,created_at,updated_at',
 renovacoes:'id,user_id,person_id,document_id,medicamento_id,medico_id,farmacia_id,hospital_id,local_id,quantidade,preco,lote,validade_produto,data,anexo_url,observacoes,created_at,updated_at,tipo_aquisicao,data_retorno_sus,data_proxima_retirada,exige_nova_receita,data_aquisicao,medicamento_nome,medicamento_dosagem,a3_location_snapshot,a3_location_changes',
 retiradas:'id,user_id,person_id,medicamento_id,renovacao_origem_id,renovacao_realizada_id,medico_id,farmacia_id,hospital_id,local_id,medicamento_nome,medicamento_dosagem,data,horario,tipo,status,quantidade_prevista,quantidade_retirada,exige_nova_receita,observacoes,realizada_em,created_at,updated_at,reagendamentos,fornecimento_id,fornecimento_ciclo_id,a3_location_snapshot,a3_location_changes',
 tratamentos:'id,user_id,person_id,nome,status,cor,observacoes,created_at,updated_at,cid_ids,hospital_ids,local_ids,medico_ids,data_inicio,condicao,visual_icon,visual_icon_revision,visual_icon_updated_at,visual_icon_operation_id',
};
const instants:Partial<Record<CutoverTable,readonly string[]>>={doseLogs:['tomado_em','ignorado_em'],retiradas:['realizada_em'],a1_prescription_links:['deleted_at'],a1_supply_locations:['deleted_at'],a1_treatment_phases:['deleted_at'],fornecimento_ciclos:['protocolado_em','autorizado_em'],fornecimento_documentos:['entregue_em'],tratamentos:['visual_icon_updated_at']};
function canonicalInstant(value:unknown){
 if(value==null)return value;
 if(!validInstant(value))return fail('INSTANT');
 const match=/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
 const fraction=(match?.[1]??'').padEnd(6,'0');
 return new Date(Date.parse(value)).toISOString().replace(/\.\d{3}Z$/,'.'+fraction+'Z');
}
function normalizeRow(table:CutoverTable,row:Row,origin:'local'|'remote'){
 if(!plain(row))return fail('ROW');
 const out={...row};const optional=new Set(nullable[table].split(',').filter(Boolean));
 // Only an explicitly nullable column can be serialized as absent locally.
 // Null on a scope dependency still fails in the existing dependency gate.
 if(origin==='remote'){
  if(Object.keys(out).sort().join(',')!==MACRO02_R3_REMOTE_COLUMNS[table].split(',').sort().join(','))return fail('REMOTE_COLUMNS_'+table);
  for(const field of Object.keys(out))if(out[field]===undefined||out[field]===null&&!optional.has(field)&&!(table==='persons'&&field==='is_default'))return fail('REMOTE_FIELD_'+table);
 }else for(const field of optional)if(out[field]===undefined)out[field]=null;
 if(table==='persons'&&origin==='remote'&&out.is_default===null)out.is_default=false; // exact ordinary pull semantics
 // No inference of a historical unit, quantity, stock cycle or receipt.
 // A missing non-null macro02 flag on a legacy local row means false only
 // with no cycle; remote true or any actual non-null value stays distinct.
 if(table==='medicamentos'&&origin==='local'&&out.macro02_stock_managed===undefined&&out.estoque_ciclo_id==null)out.macro02_stock_managed=false;
 for(const k of ['created_at','updated_at',...(instants[table]??[])])if(Object.prototype.hasOwnProperty.call(out,k)&&out[k]!==undefined)out[k]=canonicalInstant(out[k]);
 // Existing local-only undefined values must not silently disappear; only
 // the explicit nullable top-level columns above have representation proof.
 cutoverCanonical(out);return out;
}
export function normalizeMacro02LocalForComparison(raw:CutoverLocal):CutoverLocal{
 if(!plain(raw)||Object.keys(raw).sort().join(',')!=='account_id,external_dependency_queue_count,omitted_unowned_count,queue,rows,unscoped_rows_count'||!plain(raw.rows)||Object.keys(raw.rows).length!==CUTOVER_TABLES.length)return fail('LOCAL_SHAPE');
 const rows=Object.fromEntries(CUTOVER_TABLES.map(t=>{const r=raw.rows[t];if(!Array.isArray(r))return fail('TABLE');return [t,r.map(row=>normalizeRow(t,row,'local'))];})) as unknown as CutoverRows;
 // Pending queue always blocks recovery. Validate the exact queue with the
 // original strict parser; never normalize or re-enqueue an intention.
 const local={...raw,rows};cutoverLocalIdentity(local);return local;
}
export function normalizeMacro02RemoteForComparison(raw:unknown){
 if(!plain(raw)||!plain(raw.rows)||Object.keys(raw.rows).length!==CUTOVER_TABLES.length)return fail('REMOTE_SHAPE');
 const rawRows=raw.rows;
 const rows=Object.fromEntries(CUTOVER_TABLES.map(t=>{const r=rawRows[t];if(!Array.isArray(r))return fail('TABLE');return [t,r.map(row=>{if(!plain(row))return fail('ROW');return normalizeRow(t,row,'remote');})];}));
 return {...raw,rows};
}
const key=(table:CutoverTable,r:Row)=>table==='medicamento_tratamentos'?JSON.stringify([r.medicamento_id,r.tratamento_id]):String(r.id);
function ordered(raw:CutoverLocal):CutoverLocal{
 normalizeMacro02LocalForComparison(raw);
 return {...raw,rows:Object.fromEntries(CUTOVER_TABLES.map(t=>[t,[...raw.rows[t]].sort((a,b)=>key(t,a)<key(t,b)?-1:key(t,a)>key(t,b)?1:0)])) as unknown as CutoverRows,queue:[...raw.queue].sort((a,b)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0)};
}
export function exactMacro02LocalIdentity(raw:CutoverLocal){return JSON.stringify(encode(ordered(raw)));}
export function exportMacro02ExactRecoveryImage(raw:CutoverLocal){return JSON.stringify({format:'macro02-cutover-exact-local-v1',payload:encode(ordered(raw))});}
export function readMacro02ExactRecoveryImage(value:unknown,uid:string):CutoverLocal{
 if(!plain(value)||value.format!=='macro02-cutover-exact-local-v1'||Object.keys(value).sort().join(',')!=='format,payload')return fail('FILE_FORMAT');
 const raw=decode(value.payload) as CutoverLocal;if(!plain(raw)||raw.account_id!==uid)return fail('FILE_ACCOUNT');
 exactMacro02LocalIdentity(raw);return raw;
}
/** Map the already verified normalized plan back to the exact independently
 * retained local backup. Existing raw records must be identical; only the
 * selected missing records are added, never rewritten from a PG projection. */
export function materializeExactMacro02Adds(before:CutoverLocal,backup:CutoverLocal,adds:readonly {table:CutoverTable;row:Row}[]){
 const beforeId=exactMacro02LocalIdentity(before),afterId=exactMacro02LocalIdentity(backup);
 const rows=Object.fromEntries(CUTOVER_TABLES.map(t=>[t,[...before.rows[t]]])) as Record<CutoverTable,Row[]>;
 const exact:{table:CutoverTable;row:Row}[]=[];
 for(const item of adds){const k=key(item.table,item.row),row=backup.rows[item.table].find(r=>key(item.table,r)===k);if(!row||rows[item.table].some(r=>key(item.table,r)===k))return fail('ADD_ID');exact.push({table:item.table,row:decode(encode(row)) as Row});rows[item.table].push(row);}
 if(exactMacro02LocalIdentity({...before,rows})!==afterId)return fail('BACKUP_RAW_CONFLICT');
 return {adds:exact,expectedBefore:beforeId,expectedAfter:afterId};
}
