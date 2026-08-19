// app/cartoes/editar/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ShieldCheck, Landmark } from "lucide-react";
import { db } from "@/lib/db";
import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { encryptPassword, decryptPassword } from "@/lib/crypto";
import { detectCardBrand, formatCardNumber, formatExpiryDate, getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
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

function EditCardContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { updateCard } = useCards();
  const { run, isSubmitting } = useSubmitAction();

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    bank_name: "",
    type: "cartao_credito" as CardType,
    card_number: "",
    card_holder: "",
    expiry_date: "",
    cvv: "",
    agency: "",
    account: "",
    notes: "",
  });

  useEffect(() => {
    async function loadCard() {
      if (!id) return;
      try {
        // CORRIGIDO: db.bankCards em vez de db.cards
        const item = await db.bankCards.get(id);
        if (item) {
          setFormData({
            title: item.title || "",
            bank_name: item.bank_name || "",
            type: item.type || "cartao_credito",
            card_number: item.card_number_encrypted ? decryptPassword(item.card_number_encrypted) : "",
            card_holder: item.card_holder || "",
            expiry_date: item.expiry_date || "",
            cvv: item.cvv_encrypted ? decryptPassword(item.cvv_encrypted) : "",
            agency: item.agency || "",
            account: item.account || "",
            notes: item.notes || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar cartão para edição:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [id]);

  const detectedBrand = detectCardBrand(formData.card_number);
  const logoUrl = getBankLogoUrl(formData.bank_name);

  const handleChange = (field: string, value: string) => {
    if (field === "card_number") {
      value = formatCardNumber(value);
    } else if (field === "expiry_date") {
      value = formatExpiryDate(value);
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = () => {
    if (!id) return;
    trigger("vibrate");

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.bank_name.trim()) newErrors.bank_name = "O nome do banco é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    run(
      async () => {
        const cardNumberEncrypted = formData.card_number ? encryptPassword(formData.card_number) : undefined;
        const cvvEncrypted = formData.cvv ? encryptPassword(formData.cvv) : undefined;

        await updateCard(id, {
          title: formData.title.trim(),
          bank_name: formData.bank_name.trim(),
          type: formData.type,
          card_number_encrypted: cardNumberEncrypted,
          card_holder: formData.card_holder.trim(),
          brand: detectedBrand,
          expiry_date: formData.expiry_date.trim(),
          cvv_encrypted: cvvEncrypted,
          agency: formData.agency.trim(),
          account: formData.account.trim(),
          notes: formData.notes.trim(),
        });
      },
      {
        successMessage: "Registro atualizado",
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
      <main className="min-h-screen bg-void pb-32">
        <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <button
            onClick={() => { trigger("vibrate"); router.back(); }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
          >
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink-primary">Editar Banco ou Cartão</h1>
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
            <p className="mb-3 text-sm font-medium text-ink-primary">Tipo de Registro</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "cartao_credito", label: "Cartão de Crédito" },
                { id: "cartao_debito", label: "Cartão de Débito" },
                { id: "conta_corrente", label: "Conta Corrente" },
                { id: "conta_poupanca", label: "Conta Poupança" },
                { id: "conta_digital", label: "Conta Digital" },
              ].map((typeItem) => (
                <button
                  key={typeItem.id}
                  onClick={() => { trigger("vibrate"); handleChange("type", typeItem.id); }}
                  className={`rounded-2xl border px-3 py-3 text-xs font-medium text-left transition-all active:scale-95 ${
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

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="relative">
              <Input
                label="Número do Cartão"
                value={formData.card_number}
                onChange={(e) => handleChange("card_number", e.target.value)}
                placeholder="0000 0000 0000 0000"
              />
              {detectedBrand !== "unknown" && (
                <div className="absolute right-3 top-9 rounded-md bg-surface-raised px-2 py-1 text-[11px] font-semibold text-ice border border-surface-border/40">
                  {getBrandLabel(detectedBrand)}
                </div>
              )}
            </div>

            <Input
              label="Nome Impresso no Cartão"
              value={formData.card_holder}
              onChange={(e) => handleChange("card_holder", e.target.value.toUpperCase())}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Validade"
                value={formData.expiry_date}
                onChange={(e) => handleChange("expiry_date", e.target.value)}
                placeholder="MM/AA"
              />
              <Input
                label="CVV"
                value={formData.cvv}
                onChange={(e) => handleChange("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                type="password"
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input
              label="Agência"
              value={formData.agency}
              onChange={(e) => handleChange("agency", e.target.value)}
            />
            <Input
              label="Conta / Dígito"
              value={formData.account}
              onChange={(e) => handleChange("account", e.target.value)}
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
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

export default function EditCardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-void"><Loader2 size={32} className="animate-spin text-ice" /></div>}>
      <EditCardContent />
    </Suspense>
  );
}