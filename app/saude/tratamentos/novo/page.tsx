"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, FolderHeart, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { safeAddTratamento } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NovoTratamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();

  const [nome, setNome] = useState("");
  const [condicao, setCondicao] = useState("");
  const [status, setStatus] = useState<"ativo" | "concluido" | "suspenso">("ativo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!nome.trim()) {
      setError("Nome do tratamento é obrigatório");
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await safeAddTratamento({
        user_id: user?.id || "",
        nome: nome.trim(),
        condicao: condicao.trim() || undefined,
        status,
      });

      trigger("success");
      router.push("/saude");
    } catch (err) {
      console.error("Erro ao salvar tratamento:", err);
      trigger("error");
      setError("Erro ao salvar tratamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FolderHeart size={16} className="text-violet-400" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Novo Tratamento
              </h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Nome do Tratamento"
              placeholder="Ex: TDAH, Dor Crônica, Depressão..."
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (error) setError("");
              }}
              error={error}
              required
              autoFocus
            />

            <Input
              label="Condição / Diagnóstico (opcional)"
              placeholder="Ex: CID ou descrição curta"
              value={condicao}
              onChange={(e) => setCondicao(e.target.value)}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-primary">
                Status inicial
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["ativo", "concluido", "suspenso"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      trigger("vibrate");
                      setStatus(s);
                    }}
                    className={`rounded-2xl border px-3 py-2.5 text-xs font-medium capitalize transition-all active:scale-95 ${
                      status === s
                        ? "border-violet-400 bg-violet-400/12 text-violet-300"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {s === "ativo" ? "Em andamento" : s === "concluido" ? "Concluído" : "Suspenso"}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 shadow-lg shadow-violet-400/10"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar tratamento
              </>
            )}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}
