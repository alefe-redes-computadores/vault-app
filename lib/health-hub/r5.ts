/** VAULT UI360 R5: presentation/navigation only; never creates clinical events. */
import type { Consulta } from "@/lib/types";
import type { CareFlowEventM2 } from "@/lib/careflow-m2/domain";

export type HealthGroupR5 = "intelligence" | "body" | "capture" | "foundation";
export type HealthIconR5 =
  | "activity" | "flask" | "folder" | "heart" | "thermometer" | "moon" | "droplets"
  | "scan" | "files" | "shield" | "user" | "sparkles" | "pill" | "book" | "chart"
  | "lock" | "stethoscope" | "building" | "package" | "calendar" | "users";
export interface HubModuleR5 {
  id: string; title: string; description: string; href: string;
  group: HealthGroupR5; icon: HealthIconR5; keywords: readonly string[];
}
export const HEALTH_MODULES_R5: readonly HubModuleR5[] = [
  {id:"careflow",title:"Acompanhamento clínico",description:"Consultas e evolução",href:"/saude/careflow",group:"intelligence",icon:"activity",keywords:["cuidado","acompanhamento","protocolo"]},
  {id:"exames",title:"Exames 360",description:"Pedidos, itens e resultados",href:"/saude/careflow/exames",group:"intelligence",icon:"flask",keywords:["pedido","laboratorio","resultados"]},
  {id:"dossie",title:"Dossiê Clínico",description:"Linha do tempo e PDF local",href:"/saude/careflow/dossie",group:"intelligence",icon:"folder",keywords:["relatorio","medico","pdf","linha do tempo"]},
  {id:"pressao",title:"Pressão arterial",description:"Planos e aferições reais",href:"/saude/careflow/pressao",group:"body",icon:"heart",keywords:["monitoramento","pressao","afericao"]},
  {id:"sintomas",title:"Sintomas e reações",description:"Relatos e evolução",href:"/saude/careflow/sintomas",group:"body",icon:"thermometer",keywords:["dor","reacoes","diario","sintoma"]},
  {id:"sono",title:"Sono e medidas",description:"Indicadores do corpo",href:"/saude/fenix#indicadores",group:"body",icon:"moon",keywords:["sono","medidas","peso","altura","biometria"]},
  {id:"hidratacao",title:"Hidratação",description:"Água e metas registradas",href:"/saude/hidratacao",group:"body",icon:"droplets",keywords:["agua","consumo"]},
  {id:"pharmalens",title:"Conferência e bula",description:"PharmaLens e documentos",href:"/saude/pharmalens",group:"capture",icon:"scan",keywords:["receita","ocr","imagem","pedido"]},
  {id:"biblioteca",title:"Biblioteca de PDFs",description:"Relatórios CareFlow locais",href:"/saude/careflow/relatorios",group:"capture",icon:"files",keywords:["documento","pdf","laudo","arquivo"]},
  {id:"relatorio",title:"Relatório Clínico 360",description:"Resumo clínico completo",href:"/saude/relatorios",group:"capture",icon:"book",keywords:["relatorio medico","pdf","a4"]},
  {id:"tratamentos",title:"Tratamentos",description:"Condições e vínculos",href:"/saude/tratamentos",group:"foundation",icon:"shield",keywords:["condicao","tratamento","cuidado"]},
  {id:"engenharia-clinica",title:"Engenharia Clínica 360",description:"Fases, receitas vinculadas e locais",href:"/saude/engenharia-clinica",group:"foundation",icon:"activity",keywords:["evolucao","tratamento","receita","renovacao","fornecimento","fases"]},
  {id:"medicamentos",title:"Medicamentos 360",description:"Rotina e estoque",href:"/saude/medicamentos",group:"foundation",icon:"pill",keywords:["dose","remedio","estoque"]},
  {id:"fenix",title:"Fênix e Perfil Clínico",description:"Avatar, medidas e histórico",href:"/saude/fenix",group:"foundation",icon:"user",keywords:["fenix","avatar","perfil","alergia","minha saude"]},
  {id:"studio",title:"Fênix Studio",description:"Aparência e identidade visual",href:"/saude/visual-studio",group:"foundation",icon:"sparkles",keywords:["avatar","studio","corpo"]},
  {id:"fontes",title:"Fontes de saúde",description:"Relógio, anel e aparelhos",href:"/saude/fenix#fontes",group:"foundation",icon:"chart",keywords:["samsung","health connect","relogio","anel","sincronizacao"]},
  {id:"seguranca",title:"Plano de segurança",description:"Apoio e contatos escolhidos",href:"/saude/plano-seguranca",group:"foundation",icon:"lock",keywords:["apoio","contatos","seguranca"]},
  // D3: entries of the real clinical directory are also pinnable in Explorar.
  {id:"consultas",title:"Consultas",description:"Agenda e retornos",href:"/saude/consultas",group:"intelligence",icon:"calendar",keywords:["medico","atendimento","consulta"]},
  {id:"exames-clinicos",title:"Exames registrados",description:"Área clínica de exames",href:"/saude/exames",group:"intelligence",icon:"flask",keywords:["exame","pedido","resultado"]},
  {id:"cirurgias",title:"Procedimentos",description:"Cirurgias e histórico",href:"/saude/cirurgias",group:"intelligence",icon:"stethoscope",keywords:["cirurgia","operacao","procedimento"]},
  {id:"reabilitacao",title:"Reabilitação 360",description:"Programas, equipe e sessões",href:"/saude/reabilitacao",group:"intelligence",icon:"heart",keywords:["reabilitacao","fisioterapia","recuperacao funcional","sessao","terapia ocupacional"]},
  {id:"registros",title:"Diário de saúde",description:"Registros e relatos",href:"/saude/registros",group:"body",icon:"book",keywords:["sintomas","humor","diario"]},
  {id:"retiradas",title:"Retiradas",description:"Compromissos e fornecimento",href:"/saude/retiradas",group:"foundation",icon:"package",keywords:["sus","retirada","medicamento"]},
  {id:"renovacao",title:"Receitas e aquisições",description:"Renovação documental",href:"/saude/renovacao",group:"foundation",icon:"files",keywords:["receitas","renovacao","aquisicao"]},
  {id:"fornecimento",title:"Fornecimento e SUS",description:"Processos públicos e documentos",href:"/saude/fornecimento",group:"foundation",icon:"shield",keywords:["sus","processo","documentos"]},
  {id:"rede",title:"Rede clínica",description:"Médicos, farmácias e locais",href:"/saude/rede",group:"foundation",icon:"users",keywords:["medico","farmacia","hospital"]},
  {id:"lembretes",title:"Lembretes",description:"Central de notificações",href:"/saude/lembretes",group:"foundation",icon:"calendar",keywords:["alarme","aviso","horario"]},
  {id:"ocorrencias",title:"Ocorrências e ciclos",description:"Histórico clínico",href:"/saude/central-m144",group:"body",icon:"book",keywords:["vacinas","ciclos","eventos"]},
  {id:"escudo",title:"Estoque e embalagens",description:"Unidades e conferência",href:"/saude/supply-shield",group:"foundation",icon:"package",keywords:["estoque","unidade","embalagem"]},
  {id:"resumo",title:"Resumo longitudinal",description:"Relatórios de registros",href:"/saude/registros/relatorio",group:"intelligence",icon:"chart",keywords:["historico","resumo","relatorio"]},
  {id:"documentos",title:"Documentos de saúde",description:"Acervo clínico",href:"/saude/documentos",group:"capture",icon:"files",keywords:["receita","documento","pdf"]},
  {id:"brain",title:"VAULT Brain",description:"Observações e evidências",href:"/saude/brain-v7",group:"intelligence",icon:"activity",keywords:["brain","inteligencia","observacao"]},
  {id:"modo-medico",title:"Modo Médico 360",description:"Resumo para consulta",href:"/saude/careflow/modo-medico",group:"intelligence",icon:"stethoscope",keywords:["medico","pdf","dossie"]},
  {id:"episodios",title:"Episódio de atendimento",description:"Fatos de uma consulta",href:"/saude/careflow/episodios",group:"intelligence",icon:"calendar",keywords:["episodio","consulta","retorno"]},
  {id:"linha-do-tempo",title:"Brain longitudinal",description:"Registros rastreáveis",href:"/saude/careflow/linha-do-tempo",group:"intelligence",icon:"chart",keywords:["historico","brain","linha do tempo"]},
] as const;

export const NETWORK_SEARCH_R5: readonly Pick<HubModuleR5,"id"|"title"|"description"|"href"|"icon"|"keywords">[] = [
  {id:"rede-medicos",title:"Profissionais de saúde",description:"Rede multiprofissional",href:"/saude/medicos",icon:"stethoscope",keywords:["doutor","crm","especialidade"]},
  {id:"rede-unidades",title:"Hospitais e unidades",description:"Rede de Saúde",href:"/saude/hospitais",icon:"building",keywords:["hospital","clinica","laboratorio","local"]},
  {id:"rede-farmacias",title:"Farmácias e SUS",description:"Rede de Saúde",href:"/saude/farmacias",icon:"package",keywords:["fornecimento","retirada","medicamento"]},
  {id:"rede-consultas",title:"Consultas e retornos",description:"Rede de Saúde",href:"/saude/consultas",icon:"calendar",keywords:["agenda","consulta","medico"]},
] as const;

export const HEALTH_GROUPS_R5: readonly {id:HealthGroupR5;title:string;subtitle:string}[] = [
  {id:"intelligence",title:"Acompanhamento e inteligência",subtitle:"Evolução, pedidos e dossiê"},
  {id:"body",title:"Corpo, sinais e rotina",subtitle:"Aferições e dados biológicos"},
  {id:"capture",title:"Captura e documentos",subtitle:"Leitura assistida e relatórios"},
  {id:"foundation",title:"Base clínica e identidade",subtitle:"Tratamentos, perfil e Fênix"},
];
export const MODULE_IDS_R5 = new Set(HEALTH_MODULES_R5.map(item => item.id));
export type HubPreferenceR5 = {version:1; favorites:string[]; recent:string[]};
export const EMPTY_PREFERENCES_R5:HubPreferenceR5 = {version:1,favorites:[],recent:[]};
/** Migrate the old "Minha saúde" favorite onto the Fênix destination without losing scope or order. */
const uniqueValid=(raw:unknown,limit:number)=>Array.isArray(raw)
  ? [...new Set(raw.filter((x):x is string=>typeof x==="string")
    .map(id=>id==="minha-saude"?"fenix":id)
    .filter(id=>MODULE_IDS_R5.has(id)))].slice(0,limit)
  : [];
export function parseHubPreferencesR5(raw:unknown):HubPreferenceR5 {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return {...EMPTY_PREFERENCES_R5};
  const candidate=raw as Record<string,unknown>;
  if(candidate.version!==1)return {...EMPTY_PREFERENCES_R5};
  return {version:1,favorites:uniqueValid(candidate.favorites,HEALTH_MODULES_R5.length),recent:uniqueValid(candidate.recent,8)};
}
export function moveHubFavoriteR5(items:readonly string[],id:string,delta:number):string[] {
  const arr=uniqueValid(items,HEALTH_MODULES_R5.length),idx=arr.indexOf(id),next=idx+delta;
  if(idx<0||next<0||next>=arr.length||!Number.isInteger(delta))return arr;
  [arr[idx],arr[next]]=[arr[next],arr[idx]];return arr;
}
export function toggleHubFavoriteR5(items:readonly string[],id:string):string[]{
  const prev=uniqueValid(items,HEALTH_MODULES_R5.length);
  if(!MODULE_IDS_R5.has(id))return prev;
  return prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
}
export function recordHubRecentR5(items:readonly string[],id:string):string[]{
  return MODULE_IDS_R5.has(id)?uniqueValid([id,...items.filter(x=>x!==id)],8):uniqueValid(items,8);
}
export function normalizeHubSearchR5(text:string):string{return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();}
export function matchHubModuleR5(module: Pick<HubModuleR5,"title"|"description"|"keywords">,query:string):boolean {
  const norm=normalizeHubSearchR5(query);return !norm||normalizeHubSearchR5([module.title,module.description,...module.keywords].join(" ")).includes(norm);
}
export type FocusR5 = {id:string; reason:string; kind:"brain"|"consultation"|"protocol"|"exam"|"recent"};
type ScopedBrainR5={person_id:string;state:string;snoozed_until?:string;snapshot:{link?:string;titulo?:string}};
type ScopedConsultationR5=Pick<Consulta,"user_id"|"person_id"|"status"|"data"|"horario">;
type ScopedEventR5=Pick<CareFlowEventM2,"id"|"user_id"|"person_id"|"kind"|"parent_id"|"payload"|"created_at">;
export interface FocusInputR5 {userId:string;personId:string;consultations:readonly ScopedConsultationR5[];events:readonly ScopedEventR5[];brain?:readonly ScopedBrainR5[];favorites:readonly string[];recent:readonly string[];now:Date;}
const isoDay=(raw:string)=>{const input=(raw||"").slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(input))return input;if(/^\d{2}\/\d{2}\/\d{4}$/.test(input)){const [d,m,y]=input.split("/");return `${y}-${m}-${d}`;}return "";};
const localDay=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
/** Contextual cards use only explicit, account/person-scoped evidence. */
export function buildHealthFocusR5(input:FocusInputR5):FocusR5[]{
  if(!input.userId||!input.personId||!Number.isFinite(input.now.getTime()))return [];
  const favorites=new Set(uniqueValid(input.favorites,HEALTH_MODULES_R5.length));
  const ownedConsultations=input.consultations.filter(c=>c.user_id===input.userId&&c.person_id===input.personId);
  const ownedEvents=input.events.filter(e=>e.user_id===input.userId&&e.person_id===input.personId);
  const focus:FocusR5[]=[], used=new Set<string>();
  const add=(id:string,reason:string,kind:FocusR5["kind"])=>{if(MODULE_IDS_R5.has(id)&&!favorites.has(id)&&!used.has(id)&&focus.length<4){focus.push({id,reason,kind});used.add(id);}};
  const nowMs=input.now.getTime(),today=localDay(input.now);
  for(const item of input.brain||[]){
    if(item.person_id!==input.personId||item.state!=="active"||(item.snoozed_until&&item.snoozed_until>input.now.toISOString()))continue;
    const href=item.snapshot.link||"";
    const module=HEALTH_MODULES_R5.find(m=>href===m.href||href.startsWith(m.href+"?"))||[...HEALTH_MODULES_R5].sort((a,b)=>b.href.length-a.href.length).find(m=>href.startsWith(m.href+"/"));
    if(module)add(module.id,String(item.snapshot.titulo||"Atenção registrada").slice(0,90),"brain");
  }
  const soon=ownedConsultations.some(c=>{
    if(c.status!=="agendada")return false;
    const date=isoDay(c.data);if(!date)return false;
    if(date===today&&!c.horario)return true; // date-only source; never imply an hour
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.horario||""))return false;
    const when=new Date(`${date}T${c.horario}:00`).getTime();return Number.isFinite(when)&&when>=nowMs&&when<=nowMs+86400000;
  });
  if(soon){add("dossie","Consulta agendada: confira seu dossiê","consultation");add("careflow","Prepare o histórico para a consulta","consultation");}
  const since=new Date(nowMs-2*86400000);
  const done=ownedConsultations.some(c=>c.status==="realizada"&&!!isoDay(c.data)&&isoDay(c.data)>=localDay(since)&&isoDay(c.data)<=today);
  if(done){add("pharmalens","Consulta registrada como realizada; reveja documentos","consultation");add("exames","Confira se há pedidos de exames para cadastrar","consultation");add("sintomas","Se necessário, registre um acompanhamento","consultation");}
  const liveMonitor=ownedEvents.some(e=>e.kind==="monitor_plan"&&typeof e.payload.start==="string"&&typeof e.payload.end==="string"&&isoDay(e.payload.start)<=today&&isoDay(e.payload.end)>=today);
  if(liveMonitor)add("pressao","Plano de monitoramento ativo neste período","protocol");
  const examItems=ownedEvents.filter(e=>e.kind==="exam_item");
  const pending=examItems.some(item=>{
    // Only a real item without a confirmed result or cancellation is shown.
    const children=ownedEvents.filter(e=>e.parent_id===item.id);
    const lastStatus=children.filter(e=>e.kind==="exam_status").sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
    const result=children.some(e=>e.kind==="exam_result");
    return !result&&lastStatus?.payload.state!=="cancelled"&&lastStatus?.payload.state!=="result_received";
  });
  if(pending)add("exames","Há exame cadastrado sem resultado confirmado","exam");
  // Recents are captured from explicit opens through this launcher; never fabricated.
  for(const id of uniqueValid(input.recent,8)){add(id,"Acessado recentemente neste Hub","recent");if(focus.length>=4)break;}
  return focus;
}
