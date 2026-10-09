/** V102: documentos continuam canônicos em documents; aqui ficam apenas vínculos. */
export type SupplyOrigin =
  | "comprado"
  | "municipal"
  | "estadual_ceaf"
  | "farmacia_popular"
  | "outro";
export type SupplyDocumentKind =
  | "lme"
  | "receita"
  | "formulario"
  | "comprovante"
  | "decisao";
export interface SupplyRow {
  id: string;
  user_id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
}
export interface SupplyProcess extends SupplyRow {
  titulo: string;
  uf?: string | null;
  indicacao?: string | null;
  catalogo_versao?: string | null;
  origem: SupplyOrigin;
  status: "ativo" | "encerrado";
  farmacia_id: string | null;
  medico_id: string | null;
  local_id: string | null;
  protocolo: string | null;
  renovacao_meses: number | null;
  antecedencia_dias: number;
  receita_cada_retirada: boolean;
  observacoes: string | null;
}
export interface SupplyCycle extends SupplyRow {
  processo_id: string;
  motivo?: SupplyCycleReason;
  uf_snapshot?: string | null;
  indicacao_snapshot?: string | null;
  origem_snapshot?: SupplyOrigin | null;
  preparar_ate?: string | null;
  consulta_id?: string | null;
  documentos_pessoais_conferidos?: boolean;
  exigencia_local?: string | null;
  regra_versao?: string | null;
  status: "preparando" | "protocolado" | "autorizado" | "encerrado";
  inicio: string | null;
  fim: string | null;
  protocolado_em: string | null;
  autorizado_em: string | null;
  observacoes: string | null;
}
export interface SupplyItem extends SupplyRow {
  processo_id: string;
  ciclo_id: string;
  medicamento_id: string;
  catalogo_id?: string | null;
  dosagem: string;
  quantidade_mensal: number | null;
}
export interface SupplyDocumentLink extends SupplyRow {
  processo_id: string;
  ciclo_id: string;
  document_id: string;
  retirada_id: string | null;
  tipo: SupplyDocumentKind;
  estado: "preenchido" | "entregue";
  entregue_em: string | null;
}
export interface SupplyData {
  processos: SupplyProcess[];
  ciclos: SupplyCycle[];
  itens: SupplyItem[];
  documentos: SupplyDocumentLink[];
}
export const SUPPLY_ORIGIN_LABELS: Record<SupplyOrigin, string> = {
  comprado: "Comprado",
  municipal: "SUS municipal",
  estadual_ceaf: "SUS especializado / CEAF",
  farmacia_popular: "Farmácia Popular",
  outro: "Outro fornecimento",
};

export type SupplyCycleReason =
  | "inicial"
  | "renovacao"
  | "troca"
  | "inclusao"
  | "ajuste_dose"
  | "retomada"
  | "outro";
export const SUPPLY_REASON_LABELS: Record<SupplyCycleReason, string> = {
  inicial: "Primeira solicitação",
  renovacao: "Renovação",
  troca: "Troca de medicamento",
  inclusao: "Inclusão de medicamento",
  ajuste_dose: "Alteração de dose ou quantidade",
  retomada: "Retomada do fornecimento",
  outro: "Outra situação",
};
