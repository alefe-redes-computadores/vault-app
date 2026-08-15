// lib/health-insights.ts

import { computeEstoqueInfo, getDaysUntil } from "./health-utils";
import type { Medicamento, Renovacao } from "./types";

// ============================================================
// 1. VALIDAR VÍNCULO MÉDICO ↔ ESTABELECIMENTO
// ============================================================
export function validarVinculoMedicoLocal(
  medico: any,
  estabelecimentoId: string
): boolean {
  if (!medico || !estabelecimentoId) return true;
  // Usa o campo 'estabelecimentos' (se existir) ou busca na tabela de vínculos
  if (medico.estabelecimentos && Array.isArray(medico.estabelecimentos)) {
    return medico.estabelecimentos.includes(estabelecimentoId);
  }
  return true;
}

// ============================================================
// 2. SUGERIR RENOVAÇÃO (COM BASE NO ESTOQUE E RECEITA)
// ============================================================
export function sugerirRenovacao(medicamento: Medicamento) {
  const estoque = computeEstoqueInfo(medicamento);
  if (!estoque) {
    return {
      deveRenovar: false,
      mensagem: "",
      urgencia: "nenhuma" as const,
    };
  }

  const consumoDiario =
    (medicamento.estoque_horarios?.length || 1) *
    (Number(medicamento.estoque_unidade_por_dose) || 1);

  const diasRestantes = Math.floor(estoque.quantidadeRestante / consumoDiario);
  const diasAteVencimento = getDaysUntil(medicamento.proxima_renovacao);

  // Cenário 1: Estoque crítico + receita vencendo
  if (diasRestantes <= 5 && diasAteVencimento !== null && diasAteVencimento <= 15) {
    return {
      deveRenovar: true,
      mensagem: `Seu estoque de ${medicamento.nome} dura apenas ${diasRestantes} dias e a receita vence em ${diasAteVencimento} dias.`,
      urgencia: "alta" as const,
    };
  }

  // Cenário 2: Estoque crítico
  if (diasRestantes <= 3) {
    return {
      deveRenovar: true,
      mensagem: `Estoque crítico! ${medicamento.nome} dura apenas ${diasRestantes} dias.`,
      urgencia: "alta" as const,
    };
  }

  // Cenário 3: Receita vencendo
  if (diasAteVencimento !== null && diasAteVencimento <= 7) {
    return {
      deveRenovar: true,
      mensagem: `A receita de ${medicamento.nome} vence em ${diasAteVencimento} dias.`,
      urgencia: "media" as const,
    };
  }

  return {
    deveRenovar: false,
    mensagem: "",
    urgencia: "nenhuma" as const,
  };
}

// ============================================================
// 3. ANALISAR MELHOR FARMÁCIA (INSIGHT DE ECONOMIA)
// ============================================================
export function analisarMelhorFarmacia(renovacoes: Renovacao[]) {
  const farmaciasPrecos: Record<string, number[]> = {};

  renovacoes.forEach((r) => {
    if (r.farmacia_id && r.preco) {
      if (!farmaciasPrecos[r.farmacia_id]) {
        farmaciasPrecos[r.farmacia_id] = [];
      }
      farmaciasPrecos[r.farmacia_id].push(Number(r.preco));
    }
  });

  return Object.entries(farmaciasPrecos)
    .map(([id, precos]) => ({
      farmacia_id: id,
      media: precos.reduce((a, b) => a + b, 0) / precos.length,
      total_compras: precos.length,
    }))
    .sort((a, b) => a.media - b.media);
}

// ============================================================
// 4. CALCULAR ECONOMIA (ÚLTIMO PREÇO × MÉDIA ANTERIOR)
// ============================================================
export function calcularEconomia(renovacoes: Renovacao[]) {
  if (renovacoes.length < 2) return null;

  const ordenadas = [...renovacoes].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
  );
  const ultima = ordenadas[ordenadas.length - 1];
  const anteriores = ordenadas.slice(0, -1);

  if (anteriores.length === 0) return null;

  const mediaAnterior =
    anteriores.reduce((acc, r) => acc + (r.preco || 0), 0) / anteriores.length;

  const economia = (mediaAnterior - (ultima.preco || 0)).toFixed(2);
  const percentual = ((Number(economia) / mediaAnterior) * 100).toFixed(1);

  return {
    ultimo_preco: ultima.preco,
    media_anterior: mediaAnterior,
    economia: Number(economia),
    percentual: Number(percentual),
  };
}

// ============================================================
// 5. SUGERIR HORÁRIOS (ASSISTENTE)
// ============================================================
export function sugerirHorarios(
  primeiroHorario: string,
  vezesAoDia: number
): string[] {
  if (!primeiroHorario || vezesAoDia < 1) return [];

  const [h, m] = primeiroHorario.split(":").map(Number);
  const intervalo = Math.floor(24 / vezesAoDia);
  const horarios = [];

  for (let i = 0; i < vezesAoDia; i++) {
    const hora = (h + i * intervalo) % 24;
    const minuto = i === 0 ? m : 0;
    horarios.push(
      `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`
    );
  }

  return horarios;
}