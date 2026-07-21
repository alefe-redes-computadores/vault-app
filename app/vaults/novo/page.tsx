"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Heart, Briefcase, BookOpen, Plane, Car, PawPrint, Users, LucideIcon } from "lucide-react";
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
  "#7DD3FC", "#EC4899", "#3B82F6", "#F59E0B",
  "#10B981", "#8B5CF6", "#F472B6", "#34D399",
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

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-[0.98]"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Novo cofre
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {/* Ícone */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Ícone
            </label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.icon === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData((prev) => ({ ...prev, icon: option.value }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px]">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Nome do cofre"
            placeholder="Ex: Família Gomes, Saúde, etc."
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <TextArea
            label="Descrição (opcional)"
            placeholder="O que guardar neste cofre..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1.5">
              Cor
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all active:scale-[0.98] ${
                    formData.color === color ? "border-ice" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="p-4 rounded-card bg-surface border border-surface-border/50">
            <p className="text-xs text-ink-muted mb-2">Prévia do cofre:</p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${formData.color}22` }}
              >
                {selectedIcon && <selectedIcon.icon size={18} style={{ color: formData.color }} />}
              </div>
              <div>
                <p className="text-sm font-medium text-ink-primary">
                  {formData.name || "Nome do cofre"}
                </p>
                {formData.description && (
                  <p className="text-xs text-ink-muted">{formData.description}</p>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4"
          >
            {loading ? "Criando..." : "Criar cofre"}
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}