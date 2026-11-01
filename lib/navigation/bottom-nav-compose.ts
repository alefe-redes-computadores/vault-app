// VAULT M6 — ações contextuais puras da navegação inferior.
// Opções, ícones e tons sem estado de UI, consulta remota ou operações clínicas.
import {
  Home,
  LayoutGrid,
  Plus,
  Pill,
  FileWarning,
  Stethoscope,
  Building2,
  CreditCard,
  Landmark,
  FolderHeart,
  Calendar,
  Syringe,
  FlaskConical,
  MapPin,
  FileText,
  Lock,
  User,
  Clock,
  FolderOpen,
  Zap,
  Activity,
  type LucideIcon,
} from "lucide-react";

export interface ComposeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const SAUDE_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "medicamento",
    label: "Medicamento",
    icon: Pill,
    path: "/saude/medicamentos/novo",
  },
  {
    id: "tratamento",
    label: "Tratamento",
    icon: FolderHeart,
    path: "/saude/tratamentos/novo",
  },
  {
    id: "renovacao",
    label: "Renovação",
    icon: FileWarning,
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
    icon: Building2,
    path: "/saude/farmacias/novo",
  },
  {
    id: "hospital",
    label: "Hospital",
    icon: Building2,
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
    icon: Calendar,
    path: "/saude/consultas/nova",
  },
  {
    id: "cirurgia",
    label: "Cirurgia",
    icon: Syringe,
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
  {
    id: "dose-unica",
    label: "Dose Única",
    icon: Zap,
    path: "/hoje?action=dose",
  },
  {
    id: "sintoma",
    label: "Novo Sintoma",
    icon: Activity,
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
    icon: Stethoscope,
    path: "/saude/medicos/novo",
  },
];

const MEDICAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-medicamento",
    label: "Novo Medicamento",
    icon: Pill,
    path: "/saude/medicamentos/novo",
  },
];

const FARMACIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-farmacia",
    label: "Nova Farmácia",
    icon: Building2,
    path: "/saude/farmacias/novo",
  },
];

const TRATAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-tratamento",
    label: "Novo Tratamento",
    icon: FolderHeart,
    path: "/saude/tratamentos/novo",
  },
];

const HOSPITAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-hospital",
    label: "Novo Hospital",
    icon: Building2,
    path: "/saude/hospitais/novo",
  },
];

const LOCAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-local",
    label: "Novo Local",
    icon: MapPin,
    path: "/saude/locais/novo",
  },
];

const RENOVACOES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-renovacao",
    label: "Nova Renovação",
    icon: FileWarning,
    path: "/saude/renovacao/nova",
  },
];

const EXAMES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-exame",
    label: "Novo Exame",
    icon: FlaskConical,
    path: "/saude/exames/novo",
  },
];

const CONSULTAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-consulta",
    label: "Nova Consulta",
    icon: Calendar,
    path: "/saude/consultas/nova",
  },
];

const CIRURGIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-cirurgia",
    label: "Nova Cirurgia",
    icon: Syringe,
    path: "/saude/cirurgias/nova",
  },
];

const CIDS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-cid",
    label: "Novo CID",
    icon: FileText,
    path: "/saude/cids/novo",
  },
];

const REGISTROS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-registro",
    label: "Novo Registro",
    icon: Activity,
    path: "/saude/registros/novo",
  },
];

const RETIRADAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-retirada",
    label: "Nova Retirada",
    icon: Pill,
    path: "/saude/retiradas/nova",
  },
];

const SUPPLY_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-fornecimento",
    label: "Novo fornecimento",
    icon: FolderHeart,
    path: "/saude/fornecimento?action=novo",
  },
];

const CARDS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "cartao",
    label: "Novo cartão",
    icon: CreditCard,
    path: "/cartoes/novo",
  },
];

const CONTAS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "conta",
    label: "Nova conta bancária",
    icon: Landmark,
    path: "/contas/novo",
  },
];

const VAULTS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "novo-cofre",
    label: "Novo cofre",
    icon: Lock,
    path: "/vaults/novo",
  },
];

const SENHAS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-senha",
    label: "Nova senha",
    icon: Lock,
    path: "/senhas/novo",
  },
];

const PESSOAS_COMPOSE_OPTIONS: ComposeOption[] = [
  {
    id: "nova-pessoa",
    label: "Nova Pessoa",
    icon: User,
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
    if (tab === "hospitais") return HOSPITAIS_LIST_COMPOSE_OPTIONS;
    if (tab === "tratamentos") return TRATAMENTOS_LIST_COMPOSE_OPTIONS;
    if (tab === "cids") return CIDS_LIST_COMPOSE_OPTIONS;

    return SAUDE_COMPOSE_OPTIONS;
  }

  return [];
}

export function getOptionColorClass(
  id: string
) {
  if (["dose-unica"].includes(id)) {
    return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
  }

  if (["sintoma", "novo-registro"].includes(id)) {
    return "bg-amber-400/10 text-amber-400 border-amber-400/20";
  }

  if (["renovacao"].includes(id)) {
    return "bg-coral/10 text-coral border-coral/20";
  }

  if (
    ["medicamento", "farmacia", "nova-farmacia", "novo-medicamento", "nova-retirada"].includes(
      id
    )
  ) {
    return "bg-amber-400/10 text-amber-400 border-amber-400/20";
  }

  if (
    [
      "exame",
      "local",
      "cid",
      "novo-documento-saude",
    ].includes(id)
  ) {
    return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
  }

  if (
    ["tratamento", "cirurgia", "novo-tratamento", "nova-cirurgia"].includes(
      id
    )
  ) {
    return "bg-violet-400/10 text-violet-400 border-violet-400/20";
  }

  if (["medico", "novo-medico", "consulta", "nova-consulta"].includes(id)) {
    return "bg-violet-400/10 text-violet-300 border-violet-400/20";
  }
  if (["cartao", "conta"].includes(id)) {
    return id === "cartao" ? "bg-rose-400/10 text-rose-300 border-rose-400/20" : "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
  }
  return "bg-surface-raised/55 text-ink-secondary border-surface-border/50";
}
