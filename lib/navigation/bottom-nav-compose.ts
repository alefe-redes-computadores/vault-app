// VAULT M6 — ações contextuais puras da navegação inferior.
// Opções, ícones e tons sem estado de UI, consulta remota ou operações clínicas.
import { Plus, Pill, HeartPulse, RefreshCw, Stethoscope, Hospital, MapPin, FlaskConical, CalendarCheck, Scissors, FileText, Activity, Syringe, ClipboardList, Droplets, Bell, PackageCheck, Dumbbell, Utensils, type LucideIcon } from "lucide-react";

export interface ComposeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const SAUDE_COMPOSE_OPTIONS: ComposeOption[] = [
  {id:"vital-treino",label:"Treino",icon:Dumbbell,path:"/saude/vital/treinos?action=new"},
  {id:"vital-refeicao",label:"Refeição",icon:Utensils,path:"/saude/vital/nutricao?action=new"},
  {
    id: "medicamento",
    label: "Medicamento",
    icon: Pill,
    path: "/saude/medicamentos/novo",
  },
  {
    id: "tratamento",
    label: "Tratamento",
    icon: HeartPulse,
    path: "/saude/tratamentos/novo",
  },
  {
    id: "renovacao",
    label: "Renovação",
    icon: RefreshCw,
    path: "/saude/renovacao/nova",
  },
  {
    id: "medico",
    label: "Médico",
    icon: Stethoscope,
    path: "/saude/medicos/novo",
  },
  {
    id: "farmacia",
    label: "Farmácia",
    icon: Hospital,
    path: "/saude/farmacias/novo",
  },
  {
    id: "hospital",
    label: "Hospital",
    icon: Hospital,
    path: "/saude/hospitais/novo",
  },
  {
    id: "local",
    label: "Posto / Local",
    icon: MapPin,
    path: "/saude/locais/novo",
  },
  {
    id: "exame",
    label: "Exame",
    icon: FlaskConical,
    path: "/saude/exames/novo",
  },
  {
    id: "consulta",
    label: "Consulta",
    icon: CalendarCheck,
    path: "/saude/consultas/nova",
  },
  {
    id: "cirurgia",
    label: "Cirurgia",
    icon: Scissors,
    path: "/saude/cirurgias/nova",
  },
  {
    id: "cid",
    label: "CID",
    icon: FileText,
    path: "/saude/cids/novo",
  },
  {
    id: "sintoma",
    label: "Sintoma / Medição",
    icon: Activity,
    path: "/saude/registros/novo",
  },
  // B09: destinations use existing canonical editors, never parallel writers.
  {id:"vacina",label:"Vacinação",icon:Syringe,path:"/saude/vacinas"},
  {id:"procedimento",label:"Procedimento",icon:ClipboardList,path:"/saude/procedimentos"},
  {id:"hidratacao",label:"Hidratação",icon:Droplets,path:"/saude/hidratacao"},
  {id:"lembrete",label:"Lembrete",icon:Bell,path:"/saude/lembretes"},
  {id:"documento",label:"Documento / Receita",icon:FileText,path:"/saude/documentos/novo"},
  {id:"retirada",label:"Retirada",icon:PackageCheck,path:"/saude/retiradas/nova"},
  {id:"alergia",label:"Alergia / Reação",icon:Activity,path:"/saude/reacoes"},
  {id:"dose-rapida",label:"Dose rápida",icon:Pill,path:"/hoje?action=dose"},
];

const SAUDE_DOCUMENTOS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-documento-saude",
    label: "Novo documento",
    icon: Plus,
    path: "/saude/documentos/novo",
  },
];

const HOJE_COMPOSE_OPTIONS: ComposeOption[] = [
  {id:"vital-treino",label:"Treino",icon:Dumbbell,path:"/saude/vital/treinos?action=new"},
  {id:"vital-refeicao",label:"Refeição",icon:Utensils,path:"/saude/vital/nutricao?action=new"},
  {
    id: "dose-unica",
    label: "Dose Única",
    icon: Plus,
    path: "/hoje?action=dose",
  },
  {
    id: "sintoma",
    label: "Novo Sintoma",
    icon: Plus,
    path: "/saude/registros/novo",
  },
];

const DOCUMENTOS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-documento",
    label: "Novo documento",
    icon: Plus,
    path: "/documentos/novo",
  },
];

const MEDICOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-medico",
    label: "Novo Médico",
    icon: Plus,
    path: "/saude/medicos/novo",
  },
];

const MEDICAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-medicamento",
    label: "Novo Medicamento",
    icon: Plus,
    path: "/saude/medicamentos/novo",
  },
];

const FARMACIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-farmacia",
    label: "Nova Farmácia",
    icon: Plus,
    path: "/saude/farmacias/novo",
  },
];

const TRATAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-tratamento",
    label: "Novo Tratamento",
    icon: Plus,
    path: "/saude/tratamentos/novo",
  },
];

const HOSPITAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-hospital",
    label: "Novo Hospital",
    icon: Plus,
    path: "/saude/hospitais/novo",
  },
];

const LOCAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-local",
    label: "Novo Local",
    icon: Plus,
    path: "/saude/locais/novo",
  },
];

const RENOVACOES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-renovacao",
    label: "Nova Renovação",
    icon: Plus,
    path: "/saude/renovacao/nova",
  },
];

const EXAMES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-exame",
    label: "Novo Exame",
    icon: Plus,
    path: "/saude/exames/novo",
  },
];

const CONSULTAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-consulta",
    label: "Nova Consulta",
    icon: Plus,
    path: "/saude/consultas/nova",
  },
];

const CIRURGIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-cirurgia",
    label: "Nova Cirurgia",
    icon: Plus,
    path: "/saude/cirurgias/nova",
  },
];

const CIDS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-cid",
    label: "Novo CID",
    icon: Plus,
    path: "/saude/cids/novo",
  },
];

const REGISTROS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-registro",
    label: "Novo Registro",
    icon: Plus,
    path: "/saude/registros/novo",
  },
];

const RETIRADAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-retirada",
    label: "Nova Retirada",
    icon: Plus,
    path: "/saude/retiradas/nova",
  },
];

const SUPPLY_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-fornecimento",
    label: "Novo fornecimento",
    icon: Plus,
    path: "/saude/fornecimento?action=novo",
  },
];

const CARDS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "cartao",
    label: "Novo cartão",
    icon: Plus,
    path: "/cartoes/novo",
  },
];

const CONTAS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "conta",
    label: "Nova conta bancária",
    icon: Plus,
    path: "/contas/novo",
  },
];

const VAULTS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-cofre",
    label: "Novo cofre",
    icon: Plus,
    path: "/vaults/novo",
  },
];

const SENHAS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-senha",
    label: "Nova senha",
    icon: Plus,
    path: "/senhas/novo",
  },
];

const PESSOAS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-pessoa",
    label: "Nova Pessoa",
    icon: Plus,
    path: "/pessoas/novo",
  },
];

export function getComposeOptions(
  pathname: string,
  searchParams: URLSearchParams
): ComposeOption[] {
  // VAULT_CONTEXTUAL_FAB_PATH_NORMALIZATION_V44
  const normalizedPathname = pathname;

  if (normalizedPathname === "/") return SAUDE_COMPOSE_OPTIONS;
  if (["/saude", "/saude/minha-saude", "/saude/mapa", "/saude/careflow"].includes(normalizedPathname)) return SAUDE_COMPOSE_OPTIONS;
  // Episode overview creates a canonical consultation, never a second episode.
  if (normalizedPathname === "/saude/careflow/episodios") return CONSULTAS_LIST_COMPOSE_OPTIONS;
  if (normalizedPathname === "/documentos") return DOCUMENTOS_COMPOSE_OPTIONS;
  if (normalizedPathname === "/saude/documentos") {
    return SAUDE_DOCUMENTOS_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/hoje") return HOJE_COMPOSE_OPTIONS;
  if ((normalizedPathname === "/mais" || normalizedPathname.startsWith("/inteligencia"))) return [];

  if (normalizedPathname === "/pessoas") return PESSOAS_COMPOSE_OPTIONS;
  if (normalizedPathname === "/cartoes") return CARDS_COMPOSE_OPTIONS;
  if (normalizedPathname === "/contas") return CONTAS_COMPOSE_OPTIONS;
  if (normalizedPathname === "/vaults") return VAULTS_COMPOSE_OPTIONS;
  if (normalizedPathname === "/senhas") return SENHAS_COMPOSE_OPTIONS;
  if (normalizedPathname === "/favoritos") return [];

  if (normalizedPathname === "/saude/medicos") {
    return MEDICOS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/medicamentos") {
    return MEDICAMENTOS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/farmacias") {
    return FARMACIAS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/tratamentos") {
    return TRATAMENTOS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/hospitais") {
    return HOSPITAIS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/locais") {
    return LOCAIS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/renovacao") {
    return RENOVACOES_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/exames") {
    return EXAMES_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/consultas") {
    return CONSULTAS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/cirurgias") {
    return CIRURGIAS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/cids") {
    return CIDS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/registros") {
    return REGISTROS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/retiradas") {
    return RETIRADAS_LIST_COMPOSE_OPTIONS;
  }
  if (normalizedPathname === "/saude/fornecimento") {
    return SUPPLY_LIST_COMPOSE_OPTIONS;
  }

  if (normalizedPathname === "/saude/rede") {
    const tab = searchParams.get("tab");

    if (tab === "medicos") return MEDICOS_LIST_COMPOSE_OPTIONS;
    if (tab === "farmacias") return FARMACIAS_LIST_COMPOSE_OPTIONS;
    if (tab === "locais") return LOCAIS_LIST_COMPOSE_OPTIONS;
    if (tab === "consultas") return CONSULTAS_LIST_COMPOSE_OPTIONS;
    if (tab === "hospitais") return HOSPITAIS_LIST_COMPOSE_OPTIONS;
    if (tab === "tratamentos") return TRATAMENTOS_LIST_COMPOSE_OPTIONS;
    if (tab === "cids") return CIDS_LIST_COMPOSE_OPTIONS;

    return SAUDE_COMPOSE_OPTIONS;
  }

  return [];
}

/** P2: icon/surface semantics never conflate entity identity with warning status. */
export function getOptionColorClass(id: string): string {
  if(id==="vital-treino")return "bg-sky-400/10 text-sky-300 border-sky-400/25";
  if(id==="vital-refeicao")return "bg-emerald-400/10 text-emerald-300 border-emerald-400/25";
  if (["medicamento","novo-medicamento","farmacia","nova-farmacia","hospital","novo-hospital","local","novo-local","nova-retirada","novo-fornecimento","dose-unica"].includes(id))
    return "bg-emerald-400/10 text-emerald-300 border-emerald-400/25";
  if (["medico","novo-medico","consulta","nova-consulta"].includes(id))
    return "bg-sky-400/10 text-sky-300 border-sky-400/25";
  if (["exame","novo-exame"].includes(id))
    return "bg-cyan-400/10 text-cyan-300 border-cyan-400/25";
  if (["tratamento","novo-tratamento","cirurgia","nova-cirurgia"].includes(id))
    return "bg-violet-400/10 text-violet-300 border-violet-400/25";
  if (["renovacao","nova-renovacao","novo-documento","novo-documento-saude"].includes(id))
    return "bg-violet-400/10 text-violet-300 border-violet-400/25";
  if (["sintoma","novo-registro"].includes(id))
    return "bg-rose-400/10 text-rose-300 border-rose-400/25";
  if (id === "cartao") return "bg-rose-400/10 text-rose-300 border-rose-400/25";
  if (id === "conta") return "bg-emerald-400/10 text-emerald-300 border-emerald-400/25";
  return "bg-surface-raised/55 text-ink-secondary border-surface-border/50";
}

/** IA 2.0 P2: shared creation accent for FAB and contextual header CTA.
 * Amber is deliberately NOT the normal action color for medicines. */
export function getIa20CreateAccent(id: string): string {
  if (["medico","novo-medico","consulta","nova-consulta"].includes(id))
    return "border-sky-200/50 bg-sky-300 text-slate-950 shadow-sky-950/25";
  if (["medicamento","novo-medicamento","farmacia","nova-farmacia","hospital","novo-hospital","local","novo-local","nova-retirada","novo-fornecimento","dose-unica"].includes(id))
    return "border-emerald-200/50 bg-emerald-300 text-slate-950 shadow-emerald-950/25";
  if (["tratamento","novo-tratamento","cirurgia","nova-cirurgia"].includes(id))
    return "border-violet-200/50 bg-violet-300 text-slate-950 shadow-violet-950/25";
  if (["exame","novo-exame"].includes(id))
    return "border-cyan-200/50 bg-cyan-300 text-slate-950 shadow-cyan-950/25";
  if (["renovacao","nova-renovacao","novo-documento","novo-documento-saude"].includes(id))
    return "border-violet-200/50 bg-violet-300 text-slate-950 shadow-violet-950/25";
  if (["novo-registro","sintoma"].includes(id))
    return "border-rose-200/50 bg-rose-300 text-slate-950 shadow-rose-950/25";
  if (["nova-senha","novo-cofre"].includes(id))
    return "border-slate-200/50 bg-slate-300 text-slate-950 shadow-slate-950/25";
  if (id==="cartao") return "border-rose-200/50 bg-rose-300 text-slate-950 shadow-rose-950/25";
  return "border-emerald-200/50 bg-emerald-300 text-slate-950 shadow-emerald-950/25";
}

/** Shared colors for Saúde quick access and the same Compose visual language. */
export function getIa20ShortcutTone(href: string): {surface:string;icon:string} {
  if (href==="/saude/medicamentos" || href==="/saude/retiradas" || href==="/saude/fornecimento")
    return {surface:"border-emerald-300/25 bg-emerald-300/[.07] focus-visible:outline-emerald-300",icon:"text-emerald-300"};
  if (href==="/saude/consultas" || href==="/saude/rede")
    return {surface:"border-sky-300/25 bg-sky-300/[.07] focus-visible:outline-sky-300",icon:"text-sky-300"};
  if (href==="/saude/exames" || href==="/saude/careflow/pressao")
    return {surface:"border-cyan-300/25 bg-cyan-300/[.07] focus-visible:outline-cyan-300",icon:"text-cyan-300"};
  if (href==="/saude/careflow/sintomas")
    return {surface:"border-rose-300/25 bg-rose-300/[.07] focus-visible:outline-rose-300",icon:"text-rose-300"};
  return {surface:"border-surface-border/70 bg-surface/75 focus-visible:outline-white",icon:"text-ink-secondary"};
}
