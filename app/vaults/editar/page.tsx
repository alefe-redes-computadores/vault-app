// app/vaults/editar/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Home,
  Heart,
  Briefcase,
  BookOpen,
  Plane,
  Car,
  PawPrint,
  Users,
  LucideIcon,
  Lock,
  Check,
  Palette,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { vaultsRepository } from "@/lib/repositories/vaults";
import { useVaults } from "@/hooks/useVaults";

const ICON_OPTIONS: { label: string; icon: LucideIcon; value: string }[] = [
  { label: "Casa", icon: Home, value: "home" },
  { label: "Saúde", icon: Heart, value: "heart" },
  { label: "Trabalho", icon: Briefcase, value: "briefcase" },
  { label: "Estudos", icon: BookOpen, value: "book-open" },
  { label: "Viagens", icon: Plane, value: "plane" },
  { label: "Carro", icon: Car, value: "car" },
  { label: "Pet", icon: PawPrint, value: "paw-print" },
  { label: "Pessoas", icon: Users, value: "users" },
];

const COLOR_OPTIONS = [
  "#7DD3FC",
  "#EC4899",
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#F472B6",
  "#34D399",
];

function EditarVaultContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();
  const { deleteVault } = useVaults();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "home",
    color: "#7DD3FC",
  });

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    vaultsRepository
      .getById(id)
      .then((item) => {
        if (!item) {
          setNotFound(true);
        } else {
          setFormData({
            name: item.name || "",
            description: item.description || "",
            icon: item.icon || "home",
            color: item.color || "#7DD3FC",
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const selectedIcon = ICON_OPTIONS.find((opt) => opt.value === formData.icon);
  const SelectedIcon = selectedIcon?.icon || Lock;

  const validate = (): boolean => {
    if (!formData.name.trim()) {
      trigger("error");
      showToast("Informe o nome do cofre", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    trigger("vibrate");
    if (!validate() || !id) return;

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    run(
      async () => {
        try {
          await vaultsRepository.update(id, {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            icon: formData.icon,
            color: formData.color,
          });
        } finally {
          isSubmitLocked.current = false;
        }
      },
      {
        successMessage: "Cofre atualizado com sucesso",
        errorMessage: "Erro ao atualizar cofre",
        goBackOnSuccess: true,
      }
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    trigger("vibrate");
    try {
      await deleteVault(id);
      trigger("success");
      router.replace("/vaults");
    } catch (error) {
      console.error(error);
      trigger("error");
      showToast("Erro ao excluir cofre", "error");
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-screen items-center justify-center bg-void px-5">
          <div className="w-full max-w-sm rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
              <Lock size={24} className="text-ink-muted" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-primary">Cofre não encontrado</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Este cofre pode ter sido removido ou não está mais disponível.</p>
            <Button variant="primary" onClick={() => router.push("/vaults")} className="mt-6">Voltar para cofres</Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              aria-label="Voltar"
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar cofre</h1>
            </div>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir cofre"
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm">
            <div className="mb-6 flex flex-col items-center text-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/5 shadow-sm"
                style={{ backgroundColor: `${formData.color}1F` }}
              >
                <SelectedIcon size={34} style={{ color: formData.color }} />
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-ink-primary">
                {formData.name || "Configure seu cofre"}
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Escolha um nome, uma cor e um ícone para identificar rapidamente este espaço.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome do cofre"
                placeholder="Ex: Família Gomes, Saúde, Empresa"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
              <TextArea
                label="Descrição"
                placeholder="O que será guardado neste cofre?"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-ink-primary">Ícone</p>
              <p className="mt-1 text-xs text-ink-muted">
                Escolha o símbolo que melhor representa este cofre.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {ICON_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.icon === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, icon: option.value }))
                    }
                    className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? "border-ice bg-ice/10 text-ice shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <Palette size={16} style={{ color: formData.color }} />
                Cor
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Use uma cor para diferenciar cofres com mais rapidez.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map((color) => {
                const selected = formData.color === color;
                return (
                  <button
                    key={color}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, color }))
                    }
                    aria-label={`Selecionar cor ${color}`}
                    type="button"
                    aria-pressed={selected}
                    className={`relative h-10 w-10 rounded-full border-2 transition-all duration-200 active:scale-95 ${
                      selected ? "border-white shadow-lg" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {selected && (
                      <Check size={16} className="absolute inset-0 m-auto text-void" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              Prévia
            </p>
            <div className="mt-4 flex items-center gap-4 rounded-[24px] border border-surface-border/50 bg-surface-raised/60 px-4 py-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${formData.color}22` }}
              >
                <SelectedIcon size={22} style={{ color: formData.color }} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-ink-primary">
                  {formData.name || "Nome do cofre"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                  {formData.description || "Descrição opcional do cofre"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save size={16} /> Salvar alterações
              </>
            )}
          </Button>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir cofre"
          message="Tem certeza que deseja excluir este cofre? Os documentos não serão apagados, apenas desvinculados."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarVaultPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarVaultContent />
    </Suspense>
  );
}