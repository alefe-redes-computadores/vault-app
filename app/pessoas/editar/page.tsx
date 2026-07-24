"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, User, Mail, Phone, Camera, X } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { uploadFile } from "@/lib/supabase/storage";
import { useAuth } from "@/hooks/useAuth";

export default function EditarPessoaPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuth();
  const { showToast, showSuccess } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

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
          avatar_url: person.avatar_url || "",
        });
      } catch (error) {
        console.error("Erro ao carregar pessoa:", error);
        showToast("Erro ao carregar dados", "error");
        router.push("/pessoas");
      } finally {
        setIsLoading(false);
      }
    };

    loadPerson();
  }, [id, router, showToast]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingPhoto(true);
    trigger("vibrate");

    try {
      const { url, error } = await uploadFile(user.id, file, "avatars");
      if (error) throw new Error(error);

      setFormData((prev) => ({ ...prev, avatar_url: url }));
      showToast("Foto enviada com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      showToast("Erro ao enviar foto", "error");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) {
      trigger("error");
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        name: formData.name.trim(),
        avatar_url: formData.avatar_url || undefined,
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

      await db.persons.update(id, updateData);

      const updatedPerson = await db.persons.get(id);
      if (!updatedPerson) {
        throw new Error("Pessoa não encontrada após atualização");
      }

      await db.syncQueue.add({
        id: crypto.randomUUID(),
        table: "persons",
        operation: "update",
        payload: { ...updatedPerson },
        created_at: new Date().toISOString(),
        retry_count: 0,
        failed: false,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sync:process"));
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

  if (isLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void px-5 pb-28 pt-6">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-8 shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ice border-t-transparent" />
            <p className="mt-4 text-center text-sm text-ink-muted">
              Carregando dados...
            </p>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadPhoto}
        />

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

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Editar pessoa
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Atualize os dados vinculados aos documentos dessa pessoa
              </p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mb-4 rounded-[28px] border border-surface-border/50 bg-surface px-5 py-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt={formData.name}
                    className="h-16 w-16 rounded-full border-2 border-ice/20 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                    <User size={28} className="text-ice" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-void bg-ice text-void transition-all active:scale-95 disabled:opacity-50"
                  title="Alterar foto"
                >
                  {uploadingPhoto ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Camera size={12} />
                  )}
                </button>
              </div>

              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Editando</p>
                <p className="truncate font-display text-lg font-semibold text-ink-primary">
                  {formData.name || "Sem nome"}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">
                  Revise e salve os dados para manter o cadastro atualizado e consistente.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.05 }}
              >
                <Input
                  label="Nome completo"
                  placeholder="Digite o nome"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  error={errors.name}
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.1 }}
                className="relative"
              >
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="E-mail"
                  placeholder="Digite o e-mail"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  type="email"
                  className="pl-9"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.15 }}
                className="relative"
              >
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3 top-[42px] -translate-y-1/2 text-ink-muted"
                />
                <Input
                  label="Telefone"
                  placeholder="Digite o telefone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="pl-9"
                />
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.2 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2"
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