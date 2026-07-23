"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { safeAddVault } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";

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

export default function NewVaultPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "home",
    color: "#7DD3FC",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !user) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await safeAddVault({
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon,
        color: formData.color,
      });
      trigger("success");
      router.push("/vaults");
    } catch (error) {
      console.error(error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  const selectedIcon = ICON_OPTIONS.find((opt) => opt.value === formData.icon);
  const SelectedIcon = selectedIcon?.icon || Lock;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo cofre
              </h1>
            </div>
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
                Configure seu cofre
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
              <p className="text-sm font-semibold text-ink-primary">Cor</p>
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
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    aria-label={`Selecionar cor ${color}`}
                    className={`relative h-10 w-10 rounded-full border-2 transition-all duration-200 active:scale-95 ${
                      selected ? "border-white shadow-lg" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {selected && (
                      <span className="absolute inset-0 rounded-full ring-4 ring-white/10" />
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

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Criando...
              </>
            ) : (
              "Criar cofre"
            )}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}