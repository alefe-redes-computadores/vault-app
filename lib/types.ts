// ============================================================
// 1. PESSOAS
// ============================================================
export interface Person {
  id?: number;
  user_id: string; // vinculado ao Supabase Auth
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string; // foto do Google
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 2. CATEGORIAS (fixas, com cores)
// ============================================================
export type CategoryId = 'saude' | 'pessoal' | 'empresa' | 'outros';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string; // nome do ícone Lucide
  color: string; // hex
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
    description: 'RG, CPF, CNH, carteira de trabalho',
  },
  empresa: {
    id: 'empresa',
    name: 'Empresa',
    icon: 'Building2',
    color: '#F59E0B',
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

// ============================================================
// 2.1 ALIAS PARA COMPATIBILIDADE (AREAS e CATEGORY_META)
// ============================================================
export const AREAS = CATEGORIES;
export const CATEGORY_META = CATEGORIES;

// ============================================================
// 3. DOCUMENTOS (com metadata dinâmica)
// ============================================================
export type DocumentType =
  | 'rg'
  | 'cpf'
  | 'cnh'
  | 'certificado'
  | 'receita'
  | 'prontuario'
  | 'laudo'
  | 'encaminhamento'
  | 'outro';

export interface Attachment {
  id: string;
  url: string; // local (blob) ou remota (Supabase)
  name: string;
  type: 'image' | 'pdf';
  uploaded_at: string;
}

export interface Document {
  id?: number;
  person_id: number;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description?: string;
  metadata: Record<string, any>; // campos específicos por tipo
  attachments: Attachment[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 3.1 CAMPOS POR TIPO DE DOCUMENTO (para formulário dinâmico)
// ============================================================
export const DOCUMENT_FIELDS: Record<
  DocumentType,
  Array<{ key: string; label: string; type: 'text' | 'date' | 'select'; options?: string[] }>
> = {
  rg: [
    { key: 'number', label: 'Número do RG', type: 'text' },
    { key: 'issue_date', label: 'Data de emissão', type: 'date' },
    { key: 'expiry_date', label: 'Data de validade', type: 'date' },
    { key: 'issuer', label: 'Órgão emissor', type: 'text' },
  ],
  cpf: [{ key: 'number', label: 'Número do CPF', type: 'text' }],
  cnh: [
    { key: 'number', label: 'Número da CNH', type: 'text' },
    { key: 'category', label: 'Categoria', type: 'select', options: ['A', 'B', 'C', 'D', 'E'] },
    { key: 'issue_date', label: 'Data de emissão', type: 'date' },
    { key: 'expiry_date', label: 'Data de validade', type: 'date' },
  ],
  certificado: [
    { key: 'institution', label: 'Instituição de ensino', type: 'text' },
    { key: 'course', label: 'Curso', type: 'text' },
    { key: 'duration', label: 'Duração (ex: 120 horas)', type: 'text' },
    { key: 'completion_date', label: 'Data de conclusão', type: 'date' },
  ],
  receita: [
    { key: 'medication', label: 'Medicamento', type: 'text' },
    { key: 'dosage', label: 'Dosagem', type: 'text' },
    { key: 'doctor', label: 'Médico', type: 'text' },
    { key: 'pharmacy', label: 'Farmácia (opcional)', type: 'text' },
    { key: 'prescription_date', label: 'Data da receita', type: 'date' },
    { key: 'renewal_date', label: 'Próxima renovação', type: 'date' },
  ],
  prontuario: [
    { key: 'hospital', label: 'Hospital', type: 'text' },
    { key: 'doctor', label: 'Médico', type: 'text' },
    { key: 'specialty', label: 'Especialidade', type: 'text' },
    { key: 'date', label: 'Data', type: 'date' },
  ],
  laudo: [
    { key: 'doctor', label: 'Médico', type: 'text' },
    { key: 'specialty', label: 'Especialidade', type: 'text' },
    { key: 'hospital', label: 'Hospital', type: 'text' },
    { key: 'date', label: 'Data', type: 'date' },
  ],
  encaminhamento: [
    { key: 'from', label: 'Quem encaminhou', type: 'text' },
    { key: 'to', label: 'Para quem (opcional)', type: 'text' },
    { key: 'reason', label: 'Motivo', type: 'text' },
    { key: 'date', label: 'Data', type: 'date' },
  ],
  outro: [
    { key: 'custom_field_1', label: 'Campo personalizado 1', type: 'text' },
    { key: 'custom_field_2', label: 'Campo personalizado 2', type: 'text' },
  ],
};

// ============================================================
// 4. METADADOS POR TIPO DE DOCUMENTO (campos específicos)
// ============================================================
export type RGMetadata = {
  number: string;
  issue_date: string;
  expiry_date: string;
  issuer: string; // órgão emissor
};

export type CPFMetadata = {
  number: string;
};

export type CNHMetadata = {
  number: string;
  category: 'A' | 'B' | 'C' | 'D' | 'E';
  issue_date: string;
  expiry_date: string;
};

export type CertificadoMetadata = {
  institution: string;
  course: string;
  duration: string; // ex: "120 horas"
  completion_date?: string;
};

export type ReceitaMetadata = {
  medication: string;
  dosage: string;
  doctor: string;
  pharmacy?: string;
  prescription_date: string;
  renewal_date: string; // próxima renovação
};

export type ProntuarioMetadata = {
  hospital: string;
  doctor: string;
  specialty: string;
  date: string;
};

export type LaudoMetadata = {
  doctor: string;
  specialty: string;
  hospital: string;
  date: string;
};

export type EncaminhamentoMetadata = {
  from: string; // quem encaminhou
  to?: string; // para quem
  reason: string;
  date: string;
};

// ============================================================
// 5. FILA DE SINCRONIZAÇÃO
// ============================================================
export interface SyncQueueItem {
  id?: number;
  table: 'persons' | 'documents' | 'medicamentos' | 'renovacoes';
  operation: 'add' | 'update' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// 6. MÓDULO SAÚDE — MEDICAMENTOS E RENOVAÇÕES
// ============================================================
export interface Medicamento {
  id?: number;
  document_id: number; // vinculado ao documento principal
  nome: string;
  dosagem: string;
  medico: string;
  farmacia?: string;
  data_receita: string;
  proxima_renovacao: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface Renovacao {
  id?: number;
  medicamento_id: number;
  data: string;
  anexo_url?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}