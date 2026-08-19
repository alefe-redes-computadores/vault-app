// app/saude/locais/novo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, MapPin } from "lucide-react";
import { useLocais } from "@/hooks/useLocais";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPOS_LOCAL = [
  { id: "posto_saude", label: "Posto de Saúde" },
  { id: "laboratorio", label: "Laboratório" },
  { id: "clinica", label: "Clínica" },
  { id: "outro", label: "Outro" },
];

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export default function NovoLocalPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { addLocal } = useLocais();
  const { run, isSubmitting } = useSubmitAction();

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("posto_saude");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    run(
      () =>
        addLocal({
          nome: nome.trim(),
          tipo: tipo || undefined,
          endereco: endereco.trim() || undefined,
          telefone: telefone.trim() || undefined,
        }),
      {
        successMessage: "Local cadastrado com sucesso",
        errorMessage: "Erro ao cadastrar local",
        goBackOnSuccess: true,
      }
    );
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Novo local
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Cadastre postos, laboratórios e clínicas.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Nome *"
              placeholder="Ex: UBS Central, Laboratório Sabin..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_LOCAL.map((tipoOption) => (
                  <button
                    key={tipoOption.id}
                    onClick={() => { trigger("vibrate"); setTipo(tipoOption.id); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      tipo === tipoOption.id
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {tipoOption.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar local
              </>
            )}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}