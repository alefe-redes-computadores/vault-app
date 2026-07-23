"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";

export default function EditarPessoaPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuth();
  const { showToast, showSuccess } = useToast();

  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // ============================================================
  // CARREGAR DADOS DA PESSOA
  // ============================================================
  useEffect(() => {
    if (!id) {
      showToast("ID da pessoa não informado", "error");
      router.push("/pessoas");
      return;
    }

    const loadPerson = async () => {
      try {
        const person = await db.persons.get(id);
        if (!person) {
          showToast("Pessoa não encontrada", "error");
          router.push("/pessoas");
          return;
        }
        setFormData({
          name: person.name || "",
          email: person.email || "",
          phone: person.phone || "",
        });
      } catch (error) {
        console.error("Erro ao carregar pessoa:", error);
        showToast("Erro ao carregar dados", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadPerson();
  }, [id, router, showToast]);

  // ============================================================
  // VALIDAÇÃO
  // ============================================================
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // SALVAR (com sync)
  // ============================================================
  const handleSubmit = async () => {
    if (!validate() || !id) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      // ✅ CORRIGIDO: usar undefined em vez de null
      const updateData: any = {
        name: formData.name.trim(),
        updated_at: new Date().toISOString(),
        synced: false,
      };

      if (formData.email.trim()) {
        updateData.email = formData.email.trim();
      } else {
        updateData.email = undefined;
      }

      if (formData.phone.trim()) {
        updateData.phone = formData.phone.trim();
      } else {
        updateData.phone = undefined;
      }

      // Atualiza a pessoa no Dexie
      await db.persons.update(id, updateData);

      // Busca a pessoa atualizada (garantindo que existe)
      const updatedPerson = await db.persons.get(id);
      
      // ✅ VERIFICA se a pessoa existe antes de adicionar na fila
      if (!updatedPerson) {
        throw new Error("Pessoa não encontrada após atualização");
      }

      // Adiciona na fila de sincronização (update)
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        table: "persons",
        operation: "update",
        payload: { ...updatedPerson }, // ✅ Spread para garantir que é um objeto
        created_at: new Date().toISOString(),
        retry_count: 0,
        failed: false,
      });

      // ✅ FORÇA PROCESSAMENTO IMEDIATO DA FILA
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sync:process'));
      }

      trigger("success");
      showSuccess("Pessoa atualizada com sucesso!", 3000);

      setTimeout(() => {
        router.push("/pessoas");
      }, 500);

    } catch (error) {
      console.error("Erro ao atualizar pessoa:", error);
      trigger("error");
      showToast("Erro ao atualizar pessoa", "error");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (isLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-ice border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-ink-muted mt-4">Carregando...</p>
          </div>
        </main>
      </PageTransition>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="glass-header sticky top-0 z-10 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Editar pessoa
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-surface-raised border border-surface-border/50 flex items-center justify-center">
                <User size={28} className="text-ink-muted" />
              </div>
              <div>
                <p className="text-sm text-ink-muted">Editando</p>
                <p className="font-display text-lg font-semibold text-ink-primary">
                  {formData.name || "Sem nome"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Nome */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Input
              label="Nome completo"
              placeholder="Digite o nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Input
              label="E-mail"
              placeholder="Digite o e-mail"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              type="email"
            />
          </motion.div>

          {/* Telefone */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Input
              label="Telefone"
              placeholder="Digite o telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar alterações
                </>
              )}
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}