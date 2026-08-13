// ============================================================
// 1. PESSOAS
// ============================================================
export interface Person {
  id?: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 2. CATEGORIAS
// ============================================================
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

// ============================================================
// 3. DOCUMENTOS
// ============================================================
export type DocumentType =
  | 'rg'
  | 'cpf'
  | 'cnh'
  | 'certidao_nascimento'
  | 'titulo_eleitor'
  | 'certificado'
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
  metadata: Record<string, any>;
  attachments: Attachment[];
  is_favorite: boolean;
  vault_id?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// MAPA DE RELAÇÃO: Quais tipos de documento pertencem a quais categorias
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
  outro: ['pessoal', 'saude', 'empresa', 'outros']
};

// ============================================================
// 3.1 CAMPOS POR TIPO DE DOCUMENTO
// ============================================================
export const DOCUMENT_FIELDS: Record<
  DocumentType,
  Array<{ key: string; label: string; type: 'text' | 'date' | 'select'; options?: string[]; required?: boolean }>
> = {
  rg: [
    { key: 'modelo', label: 'Modelo do Documento', type: 'select', options: ['C.I.N (Nova Identidade)', 'RG (Antigo)'], required: true },
    { key: 'cpf', label: 'Número do CPF', type: 'text', required: true },
    { key: 'rg_number', label: 'Número do RG (Se modelo antigo)', type: 'text' },
    { key: 'issue_date', label: 'Data de emissão', type: 'date', required: true },
    { key: 'expiry_date', label: 'Data de validade', type: 'date' },
    { key: 'issuer', label: 'Órgão emissor', type: 'text', required: true },
  ],
  cpf: [{ key: 'number', label: 'Número do CPF', type: 'text', required: true }],
  cnh: [
    { key: 'number', label: 'Número da CNH', type: 'text', required: true },
    { key: 'category', label: 'Categoria', type: 'select', options: ['A', 'B', 'AB', 'C', 'D', 'E'], required: true },
    { key: 'issue_date', label: 'Data de emissão', type: 'date', required: true },
    { key: 'expiry_date', label: 'Data de validade', type: 'date', required: true },
  ],
  certidao_nascimento: [
    { key: 'nome_registrado', label: 'Nome Registrado', type: 'text', required: true },
    { key: 'matricula', label: 'Matrícula', type: 'text', required: true },
    { key: 'livro', label: 'Livro', type: 'text' },
    { key: 'folha', label: 'Folha', type: 'text' },
    { key: 'termo', label: 'Termo', type: 'text' },
    { key: 'cartorio', label: 'Cartório de Registro', type: 'text' },
    { key: 'data_nascimento', label: 'Data de Nascimento', type: 'date', required: true },
  ],
  titulo_eleitor: [
    { key: 'number', label: 'Número do Título', type: 'text', required: true },
    { key: 'zona', label: 'Zona Eleitoral', type: 'text', required: true },
    { key: 'secao', label: 'Seção', type: 'text', required: true },
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
  consulta: [
    { key: 'doctor', label: 'Médico', type: 'select', required: true },
    { key: 'specialty', label: 'Especialidade', type: 'text', required: true },
    { key: 'hospital', label: 'Clínica / Hospital', type: 'select' },
    { key: 'date', label: 'Data da Consulta', type: 'date', required: true },
    { key: 'reason', label: 'Motivo da Consulta', type: 'text' },
  ],
  cirurgia: [
    { key: 'procedure', label: 'Procedimento', type: 'text', required: true },
    { key: 'doctor', label: 'Médico Cirurgião', type: 'select', required: true },
    { key: 'hospital', label: 'Hospital', type: 'select', required: true },
    { key: 'date', label: 'Data da Cirurgia', type: 'date', required: true },
  ],
  exame_sangue: [
    { key: 'laboratorio', label: 'Laboratório', type: 'select', required: true },
    { key: 'data_exame', label: 'Data do Exame', type: 'date', required: true },
  ],
  exame_imagem: [
    { key: 'hospital', label: 'Local / Hospital', type: 'select', required: true },
    { key: 'tipo', label: 'Tipo de Exame (Ex: Raio-X, RM)', type: 'text', required: true },
    { key: 'data_exame', label: 'Data do Exame', type: 'date', required: true },
  ],
  credencial: [
    { key: 'orgao', label: 'Órgão Emissor / Instituição', type: 'text', required: true },
    { key: 'validade', label: 'Validade', type: 'date', required: true },
  ],
  outro: [
    { key: 'custom_field_1', label: 'Campo personalizado 1', type: 'text' },
    { key: 'custom_field_2', label: 'Campo personalizado 2', type: 'text' },
  ],
};

// ============================================================
// 4. METADADOS
// ============================================================
export type RGMetadata = { modelo: string; cpf: string; rg_number?: string; issue_date: string; expiry_date: string; issuer: string; };
export type CPFMetadata = { number: string; };
export type CNHMetadata = { number: string; category: 'A' | 'B' | 'AB' | 'C' | 'D' | 'E'; issue_date: string; expiry_date: string; };
export type CertidaoMetadata = { nome_registrado: string; matricula: string; livro?: string; folha?: string; termo?: string; cartorio?: string; data_nascimento: string; };
export type TituloEleitorMetadata = { number: string; zona: string; secao: string; };
export type CertificadoMetadata = { institution: string; course: string; duration: string; completion_date?: string; };
export type ReceitaMetadata = { medication: string; dosage: string; doctor: string; pharmacy?: string; prescription_date: string; renewal_date: string; };
export type ProntuarioMetadata = { hospital: string; doctor: string; specialty: string; date: string; };
export type LaudoMetadata = { doctor: string; specialty: string; hospital: string; date: string; };
export type EncaminhamentoMetadata = { from: string; to?: string; reason: string; date: string; };
export type ConsultaMetadata = { doctor: string; specialty: string; hospital?: string; date: string; reason?: string; };
export type CirurgiaMetadata = { procedure: string; doctor: string; hospital: string; date: string; };
export type ExameSangueMetadata = { laboratorio: string; data_exame: string; };
export type ExameImagemMetadata = { hospital: string; tipo: string; data_exame: string; };
export type CredencialMetadata = { orgao: string; validade: string; };

// ============================================================
// 5. FILA DE SINCRONIZAÇÃO
// ============================================================
export interface SyncQueueItem {
  id?: string;
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
    | 'laboratorios'
    | 'exames'
    | 'doseLogs'
    | 'credentials' 
    | 'cards'
    | 'instituicoes'
    | 'tratamentos';      
  operation: 'add' | 'update' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
  retry_count?: number;
  failed?: boolean;
}

// ============================================================
// 6. MÓDULO SAÚDE
// ============================================================
export type TipoReceita = 'comum' | 'amarela' | 'azul' | 'branca';

export interface Medicamento {
  id?: string;
  user_id: string;
  person_id?: string; // ✅ Resolvido: Vincula o medicamento à pessoa
  document_id: string;
  nome: string;
  dosagem: string;
  medico: string;
  farmacia?: string;
  data_receita: string;
  proxima_renovacao: string;
  observacoes?: string;
  tipo_receita?: TipoReceita;
  tratamento_id?: string; // Legado (Mantido para compatibilidade)
  tratamento_ids?: string[]; // N:N suporte array
  forma_farmaceutica?: 'capsula' | 'comprimido' | 'gota' | 'injecao' | 'adesivo';
  cor_principal?: string;
  cor_secundaria?: string;
  status?: 'ativo' | 'descontinuado';
  estoque_quantidade?: number;
  estoque_data_referencia?: string;
  estoque_horarios?: string[];
  estoque_unidade_por_dose?: number;
  estoque_unidade_medida?: string;
  
  formato?: string;                    
  cores?: string[];                    
  medico_id?: string;                  
  motivo_descontinuacao?: string;      
  medico_descontinuacao_id?: string;   
  medico_descontinuacao_nome?: string; 
  substituido_por_id?: string;         
  
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface Renovacao {
  id?: string;
  user_id: string;
  person_id?: string; // ✅ Resolvido: Vincula a renovação à pessoa
  medicamento_id: string;
  data: string;
  anexo_url?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface DoseLog {
  id?: string;
  user_id: string;
  person_id?: string; // ✅ Resolvido: Evita que os logs de todos se misturem
  medicamento_id: string;
  data: string; 
  horario: string; 
  tomado_em?: string; 
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

export interface Exame {
  id?: string;
  user_id?: string;
  person_id?: string; // ✅ Resolvido: Vincula exame à pessoa
  nome: string;
  laboratorio?: string;
  medico?: string;
  data: string;
  data_retorno?: string;
  motivo?: string;
  observacoes?: string;
  anexo_url?: string;
  synced?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// 7. COFRES FAMILIARES
// ============================================================
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
  updated_at: string;
  synced: boolean;
}

export interface VaultDocument {
  document_id: string;
  vault_id: string;
  shared_by: string;
  shared_at: string;
}

// ============================================================
// 8. MÓDULO SAÚDE E ENTIDADES PAI
// ============================================================
export interface Medico {
  id?: string;
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
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Hospital {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Laboratorio {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
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

export interface Tratamento {
  id?: string;
  user_id: string;
  person_id?: string; // ✅ Resolvido: Vincula o tratamento à pessoa
  nome: string;
  condicao?: string;
  data_inicio?: string;
  status: 'ativo' | 'concluido' | 'suspenso';
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 9. GERENCIADOR DE SENHAS (CREDENCIAIS) 
// ============================================================
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
  password_history?: { encrypted: string; date: string }[];
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 10. BANCOS & CARTÕES (CARDS) 
// ============================================================
export type CardType = 'cartao_credito' | 'cartao_debito' | 'conta_corrente' | 'conta_poupanca' | 'conta_digital';
export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'unknown';

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
