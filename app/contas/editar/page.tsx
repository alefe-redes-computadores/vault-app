// app/contas/editar/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ShieldCheck, Landmark } from "lucide-react";
import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { getBankLogoUrl } from "@/lib/utils/card-helper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import type { CardType } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function EditAccountContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { getCard, updateCard } = useCards();
  const { run, isSubmitting } = useSubmitAction();

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    bank_name: "",
    type: "conta_corrente" as CardType,
    agency: "",
    account: "",
    notes: "",
  });

  useEffect(() => {
    async function loadAccount() {
      if (!id) return;
      try {
        const item = await getCard(id);
        if (item) {
          setFormData({
            title: item.title || "",
            bank_name: item.bank_name || "",
            type: item.type || "conta_corrente",
            agency: item.agency || "",
            account: item.account || "",
            notes: item.notes || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar conta para edição:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAccount();
  }, [id, getCard]);

  const logoUrl = getBankLogoUrl(formData.bank_name);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = () => {
    if (!id) return;
    trigger("vibrate");

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.bank_name.trim()) newErrors.bank_name = "O nome do banco é obrigatório";
    if (!formData.agency.trim()) newErrors.agency = "A agência é obrigatória";
    if (!formData.account.trim()) newErrors.account = "A conta é obrigatória";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    run(
      () =>
        updateCard(id, {
          title: formData.title.trim(),
          bank_name: formData.bank_name.trim(),
          type: formData.type,
          agency: formData.agency.trim(),
          account: formData.account.trim(),
          notes: formData.notes.trim(),
        }),
      {
        successMessage: "Conta atualizada",
        errorMessage: "Erro ao atualizar",
        goBackOnSuccess: true,
      }
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <Loader2 size={32} className="animate-spin text-ice" />
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-32">
        <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <button
            onClick={() => { trigger("vibrate"); router.back(); }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
          >
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink-primary">Editar Conta Bancária</h1>
            <p className="text-xs text-ink-muted flex items-center gap-1">
              <ShieldCheck size={12} className="text-ice" /> Criptografia E2EE ativada
            </p>
          </div>
        </header>

        <div className="flex flex-col items-center pt-6 px-5">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-surface-border/60 bg-surface shadow-md overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo do Banco" className="h-10 w-10 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            ) : (
              <Landmark size={32} className="text-ice" />
            )}
          </div>
        </div>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              error={errors.title}
              required
            />
            <Input
              label="Nome do Banco"
              value={formData.bank_name}
              onChange={(e) => handleChange("bank_name", e.target.value)}
              error={errors.bank_name}
              required
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Tipo de Conta</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "conta_corrente", label: "C. Corrente" },
                { id: "conta_poupanca", label: "Poupança" },
                { id: "conta_digital", label: "Digital" },
              ].map((typeItem) => (
                <button
                  key={typeItem.id}
                  onClick={() => { trigger("vibrate"); handleChange("type", typeItem.id); }}
                  className={`rounded-2xl border px-2 py-3 text-xs font-medium text-center transition-all active:scale-95 ${
                    formData.type === typeItem.id
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted"
                  }`}
                >
                  {typeItem.label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Agência"
              value={formData.agency}
              onChange={(e) => handleChange("agency", e.target.value)}
              placeholder="0000"
              error={errors.agency}
              required
            />
            <Input
              label="Conta / Dígito"
              value={formData.account}
              onChange={(e) => handleChange("account", e.target.value)}
              placeholder="00000-0"
              error={errors.account}
              required
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea
              label="Observações"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "Salvando Alterações..." : "Salvar Alterações"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}

export default function EditAccountPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void"><Loader2 size={32} className="animate-spin text-ice" /></div>}>
      <EditAccountContent />
    </Suspense>
  );
}