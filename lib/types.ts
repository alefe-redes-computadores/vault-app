// lib/types.ts

// ============================================================
// 1. CONFIGURAÇÕES E ENUMS
// ============================================================

export const PERSON_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#6366F1",
] as const;

export type PersonColor = (typeof PERSON_COLORS)[number];

export type CategoryId = "saude" | "pessoal" | "empresa" | "outros";

export type DocumentType =
  | "rg"
  | "cpf"
  | "cnh"
  | "certidao_nascimento"
  | "titulo_eleitor"
  | "certificado"
  | "carteira_trabalho"
  | "passaporte"
  | "dispensa_militar"
  | "receita"
  | "prontuario"
  | "laudo"
  | "encaminhamento"
  | "consulta"
  | "cirurgia"
  | "exame_sangue"
  | "exame_imagem"
  | "credencial"
  | "outro";

export type DocumentFieldType = "text" | "date" | "select";

export type TipoReceita = "comum" | "amarela" | "azul" | "branca";

export type ModoLembreteReceita =
  | "automatico"
  | "7_dias"
  | "15_dias"
  | "data_personalizada";

export type VaultPermission = "view" | "edit" | "admin";

export type VaultMemberStatus =
  | "pending"
  | "accepted"
  | "declined";

export type CardType =
  | "cartao_credito"
  | "cartao_debito"
  | "conta_corrente"
  | "conta_poupanca"
  | "conta_digital";

export type CardBrand =
  | "visa"
  | "mastercard"
  | "elo"
  | "amex"
  | "hipercard"
  | "unknown";

export type CategoriaRegistro = "sintoma" | "medicao" | "humor";

// ============================================================
// 2. PESSOAS E CATEGORIAS
// ============================================================

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

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  saude: {
    id: "saude",
    name: "Saúde",
    icon: "Heart",
    color: "#EC4899",
    description: "Prontuários, receitas, laudos, medicamentos",
  },
  pessoal: {
    id: "pessoal",
    name: "Pessoal",
    icon: "User",
    color: "#3B82F6",
    description: "C.I.N, CPF, CNH, Certidões",
  },
  empresa: {
    id: "empresa",
    name: "Empresa",
    icon: "Building2",
    color: "#7C9CB5",
    description: "Documentos corporativos",
  },
  outros: {
    id: "outros",
    name: "Outros",
    icon: "FolderOpen",
    color: "#6B7280",
    description: "Documentos diversos",
  },
};

export const AREAS = CATEGORIES;
export const CATEGORY_META = CATEGORIES;

// ============================================================
// 3. DOCUMENTOS E ANEXOS
// ============================================================

export interface Attachment {
  id: string;
  url: string;
  thumbnail_url?: string;
  name: string;
  type: "image" | "pdf";
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

  // Relações diretas já indexadas no schema do Dexie.
  hospital_id?: string;
  medico_id?: string;

  // Relacionamento genérico de documentos introduzido no schema v32.
  entidade_tipo?: string;
  entidade_id?: string;

  created_at: string;
  updated_at: string;
  synced: boolean;
}

export const TYPE_CATEGORY_MAP: Record<DocumentType, CategoryId[]> = {
  rg: ["pessoal"],
  cpf: ["pessoal"],
  cnh: ["pessoal"],
  certidao_nascimento: ["pessoal"],
  titulo_eleitor: ["pessoal"],
  receita: ["saude"],
  prontuario: ["saude"],
  laudo: ["saude"],
  encaminhamento: ["saude"],
  consulta: ["saude"],
  cirurgia: ["saude"],
  exame_sangue: ["saude"],
  exame_imagem: ["saude"],
  credencial: ["saude"],
  certificado: ["pessoal", "empresa", "outros"],
  carteira_trabalho: ["pessoal", "empresa"],
  passaporte: ["pessoal"],
  dispensa_militar: ["pessoal"],
  outro: ["pessoal", "saude", "empresa", "outros"],
};

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
      key: "modelo",
      label: "Modelo do Documento",
      type: "select",
      options: ["C.I.N (Nova Identidade)", "RG (Antigo)"],
      required: true,
    },
    {
      key: "cpf",
      label: "Número do CPF",
      type: "text",
      required: true,
    },
    {
      key: "rg_number",
      label: "Número do RG",
      type: "text",
    },
    {
      key: "issue_date",
      label: "Data de emissão",
      type: "date",
      required: true,
    },
    {
      key: "expiry_date",
      label: "Data de validade",
      type: "date",
    },
    {
      key: "issuer",
      label: "Órgão emissor",
      type: "text",
      required: true,
    },
  ],

  cpf: [
    {
      key: "number",
      label: "Número do CPF",
      type: "text",
      required: true,
    },
  ],

  cnh: [
    {
      key: "number",
      label: "Número da CNH",
      type: "text",
      required: true,
    },
    {
      key: "category",
      label: "Categoria",
      type: "select",
      options: ["A", "B", "AB", "C", "D", "E"],
      required: true,
    },
    {
      key: "issue_date",
      label: "Data de emissão",
      type: "date",
      required: true,
    },
    {
      key: "expiry_date",
      label: "Data de validade",
      type: "date",
      required: true,
    },
  ],

  certidao_nascimento: [
    {
      key: "nome_registrado",
      label: "Nome Registrado",
      type: "text",
      required: true,
    },
    {
      key: "matricula",
      label: "Matrícula",
      type: "text",
      required: true,
    },
    {
      key: "livro",
      label: "Livro",
      type: "text",
    },
    {
      key: "folha",
      label: "Folha",
      type: "text",
    },
    {
      key: "termo",
      label: "Termo",
      type: "text",
    },
    {
      key: "cartorio",
      label: "Cartório de Registro",
      type: "text",
    },
    {
      key: "data_nascimento",
      label: "Data de Nascimento",
      type: "date",
      required: true,
    },
  ],

  titulo_eleitor: [
    {
      key: "number",
      label: "Número do Título",
      type: "text",
      required: true,
    },
    {
      key: "zona",
      label: "Zona Eleitoral",
      type: "text",
      required: true,
    },
    {
      key: "secao",
      label: "Seção",
      type: "text",
      required: true,
    },
  ],

  certificado: [
    {
      key: "institution",
      label: "Instituição de ensino",
      type: "text",
      required: true,
    },
    {
      key: "course",
      label: "Curso",
      type: "text",
      required: true,
    },
    {
      key: "duration",
      label: "Duração (ex: 120 horas)",
      type: "text",
      required: true,
    },
    {
      key: "completion_date",
      label: "Data de conclusão",
      type: "date",
    },
  ],

  carteira_trabalho: [
    {
      key: "numero",
      label: "Número da CTPS",
      type: "text",
      required: true,
    },
    {
      key: "serie",
      label: "Série",
      type: "text",
    },
    {
      key: "data_emissao",
      label: "Data de emissão",
      type: "date",
    },
    {
      key: "uf",
      label: "UF",
      type: "text",
    },
  ],

  passaporte: [
    {
      key: "numero",
      label: "Número do Passaporte",
      type: "text",
      required: true,
    },
    {
      key: "pais",
      label: "País de emissão",
      type: "text",
      required: true,
    },
    {
      key: "data_emissao",
      label: "Data de emissão",
      type: "date",
      required: true,
    },
    {
      key: "data_validade",
      label: "Data de validade",
      type: "date",
      required: true,
    },
  ],

  dispensa_militar: [
    {
      key: "numero",
      label: "Número do Certificado",
      type: "text",
      required: true,
    },
    {
      key: "categoria",
      label: "Categoria",
      type: "select",
      options: ["A", "B", "C", "D", "E"],
      required: true,
    },
    {
      key: "data_emissao",
      label: "Data de emissão",
      type: "date",
    },
  ],

  receita: [
    {
      key: "medicamento_id",
      label: "Medicamento",
      type: "select",
      required: true,
    },
    {
      key: "dosage",
      label: "Dosagem",
      type: "text",
      required: true,
    },
    {
      key: "medico_id",
      label: "Médico",
      type: "select",
      required: true,
    },
    {
      key: "farmacia_id",
      label: "Farmácia",
      type: "select",
    },
    {
      key: "prescription_date",
      label: "Data da receita",
      type: "date",
      required: true,
    },
    {
      key: "renewal_date",
      label: "Próxima renovação",
      type: "date",
      required: true,
    },
  ],

  prontuario: [
    {
      key: "hospital_id",
      label: "Hospital",
      type: "select",
      required: true,
    },
    {
      key: "medico_id",
      label: "Médico",
      type: "select",
      required: true,
    },
    {
      key: "specialty",
      label: "Especialidade",
      type: "text",
      required: true,
    },
    {
      key: "date",
      label: "Data",
      type: "date",
      required: true,
    },
  ],

  laudo: [
    {
      key: "medico_id",
      label: "Médico",
      type: "select",
      required: true,
    },
    {
      key: "specialty",
      label: "Especialidade",
      type: "text",
      required: true,
    },
    {
      key: "hospital_id",
      label: "Hospital",
      type: "select",
      required: true,
    },
    {
      key: "date",
      label: "Data",
      type: "date",
      required: true,
    },
  ],

  encaminhamento: [
    {
      key: "from_medico_id",
      label: "Quem encaminhou (Médico)",
      type: "select",
      required: true,
    },
    {
      key: "to_medico_id",
      label: "Para quem (Médico - opcional)",
      type: "select",
    },
    {
      key: "reason",
      label: "Motivo",
      type: "text",
      required: true,
    },
    {
      key: "date",
      label: "Data",
      type: "date",
      required: true,
    },
  ],

  consulta: [
    {
      key: "medico_id",
      label: "Médico",
      type: "select",
      required: true,
    },
    {
      key: "specialty",
      label: "Especialidade",
      type: "text",
      required: true,
    },
    {
      key: "hospital_id",
      label: "Clínica / Hospital",
      type: "select",
    },
    {
      key: "date",
      label: "Data da Consulta",
      type: "date",
      required: true,
    },
    {
      key: "reason",
      label: "Motivo da Consulta",
      type: "text",
    },
  ],

  cirurgia: [
    {
      key: "procedure",
      label: "Procedimento",
      type: "text",
      required: true,
    },
    {
      key: "medico_id",
      label: "Médico Cirurgião",
      type: "select",
      required: true,
    },
    {
      key: "hospital_id",
      label: "Hospital",
      type: "select",
      required: true,
    },
    {
      key: "date",
      label: "Data da Cirurgia",
      type: "date",
      required: true,
    },
  ],

  exame_sangue: [
    {
      key: "local_id",
      label: "Local / Laboratório",
      type: "select",
      required: true,
    },
    {
      key: "data_exame",
      label: "Data do Exame",
      type: "date",
      required: true,
    },
  ],

  exame_imagem: [
    {
      key: "hospital_id",
      label: "Local / Hospital",
      type: "select",
      required: true,
    },
    {
      key: "tipo",
      label: "Tipo de Exame (Ex: Raio-X, RM)",
      type: "text",
      required: true,
    },
    {
      key: "data_exame",
      label: "Data do Exame",
      type: "date",
      required: true,
    },
  ],

  credencial: [
    {
      key: "orgao",
      label: "Órgão Emissor / Instituição",
      type: "text",
      required: true,
    },
    {
      key: "validade",
      label: "Validade",
      type: "date",
      required: true,
    },
  ],

  outro: [
    {
      key: "custom_field_1",
      label: "Campo personalizado 1",
      type: "text",
    },
    {
      key: "custom_field_2",
      label: "Campo personalizado 2",
      type: "text",
    },
  ],
};

// ============================================================
// 4. SINCRONIZAÇÃO E FILA
// ============================================================

export interface SyncQueueItem {
  id?: string;
  chave: string;
  table:
    | "persons"
    | "documents"
    | "medicamentos"
    | "renovacoes"
    | "vaults"
    | "vaultMembers"
    | "medicos"
    | "farmacias"
    | "hospitais"
    | "locais"
    | "exames"
    | "consultas"
    | "cirurgias"
    | "doseLogs"
    | "credentials"
    | "cards"
    | "instituicoes"
    | "tratamentos"
    | "cids"
    | "anexos_clinicos"
    | "settings"
    | "versiculos"
    | "registros_saude";
  operation: "add" | "update" | "delete";
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  retry_count?: number;
  failed?: boolean;
  next_retry_at?: string | null;
  error?: string | null;
}

// ============================================================
// 5. ENTIDADES DE SAÚDE
// ============================================================

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
  lembrete_receita_modo?: ModoLembreteReceita;
  lembrete_receita_data?: string;
  tipo_uso?: "continuo" | "esporadico" | "sos";

  tipo_aquisicao?: "comprado" | "sus" | "gratuito";
  data_retorno_sus?: string;

  forma_farmaceutica?:
    | "capsula"
    | "comprimido"
    | "gota"
    | "injecao"
    | "adesivo";

  cor_principal?: string;
  cor_secundaria?: string;

  status?: "ativo" | "descontinuado";

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

/**
 * Contrato de criação.
 *
 * A entidade persistida continua tendo data_receita e
 * proxima_renovacao como strings, mas esses campos podem não
 * existir na entrada inicial. O repository normaliza ausência
 * para string vazia antes de persistir.
 */
export type CreateMedicamentoInput = Omit<
  Medicamento,
  | "id"
  | "user_id"
  | "person_id"
  | "data_receita"
  | "proxima_renovacao"
  | "created_at"
  | "updated_at"
  | "synced"
> & {
  id?: string;
  person_id: string;
  data_receita?: string;
  proxima_renovacao?: string;
};

/**
 * Campos em que null possui significado explícito durante
 * atualização:
 *
 * undefined = não alterar
 * null      = limpar
 *
 * Isso evita espalhar null pela entidade Medicamento inteira.
 */
export type NullableMedicamentoFields = {
  document_id?: string | null;

  medico_id?: string | null;
  farmacia_id?: string | null;
  hospital_id?: string | null;
  local_id?: string | null;

  farmacia?: string | null;

  data_receita?: string | null;
  proxima_renovacao?: string | null;

  observacoes?: string | null;
  lembrete_receita_data?: string | null;
  data_retorno_sus?: string | null;

  cor_principal?: string | null;
  cor_secundaria?: string | null;

  estoque_quantidade?: number | null;
  estoque_data_referencia?: string | null;
  estoque_unidade_por_dose?: number | null;
  estoque_unidade_medida?: string | null;
  estoque_ml_total?: number | null;
  estoque_gotas_por_ml?: number | null;

  formato?: string | null;

  motivo_descontinuacao?: string | null;
  medico_descontinuacao_id?: string | null;
  medico_descontinuacao_nome?: string | null;
  substituido_por_id?: string | null;
  data_descontinuacao?: string | null;

  preco?: number | null;

  cid_id?: string | null;
};

type UpdateMedicamentoBase = Partial<
  Omit<
    Medicamento,
    | "id"
    | "user_id"
    | "person_id"
    | "created_at"
    | keyof NullableMedicamentoFields
  >
>;

export type UpdateMedicamentoInput =
  UpdateMedicamentoBase &
  NullableMedicamentoFields;

export interface Renovacao {
  id?: string;
  user_id: string;
  person_id?: string;

  /**
   * Relação com o cadastro atual do medicamento.
   *
   * Essa relação pode deixar de resolver no futuro caso o
   * medicamento seja removido. Por isso a renovação também
   * preserva um snapshot histórico de nome e dosagem.
   */
  medicamento_id: string;

  /**
   * Snapshot histórico.
   *
   * Estes campos pertencem ao evento de renovação/aquisição e
   * não devem depender do estado atual do Medicamento.
   *
   * São opcionais para compatibilidade com registros legados.
   */
  medicamento_nome?: string | null;
  medicamento_dosagem?: string | null;

  document_id?: string | null;
  medico_id?: string | null;
  farmacia_id?: string | null;
  hospital_id?: string | null;
  local_id?: string | null;

  /**
   * Quantidade adquirida/retirada.
   *
   * Não representa preço unitário e não deve ser multiplicada
   * automaticamente por preco.
   */
  quantidade?: number | null;

  /**
   * Valor total informado para a aquisição.
   */
  preco?: number | null;

  lote?: string | null;
  validade_produto?: string | null;

  /**
   * Data clínica da receita/prescrição.
   *
   * Mantida com a semântica histórica atual do Vault e usada
   * para validade da receita e regras clínicas relacionadas.
   */
  data: string;

  /**
   * Data real em que a compra ou retirada aconteceu.
   *
   * É a data correta para histórico financeiro.
   *
   * Opcional porque registros antigos possuem somente `data`.
   * Consumidores devem usar `data_aquisicao ?? data` como
   * fallback até os dados legados serem enriquecidos.
   */
  data_aquisicao?: string | null;

  anexo_url?: string | null;
  observacoes?: string | null;

  tipo_aquisicao?:
    | "comprado"
    | "sus"
    | "gratuito";

  data_proxima_retirada?:
    | string
    | null;

  exige_nova_receita?:
    boolean;

  created_at?: string;
  updated_at?: string;
  synced?: boolean;

  data_retorno_sus?:
    | string
    | null;
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
  cid_ids?: string[];
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
  status: "agendada" | "realizada" | "cancelada";
  observacoes?: string;
  tratamento_ids?: string[];
  cid_ids?: string[];
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
  status: "agendada" | "realizada" | "cancelada";
  tratamento_ids?: string[];
  cid_ids?: string[];
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

// ============================================================
// 6. REGISTROS DE SAÚDE DIÁRIOS
// ============================================================

export interface RegistroSaude {
  id?: string;
  user_id: string;
  person_id?: string;
  categoria: CategoriaRegistro;
  tipo: string;
  nome: string;
  intensidade?: number;
  valor_medicao?: string;
  data: string;
  horario: string;
  observacoes?: string;
  medicamento_id?: string;
  tratamento_ids?: string[];
  cid_ids?: string[];
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

// ============================================================
// 7. VAULTS E COMPARTILHAMENTO
// ============================================================

export interface Vault {
  id?: string;

  /**
   * Conta proprietária/criadora do cofre.
   */
  user_id: string;

  /**
   * Pessoa da conta proprietária à qual este cofre pertence.
   */
  person_id: string;

  name: string;
  description?: string;

  /**
   * Chave visual do ícone.
   */
  icon: string;

  /**
   * Cor canônica em HEX.
   */
  color: string;

  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface VaultMember {
  id?: string;

  /**
   * Cofre ao qual este convite/membership pertence.
   */
  vault_id: string;

  /**
   * Conta do usuário convidado.
   */
  user_id?: string;

  /**
   * Pessoa da conta convidada vinculada ao compartilhamento.
   */
  person_id?: string;

  email: string;
  name?: string;

  permission: VaultPermission;

  /**
   * ID da conta que enviou o convite.
   */
  invited_by: string;

  status: VaultMemberStatus;

  invited_at: string;

  /**
   * Campo local legado.
   */
  created_at?: string;

  updated_at: string;
  synced: boolean;
}

/**
 * Tipo legado.
 *
 * A arquitetura atual persiste o vínculo com o cofre através de
 * Document.vault_id.
 */
export interface VaultDocument {
  document_id: string;
  vault_id: string;
  shared_by: string;
  shared_at: string;
}

// ============================================================
// 8. PROFISSIONAIS, LOCAIS E INSTITUIÇÕES
// ============================================================

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

  /**
   * Campo legado local.
   *
   * Médico é entidade global da conta.
   */
  person_id?: string;
}

export interface Farmacia {
  id?: string;
  user_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  observacoes?: string;

  tipo?: "particular" | "sus" | "posto";
  is_sus?: boolean;

  created_at: string;
  updated_at: string;
  synced: boolean;

  /**
   * Campo legado local.
   *
   * Farmácia é global por conta.
   */
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

  /**
   * Campo legado local.
   *
   * Hospital é global por conta.
   */
  person_id?: string;
}

export type LocalSaudeTipo =
  | "posto_saude"
  | "ubs"
  | "caps"
  | "posto"
  | "laboratorio"
  | "clinica"
  | "outro";



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

  /**
   * Campo legado local.
   *
   * Local é global por conta.
   */
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

// ============================================================
// 9. CIDs E TRATAMENTOS
// ============================================================

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
  medicamento_ids?: string[];
  condicao?: string;
  medico_ids?: string[];
  hospital_ids?: string[];
  local_ids?: string[];
  data_inicio?: string;
  status: "ativo" | "concluido" | "suspenso";
  cor?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

// ============================================================
// 10. CREDENCIAIS E CARTÕES
// ============================================================

export interface Credential {
  id?: string;
  user_id: string;

  /**
   * Toda credencial pertence obrigatoriamente a uma Person.
   */
  person_id: string;

  vault_id?: string;
  title: string;
  username?: string;
  password_encrypted: string;
  url?: string;
  notes?: string;
  category: "banco" | "social" | "trabalho" | "outros";

  password_history?: {
    encrypted: string;
    date: string;
  }[];

  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface BankCard {
  id?: string;
  user_id: string;

  /**
   * Todo cartão/conta pertence obrigatoriamente a uma Person.
   */
  person_id: string;

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

// ============================================================
// 11. CONFIGURAÇÕES E VERSÍCULOS
// ============================================================

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
