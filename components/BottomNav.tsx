// components/BottomNav.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  UploadCloud,
  Calendar,
  Syringe,
  FlaskConical,
  MapPin,
  FileText,
  Lock,
  User,
  Clock,
  FolderOpen,
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
  { id: "hoje", icon: Clock, label: "Hoje", path: "/hoje" },
  { id: "documentos", icon: FolderOpen, label: "Documentos", path: "/documentos" },
  { id: "mais", icon: LayoutGrid, label: "Mais", path: "/mais" },
];

interface ComposeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const DEFAULT_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "documento", label: "Novo arquivo", icon: Plus, path: "/novo" },
];

const SAUDE_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "medicamento", label: "Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
  { id: "tratamento", label: "Tratamento", icon: FolderHeart, path: "/saude/tratamentos/novo" },
  { id: "renovacao", label: "Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
  { id: "medico", label: "Médico", icon: Stethoscope, path: "/saude/medicos/novo" },
  { id: "farmacia", label: "Farmácia", icon: Building2, path: "/saude/farmacias/novo" },
  { id: "hospital", label: "Hospital", icon: Building2, path: "/saude/hospitais/novo" },
  { id: "local", label: "Posto / Local", icon: MapPin, path: "/saude/locais/novo" },
  { id: "exame", label: "Exame", icon: FlaskConical, path: "/saude/exames/novo" },
  { id: "consulta", label: "Consulta", icon: Calendar, path: "/saude/consultas/nova" },
  { id: "cirurgia", label: "Cirurgia", icon: Syringe, path: "/saude/cirurgias/nova" },
  { id: "cid", label: "CID", icon: FileText, path: "/saude/cids/novo" },
];

const DOCUMENTOS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-documento", label: "Novo documento", icon: Plus, path: "/novo" },
];

const MEDICOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-medico", label: "Novo Médico", icon: Stethoscope, path: "/saude/medicos/novo" },
];

const MEDICAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
];

const FARMACIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-farmacia", label: "Nova Farmácia", icon: Building2, path: "/saude/farmacias/novo" },
];

const TRATAMENTOS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-tratamento", label: "Novo Tratamento", icon: FolderHeart, path: "/saude/tratamentos/novo" },
];

const HOSPITAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-hospital", label: "Novo Hospital", icon: Building2, path: "/saude/hospitais/novo" },
];

const LOCAIS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-local", label: "Novo Local", icon: MapPin, path: "/saude/locais/novo" },
];

const RENOVACOES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
];

const EXAMES_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-exame", label: "Novo Exame", icon: FlaskConical, path: "/saude/exames/novo" },
];

const CONSULTAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-consulta", label: "Nova Consulta", icon: Calendar, path: "/saude/consultas/nova" },
];

const CIRURGIAS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-cirurgia", label: "Nova Cirurgia", icon: Syringe, path: "/saude/cirurgias/nova" },
];

const CIDS_LIST_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-cid", label: "Novo CID", icon: FileText, path: "/saude/cids/novo" },
];

const CARDS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "cartao", label: "Novo cartão", icon: CreditCard, path: "/cartoes/novo" },
];

const CONTAS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "conta", label: "Nova conta bancária", icon: Landmark, path: "/contas/novo" },
];

const VAULTS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "novo-cofre", label: "Novo cofre", icon: Lock, path: "/vaults/novo" },
];

const GALERIA_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "upload-galeria", label: "Adicionar à Galeria", icon: UploadCloud, path: "/galeria?upload=true" },
];

const SENHAS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-senha", label: "Nova senha", icon: Lock, path: "/senhas/novo" },
];

const PESSOAS_COMPOSE_OPTIONS: ComposeOption[] = [
  { id: "nova-pessoa", label: "Nova Pessoa", icon: User, path: "/pessoas/novo" },
];

function getComposeOptions(pathname: string, searchParams: URLSearchParams): ComposeOption[] {
  if (pathname === "/") return SAUDE_COMPOSE_OPTIONS;
  if (pathname === "/documentos") return DOCUMENTOS_COMPOSE_OPTIONS;
  if (pathname === "/hoje") return SAUDE_COMPOSE_OPTIONS; // Menu central ativado com as opções de saúde em /hoje
  if (pathname === "/mais") return [];

  if (pathname === "/pessoas") return PESSOAS_COMPOSE_OPTIONS;
  if (pathname === "/cartoes") return CARDS_COMPOSE_OPTIONS;
  if (pathname === "/contas") return CONTAS_COMPOSE_OPTIONS;
  if (pathname === "/vaults") return VAULTS_COMPOSE_OPTIONS;
  if (pathname === "/senhas") return SENHAS_COMPOSE_OPTIONS;
  if (pathname === "/favoritos") return [];

  if (pathname === "/saude/medicos") return MEDICOS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/medicamentos") return MEDICAMENTOS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/farmacias") return FARMACIAS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/tratamentos") return TRATAMENTOS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/hospitais") return HOSPITAIS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/locais") return LOCAIS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/renovacao") return RENOVACOES_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/exames") return EXAMES_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/consultas") return CONSULTAS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/cirurgias") return CIRURGIAS_LIST_COMPOSE_OPTIONS;
  if (pathname === "/saude/cids") return CIDS_LIST_COMPOSE_OPTIONS;

  if (pathname === "/saude/rede") {
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

const ALLOWED_NAV_PATHS = [
  "/",
  "/hoje",
  "/documentos",
  "/mais",
  "/pessoas",
  "/cartoes",
  "/contas",
  "/vaults",
  "/senhas",
  "/favoritos",
  "/saude",
  "/saude/medicamentos",
  "/saude/medicos",
  "/saude/farmacias",
  "/saude/tratamentos",
  "/saude/hospitais",
  "/saude/locais",
  "/saude/renovacao",
  "/saude/exames",
  "/saude/consultas",
  "/saude/cirurgias",
  "/saude/cids",
  "/saude/rede",
];

function shouldShowNav(pathname: string): boolean {
  return ALLOWED_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}?`)
  );
}

export function BottomNav() {
  const { trigger } = useHapticFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isEnabled: isBiometricEnabled } = useBiometricPreference();
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);

  useEffect(() => {
    const checkLock = () => {
      setIsBiometricLocked(document.body.classList.contains("biometric-locked"));
    };

    checkLock();
    const handleLockChange = () => checkLock();
    window.addEventListener("biometric:lockchange", handleLockChange);

    const observer = new MutationObserver(() => checkLock());
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

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

  const isActive = (path: string) => {
    return pathname === path || (path === "/" && pathname === "/");
  };

  const composeOptions = getComposeOptions(pathname, searchParams);
  const showCompose = composeOptions.length > 0;

  if (!shouldShowNav(pathname) || isBiometricLocked) return null;

  const handleComposePress = () => {
    if (!showCompose) return;
    if (composeOptions.length === 1) {
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
    router.push(option.path);
  };

  const gridClass = showCompose ? "grid-cols-5" : "grid-cols-4";

  const colMap: Record<string, string> = showCompose
    ? {
        home: "col-start-1",
        hoje: "col-start-2",
        documentos: "col-start-4",
        mais: "col-start-5",
      }
    : {};

  return (
    <>
      <AnimatePresence>
        {isComposeMenuOpen && showCompose && (
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
              className="shadow-vault fixed bottom-[6.5rem] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-[26px] border border-surface-border/60 bg-surface"
            >
              <div className="px-4 pb-1 pt-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                  Adicionar
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto px-2 pb-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {composeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleComposeOptionPress(option)}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-4 text-center transition-all active:scale-95 hover:border-ice/30 hover:bg-surface-raised"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Icon size={20} />
                        </div>
                        <span className="line-clamp-1 text-xs font-medium text-ink-primary">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="border-t border-surface-border/40 bg-surface/92 px-4 pb-5 pt-2 backdrop-blur-2xl">
          <div className={`relative mx-auto grid max-w-md ${gridClass} items-end justify-items-center`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

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

            {showCompose && (
              <button
                onClick={handleComposePress}
                aria-label={composeOptions.length > 1 ? "Adicionar" : composeOptions[0].label}
                aria-expanded={composeOptions.length > 1 ? isComposeMenuOpen : undefined}
                className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-ice text-void shadow-[0_16px_32px_rgba(47,227,201,0.28)] transition-all duration-200 active:scale-95"
              >
                <motion.div animate={{ rotate: isComposeMenuOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                  <Plus size={24} strokeWidth={2.6} />
                </motion.div>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
