// lib/health-records.ts

import type { CategoriaRegistro, RegistroSaude } from "@/lib/types";

export interface HealthRecordDefinition {
  categoria: CategoriaRegistro;
  tipo: string;
  nome: string;
  unidade?: string;
  valor: "intensidade" | "numero" | "pressao" | "texto";
}

export const HEALTH_RECORD_DEFINITIONS: readonly HealthRecordDefinition[] = [
  { categoria: "sintoma", tipo: "dor", nome: "Dor / Desconforto", valor: "intensidade" },
  { categoria: "humor", tipo: "humor", nome: "Humor", valor: "intensidade" },
  { categoria: "sintoma", tipo: "ansiedade", nome: "Ansiedade", valor: "intensidade" },
  { categoria: "medicao", tipo: "pressao_arterial", nome: "Pressão arterial", unidade: "mmHg", valor: "pressao" },
  { categoria: "medicao", tipo: "glicemia", nome: "Glicemia", unidade: "mg/dL", valor: "numero" },
  { categoria: "medicao", tipo: "temperatura", nome: "Temperatura", unidade: "°C", valor: "numero" },
  { categoria: "medicao", tipo: "frequencia_cardiaca", nome: "Frequência cardíaca", unidade: "bpm", valor: "numero" },
  { categoria: "medicao", tipo: "peso", nome: "Peso", unidade: "kg", valor: "numero" },
  { categoria: "habito", tipo: "sono", nome: "Sono", unidade: "min", valor: "numero" },
  { categoria: "habito", tipo: "agua", nome: "Água", unidade: "ml", valor: "numero" },
] as const;

export function normalizeHealthRecordText(value?: string | null): string {
  return String(value || "").trim().toLocaleLowerCase("pt-BR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function buildHealthRecordKey(record: Pick<RegistroSaude, "categoria" | "tipo" | "nome">): string {
  const identity = normalizeHealthRecordText(record.tipo) || normalizeHealthRecordText(record.nome) || "geral";
  return `${record.categoria}:${identity}`;
}

function positiveFinite(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

export function normalizeRegistroSaudeFields(record: Pick<RegistroSaude,
  "categoria" | "tipo" | "nome" | "valor_medicao" | "valor_numerico" |
  "unidade_medida" | "duracao_minutos" | "contexto"
>): Pick<RegistroSaude, "registro_chave" | "valor_numerico" | "unidade_medida" | "duracao_minutos" | "contexto"> {
  const definition = HEALTH_RECORD_DEFINITIONS.find((item) => item.tipo === record.tipo);
  const numeric = record.valor_numerico ??
    (definition?.valor === "numero" && record.tipo !== "sono"
      ? positiveFinite(record.valor_medicao)
      : undefined);
  const duration = record.duracao_minutos ??
    (record.tipo === "sono" ? positiveFinite(record.valor_medicao) : undefined);

  return {
    registro_chave: buildHealthRecordKey(record),
    valor_numerico: numeric,
    unidade_medida: String(record.unidade_medida || definition?.unidade || "").trim() || undefined,
    duracao_minutos: duration,
    contexto: String(record.contexto || "").trim() || undefined,
  };
}
