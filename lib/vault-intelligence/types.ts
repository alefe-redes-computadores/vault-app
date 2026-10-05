import type { BankCard, Credential, Document, Medicamento, Renovacao, Vault, VaultMember } from "@/lib/types";

export type VaultInsightKind = "security" | "attention" | "organization" | "data_quality" | "financial";
export type VaultInsightConfidence = "baixa" | "media" | "alta";

export interface VaultGeneralInsight {
  id: string;
  kind: VaultInsightKind;
  title: string;
  message: string;
  confidence: VaultInsightConfidence;
  sample: number;
  sources: string[];
  evidence: string[];
  actionLabel: string;
  href: string;
  priority: number;
}

export interface VaultIntelligenceSnapshot {
  personId: string;
  userId: string;
  credentials: Credential[];
  cards: BankCard[];
  documents: Document[];
  vaults: Vault[];
  members: VaultMember[];
  renovacoes: Renovacao[];
  medicamentos: Medicamento[];
}

export interface VaultIntelligenceResult {
  insights: VaultGeneralInsight[];
  highlights: VaultGeneralInsight[];
  coverage: {
    credentials: number;
    cards: number;
    accounts: number;
    documents: number;
    vaults: number;
    acquisitions: number;
    financialSpend90d: number;
    financialCoverage: number;
    total: number;
  };
}
