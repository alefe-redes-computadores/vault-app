/** Whitelisted fields of the existing renovation authority; no new acquisition table. */
export const acquisitionFields=['id','user_id','person_id','medicamento_id','medicamento_nome','medicamento_dosagem','medico_id','farmacia_id','hospital_id','local_id','document_id','a3_location_snapshot','a3_location_changes','tipo_aquisicao','data_proxima_retirada','data_retorno_sus','exige_nova_receita','quantidade','preco','lote','validade_produto','data','data_aquisicao','anexo_url','observacoes','created_at','updated_at'] as const;
export const medicationAcquisitionFields=['data_receita','document_id','medico_id','medico','tipo_aquisicao','farmacia_id','farmacia','data_retorno_sus','proxima_renovacao','lembrete_receita_modo','lembrete_receita_data'] as const;
export function acquisitionWire(row:object):Record<string,unknown>{const r=row as Record<string,unknown>;return Object.fromEntries(acquisitionFields.map(k=>[k,r[k]??(k==='a3_location_changes'?[]:k==='exige_nova_receita'?false:null)]));}
export function acquisitionMedicationPatch(before:object,after:object):Record<string,unknown>{const a=before as Record<string,unknown>,b=after as Record<string,unknown>;return Object.fromEntries(medicationAcquisitionFields.filter(k=>(a[k]??null)!==(b[k]??null)).map(k=>[k,b[k]??null]));}

/** Existing withdrawal authority; only completion fields change in this envelope. */
export const withdrawalReceiptFields=['id','user_id','person_id','medicamento_id','status','renovacao_realizada_id','quantidade_retirada','realizada_em','updated_at'] as const;
export function withdrawalReceiptWire(row:object):Record<string,unknown>{const r=row as Record<string,unknown>;return Object.fromEntries(withdrawalReceiptFields.map(k=>[k,r[k]??null]));}
