"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";

export default function EditPersonPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  useEffect(() => {
    const loadPerson = async () => {
      const person = await db.persons.get(id);
      if (person) {
        setFormData({
          name: person.name || "",
          email: person.email || "",
          phone: person.phone || "",
          avatar_url: person.avatar_url || "",
        });
      } else {
        showToast("Pessoa não encontrada", "error");
        router.push("/pessoas");
      }
      setIsLoading(false);
    };
    loadPerson();
  }, [id, router, showToast]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      trigger("error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await db.persons.update(id, {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        updated_at: new Date().toISOString(),
        synced: false,
      });
      trigger("success");
      showToast("Pessoa atualizada com sucesso!", "success");
      router.push("/pessoas");
    } catch (err) {
      setError("Erro ao salvar pessoa");
      trigger("error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-ice" />
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Editar pessoa</h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <div className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-full bg-surface-raised flex items-center justify-center border-2 border-ice/20">
                <User size={40} className="text-ink-muted" />
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome completo"
                placeholder="Ex: Alefe Gomes"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                error={error}
                required
              />

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail"
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

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
        </section>
      </main>
    </PageTransition>
  );
}