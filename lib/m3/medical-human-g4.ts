/** Guardian4 G4-02: human display labels only. No clinical identifiers or authorities are rewritten. */
import type {A10Fact} from '@/lib/a10/longitudinal';
const SOURCES:Readonly<Record<string,string>>={
 consultas:'Consultas',cirurgias:'Cirurgias',a1_treatment_phases:'Fases de tratamento',
 hospitalizations_a5:'Internações',hospitalization_events_a5:'Evoluções de internação',
 surgery_journey_events_a7:'Jornada cirúrgica',surgical_intents_a7m5:'Encaminhamentos cirúrgicos',
 rehab_sessions_m5:'Sessões de reabilitação',rehab_milestones_m5:'Marcos de reabilitação',
 vaccination_events_a8:'Vacinação',procedure_events_a9:'Procedimentos',
 sensitivity_events_a9:'Alergias e reações informadas',exam_orders:'Pedidos de exames',
 exam_order_items:'Itens de exames',careflow_events_m2:'CareFlow',
 registros_saude:'Registros de saúde',doseLogs:'Doses registradas',
 consulta:'Consulta',consultation:'Consulta',dose_log:'Registro de dose',
 health_record:'Registro de saúde',registro_saude_pressao:'Medição de saúde',
 exame_cadastrado:'Exame cadastrado',cirurgia_cadastrada:'Cirurgia cadastrada',
 retirada:'Retirada',renovacao_aquisicao:'Renovação ou aquisição',
 tratamento_atual:'Tratamento cadastrado',sensitivity_event_a9:'Relato de reação',
};
/** A report must not display an internal authority key. Its canonical source remains untouched. */
export function humanMedicalSourceG4(value:string):string{
 const key=String(value||'').trim();
 if(!key)return 'Origem clínica não informada';
 if(SOURCES[key])return SOURCES[key];
 if(key.startsWith('careflow_'))return 'Evento do CareFlow';
 if(key.startsWith('reabilitacao_'))return 'Registro de reabilitação';
 if(key.startsWith('vacina_'))return 'Registro de vacinação';
 return 'Registro clínico de origem não detalhada';
}
const UUID=/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
/** Retain factual link existence without exposing unresolved raw identifiers. */
export function humanMedicalRelationG4(value:string):string{
 const text=String(value||'').trim();
 if(!text)return '';
 if(/^Identificador relacionado\s*:/i.test(text))return 'Vínculo referenciado; descrição indisponível';
 if(UUID.test(text))return /^Consulta vinculada por ID\s*:/i.test(text)
  ?'Consulta vinculada por identificador; nome indisponível'
  :'Vínculo por identificador; descrição indisponível';
 return text;
}
/** Only literal matching authority+ID in the same current owner/person may be named. */
export function verifiedMedicalRelationsA10G4(f:A10Fact,all:readonly A10Fact[]):string[]{
 const index=new Map(all.filter(x=>x.userId===f.userId&&x.personId===f.personId&&x.revision==='current')
  .map(x=>[x.key,x] as const));
 const display:string[]=[];const seen=new Set<string>();
 for(const ref of f.relationTargets){
  const key=`${ref.authority}:${ref.id}`;
  if(!ref.id||key===f.key||seen.has(key))continue;
  seen.add(key);
  const target=index.get(key);
  if(!target)continue;
  const title=String(target.title||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,160);
  if(title)display.push(`Registro relacionado: ${title}`);
 }
 return display.slice(0,25);
}
