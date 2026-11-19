/** CI360 M1 — fatos relatados, NUNCA instruções clínicas inferidas. */
export const administrationRouteM1 = ["oral", "otologica", "oftalmica", "nasal", "topica", "transdermica", "inalatoria", "sublingual", "retal", "vaginal", "injetavel", "outra", "nao_informada"] as const;
export type AdministrationRouteM1 = typeof administrationRouteM1[number];
export type AdministrationSideM1 = "direito" | "esquerdo" | "ambos" | "nao_informado";
export type AdministrationSourceM1 = "relato_usuario" | "documento_conferido";
export type ClinicalRouteEpisodeM1 = {
  id: string;
  via: AdministrationRouteM1;
  local: string;
  lado: AdministrationSideM1;
  inicio: string;
  fim?: string;
  consulta_id?: string;
  fonte: AdministrationSourceM1;
  registrado_em: string;
};
export type CourseReviewOutcomeM1 = "resolvido_relato" | "melhorou_relato" | "persiste_relato" | "sem_melhora_relato" | "nao_informado";
export type CourseReviewM1 = {
  id: string;
  course_key: string;
  periodo_fim: string;
  avaliado_em: string;
  percepcao: CourseReviewOutcomeM1;
  nota?: string;
  registrado_em: string;
};
export type CourseDecisionD4 = {
  id: string; course_key: string; tipo: "conclusao_relatada" | "interrupcao_relatada";
  data_evento: string; fonte: "relato_usuario"; registrado_em: string;
  nota?: string; substitui_id?: string;
};
export type MedicationClinicalContextM1 = {
  versao: 1; regimes: ClinicalRouteEpisodeM1[]; revisoes: CourseReviewM1[];
  /** Declarações do usuário: não mutam doses, prescrição ou agenda. */
  decisoes_d4?: CourseDecisionD4[];
};
export type ConsultationDecisionKindM1 = "medicamento" | "exame" | "monitoramento" | "retorno" | "orientacao" | "outro";
export type ConsultationDecisionStateM1 = "discutido" | "prescricao_relatada" | "solicitado_relato" | "pendente" | "realizado_confirmado";
export type ConsultationDecisionM1 = {
  id: string;
  tipo: ConsultationDecisionKindM1;
  situacao: ConsultationDecisionStateM1;
  descricao: string;
  fonte: "relato_usuario" | "documento_conferido";
  registrado_em: string;
};
export type ConsultationOutcomeM1 = {versao:1; relato:string; eventos:ConsultationDecisionM1[]; registrado_em:string; revisado_em:string;};
export const administrationRouteLabelsM1:Record<AdministrationRouteM1,string> = {
 oral:"Oral",otologica:"Otológica (ouvido)",oftalmica:"Oftálmica (olho)",nasal:"Nasal",topica:"Tópica (pele)",transdermica:"Transdérmica",inalatoria:"Inalatória",sublingual:"Sublingual",retal:"Retal",vaginal:"Vaginal",injetavel:"Injetável",outra:"Outra",nao_informada:"Não informada",
};
export const reviewLabelsM1:Record<CourseReviewOutcomeM1,string> = {resolvido_relato:"Relato: objetivo resolvido",melhorou_relato:"Relato: melhorou",persiste_relato:"Relato: persiste",sem_melhora_relato:"Relato: sem melhora",nao_informado:"Prefiro não avaliar"};
const lateralRoutes = new Set<AdministrationRouteM1>(["otologica","oftalmica","nasal","topica","injetavel","outra"]);
export const dateIsValidM1=(date:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+"T12:00:00Z");return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===date;};
export const emptyMedicationClinicalContextM1=():MedicationClinicalContextM1=>({versao:1,regimes:[],revisoes:[]});
export function normalizeMedicationClinicalContextM1(input?:MedicationClinicalContextM1|null):MedicationClinicalContextM1{
 if(!input)return emptyMedicationClinicalContextM1();
 if(input.versao!==1||!Array.isArray(input.regimes)||!Array.isArray(input.revisoes)||input.regimes.length>120||input.revisoes.length>180||
    (input.decisoes_d4!==undefined && (!Array.isArray(input.decisoes_d4)||input.decisoes_d4.length>120||
      input.decisoes_d4.some(x=>!x||typeof x.id!=="string"||typeof x.course_key!=="string"||
        !["conclusao_relatada","interrupcao_relatada"].includes(x.tipo)||x.fonte!=="relato_usuario"||!dateIsValidM1(x.data_evento))||
      new Set(input.decisoes_d4.map(x=>x.id)).size!==input.decisoes_d4.length)))
    throw Error("Contexto clínico antigo ou inválido: revisar antes de salvar.");
 return {versao:1,regimes:[...input.regimes],revisoes:[...input.revisoes],...(input.decisoes_d4!==undefined?{decisoes_d4:[...input.decisoes_d4]}:{})};
}
export function appendRouteEpisodeM1(context:MedicationClinicalContextM1|null|undefined,item:ClinicalRouteEpisodeM1):MedicationClinicalContextM1{
 const previous=normalizeMedicationClinicalContextM1(context);
 if(!item.id?.trim()||previous.regimes.some(r=>r.id===item.id))throw Error("Identidade do regime inválida ou duplicada.");
 if(!administrationRouteM1.includes(item.via)||!dateIsValidM1(item.inicio)||item.fim && (!dateIsValidM1(item.fim)||item.fim<item.inicio))throw Error("Via ou datas do regime inválidas.");
 if(!["direito","esquerdo","ambos","nao_informado"].includes(item.lado))throw Error("Lado anatômico inválido.");
 if(!lateralRoutes.has(item.via)&&item.lado!=="nao_informado")throw Error("Lateralidade incompatível com a via selecionada.");
 if(item.via==="otologica"&&item.local && !/ouvido/i.test(item.local))throw Error("O local otológico deve identificar o ouvido.");
 if(item.via==="oftalmica"&&item.local && !/olho/i.test(item.local))throw Error("O local oftálmico deve identificar o olho.");
 if(item.local.length>90||item.consulta_id && !/^[a-f\d-]{36}$/i.test(item.consulta_id))throw Error("Local ou consulta do regime inválidos.");
 if(!["relato_usuario","documento_conferido"].includes(item.fonte)||!Number.isFinite(Date.parse(item.registrado_em)))throw Error("Fonte ou registro inválidos.");
 return {...previous,regimes:[...previous.regimes,item]};
}
export function recordCourseReviewM1(context:MedicationClinicalContextM1|null|undefined,item:CourseReviewM1,today:string):MedicationClinicalContextM1{
 const previous=normalizeMedicationClinicalContextM1(context);
 if(!item.id?.trim()||!item.course_key?.trim()||!dateIsValidM1(item.periodo_fim)||!dateIsValidM1(today)||item.periodo_fim>=today)throw Error("Revise somente um período já terminado.");
 if(!dateIsValidM1(item.avaliado_em)||item.avaliado_em>today||item.nota&&item.nota.length>800||!Object.hasOwn(reviewLabelsM1,item.percepcao)||!Number.isFinite(Date.parse(item.registrado_em)))throw Error("Revisão de período inválida.");
 if(previous.revisoes.some(x=>x.id===item.id||x.course_key===item.course_key))throw Error("Este período já possui revisão. Não duplicar.");
 return {...previous,revisoes:[...previous.revisoes,item]};
}
/** D4 P2: autoridade única para declarações e retificações auditáveis.
 * Registro NÃO resolve DoseLogs e NÃO altera o tratamento prescrito.
 */
export function appendCourseDecisionD4(context:MedicationClinicalContextM1|null|undefined,
  item:CourseDecisionD4,medicationId:string,today:string):MedicationClinicalContextM1 {
  const previous=normalizeMedicationClinicalContextM1(context);
  if(!medicationId||!dateIsValidM1(today)||!item||typeof item.course_key!=="string")
    throw Error("Identidade ou data de decisão inválida.");
  const prefix=`${medicationId}|Tratamento temporário · `;
  if(!item.course_key.startsWith(prefix)||item.course_key.length>280)throw Error("Chave do período não corresponde ao medicamento.");
  const note=item.course_key.slice(prefix.length);
  const match=/^(\d{4}-\d{2}-\d{2}) · (\d+) dia\(s\)(?: · intervalo (\d+)h · primeira (\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d))?$/.exec(note);
  if(!match||!dateIsValidM1(match[1])||!Number.isInteger(Number(match[2]))||Number(match[2])<1||Number(match[2])>30)
    throw Error("Origem do período não está validada.");
  if(match[3] && (Number(match[3])<1||Number(match[3])>24||!match[4]?.startsWith(match[1])))
    throw Error("Frequência ou início do período inválidos.");
  if(!item.id||!/^[-a-zA-Z0-9]{8,80}$/.test(item.id)||
    !["conclusao_relatada","interrupcao_relatada"].includes(item.tipo)||item.fonte!=="relato_usuario"||
    !dateIsValidM1(item.data_evento)||item.data_evento<match[1]||item.data_evento>today||
    typeof item.nota!=="string" && item.nota!==undefined||
    (item.nota??"").length>500||!Number.isFinite(Date.parse(item.registrado_em)))
    throw Error("Dados da declaração inválidos. Confira a data e o relato.");
  const all=previous.decisoes_d4??[];
  if(all.length>=120)throw Error("Limite de histórico atingido. Exporte o histórico antes de continuar.");
  const matched=all.filter(x=>x.course_key===item.course_key);
  const duplicate=all.find(x=>x.id===item.id);
  if(duplicate){
    // Idempotência de intenção: se exatamente o mesmo ID foi aplicado, não duplicar.
    if(JSON.stringify(duplicate)===JSON.stringify(item))return previous;
    throw Error("ID de declaração já usado com dados diferentes.");
  }
  const latest=matched.at(-1);
  if(latest && item.substitui_id!==latest.id)throw Error("Este período já possui declaração; use uma retificação explícita.");
  if(!latest && item.substitui_id)throw Error("Não existe declaração anterior para retificar.");
  if(matched.length>=8)throw Error("Limite de retificações atingido; revise o histórico.");
  return {...previous,decisoes_d4:[...all,item]};
}

export const emptyConsultationOutcomeM1=(now:string):ConsultationOutcomeM1=>({versao:1,relato:"",eventos:[],registrado_em:now,revisado_em:now});
export function saveConsultationOutcomeM1(previous:ConsultationOutcomeM1|null|undefined,summary:string,event:ConsultationDecisionM1|null,now:string):ConsultationOutcomeM1{
 if(!Number.isFinite(Date.parse(now))||summary.length>4000)throw Error("Resumo excede o limite ou data inválida.");
 const old=previous??emptyConsultationOutcomeM1(now);
 if(old.versao!==1||!Array.isArray(old.eventos)||old.eventos.length>180)throw Error("Desfecho incompatível; não sobrescrever.");
 if(event){
   if(!event.id?.trim()||old.eventos.some(x=>x.id===event.id)||!event.descricao.trim()||event.descricao.length>650||!Number.isFinite(Date.parse(event.registrado_em)))throw Error("Decisão inválida ou repetida.");
   if(!["medicamento","exame","monitoramento","retorno","orientacao","outro"].includes(event.tipo)||!["discutido","prescricao_relatada","solicitado_relato","pendente","realizado_confirmado"].includes(event.situacao)||!["relato_usuario","documento_conferido"].includes(event.fonte))throw Error("Classificação clínica inválida.");
 }
 return {...old,relato:summary.trim(),eventos:event?[...old.eventos,event]:[...old.eventos],revisado_em:now};
}
