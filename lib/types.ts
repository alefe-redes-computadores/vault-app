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
// 3. DOCUMENTOS (com metadata dinâmica e user_id)
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
  user_id: string;
  person_id: number;
  category_id: CategoryId;
  type: DocumentType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  attachments: Attachment[];
  is_favorite: boolean;
  vault_id?: number;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 3.1 CAMPOS POR TIPO DE DOCUMENTO (com required)
// ============================================================
export const DOCUMENT_FIELDS: Record<
  DocumentType,
  Array<{ key: string; label: string; type: 'text' | 'date' | 'select'; options?: string[]; required?: boolean }>
> = {
  rg: [
    { key: 'number', label: 'Número do RG', type: 'text', required: true },
    { key: 'issue_date', label: 'Data de emissão', type: 'date', required: true },
    { key: 'expiry_date', label: 'Data de validade', type: 'date', required: true },
    { key: 'issuer', label: 'Órgão emissor', type: 'text', required: true },
  ],
  cpf: [{ key: 'number', label: 'Número do CPF', type: 'text', required: true }],
  cnh: [
    { key: 'number', label: 'Número da CNH', type: 'text', required: true },
    { key: 'category', label: 'Categoria', type: 'select', options: ['A', 'B', 'C', 'D', 'E'], required: true },
    { key: 'issue_date', label: 'Data de emissão', type: 'date', required: true },
    { key: 'expiry_date', label: 'Data de validade', type: 'date', required: true },
  ],
  certificado: [
    { key: 'institution', label: 'Instituição de ensino', type: 'text', required: true },
    { key: 'course', label: 'Curso', type: 'text', required: true },
    { key: 'duration', label: 'Duração (ex: 120 horas)', type: 'text', required: true },
    { key: 'completion_date', label: 'Data de conclusão', type: 'date' },
  ],
  receita: [
    { key: 'medication', label: 'Medicamento', type: 'text', required: true },
    { key: 'dosage', label: 'Dosagem', type: 'text', required: true },
    { key: 'doctor', label: 'Médico', type: 'select', required: true },
    { key: 'pharmacy', label: 'Farmácia', type: 'select' },
    { key: 'prescription_date', label: 'Data da receita', type: 'date', required: true },
    { key: 'renewal_date', label: 'Próxima renovação', type: 'date', required: true },
  ],
  prontuario: [
    { key: 'hospital', label: 'Hospital', type: 'select', required: true },
    { key: 'doctor', label: 'Médico', type: 'select', required: true },
    { key: 'specialty', label: 'Especialidade', type: 'text', required: true },
    { key: 'date', label: 'Data', type: 'date', required: true },
  ],
  laudo: [
    { key: 'doctor', label: 'Médico', type: 'select', required: true },
    { key: 'specialty', label: 'Especialidade', type: 'text', required: true },
    { key: 'hospital', label: 'Hospital', type: 'select', required: true },
    { key: 'date', label: 'Data', type: 'date', required: true },
  ],
  encaminhamento: [
    { key: 'from', label: 'Quem encaminhou', type: 'text', required: true },
    { key: 'to', label: 'Para quem (opcional)', type: 'text' },
    { key: 'reason', label: 'Motivo', type: 'text', required: true },
    { key: 'date', label: 'Data', type: 'date', required: true },
  ],
  outro: [
    { key: 'custom_field_1', label: 'Campo personalizado 1', type: 'text' },
    { key: 'custom_field_2', label: 'Campo personalizado 2', type: 'text' },
  ],
};

// ============================================================
// 4. METADADOS POR TIPO DE DOCUMENTO
// ============================================================
export type RGMetadata = {
  number: string;
  issue_date: string;
  expiry_date: string;
  issuer: string;
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
  duration: string;
  completion_date?: string;
};

export type ReceitaMetadata = {
  medication: string;
  dosage: string;
  doctor: string; // ID do médico selecionado
  pharmacy?: string; // ID da farmácia selecionada
  prescription_date: string;
  renewal_date: string;
};

export type ProntuarioMetadata = {
  hospital: string; // ID do hospital selecionado
  doctor: string; // ID do médico selecionado
  specialty: string;
  date: string;
};

export type LaudoMetadata = {
  doctor: string; // ID do médico selecionado
  specialty: string;
  hospital: string; // ID do hospital selecionado
  date: string;
};

export type EncaminhamentoMetadata = {
  from: string;
  to?: string;
  reason: string;
  date: string;
};

// ============================================================
// 5. FILA DE SINCRONIZAÇÃO
// ============================================================
export interface SyncQueueItem {
  id?: number;
  table: 'persons' | 'documents' | 'medicamentos' | 'renovacoes' | 'vaults' | 'vaultMembers';
  operation: 'add' | 'update' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// 6. MÓDULO SAÚDE — MEDICAMENTOS E RENOVAÇÕES
// ============================================================
export interface Medicamento {
  id?: number;
  document_id: number;
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

// ============================================================
// 7. COFRES FAMILIARES / COMPARTILHAMENTO
// ============================================================
export type VaultPermission = 'view' | 'edit' | 'admin';

export interface Vault {
  id?: number;
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
  id?: number;
  vault_id: number;
  user_id: string;
  email: string;
  name?: string;
  permission: VaultPermission;
  invited_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: string;
  updated_at: string;
  synced: boolean;
}

export interface VaultDocument {
  document_id: number;
  vault_id: number;
  shared_by: string;
  shared_at: string;
}

// ============================================================
// 8. MÓDULO SAÚDE — MÉDICOS, FARMÁCIAS, HOSPITAIS
// ============================================================
export interface Medico {
  id?: number;
  user_id: string;
  nome: string;
  especialidade?: string;
  crm?: string;
  telefone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Farmacia {
  id?: number;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Hospital {
  id?: number;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}