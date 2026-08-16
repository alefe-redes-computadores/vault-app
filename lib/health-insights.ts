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
    return { deveRenovar: false, mensagem: "", urgencia: "nenhuma" as const };
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

  return { deveRenovar: false, mensagem: "", urgencia: "nenhuma" as const };
}

// ============================================================
// 3. ANALISAR MELHOR FARMÁCIA (INSIGHT DE ECONOMIA)
// ============================================================
export function analisarMelhorFarmacia(renovacoes: Renovacao[]) {
  const farmaciasPrecos: Record<string, number[]> = {};

  renovacoes.forEach((r) => {
    if (r.farmacia_id && r.preco) {
      if (!farmaciasPrecos[r.farmacia_id]) farmaciasPrecos[r.farmacia_id] = [];
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

  const mediaAnterior = anteriores.reduce((acc, r) => acc + (r.preco || 0), 0) / anteriores.length;
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
// 5. SUGERIR HORÁRIOS (ASSISTENTE / SMART DOSAGE)
// ============================================================
export function sugerirHorarios(primeiroHorario: string, vezesAoDia: number): string[] {
  if (!primeiroHorario || vezesAoDia < 1) return [];

  const [h, m] = primeiroHorario.split(":").map(Number);
  const intervalo = Math.floor(24 / vezesAoDia);
  const horarios = [];

  for (let i = 0; i < vezesAoDia; i++) {
    const hora = (h + i * intervalo) % 24;
    horarios.push(`${String(hora).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return horarios;
}

// ============================================================
// 6. VALIDAÇÃO DE RECEITA À PROVA DE FALHAS
// ============================================================
export function isReceitaVencidaSegura(dataRenovacao?: string): boolean {
  if (!dataRenovacao) return false;
  try {
    const dataExp = new Date(dataRenovacao);
    if (isNaN(dataExp.getTime())) return false;
    return dataExp < new Date();
  } catch {
    return false;
  }
}

// ============================================================
// 7. COMPORTAMENTO DE USO (ALERTAS INTELIGENTES)
// ============================================================
export function analisarComportamentoUso(medicamento: any, historicoDoses: any[]) {
  if (!historicoDoses || historicoDoses.length === 0) return null;

  const umaSemanaAtras = new Date();
  umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
  
  const dosesRecentes = historicoDoses.filter(d => new Date(d.timestamp || d.data) >= umaSemanaAtras);
  const isEsporadico = medicamento.tipo_uso === 'esporadico' || medicamento.tipo_uso === 'sos';

  // SOS usado com alta frequência
  if (isEsporadico && dosesRecentes.length >= 4) {
    return {
      tipo: 'padrao_esporadico',
      titulo: 'Aumento no uso de SOS',
      mensagem: `Você utilizou "${medicamento.nome}" ${dosesRecentes.length} vezes na última semana. Considere reavaliar com seu médico.`,
      acaoSugerida: 'Conversar com médico'
    };
  }

  // Queda na adesão
  const dosesPerdidas = dosesRecentes.filter(d => d.status === 'perdido' || d.status === 'ignorado');
  if (dosesPerdidas.length >= 3) {
    return {
      tipo: 'alerta_adesao',
      titulo: 'Atenção aos horários',
      mensagem: `Você perdeu algumas doses de "${medicamento.nome}" recentemente. A constância é essencial.`,
      acaoSugerida: 'Ajustar alarmes'
    };
  }

  return null;
}

// ============================================================
// 8. VIGILÂNCIA MÉDICA (CONTEXTO ESPECÍFICO DE MÉDICOS)
// ============================================================
export interface MedicoInsight {
  urgencia: 'alta' | 'media' | 'baixa' | 'nenhuma';
  mensagem: string;
  tipo: 'estoque' | 'adesao' | 'frequencia' | 'nenhum';
}

export function analisarMedico(medicoContexto: { 
  medicamentos: any[], 
  consultasCount: number, 
  ultimaConsulta: any 
}): MedicoInsight | null {
  
  const mesesDesdeUltimaConsulta = medicoContexto.ultimaConsulta 
    ? (new Date().getTime() - new Date(medicoContexto.ultimaConsulta.data).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 12;

  if (medicoContexto.medicamentos.length > 0 && mesesDesdeUltimaConsulta > 6) {
    return {
      urgencia: 'media',
      tipo: 'frequencia',
      mensagem: `Sem consulta há ${Math.floor(mesesDesdeUltimaConsulta)} meses com prescrições ativas.`
    };
  }

  return null;
}

// ============================================================
// 9. VIGILÂNCIA DE FARMÁCIA (CONTEXTO DE ESTABELECIMENTOS)
// ============================================================
export interface FarmaciaInsight {
  status: 'destaque_preco' | 'alerta_gasto' | 'neutro';
  mensagem: string;
}

export function analisarFarmaciaDetalhada(farmaciaContexto: {
  totalGasto: number;
  comprasCount: number;
  isMaisEconomica: boolean;
}): FarmaciaInsight | null {
  if (farmaciaContexto.isMaisEconomica && farmaciaContexto.comprasCount > 0) {
    return {
      status: 'destaque_preco',
      mensagem: 'Esta é a sua farmácia mais econômica com base no histórico de preços.'
    };
  }

  if (farmaciaContexto.totalGasto > 300) {
    return {
      status: 'alerta_gasto',
      mensagem: `Alto volume financeiro histórico acumulado (R$ ${farmaciaContexto.totalGasto.toFixed(2)}).`
    };
  }

  return null;
}

// ============================================================
// 10. VISÃO GERAL DA REDE (MOTOR DE ALERTAS CRUZADOS)
// ============================================================
export interface AlertaVisaoGeral {
  tipo: 'estoque' | 'receita' | 'consulta' | 'exame' | 'cirurgia';
  mensagem: string;
  urgencia: 'alta' | 'media' | 'baixa';
  link: string;
}

export function gerarAlertasVisaoGeral(contexto: {
  medicamentos: any[];
  consultas: any[];
  exames: any[];
  cirurgias: any[];
}): AlertaVisaoGeral[] {
  const alerts: AlertaVisaoGeral[] = [];
  const hoje = new Date();
  
  const seteDias = new Date(hoje);
  seteDias.setDate(hoje.getDate() + 7);
  
  const trintaDias = new Date(hoje);
  trintaDias.setDate(hoje.getDate() + 30);

  // 1. Medicamentos (Estoque e Receita)
  contexto.medicamentos.forEach(med => {
    const insight = sugerirRenovacao(med);
    if (insight.deveRenovar) {
      alerts.push({
        tipo: 'estoque',
        mensagem: insight.mensagem,
        urgencia: insight.urgencia,
        link: `/saude/medicamentos/detalhes?id=${med.id}`,
      });
    }

    if (isReceitaVencidaSegura(med.proxima_renovacao)) {
      alerts.push({
        tipo: 'receita',
        mensagem: `Receita de ${med.nome} está vencida.`,
        urgencia: 'alta',
        link: `/saude/medicamentos/detalhes?id=${med.id}`,
      });
    }
  });

  // 2. Consultas (Próximos 7 dias)
  contexto.consultas.forEach(con => {
    if (con.status === 'agendada') {
      const dataCon = new Date(con.data);
      if (dataCon >= hoje && dataCon <= seteDias) {
        const dias = Math.ceil((dataCon.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const nomeMedico = con.medico || con.medico_nome || 'médico';
        alerts.push({
          tipo: 'consulta',
          mensagem: `Consulta com ${nomeMedico} em ${dias} dia${dias > 1 ? 's' : ''}`,
          urgencia: dias <= 2 ? 'alta' : 'media',
          link: `/saude/consultas/detalhes?id=${con.id}`,
        });
      }
    }
  });

  // 3. Exames (Vencidos ou Próximos 7 dias)
  contexto.exames.forEach(exame => {
    if (exame.data_retorno) {
      const dias = getDaysUntil(exame.data_retorno);
      if (dias !== null) {
        if (dias < 0) {
          alerts.push({
            tipo: 'exame',
            mensagem: `Prazo do exame "${exame.nome}" venceu há ${Math.abs(dias)} dia(s)`,
            urgencia: 'alta',
            link: `/saude/exames/detalhes?id=${exame.id}`,
          });
        } else if (dias <= 7) {
          alerts.push({
            tipo: 'exame',
            mensagem: `Apresentação do exame "${exame.nome}" em ${dias} dia(s)`,
            urgencia: dias <= 2 ? 'alta' : 'media',
            link: `/saude/exames/detalhes?id=${exame.id}`,
          });
        }
      }
    }
  });

  // 4. Cirurgias (Próximos 30 dias)
  contexto.cirurgias.forEach(cir => {
    if (cir.status === 'agendada') {
      const dataCir = new Date(cir.data);
      if (dataCir >= hoje && dataCir <= trintaDias) {
        const dias = Math.ceil((dataCir.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          tipo: 'cirurgia',
          mensagem: `Cirurgia "${cir.procedimento}" em ${dias} dia${dias > 1 ? 's' : ''}`,
          urgencia: dias <= 7 ? 'alta' : 'media',
          link: `/saude/cirurgias/detalhes?id=${cir.id}`,
        });
      }
    }
  });

  // Ordenar por urgência
  return alerts.sort((a, b) => {
    const ordem = { alta: 0, media: 1, baixa: 2 };
    return ordem[a.urgencia] - ordem[b.urgencia];
  });
}
