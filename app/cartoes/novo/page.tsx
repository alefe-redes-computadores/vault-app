"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ShieldCheck, Landmark } from "lucide-react";
import { useCards } from "@/hooks/useCards";
import { useHapticFeedback } from "@/lib/haptics";
import { encryptPassword } from "@/lib/crypto";
import { detectCardBrand, formatCardNumber, formatExpiryDate, getBankLogoUrl, getBrandLabel } from "@/lib/utils/card-helper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import type { CardType } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function NewCardPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { addCard } = useCards();

  const [saving, setSaving] = useState(false);
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

  const handleSubmit = async () => {
    trigger("vibrate");

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "O título é obrigatório";
    if (!formData.bank_name.trim()) newErrors.bank_name = "O nome do banco é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      const cardNumberEncrypted = formData.card_number ? encryptPassword(formData.card_number) : undefined;
      const cvvEncrypted = formData.cvv ? encryptPassword(formData.cvv) : undefined;

      await addCard({
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

      trigger("success");
      router.back();
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      {/* Padding inferior aumentado para pb-44 garantindo que o conteúdo nunca fique sob o botão flutuante */}
      <main className="min-h-screen bg-void pb-44">
        {/* Header Fixo */}
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

        {/* Ícone Dinâmico no Topo */}
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
          {/* Informações Básicas */}
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

          {/* Seletor Focado em Cartões */}
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

          {/* Dados Exclusivos do Cartão */}
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

          {/* Agência/Conta (Opcional para Cartão) */}
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

          {/* Notas */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea 
              label="Observações (opcional)" 
              value={formData.notes} 
              onChange={(e) => handleChange("notes", e.target.value)} 
              placeholder="Ex: Senha do app, limite, etc." 
            />
          </motion.div>
        </section>

        {/* Botão Salvar Fixo com SafeArea perfeitamente tratada */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/90 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Salvando com Segurança..." : "Salvar Cartão"}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}
