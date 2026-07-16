export type DocumentCategory =
  | "prontuario"
  | "receita"
  | "pessoal"
  | "transporte"
  | "laudo"
  | "outros";

export type Profile = {
  id?: number;
  name: string; // "Eu", "Mãe", "Filha"
  icon: string; // emoji
  createdAt: string;
};

export type Area = {
  id: string;
  name: "Saúde" | "Pessoal" | "Empresa" | "Outros";
  icon: string; // nome do ícone lucide-react
  description?: string;
};

export interface VaultDocument {
  id?: number;
  profileId: number;
  areaId: string;
  category: DocumentCategory;
  title: string;
  notes?: string;
  documentDate?: string; // ISO date
  expiryDate?: string; // ISO date
  fileLocalUri?: string; // blob URL / IndexedDB blob key
  fileRemoteUrl?: string; // Supabase Storage URL
  synced: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultCategoryMeta {
  id: DocumentCategory;
  label: string;
  icon: string; // nome do ícone lucide-react
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: "add" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
}

export const CATEGORY_META: Record<DocumentCategory, VaultCategoryMeta> = {
  prontuario: { id: "prontuario", label: "Prontuários", icon: "ClipboardList" },
  receita: { id: "receita", label: "Receitas médicas", icon: "Pill" },
  pessoal: { id: "pessoal", label: "Documentos pessoais", icon: "IdCard" },
  transporte: { id: "transporte", label: "Carteira de ônibus", icon: "BusFront" },
  laudo: { id: "laudo", label: "Laudos", icon: "FileText" },
  outros: { id: "outros", label: "Outros", icon: "FolderOpen" },
};

export const DEFAULT_PROFILES: Omit<Profile, "id" | "createdAt">[] = [
  { name: "Eu", icon: "👤" },
  { name: "Mãe", icon: "👩" },
  { name: "Pai", icon: "👨" },
  { name: "Filha", icon: "👧" },
  { name: "Filho", icon: "👦" },
];

export const AREAS: Area[] = [
  { id: "saude", name: "Saúde", icon: "Heart", description: "Prontuários, receitas, laudos" },
  { id: "pessoal", name: "Pessoal", icon: "User", description: "RG, CPF, CNH" },
  { id: "empresa", name: "Empresa", icon: "Building2", description: "Documentos corporativos" },
  { id: "outros", name: "Outros", icon: "FolderOpen", description: "Documentos diversos" },
];