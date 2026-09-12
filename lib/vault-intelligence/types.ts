import type { BankCard, Credential, Document, Vault, VaultMember } from "@/lib/types";

export type VaultInsightKind = "security" | "attention" | "organization" | "data_quality";
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
    total: number;
  };
}
