"use client";


import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { safeAddRenovacao } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";

export default function NewRenovacaoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const medicamentoId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data: "",
    observacoes: "",
  });

  const handleSubmit = async () => {
    if (!formData.data) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      await safeAddRenovacao({
        medicamento_id: medicamentoId,
        data: formData.data,
        observacoes: formData.observacoes || undefined,
      });
      trigger("success");
      router.push(`/saude/medicamentos/${medicamentoId}`);
    } catch (error) {
      console.error(error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              trigger("vibrate");
              router.back();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
          >
            <ArrowLeft size={18} className="text-ink-primary" />
          </button>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
            <h1 className="font-display text-xl font-semibold text-ink-primary">
              Nova renovação
            </h1>
          </div>
        </div>
      </header>

      <section className="px-5 pt-6 space-y-4">
        <Input
          label="Data da renovação"
          type="date"
          value={formData.data}
          onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
        />

        <TextArea
          label="Observações (opcional)"
          placeholder="Ex: Nova receita, troca de farmácia, etc."
          value={formData.observacoes}
          onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2"
            onClick={() => trigger("vibrate")}
          >
            <Upload size={16} />
            Anexar receita
          </Button>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4"
        >
          {loading ? "Salvando..." : "Registrar renovação"}
        </Button>
      </section>
    </main>
  );
}