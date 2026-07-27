"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Pill, Trash2, AlertTriangle } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import {
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
  TIPO_RECEITA_LABELS,
} from "@/lib/health-utils";
import type { TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPO_OPTIONS: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

export default function EditarMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { getMedicamento, updateMedicamento, deleteMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [medicoNome, setMedicoNome] = useState("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceita, setDataReceita] = useState("");
  const [proximaRenovacao, setProximaRenovacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const diasValidade = VALIDADE_RECEITA_DIAS[tipoReceita];

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    getMedicamento(id).then((item) => {
      if (!item) {
        setNotFound(true);
      } else {
        setNome(item.nome || "");
        setDosagem(item.dosagem || "");
        setMedicoNome(item.medico || "");
        setFarmaciaNome(item.farmacia || "");
        setDataReceita(item.data_receita || "");
        setProximaRenovacao(item.proxima_renovacao || "");
        setObservacoes(item.observacoes || "");
        setTipoReceita((item.tipo_receita as TipoReceita) || "comum");
      }
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTipoReceitaChange = (tipo: TipoReceita) => {
    trigger("vibrate");
    setTipoReceita(tipo);
  };

  const aplicarSugestaoValidade = () => {
    if (!dataReceita || !diasValidade) return;
    trigger("vibrate");
    setProximaRenovacao(suggestRenewalDate(dataReceita, tipoReceita));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome do medicamento é obrigatório";
    if (!dosagem.trim()) newErrors.dosagem = "Dosagem é obrigatória";
    if (!medicoNome.trim()) newErrors.medico = "Selecione o médico";
    if (!dataReceita) newErrors.dataReceita = "Data da receita é obrigatória";
    if (!proximaRenovacao) newErrors.proximaRenovacao = "Data da próxima renovação é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    setSaving(true);
    try {
      await updateMedicamento(id, {
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        medico: medicoNome.trim(),
        farmacia: farmaciaNome.trim() || undefined,
        data_receita: dataReceita,
        proxima_renovacao: proximaRenovacao,
        observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita,
      });
      trigger("success");
      router.push("/saude");
    } catch (error) {
      console.error("Erro ao atualizar medicamento:", error);
      trigger("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMedicamento(id);
      trigger("success");
      router.push("/saude");
    } catch (error) {
      console.error("Erro ao excluir medicamento:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (notFound) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
          <p className="font-display text-lg font-semibold text-ink-primary">
            Medicamento não encontrado
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-ice px-5 py-2.5 text-sm font-semibold text-void"
          >
            Voltar
          </button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
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

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Editar medicamento
              </h1>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              aria-label="Excluir medicamento"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {/* Tipo de receita */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Tipo de receita</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_OPTIONS.map((tipo) => {
                const active = tipoReceita === tipo;
                return (
                  <button
                    key={tipo}
                    onClick={() => handleTipoReceitaChange(tipo)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? tipo === "comum"
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-violet-400 bg-violet-400/12 text-violet-300"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {TIPO_RECEITA_LABELS[tipo]}
                  </button>
                );
              })}
            </div>

            {diasValidade && (
              <div className="mt-3 flex items-start justify-between gap-2 rounded-2xl bg-violet-400/8 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-violet-300" />
                  <p className="text-xs leading-5 text-ink-muted">
                    Receita {TIPO_RECEITA_LABELS[tipoReceita].toLowerCase()} vale{" "}
                    <span className="font-medium text-ink-primary">{diasValidade} dias</span>.
                  </p>
                </div>
                <button
                  onClick={aplicarSugestaoValidade}
                  className="shrink-0 whitespace-nowrap text-xs font-medium text-violet-300 hover:text-violet-200"
                >
                  Aplicar +{diasValidade}d
                </button>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.04 }}
            className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <Input
              label="Medicamento"
              placeholder="Ex: Losartana, Sertralina..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errors.nome}
              required
            />
            <Input
              label="Dosagem"
              placeholder="Ex: 50mg, 1x ao dia"
              value={dosagem}
              onChange={(e) => setDosagem(e.target.value)}
              error={errors.dosagem}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Médico <span className="text-coral">*</span>
              </label>
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsDoctorModalOpen(true);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${
                  errors.medico ? "border-coral/50" : "border-surface-border/50"
                } bg-surface-raised`}
              >
                {medicoNome || "Selecionar médico"}
              </button>
              {errors.medico && <p className="mt-1 text-xs text-coral">{errors.medico}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Farmácia (opcional)
              </label>
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsPharmacyModalOpen(true);
                }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors"
              >
                {farmaciaNome || "Selecionar farmácia"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Data da receita <span className="text-coral">*</span>
                </label>
                <input
                  type="date"
                  value={dataReceita}
                  onChange={(e) => setDataReceita(e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.dataReceita ? "border-coral/50" : "border-surface-border/50"
                  }`}
                />
                {errors.dataReceita && (
                  <p className="text-xs text-coral">{errors.dataReceita}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Próxima renovação <span className="text-coral">*</span>
                </label>
                <input
                  type="date"
                  value={proximaRenovacao}
                  onChange={(e) => setProximaRenovacao(e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${
                    errors.proximaRenovacao ? "border-coral/50" : "border-surface-border/50"
                  }`}
                />
                {errors.proximaRenovacao && (
                  <p className="text-xs text-coral">{errors.proximaRenovacao}</p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.28, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Notas (opcional)"
              placeholder="Ex: tomar em jejum, horário fixo..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {saving ? (
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
        </div>

        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setMedicoNome(item.nome);
          }}
          items={medicos}
          title="Selecionar médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.especialidade && (
                <p className="text-xs text-ink-muted">{item.especialidade}</p>
              )}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsDoctorModalOpen(false);
            trigger("vibrate");
            router.push("/saude/medicos/novo");
          }}
          createNewLabel="Criar médico"
        />

        <SelectionModal
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setFarmaciaNome(item.nome);
          }}
          items={farmacias}
          title="Selecionar farmácia"
          placeholder="Buscar farmácia..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => {
            setIsPharmacyModalOpen(false);
            trigger("vibrate");
            router.push("/saude/farmacias/novo");
          }}
          createNewLabel="Criar farmácia"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir medicamento"
          message={`Tem certeza que deseja excluir "${nome}"? O documento de receita vinculado não será apagado automaticamente.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}
