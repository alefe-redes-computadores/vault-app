/** A bounded, explicitly observational consultation brief. No medical sign-off inferred. */
import type { Medicamento, Renovacao } from '@/lib/types';
import { readManufacturerMetadata } from '@/lib/medications/manufacturer-experience';
import type { BrainV7Result } from './brain-v7-universal';
import { validBrainDayV7 } from './brain-v7-universal';

export type BrainV7Rationale = {
  id: string; medicationId: string; recordedAt: string;
  source: 'relato_pessoal' | 'documento_referido';
  note: string; reference?: string;
};
export type BrainV7DossierInput = {
  report: BrainV7Result;
  userId: string; personId: string;
  medications: readonly Medicamento[];
  acquisitions: readonly Renovacao[];
  rationales: readonly BrainV7Rationale[];
};
export function prepareBrainV7Dossier(input: BrainV7DossierInput): string {
  const r=input.report;
  if(!r.authorized||!input.userId||!input.personId||!validBrainDayV7(r.referenceDay))return 'Dados autorizados indisponíveis para gerar o resumo.';
  const meds=input.medications.filter(m=>m.id&&m.user_id===input.userId&&m.person_id===input.personId);
  const allowedIds=new Set(meds.map(m=>m.id!));
  const acquisitions=input.acquisitions.filter(x=>x.user_id===input.userId&&x.person_id===input.personId&&allowedIds.has(x.medicamento_id)&&x.id&&x.data_aquisicao&&validBrainDayV7(x.data_aquisicao)&&x.data_aquisicao<=r.referenceDay);
  const manufacturer=new Map<string,string>();
  for(const a of [...acquisitions].sort((x,y)=>(y.data_aquisicao||'').localeCompare(x.data_aquisicao||''))){
    if(manufacturer.has(a.medicamento_id))continue;
    const value=readManufacturerMetadata(a.observacoes).manufacturer;
    if(value)manufacturer.set(a.medicamento_id,value);
  }
  const lines:string[]=[
    'VAULT — DOSSIÊ OBSERVACIONAL PARA CONSULTA',
    `Data de referência: ${r.referenceDay.split('-').reverse().join('/')}`,
    'Documento pessoal; conferir com o profissional. Não é prescrição, laudo ou autorização de dose.',
    '',
    'ESQUEMA CADASTRADO (não comprova uso efetivo)',
  ];
  const active=meds.filter(m=>m.status!=='descontinuado').sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  if(!active.length)lines.push('• Nenhum medicamento ativo cadastrado.');
  for(const m of active.slice(0,24)){
    const activeManufacturer=manufacturer.get(m.id!)||'não documentado na última aquisição identificada';
    lines.push(`• ${m.nome} ${m.dosagem||''} | tipo: ${m.tipo_uso||'não informado'} | último fabricante identificado: ${activeManufacturer}`.slice(0,220));
  }
  if(active.length>24)lines.push(`• Mais ${active.length-24} medicamento(s) cadastrados; conferir no aplicativo.`);
  lines.push('','ESTABILIDADE DE BASE (medicamentos marcados voluntariamente)');
  if(!r.anchors.length)lines.push('• Nenhuma âncora selecionada no dispositivo.');
  for(const a of r.anchors)lines.push(`• ${a.medicationName}: ${a.documentedDays}/14 dia(s) com logs, ${a.taken} tomada(s), ${a.explicitlyIgnored} ignorada(s), ${a.confirmedOutOfStock} declarada(s) sem estoque${a.returnDay?`, retorno documentado em ${a.returnDay}`:''}.`);
  lines.push('','QUATRO EIXOS (último registro documentado)');
  for(const a of r.axes)lines.push(`• ${a.label}: ${a.value===null?'sem registro':`${a.value}/10 em ${a.day}`}; ${a.observedDays} dia(s) documentado(s).`);
  lines.push('','SONO / ROTINA / RESGATES');
  lines.push(`• Sono com início/fim documentados: ${r.sleep.observedDays} dia(s) nos últimos 14 dias. Último despertar observado: ${r.sleep.lastWakeAt||'não informado'}.`);
  lines.push(`• Registros de doses SOS/extra tomadas nas últimas 24h: ${r.rescue.takenIn24h}. Isso não mede risco farmacológico.`);
  for(const x of r.rescue.byMedication)lines.push(`  - ${x.medicationName}: ${x.count} registro(s).`);
  lines.push(`• Marcadores voluntários de rotina: ${r.lifestyle.length} ocorrência(s).`);
  lines.push('','HISTÓRICO E TRANSIÇÕES');
  if(!r.transitions.length)lines.push('• Nenhuma descontinuação ou substituição documentada.');
  for(const x of r.transitions.slice(0,12))lines.push(`• ${x.medicationName}: ${x.label}${x.stoppedOn?` em ${x.stoppedOn}`:''}${x.replacementName?` → ${x.replacementName}`:''}${x.reason?`; motivo declarado: ${x.reason}`:''}.`.slice(0,230));
  lines.push('','JUSTIFICATIVAS E CONTEXTO HISTÓRICO (sem supressão de alertas)');
  const notes=input.rationales.filter(x=>allowedIds.has(x.medicationId)&&x.note.trim()&&x.note.length<=1200).slice(-8);
  if(!notes.length)lines.push('• Nenhuma justificativa adicional registrada neste dispositivo.');
  for(const x of notes){const m=meds.find(m=>m.id===x.medicationId);lines.push(`• ${m?.nome||'Medicamento'} — ${x.source==='documento_referido'?'documento referido pelo usuário, não verificado':'relato pessoal'}: ${x.note.slice(0,350)}${x.reference?` | ref.: ${x.reference.slice(0,100)}`:''}`);}
  lines.push('','FORNECIMENTO DOCUMENTADO');
  lines.push(`• Compras particulares registradas: ${r.supply.purchasedEvents}; gasto informado total: R$ ${r.supply.paidTotal.toFixed(2)}; eventos sem valor: ${r.supply.amountUnreportedEvents}.`);
  lines.push(`• Aquisições SUS/gratuitas: ${r.supply.freeOrSusEvents}. Não é possível inferir valor economizado.`);
  lines.push('','COBERTURA E LIMITAÇÕES');
  lines.push(`• Últimos 14 dias: ${r.documentation.doseDays14} dia(s) com logs de dose e ${r.documentation.healthDays14} com registros de saúde.`);
  lines.push('• Histórico de tolerância, relatos e documentos referidos não comprovam segurança de dose nem substituem avaliação médica.');
  lines.push('• Interações, riscos regulatórios e sinais de toxicidade NÃO foram silenciados; dados de dispositivos não excluem emergência.');
  lines.push('• A falta de registro não prova falta de medicamento ou efeito adverso.');
  return lines.join('\n');
}
