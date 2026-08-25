// lib/health-insights.ts
import { computeEstoqueInfo, getDaysUntil } from "./health-utils";
import type { Medicamento, Renovacao, Consulta, Exame, Cirurgia, Tratamento, Cid } from "./types";

// ============================================================
// 1. VALIDAR VÍNCULO MÉDICO ↔ LOCAL (estabelecimento_id -> local_id)
// ============================================================
export function validarVinculoMedicoLocal(
  medico: { estabelecimentos?: string[] } | null | undefined,
  localId: string
): boolean {
  if (!medico || !localId) return true;
  if (medico.estabelecimentos && Array.isArray(medico.estabelecimentos)) {
    return medico.estabelecimentos.includes(localId);
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
      media_preco: precos.reduce((a, b) => a + b, 0) / precos.length,
      total_compras: precos.length,
    }))
    .sort((a, b) => a.media_preco - b.media_preco);
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
// 7. COMPORTAMENTO DE USO & SEGURANÇA (VIGILÂNCIA DE DOSAGEM)
// ============================================================
export interface ComportamentoInsight {
  tipo: 'padrao_esporadico' | 'alerta_adesao' | 'risco_superdosagem';
  titulo: string;
  mensagem: string;
  acaoSugerida: string;
  requerAtencaoUrgente?: boolean;
}

export function analisarComportamentoUso(
  medicamento: Medicamento,
  historicoDoses: Array<{ timestamp?: string; data?: string; status?: string }>
): ComportamentoInsight | null {
  if (!historicoDoses || historicoDoses.length === 0) return null;

  const agora = new Date();
  const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);
  const umaSemanaAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dosesUltimaHora = historicoDoses.filter(d => new Date(d.timestamp || d.data || '') >= umaHoraAtras);
  const dosesRecentes = historicoDoses.filter(d => new Date(d.timestamp || d.data || '') >= umaSemanaAtras);
  const isEsporadico = medicamento.tipo_uso === 'esporadico' || medicamento.tipo_uso === 'sos';

  // Vigilância de Segurança: Múltiplas doses em curto espaço de tempo (Proteção contra superdosagem)
  if (dosesUltimaHora.length >= 2) {
    return {
      tipo: 'risco_superdosagem',
      titulo: '⚠️ Alerta de Segurança e Dosagem',
      mensagem: `Você registrou ${dosesUltimaHora.length} doses de "${medicamento.nome}" na última hora. Verifique se está tudo bem ou se houve duplo registro.`,
      acaoSugerida: 'Ligar para 188 ou orientações médicas',
      requerAtencaoUrgente: true
    };
  }

  if (isEsporadico && dosesRecentes.length >= 4) {
    return {
      tipo: 'padrao_esporadico',
      titulo: 'Aumento no uso de SOS',
      mensagem: `Você utilizou "${medicamento.nome}" ${dosesRecentes.length} vezes na última semana. Considere reavaliar com seu médico.`,
      acaoSugerida: 'Conversar com médico'
    };
  }

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
  medicamentos: Medicamento[];
  consultasCount: number;
  ultimaConsulta: Consulta | null;
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
// 9. VIGILÂNCIA DE FARMÁCIA (CONTEXTO DE LOCAIS)
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
  urgencia: 'alta' | 'media' | 'baixa' | 'nenhuma';
  link: string;
}

export function gerarAlertasVisaoGeral(contexto: {
  medicamentos: Medicamento[];
  consultas: Consulta[];
  exames: Exame[];
  cirurgias: Cirurgia[];
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

  // 2. Retiradas / Retornos do SUS (Posto de Saúde / Dispensação)
  contexto.medicamentos.forEach(med => {
    if (med.tipo_aquisicao === 'sus' && med.data_retorno_sus) {
      const dias = getDaysUntil(med.data_retorno_sus);
      if (dias !== null) {
        if (dias < 0) {
          alerts.push({
            tipo: 'consulta',
            mensagem: `Prazo de retirada SUS de "${med.nome}" venceu há ${Math.abs(dias)} dia(s)!`,
            urgencia: 'alta',
            link: `/saude/medicamentos/detalhes?id=${med.id}`,
          });
        } else if (dias <= 7) {
          alerts.push({
            tipo: 'consulta',
            mensagem: `Retirada SUS de "${med.nome}" programada para daqui a ${dias} dia(s)`,
            urgencia: dias <= 2 ? 'alta' : 'media',
            link: `/saude/medicamentos/detalhes?id=${med.id}`,
          });
        }
      }
    }
  });

  // 3. Consultas (Próximos 7 dias)
  contexto.consultas.forEach(con => {
    if (con.status === 'agendada') {
      const dataCon = new Date(con.data);
      if (dataCon >= hoje && dataCon <= seteDias) {
        const dias = Math.ceil((dataCon.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const nomeMedico = con.medico || 'médico';
        alerts.push({
          tipo: 'consulta',
          mensagem: `Consulta com ${nomeMedico} em ${dias} dia${dias > 1 ? 's' : ''}`,
          urgencia: dias <= 2 ? 'alta' : 'media',
          link: `/saude/consultas/detalhes?id=${con.id}`,
        });
      }
    }
  });

  // 4. Exames (Vencidos ou Próximos 7 dias)
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

  // 5. Cirurgias (Próximos 30 dias)
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
    const ordem = { alta: 0, media: 1, baixa: 2, nenhuma: 3 };
    return ordem[a.urgencia] - ordem[b.urgencia];
  });
}


// ============================================================
// 11. ASSISTENTE DIÁRIO (INSIGHTS CRUZADOS DA ROTINA)
// ============================================================
export interface RotinaInsight {
  titulo: string;
  mensagem: string;
  icone: 'alerta' | 'info' | 'medico' | 'cirurgia';
  urgencia: 'alta' | 'media' | 'baixa';
}

export function analisarRotinaDiaria(
  dosesHoje: Array<{ tomada?: boolean; ignorada?: boolean; horario: string }>,
  compromissosHoje: Array<{ tipo: string; procedimento?: string; nome?: string; medico?: string }>
): RotinaInsight | null {
  // Regra 1: Risco Cirúrgico (Jejum/Interação)
  const cirurgiaHoje = compromissosHoje.find(c => c.tipo === 'cirurgia');
  if (cirurgiaHoje && dosesHoje.some(d => !d.tomada && !d.ignorada)) {
    return {
      titulo: 'Atenção: Jejum e Medicações',
      mensagem: `Você tem uma cirurgia hoje (${cirurgiaHoje.procedimento || ''}). Confirme com sua equipe médica antes de tomar qualquer dose pendente.`,
      icone: 'cirurgia',
      urgencia: 'alta'
    };
  }

  // Regra 2: Risco de Exame (Ex: Exames de Sangue pedem jejum)
  const exameHoje = compromissosHoje.find(c => 
    c.tipo === 'exame' && 
    (c.nome?.toLowerCase().includes('sangue') || 
     c.nome?.toLowerCase().includes('glicemia') || 
     c.nome?.toLowerCase().includes('colesterol'))
  );
  if (exameHoje && dosesHoje.some(d => !d.tomada && !d.ignorada && Number(d.horario.split(':')[0]) < 12)) {
    return {
      titulo: 'Exame Laboratorial Hoje',
      mensagem: `Verifique os requisitos de jejum para o exame "${exameHoje.nome}" antes de tomar medicamentos pela manhã.`,
      icone: 'alerta',
      urgencia: 'media'
    };
  }

  // Regra 3: Aproveitamento de Consulta
  const consultaHoje = compromissosHoje.find(c => c.tipo === 'consulta');
  if (consultaHoje) {
    const medico = consultaHoje.medico || 'seu médico';
    return {
      titulo: 'Dia de Consulta',
      mensagem: `Você verá o(a) Dr(a). ${medico} hoje. Aproveite para relatar como está sendo sua adesão à rotina de medicamentos.`,
      icone: 'medico',
      urgencia: 'baixa'
    };
  }

  return null;
}

// ============================================================
// 12. VALIDAÇÃO INTELIGENTE DE RECEITAS ARQUIVADAS
// ============================================================
export interface StatusReceita {
  status: 'valida' | 'proxima' | 'vencida' | 'renovada_historico';
  label: string;
  color: string;
}

export function analisarReceitaArquivada(
  dataReceita: string | undefined,
  medicamentoAlvo: Medicamento | null,
  renovacoesDoMedicamento: Renovacao[]
): StatusReceita | null {
  if (!dataReceita) return null;

  // 1. Verifica se houve compra APÓS a data desta receita
  const temRenovacaoRecente = renovacoesDoMedicamento.some(
    r => new Date(r.data) >= new Date(dataReceita)
  );

  if (temRenovacaoRecente) {
    return { status: 'renovada_historico', label: 'Arquivada (Renovada)', color: '#38BDF8' };
  }

  // 2. Se não renovou, verifica se está vencida
  const vencida = isReceitaVencidaSegura(dataReceita);
  const dias = getDaysUntil(dataReceita);

  if (vencida) {
    return { status: 'vencida', label: 'Vencida', color: '#EF4444' };
  } else if (dias !== null && dias <= 7) {
    return { status: 'proxima', label: 'Vence em breve', color: '#F59E0B' };
  }

  return { status: 'valida', label: 'Válida', color: '#10B981' };
}

// ============================================================
// 13. INTELIGÊNCIA E INSIGHTS PARA CIDs (CID-10)
// ============================================================
export interface CidInsight {
  categoria: string;
  tratamentosSugeridos: string[];
  alertaClinico: string;
}

export function getCidInsights(codigo: string): CidInsight {
  const codigoLimpo = (codigo || "").trim().toUpperCase();
  
  // Transtornos Hipercinéticos / TDAH (Capítulo F90)
  if (codigoLimpo.startsWith("F90")) {
    return {
      categoria: "Neurodesenvolvimento (TDAH)",
      tratamentosSugeridos: ["Psicoestimulantes", "Terapia Cognitivo-Comportamental (TCC)", "Organização de Rotina e Tarefas"],
      alertaClinico: "Monitorar padrões de apatia, foco e constância nas tomadas de medicação de longo prazo."
    };
  }

  // Transtornos Depressivos (Capítulo F32 ou F33)
  if (codigoLimpo.startsWith("F32") || codigoLimpo.startsWith("F33")) {
    return {
      categoria: "Transtorno do Humor (Depressão)",
      tratamentosSugeridos: ["Antidepressivos (ISRS/IRSN)", "Psicoterapia de Apoio", "Acompanhamento Psiquiátrico Regular"],
      alertaClinico: "Atenção redobrada a quedas de adesão ao tratamento e episódios de desânimo prolongado."
    };
  }

  // Dor Crônica / Neuropática ou enxaquecas comuns
  if (codigoLimpo.startsWith("G43") || codigoLimpo.startsWith("M54")) {
    return {
      categoria: "Dor Crônica / Neurológica",
      tratamentosSugeridos: ["Analgésicos / Opiáceos de controle", "Fisioterapia", "Avaliação de Dor Neuropática"],
      alertaClinico: "Vigiar o aumento no uso de medicamentos SOS para dor e garantir acompanhamento médico contínuo."
    };
  }

  // Fallback padrão para outras CIDs
  return {
    categoria: "Condição Clínica Geral",
    tratamentosSugeridos: ["Acompanhamento Médico Regular", "Manutenção de Prontuários e Laudos atualizados"],
    alertaClinico: "Certifique-se de manter os exames e receitas associados a este CID salvos no cofre do paciente."
  };
}

// ============================================================
// 14. ANÁLISE DE ADESÃO (MEDICAMENTOS) – NOVA FUNÇÃO
// ============================================================
export function analisarAdesaoMedicamento(
  medicamento: Medicamento,
  doseLogs: Array<{ data: string; horario: string; quantidade: number }>,
  ultimosDias: number = 7
): { adesao: number; status: 'boa' | 'media' | 'baixa'; mensagem: string } {
  const horarios = medicamento.estoque_horarios || [];
  if (horarios.length === 0) {
    return { adesao: 100, status: 'boa', mensagem: 'Sem horários configurados' };
  }

  const hoje = new Date();
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() - ultimosDias);

  const dosesEsperadas = horarios.length * ultimosDias;
  const dosesTomadas = doseLogs.filter(d => new Date(d.data) >= dataLimite).length;

  const adesao = Math.min(100, Math.round((dosesTomadas / dosesEsperadas) * 100));
  let status: 'boa' | 'media' | 'baixa';
  let mensagem: string;

  if (adesao >= 80) {
    status = 'boa';
    mensagem = 'Ótima adesão! Continue assim.';
  } else if (adesao >= 50) {
    status = 'media';
    mensagem = 'Atenção: você perdeu algumas doses recentemente.';
  } else {
    status = 'baixa';
    mensagem = 'Baixa adesão. Reavalie sua rotina de medicamentos.';
  }

  return { adesao, status, mensagem };
}

// ============================================================
// 15. MOTOR DE INTELIGÊNCIA CLÍNICA E SINAIS VITAIS (COMPLETO)
// ============================================================
export interface RegistroSaudeInsight {
  status: 'normal' | 'atencao' | 'alerta' | 'critico';
  titulo: string;
  mensagem: string;
  recomendacao: string;
}

export function analisarRegistroSaude(
  tipo: string, 
  valorMedicao?: string, 
  intensidade?: number,
  observacoes?: string
): RegistroSaudeInsight | null {
  if (!tipo) return null;
  const t = tipo.toLowerCase().trim();

  // 1. PRESSÃO ARTERIAL (Ex: "120/80")
  if (t.includes('pressao') || t.includes('pressão') || t.includes('pa')) {
    if (!valorMedicao) return null;
    const [sisStr, diasStr] = valorMedicao.split('/');
    const sis = Number(sisStr);
    const dias = Number(diasStr);
    if (isNaN(sis) || isNaN(dias)) return null;

    if (sis >= 180 || dias >= 120) {
      return {
        status: 'critico',
        titulo: 'Crise Hipertensiva',
        mensagem: `Pressão muito alta (${sis}/${dias} mmHg). Risco iminente à saúde.`,
        recomendacao: 'Procure atendimento médico de emergência imediatamente se houver sintomas associados.'
      };
    }
    if (sis >= 140 || dias >= 90) {
      return {
        status: 'alerta',
        titulo: 'Hipertensão Detectada',
        mensagem: `Pressão arterial elevada (${sis}/${dias} mmHg).`,
        recomendacao: 'Evite esforço físico intenso, descanse e registre novamente em 30 minutos. Consulte seu médico.'
      };
    }
    if (sis >= 130 || dias >= 85) {
      return {
        status: 'atencao',
        titulo: 'Pressão Limítrofe (Pré-hipertensão)',
        mensagem: `Valores ligeiramente acima do ideal (${sis}/${dias} mmHg).`,
        recomendacao: 'Monitore o consumo de sódio e mantenha-se hidratado ao longo do dia.'
      };
    }
    if (sis < 90 || dias < 60) {
      return {
        status: 'atencao',
        titulo: 'Hipotensão (Pressão Baixa)',
        mensagem: `Pressão baixa (${sis}/${dias} mmHg). Pode causar tontura ou fraqueza.`,
        recomendacao: 'Beba água, consuma uma pitada de sal ou alimento leve e deite-se se sentir vertigem.'
      };
    }
    return {
      status: 'normal',
      titulo: 'Pressão Ideal',
      mensagem: `Pressão arterial excelente (${sis}/${dias} mmHg).`,
      recomendacao: 'Continue mantendo seus hábitos e rotina de cuidados.'
    };
  }

  // 2. GLICEMIA (Ex: "99", "140")
  if (t.includes('glicemia') || t.includes('acucar') || t.includes('açúcar') || t.includes('glicose')) {
    if (!valorMedicao) return null;
    const glic = Number(valorMedicao.replace(',', '.'));
    if (isNaN(glic)) return null;

    if (glic < 70) {
      return {
        status: 'alerta',
        titulo: 'Hipoglicemia (Glicose Baixa)',
        mensagem: `Glicemia em ${glic} mg/dL. Risco de tontura e tremores.`,
        recomendacao: 'Ingira carboidratos de rápida absorção imediatamente (ex: 1 colher de açúcar, mel ou suco).'
      };
    }
    if (glic > 200) {
      return {
        status: 'alerta',
        titulo: 'Hiperglicemia Elevada',
        mensagem: `Glicemia alta registrada (${glic} mg/dL).`,
        recomendacao: 'Entre em contato com seu médico para reavaliar a medicação ou dieta recente.'
      };
    }
    if (glic > 125) {
      return {
        status: 'atencao',
        titulo: 'Glicemia Alterada (Jejum)',
        mensagem: `Glicemia em ${glic} mg/dL, acima da faixa padrão.`,
        recomendacao: 'Monitore com frequência e leve o histórico para sua próxima consulta médica.'
      };
    }
    return {
      status: 'normal',
      titulo: 'Glicemia Estável',
      mensagem: `Glicemia dentro dos parâmetros aceitáveis (${glic} mg/dL).`,
      recomendacao: 'Mantenha sua rotina alimentar e hidratação.'
    };
  }

  // 3. TEMPERATURA / FEBRE (Ex: "38.5")
  if (t.includes('temperatura') || t.includes('febre')) {
    if (!valorMedicao) return null;
    const temp = Number(valorMedicao.replace(',', '.'));
    if (isNaN(temp)) return null;

    if (temp >= 39.5) {
      return {
        status: 'critico',
        titulo: 'Febre Alta / Hipertermia',
        mensagem: `Temperatura crítica de ${temp}°C.`,
        recomendacao: 'Utilize antitérmico prescrito, faça compressas mornas e procure avaliação médica de prontidão.'
      };
    }
    if (temp >= 38.0) {
      return {
        status: 'alerta',
        titulo: 'Estado Febril',
        mensagem: `Temperatura elevada (${temp}°C).`,
        recomendacao: 'Mantenha-se hidratado, descanse e monitore a evolução da temperatura a cada 4 horas.'
      };
    }
    if (temp >= 37.3) {
      return {
        status: 'atencao',
        titulo: 'Febrícula (Estado Subfebril)',
        mensagem: `Temperatura ligeiramente alta (${temp}°C).`,
        recomendacao: 'Fique atento ao surgimento de outros sintomas associados (corpo mole, dor de cabeça).'
      };
    }
    if (temp < 35.0) {
      return {
        status: 'alerta',
        titulo: 'Hipotermia Leve',
        mensagem: `Temperatura abaixo do normal (${temp}°C).`,
        recomendacao: 'Aqueca-se com roupas adequadas, cobertores e bebidas mornas.'
      };
    }
    return {
      status: 'normal',
      titulo: 'Temperatura Normal',
      mensagem: `Temperatura corporal estável (${temp}°C).`,
      recomendacao: 'Tudo dentro da normalidade.'
    };
  }

  // 4. FREQUÊNCIA CARDÍACA / PULSO (Ex: "85")
  if (t.includes('batimento') || t.includes('pulso') || t.includes('frequencia') || t.includes('cardíaca') || t.includes('bpm')) {
    if (!valorMedicao) return null;
    const bpm = Number(valorMedicao);
    if (isNaN(bpm)) return null;

    if (bpm > 120) {
      return {
        status: 'alerta',
        titulo: 'Taquicardia (Batimento Acelerado)',
        mensagem: `Frequência cardíaca alta (${bpm} bpm em repouso).`,
        recomendacao: 'Sente-se, respire fundo de forma controlada. Se persistir com falta de ar, busque ajuda médica.'
      };
    }
    if (bpm < 50) {
      return {
        status: 'atencao',
        titulo: 'Bradicardia (Batimento Lento)',
        mensagem: `Frequência cardíaca baixa (${bpm} bpm).`,
        recomendacao: 'Se não for atleta condicionado e houver tontura associada, consulte um cardiologista.'
      };
    }
    return {
      status: 'normal',
      titulo: 'Frequência Cardíaca Normal',
      mensagem: `Ritmo cardíaco saudável (${bpm} bpm).`,
      recomendacao: 'Parâmetro excelente para o seu dia a dia.'
    };
  }

  // 5. ESCALA DE INTENSIDADE PARA SINTOMAS (DOR, ANSIEDADE, FADIGA, APATIA, NÁUSEA - 1 A 10)
  if (intensidade !== undefined && intensidade !== null) {
    if (intensidade >= 8) {
      return {
        status: 'critico',
        titulo: 'Intensidade Severa / Crítica',
        mensagem: `Nível ${intensidade}/10 relatado para "${t}". Impacto forte na rotina.`,
        recomendacao: 'Utilize o medicamento de resgate SOS indicado pelo seu médico ou entre em contato com o especialista responsável.'
      };
    }
    if (intensidade >= 5) {
      return {
        status: 'alerta',
        titulo: 'Intensidade Moderada',
        mensagem: `Nível ${intensidade}/10 para "${t}". Sintoma incômodo que merece monitoramento.`,
        recomendacao: 'Descanse, observe se há gatilhos ambientais ou alimentares e avalie suporte de medicação leve.'
      };
    }
    if (intensidade >= 1) {
      return {
        status: 'atencao',
        titulo: 'Sintoma Leve',
        mensagem: `Nível ${intensidade}/10. Desconforto sutil.`,
        recomendacao: 'Acompanhe a evolução ao longo das próximas horas com hidratação ou repouso.'
      };
    }
  }

  // 6. CASOS ESPECÍFICOS DE SINTOMAS E CONTEXTOS (ANSIEDADE, SONO, APATIA, FADIGA)
  if (t.includes('ansiedade') || t.includes('panico') || t.includes('pânico')) {
    return {
      status: 'atencao',
      titulo: 'Apoio para Crise de Ansiedade',
      mensagem: 'Momentos de ansiedade intensa exigem pausas para resgate emocional e regulação respiratória.',
      recomendacao: 'Pratique respiração diafragmática profunda (inspire em 4s, segure por 4s, expire em 4s).'
    };
  }

  if (t.includes('insonia') || t.includes('sono')) {
    return {
      status: 'atencao',
      titulo: 'Monitoramento do Sono',
      mensagem: 'Dificuldades para dormir afetam diretamente a disposição, o humor e a resposta imunológica.',
      recomendacao: 'Evite telas 1 hora antes de deitar, mantenha o ambiente escuro e evite cafeína à tarde.'
    };
  }

  if (t.includes('apatia') || t.includes('fadiga') || t.includes('desanimo') || t.includes('cansaço')) {
    return {
      status: 'atencao',
      titulo: 'Avaliação de Fadiga e Energia',
      mensagem: 'Cansaço ou desânimo persistente são sinais importantes para rastrear na rotina clínica.',
      recomendacao: 'Anote os horários em que a apatia é mais forte e discuta esses picos com seu médico.'
    };
  }

  return {
    status: 'normal',
    titulo: 'Registro Prontuário',
    mensagem: `O sintoma "${tipo}" foi salvo no prontuário com sucesso.`,
    recomendacao: 'Mantenha o registro contínuo para gerar um histórico detalhado para o seu acompanhamento.'
  };
}
