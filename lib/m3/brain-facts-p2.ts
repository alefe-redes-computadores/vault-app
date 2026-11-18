/** M3 P2 — leitura factual longitudinal: nenhuma inferência de causalidade/diagnóstico.
 * Usa somente IDs e timestamps da autoridade existente, sem criar registros clínicos.
 */
export type BrainFactKindP2='consulta'|'cirurgia'|'exame'|'dose_tomada'|'dose_ignorada'|'dose_registrada'|'medicao'|'registro'|'careflow';
export type BrainFactP2={key:string;sourceId:string;kind:BrainFactKindP2;title:string;date:string;provenance:string;href:string;detail:string};
export type BrainInputP2={
  userId:string;personId:string;
  consultas:readonly {id?:string;user_id?:string;person_id?:string;data:string;status:string;motivo?:string}[];
  cirurgias:readonly {id?:string;user_id?:string;person_id?:string;data:string;status:string;procedimento?:string}[];
  exames:readonly {id?:string;user_id?:string;person_id?:string;data:string;nome:string}[];
  doses:readonly {id?:string;user_id?:string;person_id?:string;data:string;horario?:string;tomado_em?:string;ignorado_em?:string}[];
  registros:readonly {id?:string;user_id?:string;person_id?:string;data:string;nome:string;tipo?:string;valor_numerico?:number;valor_medicao?:string;unidade_medida?:string;source?:string|null}[];
  careflow:readonly {id:string;user_id:string;person_id:string;created_at:string;kind:string;payload:Record<string,unknown>}[];
};
const trim=(v:unknown,n=80)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n):'';
const day=(s:unknown)=>{
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(s))return '';
  const value=s.slice(0,10),[y,m,d]=value.split('-').map(Number),utc=new Date(Date.UTC(y,m-1,d));
  return utc.getUTCFullYear()===y&&utc.getUTCMonth()===m-1&&utc.getUTCDate()===d?value:'';
};
export function buildBrainFactsP2(input:BrainInputP2,max=80):BrainFactP2[]{
  if(!input.userId||!input.personId)return [];
  const owner=(x:{user_id?:string;person_id?:string})=>x.user_id===input.userId&&x.person_id===input.personId;
  const rows:BrainFactP2[]=[];
  const append=(kind:BrainFactKindP2,id:string|undefined,date:string,title:string,detail:string,href:string,provenance:string)=>{
    if(!id||!day(date))return;
    rows.push({key:`${kind}:${id}`,sourceId:id,kind,title:trim(title,130),date:day(date),detail:trim(detail,200),href,provenance});
  };
  for(const c of input.consultas.filter(owner))append('consulta',c.id,c.data,'Consulta · '+trim(c.motivo||'Compromisso'),`Situação registrada: ${trim(c.status)}`,`/saude/consultas/detalhes?id=${encodeURIComponent(c.id||'')}`,'Consulta cadastrada');
  for(const c of input.cirurgias.filter(owner))append('cirurgia',c.id,c.data,'Cirurgia · '+trim(c.procedimento||'Procedimento'),`Situação registrada: ${trim(c.status)}`,`/saude/cirurgias/detalhes?id=${encodeURIComponent(c.id||'')}`,'Cirurgia cadastrada');
  for(const e of input.exames.filter(owner))append('exame',e.id,e.data,'Exame · '+trim(e.nome),'Agendamento ou registro; não comprova resultado',`/saude/exames/detalhes?id=${encodeURIComponent(e.id||'')}`,'Exame cadastrado');
  for(const d of input.doses.filter(owner)){
    const status:BrainFactKindP2=d.tomado_em?'dose_tomada':d.ignorado_em?'dose_ignorada':'dose_registrada';
    append(status,d.id,d.data,status==='dose_tomada'?'Dose marcada como tomada':status==='dose_ignorada'?'Dose marcada como ignorada':'Dose registrada sem confirmação',
      trim(d.horario||''),'/hoje?focus=doses','DoseLog da pessoa');
  }
  for(const r of input.registros.filter(owner)){
    const num=typeof r.valor_numerico==='number'&&Number.isFinite(r.valor_numerico)?String(r.valor_numerico):'';
    const knownMeasurement=/^(pressao_arterial|glicemia|peso|temperatura|frequencia_cardiaca|saturacao|pressao|oximetria)$/i.test(r.tipo||'');
    const measured=knownMeasurement||Boolean(num&&r.unidade_medida);
    const declaredValue=num||trim(r.valor_medicao,45);
    const detail=declaredValue?`${declaredValue}${r.unidade_medida?' '+trim(r.unidade_medida):''}`:'Valor não informado';
    append(measured?'medicao':'registro',r.id,r.data,trim(r.nome||r.tipo||'Registro de saúde'),measured?detail:'Registro pessoal; não equivale a uma aferição numérica','/saude/registros',r.source?'Registro · '+trim(r.source):'Registro informado');
  }
  for(const e of input.careflow.filter(owner)){
    const described=trim(e.payload?.title||e.payload?.name||e.kind);
    append('careflow',e.id,e.created_at,'CareFlow · '+described,'Evento vinculado; revisar fonte e documento','/saude/careflow/dossie','Evento CareFlow M2');
  }
  const seen=new Set<string>();
  return rows.filter(r=>!seen.has(r.key)&&Boolean(seen.add(r.key)))
    .sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key)).slice(0,Math.max(0,Math.min(250,max)));
}
