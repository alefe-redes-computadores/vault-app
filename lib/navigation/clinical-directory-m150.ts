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
    id: 'saude', title: 'Minha saúde e registros',
    description: 'Perfil clínico, fatos observados e compromissos',
    items: [
      {id:'minha-saude',label:'Minha Saúde e Fênix',description:'Avatar e informações do perfil',href:'/saude/minha-saude',icon:'heart'},
      {id:'registros',label:'Diário de saúde',description:'Registros e relatos informados',href:'/saude/registros',icon:'clipboard'},
      {id:'consultas',label:'Consultas',description:'Agenda e profissionais',href:'/saude/consultas',icon:'stethoscope'},
      {id:'exames',label:'Exames',description:'Pedidos e resultados',href:'/saude/exames',icon:'flask'},
      {id:'cirurgias',label:'Procedimentos',description:'Cirurgias e histórico',href:'/saude/cirurgias',icon:'calendar'},
      {id:'hidratacao',label:'Hidratação',description:'Registros de consumo',href:'/saude/hidratacao',icon:'droplet'},
      {id:'lembretes',label:'Lembretes',description:'Avisos e configurações',href:'/saude/lembretes',icon:'bell'},
      {id:'rede',label:'Rede clínica',description:'Médicos, farmácias e locais',href:'/saude/rede',icon:'users'},
    ],
  },
  {
    id: 'evidencias', title: 'Inteligência e evidências',
    description: 'Análises não substituem registros de origem',
    items: [
      {id:'brain',label:'Brain V7',description:'Análise e explicação dos sinais',href:'/saude/brain-v7',icon:'brain'},
      {id:'studio',label:'Visual Studio e quatro eixos',description:'Evolução, visualização e PillStudio',href:'/saude/visual-studio',icon:'eye'},
      {id:'pharmalens',label:'PharmaLens',description:'Fabricantes e evidências observadas',href:'/saude/pharmalens',icon:'factory'},
      {id:'ocorrencias',label:'Ocorrências, ciclos e vacinas',description:'Histórico e observações registradas',href:'/saude/central-m144',icon:'syringe'},
      {id:'escudo',label:'Estoque e embalagens',description:'Unidades, informações e conferência',href:'/saude/supply-shield',icon:'layers'},
      {id:'resumo',label:'Resumo longitudinal',description:'Registros ao longo do tempo',href:'/saude/registros/relatorio',icon:'activity'},
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

export function searchClinicalDirectoryM150(query: string): readonly ClinicalMapSectionM150[] {
  const needle = normalizeClinicalSearchM150(query);
  if (!needle) return clinicalDirectoryM150;
  return clinicalDirectoryM150.map(section => ({...section,items:section.items.filter(item =>
    normalizeClinicalSearchM150([item.label,item.description,section.title].join(' ')).includes(needle)
  )})).filter(section => section.items.length > 0);
}
