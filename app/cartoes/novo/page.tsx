// app/cartoes/novo/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ShieldCheck, Landmark } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { detectCardBrand, formatCardNumber, formatExpiryDate, getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useCards } from "@/hooks/useCards";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import type { CardType } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NewCardPage() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const { addCard } = useCards();
  const { activePersonId } = useActivePersonId();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

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
    trigger("vibrate");

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.bank_name.trim()) newErrors.bank_name = "O nome do banco é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    run(
      async () => {
        try {
          await addCard({
            title: formData.title.trim(),
            bank_name: formData.bank_name.trim(),
            type: formData.type,
            card_number: formData.card_number.trim(),
            card_holder: formData.card_holder.trim(),
            expiry_date: formData.expiry_date.trim(),
            cvv: formData.cvv.trim(),
            agency: formData.agency.trim(),
            account: formData.account.trim(),
            notes: formData.notes.trim(),
            person_id: activePersonId || undefined,
          } as any);
        } finally {
          isSubmitLocked.current = false;
        }
      },
      {
        successMessage: "Cartão salvo com sucesso",
        errorMessage: "Erro ao salvar cartão",
        goBackOnSuccess: true,
      }
    );
  };

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-44">
        <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <button 
            onClick={() => { trigger("vibrate"); router.back(); }} 
            className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
          >
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink-primary">Adicionar Cartão</h1>
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
              label="Título (ex: Nubank Ultravioleta, Cartão Principal)" 
              value={formData.title} 
              onChange={(e) => handleChange("title", e.target.value)} 
              error={errors.title} 
              required 
            />
            <Input 
              label="Nome do Banco (ex: Nubank, Itaú, Bradesco)" 
              value={formData.bank_name} 
              onChange={(e) => handleChange("bank_name", e.target.value)} 
              error={errors.bank_name} 
              required 
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Tipo de Cartão</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "cartao_credito", label: "Cartão de Crédito" },
                { id: "cartao_debito", label: "Cartão de Débito" },
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
              placeholder="NOME COMO NO CARTÃO" 
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
                placeholder="123" 
                type="password" 
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <Input 
              label="Agência (Opcional)" 
              value={formData.agency} 
              onChange={(e) => handleChange("agency", e.target.value)} 
              placeholder="0000" 
            />
            <Input 
              label="Conta / Digito (Opcional)" 
              value={formData.account} 
              onChange={(e) => handleChange("account", e.target.value)} 
              placeholder="00000-0" 
            />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea 
              label="Observações (opcional)" 
              value={formData.notes} 
              onChange={(e) => handleChange("notes", e.target.value)} 
              placeholder="Ex: Senha do app, limite, etc." 
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/90 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "Salvando com Segurança..." : "Salvar Cartão"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}
