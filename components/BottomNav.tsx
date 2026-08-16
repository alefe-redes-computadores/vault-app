"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Heart,
  Images,
  LayoutGrid,
  Plus,
  Pill,
  FileWarning,
  Stethoscope,
  Building2,
  CreditCard,
  Landmark,
  FolderHeart,
  UploadCloud,
  Calendar,
  Syringe,
  Edit,
  FlaskConical,
  MapPin,
  Activity,
  Copy,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "home", icon: Home, label: "Início", path: "/" },
  { id: "saude", icon: Heart, label: "Saúde", path: "/saude" },
  { id: "galeria", icon: Images, label: "Galeria", path: "/galeria" },
  { id: "mais", icon: LayoutGrid, label: "Mais", path: "/mais" },
];

interface ComposeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const DEFAULT_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "documento", label: "Novo documento", icon: Plus, path: "/novo" },
];

const SAUDE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "medicamento", label: "Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
  { id: "tratamento", label: "Tratamento", icon: FolderHeart, path: "/saude/tratamentos/novo" },
  { id: "renovacao", label: "Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
  { id: "medico", label: "Médico", icon: Stethoscope, path: "/saude/medicos/novo" },
  { id: "local", label: "Farmácia/Hospital", icon: Building2, path: "/saude/locais/novo" },
];

// ============================================================
// MÉDICOS
// ============================================================
const MEDICOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-medico", label: "Novo Médico", icon: Stethoscope, path: "/saude/medicos/novo" },
];
const MEDICOS_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-consulta", label: "Nova Consulta", icon: Calendar, path: "/saude/consultas/nova" },
  { id: "nova-cirurgia", label: "Nova Cirurgia", icon: Syringe, path: "/saude/cirurgias/nova" },
  { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
  { id: "editar-medico", label: "Editar Médico", icon: Edit, path: "/saude/medicos/editar" },
];

// ============================================================
// FARMÁCIAS
// ============================================================
const FARMACIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-farmacia", label: "Nova Farmácia", icon: Building2, path: "/saude/farmacias/novo" },
];
const FARMACIAS_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
  { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
  { id: "editar-farmacia", label: "Editar Farmácia", icon: Edit, path: "/saude/farmacias/editar" },
];

// ============================================================
// TRATAMENTOS
// ============================================================
const TRATAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-tratamento", label: "Novo Tratamento", icon: FolderHeart, path: "/saude/tratamentos/novo" },
];
const TRATAMENTOS_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
  { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
  { id: "adicionar-documento", label: "Adicionar Documento", icon: UploadCloud, path: "/novo" },
  { id: "editar-tratamento", label: "Editar Tratamento", icon: Edit, path: "/saude/tratamentos/editar" },
];

// ============================================================
// HOSPITAIS
// ============================================================
const HOSPITAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-hospital", label: "Novo Hospital", icon: Building2, path: "/saude/hospitais/novo" },
];
const HOSPITAIS_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-cirurgia", label: "Nova Cirurgia", icon: Syringe, path: "/saude/cirurgias/nova" },
  { id: "novo-exame", label: "Novo Exame", icon: FlaskConical, path: "/saude/exames/novo" },
  { id: "nova-consulta", label: "Nova Consulta", icon: Calendar, path: "/saude/consultas/nova" },
  { id: "editar-hospital", label: "Editar Hospital", icon: Edit, path: "/saude/hospitais/editar" },
];

// ============================================================
// LOCAIS
// ============================================================
const LOCAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-local", label: "Novo Local", icon: MapPin, path: "/saude/locais/novo" },
];
const LOCAIS_DETALHE_COMPOSE_OPTIONS: ComposerOption[] = [
  { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
  { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
  { id: "editar-local", label: "Editar Local", icon: Edit, path: "/saude/locais/editar" },
];

// ============================================================
// RENOVAÇÕES
// ============================================================
const RENOVACOES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
];
const RENOVACOES_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "editar-renovacao", label: "Editar Renovação", icon: Edit, path: "/saude/renovacao/editar" },
  { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
];

// ============================================================
// EXAMES (NOVO)
// ============================================================
const EXAMES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-exame", label: "Novo Exame", icon: FlaskConical, path: "/saude/exames/novo" },
];
const EXAMES_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "editar-exame", label: "Editar Exame", icon: Edit, path: "/saude/exames/editar" },
  { id: "duplicar-exame", label: "Solicitar Novamente", icon: Copy, path: "/saude/exames/novo" },
];

// ============================================================
// CONSULTAS (NOVO)
// ============================================================
const CONSULTAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-consulta", label: "Nova Consulta", icon: Calendar, path: "/saude/consultas/nova" },
];
const CONSULTAS_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "editar-consulta", label: "Editar Consulta", icon: Edit, path: "/saude/consultas/editar" },
  { id: "reagendar-consulta", label: "Reagendar Consulta", icon: RotateCcw, path: "/saude/consultas/nova" },
];

// ============================================================
// CIRURGIAS (NOVO)
// ============================================================
const CIRURGIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-cirurgia", label: "Nova Cirurgia", icon: Syringe, path: "/saude/cirurgias/nova" },
];
const CIRURGIAS_DETALHE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "editar-cirurgia", label: "Editar Cirurgia", icon: Edit, path: "/saude/cirurgias/editar" },
];

// ============================================================
// CARTÕES E GALERIA
// ============================================================
const CARDS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "cartao", label: "Novo cartão", icon: CreditCard, path: "/cartoes/novo" },
  { id: "conta", label: "Nova conta bancária", icon: Landmark, path: "/contas/novo" },
];
const GALERIA_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "upload-galeria", label: "Adicionar à Galeria", icon: UploadCloud, path: "/galeria?upload=true" },
];

const HIDDEN_ON_PATHS = ["/novo", "/login", "/auth/callback", "/cartoes/novo", "/contas/novo"];

function shouldHideNav(pathname: string): boolean {
  if (HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.includes("/editar")) {
    return true;
  }
  if (pathname !== "/saude" && pathname.startsWith("/saude/")) {
    return true;
  }
  if (pathname === "/senhas" || pathname.startsWith("/senhas/")) {
    return true;
  }
  if (pathname.startsWith("/cartoes/") && pathname !== "/cartoes") {
    return true;
  }
  return false;
}

function getComposeOptions(pathname: string): ComposeOption[] {
  // MÉDICOS
  if (pathname === "/saude/medicos") return MEDICOS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/medicos/detalhes")) return MEDICOS_DETALHE_COMPOSE_OPTIONS;
  
  // FARMÁCIAS
  if (pathname === "/saude/farmacias") return FARMACIAS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/farmacias/detalhes")) return FARMACIAS_DETALHE_COMPOSE_OPTIONS;
  
  // TRATAMENTOS
  if (pathname === "/saude/tratamentos") return TRATAMENTOS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/tratamentos/detalhes")) return TRATAMENTOS_DETALHE_COMPOSE_OPTIONS;
  
  // HOSPITAIS
  if (pathname === "/saude/hospitais") return HOSPITAIS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/hospitais/detalhes")) return HOSPITAIS_DETALHE_COMPOSE_OPTIONS;
  
  // LOCAIS
  if (pathname === "/saude/locais") return LOCAIS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/locais/detalhes")) return LOCAIS_DETALHE_COMPOSE_OPTIONS;
  
  // RENOVAÇÕES
  if (pathname === "/saude/renovacao") return RENOVACOES_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/renovacao/detalhes")) return RENOVACOES_DETALHE_COMPOSE_OPTIONS;
  
  // EXAMES (NOVO)
  if (pathname === "/saude/exames") return EXAMES_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/exames/detalhes")) return EXAMES_DETALHE_COMPOSE_OPTIONS;
  
  // CONSULTAS (NOVO)
  if (pathname === "/saude/consultas") return CONSULTAS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/consultas/detalhes")) return CONSULTAS_DETALHE_COMPOSE_OPTIONS;
  
  // CIRURGIAS (NOVO)
  if (pathname === "/saude/cirurgias") return CIRURGIAS_LIST_COMPOSE_OPTIONS;
  if (pathname.startsWith("/saude/cirurgias/detalhes")) return CIRURGIAS_DETALHE_COMPOSE_OPTIONS;
  
  if (pathname === "/saude") return SAUDE_COMPOSE_OPTIONS;
  if (pathname === "/cartoes") return CARDS_COMPOSE_OPTIONS;
  if (pathname === "/galeria") return GALERIA_COMPOSE_OPTIONS;
  return DEFAULT_COMPOSE_OPTIONS;
}

export function BottomNav() {
  const { trigger } = useHapticFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const { isEnabled: isBiometricEnabled } = useBiometricPreference();
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);

  const getEntityIdFromPath = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  };

  useEffect(() => {
    const checkLock = () => {
      setIsBiometricLocked(document.body.classList.contains("biometric-locked"));
    };

    checkLock();

    const handleLockChange = () => {
      checkLock();
    };

    window.addEventListener("biometric:lockchange", handleLockChange);

    const observer = new MutationObserver(() => {
      checkLock();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("biometric:lockchange", handleLockChange);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setIsComposeMenuOpen(false);
  }, [pathname]);

  const handleNavigate = (path: string) => {
    if (path === pathname) return;
    trigger("vibrate");
    router.push(path);
  };

  if (shouldHideNav(pathname) || isBiometricLocked) return null;

  const isActive = (path: string) => {
    return pathname === path || (path === "/" && pathname === "/");
  };

  const composeOptions = getComposeOptions(pathname);
  const hasComposeMenu = composeOptions.length > 1;

  const handleComposePress = () => {
    if (!hasComposeMenu) {
      trigger("success");
      router.push(composeOptions[0].path);
      return;
    }
    trigger("vibrate");
    setIsComposeMenuOpen((prev) => !prev);
  };

  const handleComposeOptionPress = (option: ComposeOption) => {
    trigger("success");
    setIsComposeMenuOpen(false);

    let path = option.path;

    const isContextualAction = [
      "nova-consulta",
      "nova-cirurgia",
      "novo-medicamento",
      "editar-medico",
      "nova-renovacao",
      "editar-farmacia",
      "editar-tratamento",
      "adicionar-documento",
      "novo-exame",
      "editar-hospital",
      "editar-local",
      "editar-renovacao",
      "editar-exame",
      "duplicar-exame",
      "editar-consulta",
      "reagendar-consulta",
      "editar-cirurgia",
    ].includes(option.id);

    if (isContextualAction) {
      const entityId = getEntityIdFromPath();
      if (entityId) {
        const separator = path.includes('?') ? '&' : '?';
        let paramName = 'id';
        if (pathname.includes('/medicos/detalhes')) paramName = 'medico_id';
        else if (pathname.includes('/farmacias/detalhes')) paramName = 'farmacia_id';
        else if (pathname.includes('/tratamentos/detalhes')) paramName = 'tratamento_id';
        else if (pathname.includes('/hospitais/detalhes')) paramName = 'hospital_id';
        else if (pathname.includes('/locais/detalhes')) paramName = 'local_id';
        else if (pathname.includes('/renovacao/detalhes')) paramName = 'renovacao_id';
        else if (pathname.includes('/exames/detalhes')) paramName = 'exame_id';
        else if (pathname.includes('/consultas/detalhes')) paramName = 'consulta_id';
        else if (pathname.includes('/cirurgias/detalhes')) paramName = 'cirurgia_id';
        
        // Se for "reagendar-consulta", passamos também o medico_id e hospital_id
        if (option.id === "reagendar-consulta") {
          // Podemos pegar da URL, mas vamos simplificar passando apenas o id da consulta
          // A página de criação pode usar esse parâmetro para pré-preencher
          path = `${path}${separator}reagendar=true&consulta_id=${entityId}`;
        } else if (option.id === "duplicar-exame") {
          path = `${path}${separator}duplicar=${entityId}`;
        } else {
          path = `${path}${separator}${paramName}=${entityId}`;
        }
      } else {
        // Fallback: vai para a página principal correspondente
        if (pathname.includes('/medicos')) router.push("/saude/medicos");
        else if (pathname.includes('/farmacias')) router.push("/saude/farmacias");
        else if (pathname.includes('/tratamentos')) router.push("/saude/tratamentos");
        else if (pathname.includes('/hospitais')) router.push("/saude/hospitais");
        else if (pathname.includes('/locais')) router.push("/saude/locais");
        else if (pathname.includes('/renovacao')) router.push("/saude/renovacao");
        else if (pathname.includes('/exames')) router.push("/saude/exames");
        else if (pathname.includes('/consultas')) router.push("/saude/consultas");
        else if (pathname.includes('/cirurgias')) router.push("/saude/cirurgias");
        else router.push("/saude");
        return;
      }
    }

    router.push(path);
  };

  return (
    <>
      <AnimatePresence>
        {isComposeMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setIsComposeMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="shadow-vault fixed bottom-[6.5rem] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-xs -translate-x-1/2 overflow-hidden rounded-[26px] border border-surface-border/60 bg-surface"
            >
              <div className="px-4 pb-1 pt-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                  Adicionar
                </p>
              </div>
              <div className="px-2 pb-2">
                {composeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleComposeOptionPress(option)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Icon size={16} />
                      </div>
                      <span className="text-sm font-medium text-ink-primary">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="border-t border-surface-border/40 bg-surface/92 px-4 pb-5 pt-2 backdrop-blur-2xl">
          <div className="relative mx-auto grid max-w-md grid-cols-5 items-end justify-items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              const colMap: Record<string, string> = {
                home: "col-start-1",
                saude: "col-start-2",
                galeria: "col-start-4",
                mais: "col-start-5",
              };

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`
                    relative flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-all duration-200 active:scale-95
                    ${active ? "text-ice" : "text-ink-muted/65 hover:text-ink-primary"}
                    ${colMap[item.id] || ""}
                  `}
                >
                  {active && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-2xl bg-ice/10"
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    />
                  )}

                  <div className="relative z-[1] flex flex-col items-center gap-1">
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                    <span
                      className={`text-[10px] font-medium ${
                        active ? "text-ice" : "text-ink-muted/65"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}

            <button
              onClick={handleComposePress}
              aria-label={hasComposeMenu ? "Adicionar" : composeOptions[0].label}
              aria-expanded={hasComposeMenu ? isComposeMenuOpen : undefined}
              className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-ice text-void shadow-[0_16px_32px_rgba(47,227,201,0.28)] transition-all duration-200 active:scale-95"
            >
              <motion.div
                animate={{ rotate: isComposeMenuOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Plus size={24} strokeWidth={2.6} />
              </motion.div>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}