// app/saude/renovacao/editar/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  Pill,
  Stethoscope,
  Store,
  Building2,
  MapPin,
  Eraser,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { renovacoesRepository } from "@/lib/repositories/renovacoes";
import type {
  Renovacao,
  Medicamento,
  Medico,
  Farmacia,
  Hospital,
  LocalSaude,
} from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateToDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDateToISO(displayStr: string): string {
  const clean = displayStr.replace(/\D/g, "");
  if (clean.length !== 8) return "";
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function handleDateMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  }
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
}

function handleCurrencyMask(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "";
  const numberVal = parseInt(clean, 10) / 100;
  return numberVal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function EditarRenovacaoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { activePersonId } = useActivePersonId();
  const { getRenovacao } = useRenovacoes();
  const { medicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();
  const { locais } = useLocais();

  const { run: runSave, isSubmitting: isSaving } = useSubmitAction();
  const { run: runDelete, isSubmitting: isDeleting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [renovacao, setRenovacao] = useState<Renovacao | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [medicamentoId, setMedicamentoId] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [farmaciaId, setFarmaciaId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [localId, setLocalId] = useState("");
  const [dataDisplay, setDataDisplay] = useState("");
  const [preco, setPreco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");

  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const selectedMedicamento = medicamentos.find((m) => m.id === medicamentoId);
  const selectedMedico = medicos.find((m) => m.id === medicoId);
  const selectedFarmacia = farmacias.find((f) => f.id === farmaciaId);
  const selectedHospital = hospitais.find((h) => h.id === hospitalId);
  const selectedLocal = locais.find((l) => l.id === localId);

  useEffect(() => {
    if (!id) {
      router.push("/saude/renovacao");
      return;
    }

    const loadData = async () => {
      try {
        const data = await getRenovacao(id);
        if (data) {
          setRenovacao(data);
          setMedicamentoId(data.medicamento_id || "");
          setMedicoId(data.medico_id || "");
          setFarmaciaId(data.farmacia_id || "");
          setHospitalId(data.hospital_id || "");
          setLocalId(data.local_id || "");
          setDataDisplay(formatDateToDisplay(data.data));
          
          if (data.preco !== undefined && data.preco !== null) {
             const precoCents = Math.round(data.preco * 100).toString();
             setPreco(handleCurrencyMask(precoCents));
          } else {
             setPreco("");
          }

          setObservacoes(data.observacoes || "");
          setAnexoUrl(data.anexo_url || "");
        } else {
          router.push("/saude/renovacao");
        }
      } catch (error) {
        router.push("/saude/renovacao");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, router, getRenovacao]);

  const handleSubmit = () => {
    trigger("vibrate");
    if (!id) return;

    if (isSubmitLocked.current || isSaving) return;
    isSubmitLocked.current = true;

    runSave(
      async () => {
        const dataISO = parseDateToISO(dataDisplay);
        const precoNum = preco
          ? parseFloat(preco.replace(/\./g, "").replace(",", "."))
          : undefined;

        await renovacoesRepository.update(id, {
          person_id: activePersonId || undefined,
          medicamento_id: medicamentoId || undefined,
          medico_id: medicoId || undefined,
          farmacia_id: farmaciaId || undefined,
          hospital_id: hospitalId || undefined,
          local_id: localId || undefined,
          data: dataISO || undefined,
          preco: precoNum,
          observacoes: observacoes.trim() || undefined,
          anexo_url: anexoUrl.trim() || undefined,
        });
      },
      {
        successMessage: "Renovação atualizada com sucesso",
        errorMessage: "Erro ao atualizar renovação",
        goBackOnSuccess: true,
      }
    ).finally(() => {
      isSubmitLocked.current = false;
    });
  };

  const handleDelete = () => {
    runDelete(
      async () => {
        await renovacoesRepository.delete(id!);
        router.replace("/saude/renovacao");
      },
      {
        successMessage: "Renovação excluída com sucesso",
        errorMessage: "Erro ao excluir renovação",
      }
    );
  };

  if (isLoading) return <DetailSkeleton />;
  if (!renovacao) return null;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Editar Renovação
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              trigger("vibrate");
              setShowDeleteModal(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
          >
            <Trash2 size={16} />
          </button>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Medicamento</label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsMedModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Pill size={16} className="text-ice" />
                {selectedMedicamento
                  ? `${selectedMedicamento.nome} · ${selectedMedicamento.dosagem}`
                  : "Selecionar medicamento..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          {/* 🔥 MÉDICO COM LIMPAR */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.02 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Médico Prescritor</label>
              {medicoId && selectedMedico && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setMedicoId("");
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsDoctorModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                {selectedMedico ? `Dr(a). ${selectedMedico.nome}` : "Selecionar médico..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          {/* 🔥 FARMÁCIA COM LIMPAR */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.03 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Farmácia</label>
              {farmaciaId && selectedFarmacia && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setFarmaciaId("");
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsPharmacyModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Store size={16} className="text-amber-400" />
                {selectedFarmacia ? selectedFarmacia.nome : "Selecionar farmácia..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          {/* 🔥 HOSPITAL COM LIMPAR */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Hospital</label>
              {hospitalId && selectedHospital && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setHospitalId("");
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsHospitalModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" />
                {selectedHospital ? selectedHospital.nome : "Selecionar hospital..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          {/* 🔥 LOCAL COM LIMPAR */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Local / Posto</label>
              {localId && selectedLocal && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setLocalId("");
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsLocalModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" />
                {selectedLocal ? selectedLocal.nome : "Selecionar local..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.06 }}
            className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data da Receita</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataDisplay}
                  onChange={(e) => setDataDisplay(handleDateMask(e.target.value))}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Custo (R$)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="0,00"
                  value={preco}
                  onChange={(e) => setPreco(handleCurrencyMask(e.target.value))}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.07 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas sobre esta renovação..."
            />
          </motion.div>

          {anexoUrl && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Anexo</label>
              <a
                href={anexoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice hover:bg-ice/20 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Comprovante Anexado
                </div>
                <ExternalLink size={14} />
              </a>
            </motion.div>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <SelectionModal<Medicamento>
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setMedicamentoId(item.id!);
          }}
          items={medicamentos}
          title="Selecionar Medicamento"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              <p className="text-xs text-ink-muted">{item.dosagem}</p>
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => {}}
          createNewLabel=""
        />

        <SelectionModal<Medico>
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setMedicoId(item.id!);
          }}
          items={medicos}
          title="Selecionar Médico"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">Dr(a). {item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => {}}
          createNewLabel=""
        />

        <SelectionModal<Farmacia>
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setFarmaciaId(item.id!);
          }}
          items={farmacias}
          title="Selecionar Farmácia"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => {}}
          createNewLabel=""
        />

        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setHospitalId(item.id!);
          }}
          items={hospitais}
          title="Selecionar Hospital"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => {}}
          createNewLabel=""
        />

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setLocalId(item.id!);
          }}
          items={locais}
          title="Selecionar Local / Posto"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
          onCreateNew={() => {}}
          createNewLabel=""
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Renovação"
          message="Tem certeza que deseja excluir este registro de renovação?"
          isLoading={isDeleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function EditarRenovacaoPage() {
  return <Suspense fallback={<DetailSkeleton />}><EditarRenovacaoContent /></Suspense>;
}