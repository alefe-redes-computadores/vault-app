//lib/health-utils.ts
import type { Document, Medicamento, TipoReceita } from "@/lib/types";
import { 
  Brain, 
  Flame, 
  HeartPulse, 
  ShieldAlert, 
  Activity, 
  Moon, 
  Eye,
  Droplet,
  CheckCircle2,
  Clock,
  XCircle,
  Stethoscope
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AlertLevel = "vencido" | "urgente" | "atencao" | "ok";

export interface HealthAlert {
  id: string;
  kind: "medicamento" | "documento" | "consulta" | "estoque" | "exame" | "cirurgia" | "tratamento" | "renovacao";
  title: string;
  subtitle: string;
  date: string;
  daysUntil: number;
  level: AlertLevel;
  href: string;
  tipoReceita?: TipoReceita;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const URGENTE_DIAS = 5;
const ATENCAO_DIAS = 15;
const URGENTE_DIAS_CONTROLADA = 7;
const ATENCAO_DIAS_CONTROLADA = 18;

const URGENTE_DIAS_ESTOQUE = 3;
const ATENCAO_DIAS_ESTOQUE = 7;

export const VALIDADE_RECEITA_DIAS: Record<TipoReceita, number | null> = {
  comum: null,
  amarela: 30,
  azul: 60,
  branca: 60,
};

export const TIPO_RECEITA_LABELS: Record<TipoReceita, string> = {
  comum: "Comum",
  amarela: "Amarela",
  azul: "Azul",
  branca: "Branca controlada",
};

export function isControlada(tipo?: TipoReceita): boolean {
  return !!tipo && tipo !== "comum";
}

export function getDaysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function getAlertLevel(
  daysUntil: number | null,
  controlada: boolean = false
): AlertLevel {
  if (daysUntil === null) return "ok";
  if (daysUntil < 0) return "vencido";
  const urgenteLimite = controlada ? URGENTE_DIAS_CONTROLADA : URGENTE_DIAS;
  const atencaoLimite = controlada ? ATENCAO_DIAS_CONTROLADA : ATENCAO_DIAS;
  if (daysUntil <= urgenteLimite) return "urgente";
  if (daysUntil <= atencaoLimite) return "atencao";
  return "ok";
}

export function suggestRenewalDate(dataReceita: string, tipo: TipoReceita): string {
  const dias = VALIDADE_RECEITA_DIAS[tipo];
  if (!dias) return "";
  const date = new Date(dataReceita);
  if (isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
}

export interface EstoqueInfo {
  consumoDiario: number;
  quantidadeInicial: number;
  quantidadeRestante: number;
  diasRestantes: number;
  dosesRestantes: number; 
  unidade: string;
  textoEstoque: string; 
}

export function temEstoqueConfigurado(med: Medicamento): boolean {
  return typeof med.estoque_quantidade === "number";
}

export function computeEstoqueInfo(med: Medicamento): EstoqueInfo | null {
  if (!temEstoqueConfigurado(med)) return null;

  const horarios = med.estoque_horarios || [];
  const isSOS = med.tipo_uso !== "continuo";
  const unidadePorDose = med.estoque_unidade_por_dose || 1;
  const quantidadeRestante = med.estoque_quantidade!;
  const unidade = (med.estoque_unidade_medida || "unidades").toLowerCase();
  const formato = (med.formato || "").toLowerCase();
  const isGotas = formato.includes("gota");

  let diasRestantes = 0;
  let dosesRestantes = 0;
  let consumoDiario = 0;
  let textoEstoque = "";

  if (isGotas && (unidade.includes("ml") || unidade.includes("frasco"))) {
    const gotasPorMl = med.estoque_gotas_por_ml || 20; 
    const totalGotas = quantidadeRestante * gotasPorMl; 
    
    consumoDiario = horarios.length * unidadePorDose; 
    dosesRestantes = Math.floor(totalGotas / (unidadePorDose > 0 ? unidadePorDose : 1));
    
    if (!isSOS && consumoDiario > 0) {
      diasRestantes = Math.floor(totalGotas / consumoDiario);
    }
    
    textoEstoque = `${quantidadeRestante} ${med.estoque_unidade_medida || 'ml'} (aprox. ${dosesRestantes} doses)`;
  } else {
    consumoDiario = horarios.length * unidadePorDose; 
    dosesRestantes = Math.floor(quantidadeRestante / (unidadePorDose > 0 ? unidadePorDose : 1));
    
    if (!isSOS && consumoDiario > 0) {
      diasRestantes = Math.floor(quantidadeRestante / consumoDiario);
    }
    
    textoEstoque = `${quantidadeRestante} ${med.estoque_unidade_medida || 'unidades'}`;
  }

  return {
    consumoDiario,
    quantidadeInicial: quantidadeRestante,
    quantidadeRestante,
    diasRestantes,
    dosesRestantes,
    unidade: med.estoque_unidade_medida || "unidade(s)",
    textoEstoque,
  };
}
/**
 * 🔄 Calcula o estoque estimado retroativamente com base em uma data passada.
 * Se o usuário comprou comprimidos no passado, o app abate o consumo diário até hoje.
 */
export function calcularEstoqueRetroativo(
  quantidadeComprada: number,
  dataCompraStr: string,
  horariosDiarios: string[],
  unidadePorDose: number = 1
): number {
  if (!dataCompraStr || quantidadeComprada <= 0) return quantidadeComprada;
  
  const dataCompra = new Date(dataCompraStr);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataCompra.setHours(0, 0, 0, 0);

  const diffTime = hoje.getTime() - dataCompra.getTime();
  const diasPassados = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diasPassados <= 0) return quantidadeComprada;

  const consumoDiario = (horariosDiarios.length || 1) * unidadePorDose;
  const totalConsumido = diasPassados * consumoDiario;
  const saldoRestante = quantidadeComprada - totalConsumido;

  return Math.max(0, saldoRestante);
}



export function getEstoqueAlerts(medicamentos: Medicamento[]): HealthAlert[] {
  return medicamentos
    .filter((med) => !!med.id && temEstoqueConfigurado(med))
    .map((med) => {
      const info = computeEstoqueInfo(med)!;
      const daysUntil = info.diasRestantes;
      let level: AlertLevel = "ok";
      
      if (daysUntil <= 0) level = "vencido";
      else if (daysUntil <= URGENTE_DIAS_ESTOQUE) level = "urgente";
      else if (daysUntil <= ATENCAO_DIAS_ESTOQUE) level = "atencao";

      return {
        id: med.id!,
        kind: "estoque" as const,
        title: med.nome,
        subtitle: `${info.quantidadeRestante} ${info.unidade} restantes`,
        date: "",
        daysUntil,
        level,
        href: `/saude/medicamentos/editar?id=${med.id}`,
        tipoReceita: med.tipo_receita,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getMedicamentoAlerts(medicamentos: Medicamento[]): HealthAlert[] {
  return medicamentos
    .filter((med) => !!med.id)
    .map((med) => {
      const controlada = isControlada(med.tipo_receita);
      const daysUntil = getDaysUntil(med.proxima_renovacao);
      return {
        id: med.id!,
        kind: "medicamento" as const,
        title: med.nome,
        subtitle: `${med.dosagem} · Dr(a). ${med.medico || "Não informado"}`,
        date: med.proxima_renovacao || "",
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil, controlada),
        href: `/saude/medicamentos/editar?id=${med.id}`,
        tipoReceita: med.tipo_receita,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getDocumentAlerts(documents: Document[]): HealthAlert[] {
  return documents
    .filter((doc) => doc.category_id === "saude" && !!doc.id)
    .map((doc) => {
      const expiry = String(doc.metadata?.expiry_date || doc.metadata?.renewal_date || '');
      const daysUntil = getDaysUntil(expiry);
      return {
        id: doc.id!,
        kind: "documento" as const,
        title: doc.title,
        subtitle: doc.type === "receita" ? "Receita" : doc.type,
        date: expiry,
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil),
        href: `/detalhes?id=${doc.id}`,
      };
    })
    .filter((a) => a.date && a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getUpcomingAppointments(documents: Document[]): HealthAlert[] {
  const relevantTypes = ["prontuario", "laudo", "encaminhamento"];
  return documents
    .filter(
      (doc) =>
        doc.category_id === "saude" && !!doc.id && relevantTypes.includes(doc.type)
    )
    .map((doc) => {
      const date = String(doc.metadata?.date || '');
      const subtitle = String(doc.metadata?.specialty || doc.metadata?.hospital || doc.type);
      const daysUntil = getDaysUntil(date);
      return {
        id: doc.id!,
        kind: "consulta" as const,
        title: doc.title,
        subtitle,
        date,
        daysUntil: daysUntil ?? -999,
        level: "ok" as AlertLevel,
        href: `/detalhes?id=${doc.id}`,
      };
    })
    .filter((a) => a.date && a.daysUntil >= 0 && a.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getExameAlerts(exames: any[]): HealthAlert[] {
  return exames
    .filter((exame) => !!exame.id && !!exame.data_retorno)
    .map((exame) => {
      const daysUntil = getDaysUntil(exame.data_retorno);
      return {
        id: exame.id,
        kind: "exame" as const,
        title: `Retorno Exame: ${exame.nome}`,
        subtitle: `Laboratório: ${exame.laboratorio || "Não informado"}`,
        date: exame.data_retorno,
        daysUntil: daysUntil ?? 999,
        level: getAlertLevel(daysUntil),
        href: `/saude/exames/detalhes?id=${exame.id}`,
      };
    })
    .filter((a) => a.level !== "ok")
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function alertLevelColor(level: AlertLevel): string {
  switch (level) {
    case "vencido": return "#F87171";
    case "urgente": return "#FB923C";
    case "atencao": return "#FBBF24";
    default: return "#7C9CB5";
  }
}

export function alertLevelLabel(level: AlertLevel, daysUntil: number): string {
  if (level === "vencido") {
    const dias = Math.abs(daysUntil);
    return dias === 0 ? "Acabou hoje" : `Acabou há ${dias} dia${dias !== 1 ? "s" : ""}`;
  }
  if (daysUntil === 0) return "Vence hoje";
  return `Vence em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`;
}

export function estoqueLevelLabel(level: AlertLevel, diasRestantes: number): string {
  if (level === "vencido") return "Acabou";
  if (diasRestantes === 0) return "Acaba hoje";
  return `Acaba em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`;
}

export function getLocalTodayISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

export function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ==========================================
// NOVAS FUNÇÕES UTILITÁRIAS GLOBAIS ADICIONADAS
// ==========================================

export function formatCurrency(value: number | undefined | null): string {
  const val = typeof value === 'number' ? value : 0;
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

export function getStatusConfig(status: string): { color: string; icon: LucideIcon } {
  switch (status?.toLowerCase()) {
    case "agendada":
      return { color: "#F59E0B", icon: Clock }; // Âmbar
    case "realizada":
      return { color: "#34D399", icon: CheckCircle2 }; // Verde
    case "cancelada":
      return { color: "#EF4444", icon: XCircle }; // Vermelho
    default:
      return { color: "#38BDF8", icon: Stethoscope }; // Azul padrão
  }
}

/**
 * Utilitário centralizado para definir ícones e cores de CIDs e Tratamentos.
 * Ele escaneia a string recebida em busca de palavras-chave.
 */
export function getClinicalTheme(text: string): { 
  icon: LucideIcon; 
  hex: string;
  textClass: string; 
  bgClass: string; 
  borderClass: string; 
  tagClass: string; 
} {
  const lower = (text || "").toLowerCase();

  // 1. Oftalmologia / Olhos
  if (lower.includes("ceratocone") || lower.includes("estrabismo") || lower.includes("olho") || lower.includes("visão")) {
    return { 
      icon: Eye, 
      hex: "#06B6D4", // Ciano
      textClass: "text-cyan-500", 
      bgClass: "bg-cyan-500/10", 
      borderClass: "border-cyan-500/30", 
      tagClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500" 
    };
  }

  // 2. Sono / Insônia
  if (lower.includes("insônia") || lower.includes("sono")) {
    return { 
      icon: Moon, 
      hex: "#6366F1", // Índigo
      textClass: "text-indigo-400", 
      bgClass: "bg-indigo-400/10", 
      borderClass: "border-indigo-400/30", 
      tagClass: "bg-indigo-400/10 border-indigo-400/20 text-indigo-400" 
    };
  }

  // 3. Neurologia / Psiquiatria / TDAH
  if (lower.includes("tdah") || lower.includes("f33") || lower.includes("f43") || lower.includes("neuro") || lower.includes("psi") || lower.includes("transtorno") || lower.includes("bipolar")) {
    return { 
      icon: Brain, 
      hex: "#8B5CF6", // Roxo / Violeta
      textClass: "text-violet-400", 
      bgClass: "bg-violet-400/10", 
      borderClass: "border-violet-400/30", 
      tagClass: "bg-violet-400/10 border-violet-400/20 text-violet-400" 
    };
  }

  // 4. Humor / Afeto / Depressão
  if (lower.includes("depressão") || lower.includes("depress")) {
    return { 
      icon: HeartPulse, 
      hex: "#EF4444", // Vermelho Coral
      textClass: "text-coral", 
      bgClass: "bg-coral/10", 
      borderClass: "border-coral/30", 
      tagClass: "bg-coral/10 border-coral/20 text-coral" 
    };
  }

  // 5. Ansiedade / Pânico
  if (lower.includes("ansied") || lower.includes("f4") || lower.includes("pânico") || lower.includes("estresse")) {
    return { 
      icon: ShieldAlert, 
      hex: "#38BDF8", // Azul Gelo
      textClass: "text-ice", 
      bgClass: "bg-ice/10", 
      borderClass: "border-ice/30", 
      tagClass: "bg-ice/10 border-ice/20 text-ice" 
    };
  }

  // 6. Dor Crônica / Lesões Neurológicas, Ortopédicas e Múltiplas
  if (lower.includes("dor") || lower.includes("lesão") || lower.includes("plexo") || lower.includes("monoplegia") || lower.includes("artrose") || lower.includes("s89") || lower.includes("s14") || lower.includes("g83") || lower.includes("inflama")) {
    return { 
      icon: Flame, 
      hex: "#F59E0B", // Âmbar
      textClass: "text-amber-400", 
      bgClass: "bg-amber-400/10", 
      borderClass: "border-amber-400/30", 
      tagClass: "bg-amber-400/10 border-amber-400/20 text-amber-400" 
    };
  }

  // 7. Padrão (Fallback)
  return { 
    icon: Activity, 
    hex: "#34D399", // Esmeralda / Verde
    textClass: "text-emerald-400", 
    bgClass: "bg-emerald-400/10", 
    borderClass: "border-emerald-400/30", 
    tagClass: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" 
  };
}

// ==========================================
// TEMAS E ÍCONES PARA REGISTROS DE SAÚDE (SINTOMAS E SINAIS VITAIS)
// ==========================================

export function getRegistroTheme(tipo: string): {
  icon: LucideIcon;
  hex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  tagClass: string;
} {
  const lower = (tipo || "").toLowerCase();

  // 1. Pressão Arterial
  if (lower.includes("pressao") || lower.includes("pressão") || lower.includes("pa")) {
    return {
      icon: HeartPulse,
      hex: "#EF4444", // Vermelho / Coral
      textClass: "text-coral",
      bgClass: "bg-coral/10",
      borderClass: "border-coral/30",
      tagClass: "bg-coral/10 border-coral/20 text-coral",
    };
  }

  // 2. Glicemia / Glicose
  if (lower.includes("glicemia") || lower.includes("glicose") || lower.includes("açúcar")) {
    return {
      icon: Droplet,
      hex: "#34D399", // Esmeralda
      textClass: "text-emerald-400",
      bgClass: "bg-emerald-400/10",
      borderClass: "border-emerald-400/30",
      tagClass: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
    };
  }

  // 3. Temperatura / Febre
  if (lower.includes("temperatura") || lower.includes("febre")) {
    return {
      icon: Flame,
      hex: "#F59E0B", // Âmbar
      textClass: "text-amber-400",
      bgClass: "bg-amber-400/10",
      borderClass: "border-amber-400/30",
      tagClass: "bg-amber-400/10 border-amber-400/20 text-amber-400",
    };
  }

  // 4. Batimentos / Pulso / BPM
  if (lower.includes("batimento") || lower.includes("pulso") || lower.includes("bpm")) {
    return {
      icon: Activity,
      hex: "#38BDF8", // Azul Gelo
      textClass: "text-ice",
      bgClass: "bg-ice/10",
      borderClass: "border-ice/30",
      tagClass: "bg-ice/10 border-ice/20 text-ice",
    };
  }

  // 5. Ansiedade / Humor / Mental
  if (lower.includes("ansiedade") || lower.includes("humor") || lower.includes("panico")) {
    return {
      icon: ShieldAlert,
      hex: "#8B5CF6", // Violeta
      textClass: "text-violet-400",
      bgClass: "bg-violet-400/10",
      borderClass: "border-violet-400/30",
      tagClass: "bg-violet-400/10 border-violet-400/20 text-violet-400",
    };
  }

  // 6. Fallback padrão para Dor / Sintomas Gerais
  return {
    icon: Activity,
    hex: "#7C9CB5",
    textClass: "text-ink-muted",
    bgClass: "bg-surface-raised",
    borderClass: "border-surface-border",
    tagClass: "bg-surface-raised border-surface-border text-ink-muted",
  };
}
