// app/pessoas/novo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  Check,
  Palette,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { useSubmitAction } from "@/hooks/useSubmitAction";

const PERSON_COLORS = [
  { name: "Azul", value: "#38BDF8" },
  { name: "Roxo", value: "#A78BFA" },
  { name: "Rosa", value: "#F472B6" },
  { name: "Vermelho", value: "#F87171" },
  { name: "Laranja", value: "#FB923C" },
  { name: "Amarelo", value: "#FACC15" },
  { name: "Verde", value: "#4ADE80" },
  { name: "Ciano", value: "#22D3EE" },
  { name: "Índigo", value: "#6366F1" },
  { name: "Coral", value: "#F87171" },
  { name: "Cinza", value: "#9CA3AF" },
];

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export default function NewPersonPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { run, isSubmitting } = useSubmitAction();

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
    color: "#38BDF8",
  });

  const handleSelectColor = (color: string) => {
    trigger("vibrate");
    setFormData((prev) => ({ ...prev, color }));
  };

  const handleSubmit = () => {
    trigger("vibrate");

    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      trigger("error");
      return;
    }

    if (!user?.id) {
      setError("Usuário não autenticado");
      trigger("error");
      return;
    }

    run(
      async () => {
        const newPerson = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          avatar_url: formData.avatar_url || undefined,
          color: formData.color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          synced: 0,
        };

        // Transação Atômica Local + Fila de Sincronização
        await db.transaction("rw", db.persons, db.syncQueue, async () => {
          await db.persons.add(newPerson as any);
          await enfileirarOperacao("persons", "add", newPerson);
        });

        router.push("/pessoas");
      },
      {
        successMessage: "Pessoa adicionada com sucesso!",
        errorMessage: "Erro ao salvar pessoa",
        goBackOnSuccess: false,
      }
    );
  };

  const handlePreencherDados = () => {
    trigger("vibrate");
    const nome = user?.user_metadata?.full_name || "";
    const email = user?.email || "";
    const avatar = user?.user_metadata?.avatar_url || "";
    setFormData((prev) => ({ ...prev, name: nome, email, avatar_url: avatar }));
    showToast("Dados preenchidos com seu perfil!", "info");
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
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

            <div className="min-w-0">
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Nova pessoa
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Cadastre uma pessoa para vincular documentos com mais rapidez
              </p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-surface-border/50 shadow-sm transition-colors duration-200"
                style={{
                  backgroundColor: `${formData.color}18`,
                  borderColor: `${formData.color}55`,
                }}
              >
                <User size={28} style={{ color: formData.color }} />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Cadastro</p>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  Dados da pessoa
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Salve os dados principais para reutilizar em documentos e registros.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-[22px] border border-surface-border/40 bg-surface-raised/60 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border/50 bg-surface">
                  <User size={20} className="text-ink-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    Preencher com meus dados
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-faint">
                    Usa nome, e-mail e avatar do seu perfil atual.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePreencherDados}
                className="mt-3 inline-flex rounded-full bg-ice/12 px-3.5 py-2 text-sm font-medium text-ice transition-all active:scale-95 hover:bg-ice/16"
              >
                Usar meu perfil
              </button>
            </div>

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.04 }}
              >
                <Input
                  label="Nome completo"
                  placeholder="Ex: Alefe Gomes"
                  value={formData.name}
                  onChange={(e) => {
                    setError("");
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                  }}
                  error={error}
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.08 }}
                className="relative"
              >
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail"
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="pl-9"
                  type="email"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.12 }}
                className="relative"
              >
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))
                  }
                  className="pl-9"
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.16 }}
              className="mt-6"
            >
              <div className="mb-3">
                <p className="text-sm font-medium text-ink-primary flex items-center gap-2">
                  <Palette size={16} style={{ color: formData.color }} />
                  Cor da pessoa
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Escolha uma cor para identificar esta pessoa visualmente no aplicativo.
                </p>
              </div>

              <div className="rounded-[22px] border border-surface-border/40 bg-surface-raised/60 p-4">
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-8">
                  {PERSON_COLORS.map((color) => {
                    const selected = formData.color === color.value;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        aria-label={`Selecionar cor ${color.name}`}
                        aria-pressed={selected}
                        onClick={() => handleSelectColor(color.value)}
                        className="relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                        style={{
                          backgroundColor: color.value,
                          boxShadow: selected
                            ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${color.value}`
                            : "none",
                        }}
                      >
                        {selected && (
                          <Check
                            size={19}
                            strokeWidth={3}
                            className="text-white drop-shadow-sm"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center gap-3 border-t border-surface-border/30 pt-4">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: formData.color }}
                  />
                  <p className="text-xs text-ink-muted">
                    Esta será a cor usada nos cards e identificadores de{" "}
                    <span className="font-medium text-ink-primary">
                      {formData.name.trim() || "esta pessoa"}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.20 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-4 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Adicionar pessoa
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}
