// lib/types.ts

export const PERSON_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#6366F1',
] as const;

export type PersonColor = (typeof PERSON_COLORS)[number];

export interface Person {
  id?: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  color: string;
  isDefault?: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export type CategoryId = 'saude' | 'pessoal' | 'empresa' | 'outros';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  saude: {
    id: 'saude',
    name: 'Saúde',
    icon: 'Heart',
    color: '#EC4899',
    description: 'Prontuários, receitas, laudos, medicamentos',
  },
  pessoal: {
    id: 'pessoal',
    name: 'Pessoal',
    icon: 'User',
    color: '#3B82F6',
    description: 'C.I.N, CPF, CNH, Certidões',
  },
  empresa: {
    id: 'empresa',
    name: 'Empresa',
    icon: 'Building2',
    color: '#7C9CB5',
    description: 'Documentos corporativos',
  },
  outros: {
    id: 'outros',
    name: 'Outros',
    icon: 'FolderOpen',
    color: '#6B7280',
    description: 'Documentos diversos',
  },
};

export const AREAS = CATEGORIES;
export const CATEGORY_META = CATEGORIES;

export type DocumentType =
  | 'rg'
  | 'cpf'
  | 'cnh'
  | 'certidao_nascimento'
  | 'titulo_eleitor'
  | 'certificado'
  | 'carteira_trabalho'
  | 'passaporte'
  | 'dispensa_militar'
  | 'receita'
  | 'prontuario'
  | 'laudo'
  | 'encaminhamento'
  | 'consulta'
  | 'cirurgia'
  | 'exame_sangue'
  | 'exame_imagem'
  | 'credencial'
  | 'outro';

export interface Attachment {
  id: string;
  url: string;
  thumbnail_url?: string;
  name: string;
  type: 'image' | 'pdf';
  uploaded_at: string;
}

export interface Document {
  id?: string;
  user_id: string;
  person_id: string;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  attachments: Attachment[];
  is_favorite: boolean;
  vault_id?: string;
  hospital_id?: string;
  medico_id?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export const TYPE_CATEGORY_MAP: Record<DocumentType, CategoryId[]> = {
  rg: ['pessoal'],
  cpf: ['pessoal'],
  cnh: ['pessoal'],
  certidao_nascimento: ['pessoal'],
  titulo_eleitor: ['pessoal'],
  receita: ['saude'],
  prontuario: ['saude'],
  laudo: ['saude'],
  encaminhamento: ['saude'],
  consulta: ['saude'],
  cirurgia: ['saude'],
  exame_sangue: ['saude'],
  exame_imagem: ['saude'],
  credencial: ['saude'],
  certificado: ['pessoal', 'empresa', 'outros'],
  carteira_trabalho: ['pessoal', 'empresa'],
  passaporte: ['pessoal'],
  dispensa_militar: ['pessoal'],
  outro: ['pessoal', 'saude', 'empresa', 'outros'],
};

export type DocumentFieldType = 'text' | 'date' | 'select';

export interface DocumentField {
  key: string;
  label: string;
  type: DocumentFieldType;
  options?: string[];
  required?: boolean;
}

export const DOCUMENT_FIELDS: Record<DocumentType, DocumentField[]> = {
  rg: [
    {
      key: 'modelo',
      label: 'Modelo do Documento',
      type: 'select',
      options: ['C.I.N (Nova Identidade)', 'RG (Antigo)'],
      required: true,
    },
    {
      key: 'cpf',
      label: 'Número do CPF',
      type: 'text',
      required: true,
    },
    {
      key: 'rg_number',
      label: 'Número do RG',
      type: 'text',
    },
    {
      key: 'issue_date',
      label: 'Data de emissão',
      type: 'date',
      required: true,
    },
    {
      key: 'expiry_date',
      label: 'Data de validade',
      type: 'date',
    },
    {
      key: 'issuer',
      label: 'Órgão emissor',
      type: 'text',
      required: true,
    },
  ],

  cpf: [
    {
      key: 'number',
      label: 'Número do CPF',
      type: 'text',
      required: true,
    },
  ],

  cnh: [
    {
      key: 'number',
      label: 'Número da CNH',
      type: 'text',
      required: true,
    },
    {
      key: 'category',
      label: 'Categoria',
      type: 'select',
      options: ['A', 'B', 'AB', 'C', 'D', 'E'],
      required: true,
    },
    {
      key: 'issue_date',
      label: 'Data de emissão',
      type: 'date',
      required: true,
    },
    {
      key: 'expiry_date',
      label: 'Data de validade',
      type: 'date',
      required: true,
    },
  ],

  certidao_nascimento: [
    {
      key: 'nome_registrado',
      label: 'Nome Registrado',
      type: 'text',
      required: true,
    },
    {
      key: 'matricula',
      label: 'Matrícula',
      type: 'text',
      required: true,
    },
    {
      key: 'livro',
      label: 'Livro',
      type: 'text',
    },
    {
      key: 'folha',
      label: 'Folha',
      type: 'text',
    },
    {
      key: 'termo',
      label: 'Termo',
      type: 'text',
    },
    {
      key: 'cartorio',
      label: 'Cartório de Registro',
      type: 'text',
    },
    {
      key: 'data_nascimento',
      label: 'Data de Nascimento',
      type: 'date',
      required: true,
    },
  ],

  titulo_eleitor: [
    {
      key: 'number',
      label: 'Número do Título',
      type: 'text',
      required: true,
    },
    {
      key: 'zona',
      label: 'Zona Eleitoral',
      type: 'text',
      required: true,
    },
    {
      key: 'secao',
      label: 'Seção',
      type: 'text',
      required: true,
    },
  ],

  certificado: [
    {
      key: 'institution',
      label: 'Instituição de ensino',
      type: 'text',
      required: true,
    },
    {
      key: 'course',
      label: 'Curso',
      type: 'text',
      required: true,
    },
    {
      key: 'duration',
      label: 'Duração (ex: 120 horas)',
      type: 'text',
      required: true,
    },
    {
      key: 'completion_date',
      label: 'Data de conclusão',
      type: 'date',
    },
  ],

  carteira_trabalho: [
    {
      key: 'numero',
      label: 'Número da CTPS',
      type: 'text',
      required: true,
    },
    {
      key: 'serie',
      label: 'Série',
      type: 'text',
    },
    {
      key: 'data_emissao',
      label: 'Data de emissão',
      type: 'date',
    },
    {
      key: 'uf',
      label: 'UF',
      type: 'text',
    },
  ],

  passaporte: [
    {
      key: 'numero',
      label: 'Número do Passaporte',
      type: 'text',
      required: true,
    },
    {
      key: 'pais',
      label: 'País de emissão',
      type: 'text',
      required: true,
    },
    {
      key: 'data_emissao',
      label: 'Data de emissão',
      type: 'date',
      required: true,
    },
    {
      key: 'data_validade',
      label: 'Data de validade',
      type: 'date',
      required: true,
    },
  ],

  dispensa_militar: [
    {
      key: 'numero',
      label: 'Número do Certificado',
      type: 'text',
      required: true,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      type: 'select',
      options: ['A', 'B', 'C', 'D', 'E'],
      required: true,
    },
    {
      key: 'data_emissao',
      label: 'Data de emissão',
      type: 'date',
    },
  ],

  receita: [
    {
      key: 'medicamento_id',
      label: 'Medicamento',
      type: 'select',
      required: true,
    },
    {
      key: 'dosage',
      label: 'Dosagem',
      type: 'text',
      required: true,
    },
    {
      key: 'medico_id',
      label: 'Médico',
      type: 'select',
      required: true,
    },
    {
      key: 'farmacia_id',
      label: 'Farmácia',
      type: 'select',
    },
    {
      key: 'prescription_date',
      label: 'Data da receita',
      type: 'date',
      required: true,
    },
    {
      key: 'renewal_date',
      label: 'Próxima renovação',
      type: 'date',
      required: true,
    },
  ],

  prontuario: [
    {
      key: 'hospital_id',
      label: 'Hospital',
      type: 'select',
      required: true,
    },
    {
      key: 'medico_id',
      label: 'Médico',
      type: 'select',
      required: true,
    },
    {
      key: 'specialty',
      label: 'Especialidade',
      type: 'text',
      required: true,
    },
    {
      key: 'date',
      label: 'Data',
      type: 'date',
      required: true,
    },
  ],

  laudo: [
    {
      key: 'medico_id',
      label: 'Médico',
      type: 'select',
      required: true,
    },
    {
      key: 'specialty',
      label: 'Especialidade',
      type: 'text',
      required: true,
    },
    {
      key: 'hospital_id',
      label: 'Hospital',
      type: 'select',
      required: true,
    },
    {
      key: 'date',
      label: 'Data',
      type: 'date',
      required: true,
    },
  ],

  encaminhamento: [
    {
      key: 'from_medico_id',
      label: 'Quem encaminhou (Médico)',
      type: 'select',
      required: true,
    },
    {
      key: 'to_medico_id',
      label: 'Para quem (Médico - opcional)',
      type: 'select',
    },
    {
      key: 'reason',
      label: 'Motivo',
      type: 'text',
      required: true,
    },
    {
      key: 'date',
      label: 'Data',
      type: 'date',
      required: true,
    },
  ],

  consulta: [
    {
      key: 'medico_id',
      label: 'Médico',
      type: 'select',
      required: true,
    },
    {
      key: 'specialty',
      label: 'Especialidade',
      type: 'text',
      required: true,
    },
    {
      key: 'hospital_id',
      label: 'Clínica / Hospital',
      type: 'select',
    },
    {
      key: 'date',
      label: 'Data da Consulta',
      type: 'date',
      required: true,
    },
    {
      key: 'reason',
      label: 'Motivo da Consulta',
      type: 'text',
    },
  ],

  cirurgia: [
    {
      key: 'procedure',
      label: 'Procedimento',
      type: 'text',
      required: true,
    },
    {
      key: 'medico_id',
      label: 'Médico Cirurgião',
      type: 'select',
      required: true,
    },
    {
      key: 'hospital_id',
      label: 'Hospital',
      type: 'select',
      required: true,
    },
    {
      key: 'date',
      label: 'Data da Cirurgia',
      type: 'date',
      required: true,
    },
  ],

  exame_sangue: [
    {
      key: 'laboratorio_id',
      label: 'Laboratório',
      type: 'select',
      required: true,
    },
    {
      key: 'data_exame',
      label: 'Data do Exame',
      type: 'date',
      required: true,
    },
  ],

  exame_imagem: [
    {
      key: 'hospital_id',
      label: 'Local / Hospital',
      type: 'select',
      required: true,
    },
    {
      key: 'tipo',
      label: 'Tipo de Exame (Ex: Raio-X, RM)',
      type: 'text',
      required: true,
    },
    {
      key: 'data_exame',
      label: 'Data do Exame',
      type: 'date',
      required: true,
    },
  ],

  credencial: [
    {
      key: 'orgao',
      label: 'Órgão Emissor / Instituição',
      type: 'text',
      required: true,
    },
    {
      key: 'validade',
      label: 'Validade',
      type: 'date',
      required: true,
    },
  ],

  outro: [
    {
      key: 'custom_field_1',
      label: 'Campo personalizado 1',
      type: 'text',
    },
    {
      key: 'custom_field_2',
      label: 'Campo personalizado 2',
      type: 'text',
    },
  ],
};
export interface SyncQueueItem {
  id?: string;
  chave: string;
  table:
    | 'persons'
    | 'documents'
    | 'medicamentos'
    | 'renovacoes'
    | 'vaults'
    | 'vaultMembers'
    | 'medicos'
    | 'farmacias'
    | 'hospitais'
    | 'locais'
    | 'exames'
    | 'consultas'
    | 'cirurgias'
    | 'doseLogs'
    | 'credentials'
    | 'cards'
    | 'instituicoes'
    | 'tratamentos'
    | 'cids'
    | 'anexos_clinicos'
    | 'settings'
    | 'versiculos';
  operation: 'add' | 'update' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  retry_count?: number;
  failed?: boolean;
  next_retry_at?: string | null;
}

export type TipoReceita = 'comum' | 'amarela' | 'azul' | 'branca';

export interface Medicamento {
  id?: string;
  user_id: string;
  person_id?: string;
  document_id?: string;
  nome: string;
  dosagem: string;
  medico_id?: string;
  farmacia_id?: string;
  hospital_id?: string;
  local_id?: string;
  tratamento_ids?: string[];
  medico: string;
  farmacia?: string;
  data_receita: string;
  proxima_renovacao: string;
  observacoes?: string;
  tipo_receita?: TipoReceita;
  tipo_uso?: 'continuo' | 'esporadico' | 'sos';
  forma_farmaceutica?:
    | 'capsula'
    | 'comprimido'
    | 'gota'
    | 'injecao'
    | 'adesivo';
  cor_principal?: string;
  cor_secundaria?: string;
  status?: 'ativo' | 'descontinuado';
  estoque_quantidade?: number;
  estoque_data_referencia?: string;
  estoque_horarios?: string[];
  estoque_unidade_por_dose?: number;
  estoque_unidade_medida?: string;
  estoque_ml_total?: number;
  estoque_gotas_por_ml?: number;
  formato?: string;
  cores?: string[];
  motivo_descontinuacao?: string;
  medico_descontinuacao_id?: string;
  medico_descontinuacao_nome?: string;
  substituido_por_id?: string;
  data_descontinuacao?: string;
  preco?: number;
  historico_dosagens?: {
    dosagem_antiga: string;
    data_mudanca: string;
    medico_responsavel: string;
  }[];
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
  cid_ids?: string[];
  cid_id?: string;

}

export interface Renovacao {
  id?: string;
  user_id: string;
  person_id?: string;
  medicamento_id: string;
  document_id?: string;
  medico_id?: string;
  farmacia_id?: string;
  hospital_id?: string;
  local_id?: string;
  quantidade?: number;
  preco?: number;
  lote?: string;
  validade_produto?: string;
  data: string;
  anexo_url?: string;
  observacoes?: string;
  tipo_aquisicao?: 'comprado' | 'gratuito';
  data_proxima_retirada?: string;
  exige_nova_receita?: boolean;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface DoseLog {
  id?: string;
  user_id: string;
  person_id?: string;
  medicamento_id: string;
  data: string;
  horario: string;
  tomado_em?: string;
  ignorado_em?: string;
  quantidade?: number;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface Exame {
  id?: string;
  user_id?: string;
  person_id?: string;
  document_id?: string;
  nome: string;
  medico_id?: string;
  local_id?: string;
  laboratorio?: string;
  medico?: string;
  data: string;
  horario?: string;
  data_retorno?: string;
  motivo?: string;
  observacoes?: string;
  anexo_url?: string;
  tratamento_ids?: string[];
  synced?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Cirurgia {
  id?: string;
  user_id: string;
  person_id?: string;
  document_id?: string;
  procedimento: string;
  data: string;
  horario?: string;
  medico_id?: string;
  hospital_id?: string;
  local_id?: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface Consulta {
  id?: string;
  user_id: string;
  person_id?: string;
  document_id?: string;
  especialidade: string;
  medico: string;
  medico_id?: string;
  hospital_id?: string;
  local_id?: string;
  data: string;
  horario?: string;
  motivo?: string;
  observacoes?: string;
  anexo_url?: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export type VaultPermission = 'view' | 'edit' | 'admin';

export interface Vault {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface VaultMember {
  id?: string;
  vault_id: string;
  user_id: string;
  email: string;
  name?: string;
  permission: VaultPermission;
  invited_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: string;
  created_at?: string;
  updated_at: string;
  synced: boolean;
}

export interface VaultDocument {
  document_id: string;
  vault_id: string;
  shared_by: string;
  shared_at: string;
}

export interface Medico {
  id?: string;
  user_id: string;
  nome: string;
  especialidade?: string;
  crm?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
  created_at: string;
  hospital_ids?: string[];
  tratamento_ids?: string[];
  local_ids?: string[];
  updated_at: string;
  synced: boolean;
  person_id?: string;

}

export interface Farmacia {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  person_id?: string;

}

export interface Hospital {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  tipo?: string;
  observacoes?: string;
  medico_ids?: string[];
  tratamento_ids?: string[];
  created_at: string;
  updated_at: string;
  synced: boolean;
  person_id?: string;

}

export interface LocalSaude {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  medico_ids?: string[];
  tratamento_ids?: string[];
  tipo?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  person_id?: string;

}

export interface InstituicaoEnsino {
  id?: string;
  user_id: string;
  nome: string;
  cnpj?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Cid {
  id?: string;
  user_id: string;
  person_id?: string;
  codigo: string;
  descricao: string;
  data_diagnostico?: string;
  medico_id?: string;
  hospital_id?: string;
  local_id?: string;
  observacoes?: string;
  anexo_url?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Tratamento {
  id?: string;
  user_id: string;
  person_id?: string;
  nome: string;
  cid_ids?: string[];
  condicao?: string;
  medico_ids?: string[];
  hospital_ids?: string[];
  local_ids?: string[];
  data_inicio?: string;
  status: 'ativo' | 'concluido' | 'suspenso';
  cor?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Credential {
  id?: string;
  user_id: string;
  vault_id?: string;
  title: string;
  username?: string;
  password_encrypted: string;
  url?: string;
  notes?: string;
  category: 'banco' | 'social' | 'trabalho' | 'outros';
  password_history?: {
    encrypted: string;
    date: string;
  }[];
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface AppSettings {
  id: string;
  user_id: string;
  default_person_id?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface Versiculo {
  id: string;
  user_id: string;
  texto: string;
  referencia: string;
  created_at: string;
  updated_at?: string;
}

export type CardType =
  | 'cartao_credito'
  | 'cartao_debito'
  | 'conta_corrente'
  | 'conta_poupanca'
  | 'conta_digital';

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'elo'
  | 'amex'
  | 'hipercard'
  | 'unknown';

export interface BankCard {
  id?: string;
  user_id: string;
  title: string;
  bank_name: string;
  type: CardType;
  card_number_encrypted?: string;
  card_holder?: string;
  brand?: CardBrand;
  expiry_date?: string;
  cvv_encrypted?: string;
  agency?: string;
  account?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}