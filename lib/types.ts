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
}

export interface Renovacao {
  id?: number;
  medicamento_id: number;
  data: string;
  anexo_url?: string;
  observacoes?: string;
}