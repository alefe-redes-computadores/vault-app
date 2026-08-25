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
  Receipt,
  Check,
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
import { getClinicalTheme } from "@/lib/health-utils";
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
  
  // 🛡️ Novos estados do SUS na edição
  const [tipoAquisicao, setTipoAquisicao] = useState<"comprado" | "sus">("comprado");
  const [dataProximaRetirada, setDataProximaRetirada] = useState("");

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

  const theme = getClinicalTheme(selectedMedicamento?.nome || "Editar Renovação");

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

          setTipoAquisicao(data.tipo_aquisicao === "sus" ? "sus" : "comprado");
          setDataProximaRetirada(data.data_proxima_retirada ? formatDateToDisplay(data.data_proxima_retirada) : "");

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
        const precoNum = tipoAquisicao === "comprado" && preco
          ? parseFloat(preco.replace(/\./g, "").replace(",", "."))
          : undefined;

        const dataRetornoISO = tipoAquisicao === "sus" && dataProximaRetirada.length === 10 
          ? parseDateToISO(dataProximaRetirada) 
          : undefined;

        await renovacoesRepository.update(id, {
          person_id: activePersonId || undefined,
          medicamento_id: medicamentoId || undefined,
          medico_id: medicoId || undefined,
          farmacia_id: farmaciaId || undefined,
          hospital_id: hospitalId || undefined,
          local_id: localId || undefined,
          tipo_aquisicao: tipoAquisicao,
          data_proxima_retirada: dataRetornoISO,
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
      <main className="relative min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                  Editar Renovação
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir renovação"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* ===== CONTEÚDO ===== */}
        <section className="space-y-4 px-5 pt-6">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all duration-300 ${theme.borderClass}`}
            style={{ borderLeft: `6px solid ${theme.hex}` }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
              >
                <Receipt size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${theme.textClass}`}>
                  AQUISIÇÃO
                </p>
                <h2 className="mt-0.5 line-clamp-2 font-display text-base font-semibold text-ink-primary">
                  {selectedMedicamento ? selectedMedicamento.nome : "Aguardando seleção..."}
                </h2>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              Medicamento
            </label>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setIsMedModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex items-center gap-2">
                <Pill size={16} className="text-ice" />
                {selectedMedicamento
                  ? `${selectedMedicamento.nome} · ${selectedMedicamento.dosagem}`
                  : "Selecionar medicamento..."}
              </span>
              <span className="text-xs font-medium text-ice">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.02 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Médico Prescritor
              </label>
              {medicoId && selectedMedico && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setMedicoId("");
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setIsDoctorModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                {selectedMedico ? `Dr(a). ${selectedMedico.nome}` : "Selecionar médico..."}
              </span>
              <span className="text-xs font-medium text-ice">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.03 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Farmácia / Posto
              </label>
              {farmaciaId && selectedFarmacia && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setFarmaciaId("");
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setIsPharmacyModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex items-center gap-2">
                <Store size={16} className="text-amber-400" />
                {selectedFarmacia ? selectedFarmacia.nome : "Selecionar farmácia / posto..."}
              </span>
              <span className="text-xs font-medium text-ice">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Hospital
              </label>
              {hospitalId && selectedHospital && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setHospitalId("");
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setIsHospitalModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" />
                {selectedHospital ? selectedHospital.nome : "Selecionar hospital..."}
              </span>
              <span className="text-xs font-medium text-ice">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-primary">
                Local / Posto
              </label>
              {localId && selectedLocal && (
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setLocalId("");
                  }}
                  className="flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase text-coral"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setIsLocalModalOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary"
            >
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" />
                {selectedLocal ? selectedLocal.nome : "Selecionar local..."}
              </span>
              <span className="text-xs font-medium text-ice">Alterar</span>
            </button>
          </motion.div>

          {/* Forma de Aquisição */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-ink-primary">Forma de Aquisição</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setTipoAquisicao("comprado");
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  tipoAquisicao === "comprado"
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                🛒 Comprado (Particular)
              </button>
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setTipoAquisicao("sus");
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  tipoAquisicao === "sus"
                    ? "border-emerald-500 bg-emerald-500/12 text-emerald-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                🛡️ Retirada SUS / Governo
              </button>
            </div>
          </motion.div>

          {/* Data e Preço / Retirada SUS */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.07 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">
                Data do Registro / Retirada
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataDisplay}
                  onChange={(e) => setDataDisplay(handleDateMask(e.target.value))}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm text-ink-primary outline-none focus:border-ice/50"
                />
              </div>
            </div>

            {tipoAquisicao === "comprado" ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">
                  Custo (R$)
                </label>
                <div className="relative">
                  <DollarSign
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                  />
                  <input
                    type="text"
                    placeholder="0,00"
                    value={preco}
                    onChange={(e) => setPreco(handleCurrencyMask(e.target.value))}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm text-ink-primary outline-none focus:border-ice/50"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-2 border-t border-surface-border/30">
                <label className="block text-sm font-medium text-emerald-400">
                  📅 Próxima data de retorno ao posto (SUS)
                </label>
                <div className="relative">
                  <Calendar
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={dataProximaRetirada}
                    onChange={(e) => setDataProximaRetirada(handleDateMask(e.target.value))}
                    className="w-full rounded-2xl border border-emerald-500/30 bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm text-ink-primary outline-none focus:border-emerald-500/50"
                  />
                </div>
                <p className="text-[11px] text-ink-muted">Esta data gerará alertas automáticos na sua agenda.</p>
              </div>
            )}
          </motion.div>

          {/* Observações */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas sobre esta renovação..."
            />
          </motion.div>

          {/* Anexo */}
          {anexoUrl && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.09 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Anexo
              </label>
              <a
                href={anexoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice transition-colors hover:bg-ice/20"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Comprovante Anexado
                </div>
                <ExternalLink size={14} />
              </a>
            </motion.div>
          )}
        </section>

        {/* ===== FIXED FOOTER ===== */}
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

        {/* ===== MODAIS ===== */}
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
          onCreateNew={() => {
            setIsMedModalOpen(false);
            router.push("/saude/medicamentos/novo");
          }}
          createNewLabel="Cadastrar Novo Medicamento"
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
          onCreateNew={() => {
            setIsDoctorModalOpen(false);
            router.push("/saude/medicos/novo");
          }}
          createNewLabel="Cadastrar Novo Médico"
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
          onCreateNew={() => {
            setIsPharmacyModalOpen(false);
            router.push("/saude/farmacias/novo");
          }}
          createNewLabel="Cadastrar Nova Farmácia"
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
          onCreateNew={() => {
            setIsHospitalModalOpen(false);
            router.push("/saude/hospitais/novo");
          }}
          createNewLabel="Cadastrar Novo Hospital"
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
          onCreateNew={() => {
            setIsLocalModalOpen(false);
            router.push("/saude/locais/novo");
          }}
          createNewLabel="Cadastrar Novo Local"
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
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EditarRenovacaoContent />
    </Suspense>
  );
}
