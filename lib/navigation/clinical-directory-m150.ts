/**
 * M150 P1 — directory of ACTUAL existing clinical routes.
 * Pure presentation metadata. No fetches, writes, dosage or clinical inference.
 * Group by task, not by implementation names. Keep each route in one section.
 */
export type ClinicalMapIconM150 =
  | 'clock' | 'pill' | 'heart' | 'file' | 'truck' | 'calendar' | 'activity'
  | 'stethoscope' | 'flask' | 'droplet' | 'bell' | 'users' | 'shield'
  | 'brain' | 'eye' | 'layers' | 'factory' | 'clipboard' | 'syringe';
export type ClinicalMapEntryM150 = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: ClinicalMapIconM150;
};
export type ClinicalMapSectionM150 = {
  id: string;
  title: string;
  description: string;
  items: readonly ClinicalMapEntryM150[];
};
export const clinicalDirectoryM150: readonly ClinicalMapSectionM150[] = [
  {
    id: 'rotina', title: 'Rotina e medicamentos',
    description: 'Doses, tratamento, receita, estoque e retirada',
    items: [
      {id:'hoje',label:'Hoje',description:'Linha do tempo e registros do dia',href:'/hoje',icon:'clock'},
      {id:'medicamentos',label:'Medicamentos',description:'Identidade, doses e saldo registrado',href:'/saude/medicamentos',icon:'pill'},
      {id:'tratamentos',label:'Tratamentos',description:'Vínculos e acompanhamento',href:'/saude/tratamentos',icon:'heart'},
      {id:'retiradas',label:'Retiradas',description:'Compromissos e fornecimento',href:'/saude/retiradas',icon:'truck'},
      {id:'renovacao',label:'Receitas e aquisições',description:'Renovação e histórico documental',href:'/saude/renovacao',icon:'file'},
      {id:'fornecimento',label:'Fornecimento e SUS',description:'Processos e próximas etapas',href:'/saude/fornecimento',icon:'shield'},
    ],
  },
  {
    id: 'saude', title: 'Consultas e registros',
    description: 'Perfil clínico, fatos observados e compromissos',
    items: [
      {id:'minha-saude',label:'Fênix e Perfil Clínico',description:'Avatar, medidas e histórico',href:'/saude/fenix',icon:'eye'},
      {id:'registros',label:'Diário de saúde',description:'Registros e relatos informados',href:'/saude/registros',icon:'clipboard'},
      {id:'consultas',label:'Consultas',description:'Agenda e profissionais',href:'/saude/consultas',icon:'stethoscope'},
      {id:'exames',label:'Exames',description:'Pedidos e resultados',href:'/saude/exames',icon:'flask'},
      {id:'cirurgias',label:'Procedimentos',description:'Cirurgias e histórico',href:'/saude/cirurgias',icon:'calendar'},
      {id:'hidratacao',label:'Hidratação',description:'Registros de consumo',href:'/saude/hidratacao',icon:'droplet'},
      {id:'lembretes',label:'Lembretes',description:'Avisos e configurações',href:'/saude/lembretes',icon:'bell'},
      {id:'rede',label:'Profissionais e locais',description:'Médicos, farmácias e unidades',href:'/saude/rede',icon:'users'},
    ],
  },
  {
    id: 'evidencias', title: 'Inteligência e evidências',
    description: 'Análises não substituem registros de origem',
    items: [
      {id:'brain',label:'VAULT Brain',description:'Análise e explicação dos sinais',href:'/saude/brain-v7',icon:'brain'},
      {id:'studio',label:'Visual Studio e quatro eixos',description:'Evolução, visualização e PillStudio',href:'/saude/visual-studio',icon:'eye'},
      {id:'pharmalens',label:'Conferência e bula',description:'PharmaLens e documentos',href:'/saude/pharmalens',icon:'factory'},
      {id:'ocorrencias',label:'Ocorrências, ciclos e vacinas',description:'Histórico e observações registradas',href:'/saude/central-m144',icon:'syringe'},
      {id:'escudo',label:'Estoque e embalagens',description:'Unidades, informações e conferência',href:'/saude/supply-shield',icon:'layers'},
      {id:'resumo',label:'Resumo longitudinal',description:'Registros ao longo do tempo',href:'/saude/registros/relatorio',icon:'activity'},
    ],
  },
  {
    id: 'careflow', title: 'Acompanhamento e histórico',
    description: 'Episódios, sintomas, pressão, Brain e relatórios',
    items: [
      {id:'careflow',label:'Acompanhamento clínico',description:'Consultas e histórico',href:'/saude/careflow',icon:'activity'},
      {id:'episodios',label:'Episódio de atendimento',description:'Consulta e desdobramentos reais',href:'/saude/careflow/episodios',icon:'calendar'},
      {id:'modo-medico',label:'Modo Médico 360',description:'Resumo para consulta e PDF',href:'/saude/careflow/modo-medico',icon:'stethoscope'},
      {id:'linha-do-tempo',label:'Brain longitudinal',description:'História clínica rastreável',href:'/saude/careflow/linha-do-tempo',icon:'brain'},
      {id:'dossie',label:'Dossiê de acompanhamento',description:'Linha do tempo da pessoa',href:'/saude/careflow/dossie',icon:'file'},
      {id:'exames-360',label:'Pedidos e resultados 360',description:'Itens de exame e estados reais',href:'/saude/careflow/exames',icon:'flask'},
      {id:'pressao',label:'Pressão e planos',description:'Medições reais e planos finitos',href:'/saude/careflow/pressao',icon:'heart'},
      {id:'sintomas',label:'Sintomas e evolução',description:'Relatos com horário e intensidade',href:'/saude/careflow/sintomas',icon:'activity'},
      {id:'biblioteca',label:'Biblioteca de PDFs',description:'Arquivos clínicos locais',href:'/saude/careflow/relatorios',icon:'file'},
    ],
  },
  {
    id: 'documentos', title: 'Documentos e proteção',
    description: 'Arquivos de saúde e suporte pessoal',
    items: [
      {id:'documentos',label:'Documentos de saúde',description:'Acervo clínico e anexos',href:'/saude/documentos',icon:'file'},
      {id:'plano',label:'Plano pessoal de segurança',description:'Contatos e informações escolhidas',href:'/saude/plano-seguranca',icon:'shield'},
    ],
  },
];

export function normalizeClinicalSearchM150(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}

/** P5 P5: aliases populares apenas para localizacao de rotas existentes.
 * Nao criam rotas, resultados clinicos, medicamentos nem correspondencia fuzzy arriscada. */
const clinicalSearchAliasesM150P5P5: Readonly<Record<string, readonly string[]>> = {
  hoje: ['minhas doses','horario da dose','dose de hoje','rotina de hoje'],
  medicamentos: ['remedio','remedios','medicacao','medicacoes','comprimido','comprimidos'],
  tratamentos: ['meus tratamentos','plano de tratamento','acompanhamento'],
  retiradas: ['pegar remedio','buscar remedio','retirar na farmacia','retirada do sus'],
  renovacao: ['renovar receita','pedir receita','nova receita','anexar receita'],
  fornecimento: ['sus','medicamento gratuito','fornecimento publico','processo de fornecimento'],
  consultas: ['consulta medica','agendar medico','atendimento medico'],
  exames: ['resultado de exame','pedido de exame'],
  rede: ['farmacia','farmacias','medico','medicos','hospitais'],
  brain: ['inteligencia','analise de medicamentos','alertas do brain'],
  pharmalens: ['fabricante','laboratorio','laboratorios'],
  documentos: ['receitas anexadas','arquivo clinico','documentos clinicos'],
  episodios: ['episodio','pos consulta','retorno'],
  'modo-medico': ['medico','relatorio medico','resumo de consulta'],
  'linha-do-tempo': ['brain','linha do tempo','historico'],
  dossie: ['dossie','historia clinica','pdf'],
  'exames-360': ['laboratorio','pedido de exames','resultado'],
  biblioteca: ['biblioteca de pdf','laudo','arquivo'],
  pressao: ['pressao arterial','afericao'],
  sintomas: ['dor','evolucao','relato'],
};

/** Complementary Hub routes: searchable without flooding the initial 31-card map.
 * All entries point to existing destinations; IDs of original favorites remain untouched.
 */
export const clinicalAdditionalSectionsM150: readonly ClinicalMapSectionM150[] = [
  {id:'complementares',title:'Outras áreas de saúde',description:'Profissionais, reabilitação, documentos e Fênix',items:[
    {id:'reabilitacao',label:'Reabilitação',description:'Programas, equipe e sessões',href:'/saude/reabilitacao',icon:'heart'},
    {id:'vacinas',label:'Vacinação',description:'Carteira e aplicações declaradas',href:'/saude/vacinas',icon:'syringe'},
    {id:'procedimentos-a9',label:'Procedimentos não cirúrgicos',description:'Registros e planejamento',href:'/saude/procedimentos',icon:'stethoscope'},
    {id:'reacoes-a9',label:'Alergias e reações',description:'Relatos e sensibilidades',href:'/saude/reacoes',icon:'heart'},
    {id:'engenharia-clinica',label:'Engenharia Clínica',description:'Fases de tratamento e vínculos',href:'/saude/engenharia-clinica',icon:'activity'},
    {id:'relatorio',label:'Relatório clínico',description:'Resumo revisável e PDF',href:'/saude/relatorios',icon:'file'},
    {id:'rede-medicos',label:'Profissionais de saúde',description:'Médicos e especialidades',href:'/saude/medicos',icon:'users'},
    {id:'rede-hospitais',label:'Hospitais e unidades',description:'Unidades e locais de atendimento',href:'/saude/hospitais',icon:'users'},
    {id:'rede-farmacias',label:'Farmácias e SUS',description:'Farmácias e fornecimento',href:'/saude/farmacias',icon:'users'},
    {id:'fenix-indicadores',label:'Indicadores do corpo',description:'Medidas, peso e sono na Fênix',href:'/saude/fenix#indicadores',icon:'activity'},
    {id:'fenix-fontes',label:'Fontes de saúde',description:'Relógios e dispositivos na Fênix',href:'/saude/fenix#fontes',icon:'eye'},
  ]},
];
const additionalSearchAliasesM150: Readonly<Record<string,readonly string[]>> = {
 reabilitacao:['fisioterapia','terapia ocupacional','sessao','recuperacao funcional'],
 vacinas:['vacina','imunizacao','carteira vacinal','reforco'],
 'procedimentos-a9':['curativo','ambulatorial','intervencao'],
 'reacoes-a9':['intolerancia','alergia','efeito adverso'],
 'engenharia-clinica':['fases','receitas vinculadas','fornecimento'],
 relatorio:['relatorio medico','resumo para consulta','pdf'],
 'rede-medicos':['medicos','doutor','crm','especialidade'],
 'rede-hospitais':['hospital','clinica','unidade','laboratorio'],
 'rede-farmacias':['farmacia','farmacias','farmaceutico'],
 'fenix-indicadores':['sono','peso','altura','biometria'],
 'fenix-fontes':['samsung','health connect','relogio','anel'],
};
export function searchClinicalDirectoryM150(query: string): readonly ClinicalMapSectionM150[] {
  const needle = normalizeClinicalSearchM150(query);
  if (!needle) return clinicalDirectoryM150;
  return [...clinicalDirectoryM150,...clinicalAdditionalSectionsM150].map(section =>
    ({...section,items:section.items.filter(item => normalizeClinicalSearchM150([
      item.label,item.description,section.title,...(clinicalSearchAliasesM150P5P5[item.id] || []),
      ...(additionalSearchAliasesM150[item.id] || [])
    ].join(' ')).includes(needle))})).filter(section => section.items.length > 0);
}
