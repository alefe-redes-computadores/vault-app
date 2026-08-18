// app/saude/renovacao/nova/page.tsx
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  FileWarning,
  Upload,
  Camera,
  X,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  Store,
  PackagePlus,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Building2,
  MapPin,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { usePersons } from "@/hooks/usePersons";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { uploadFile } from "@/lib/supabase/storage";
import { VALIDADE_RECEITA_DIAS, getLocalTodayISO } from "@/lib/health-utils";
import type {
  Attachment,
  TipoReceita,
  Person,
  Medicamento,
  Medico,
  Farmacia,
  Hospital,
  LocalSaude,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { useRenovacaoInteligente } from "@/hooks/useRenovacaoInteligente";
import { ModalAlertaReceita } from "@/components/saude/ModalAlertaReceita";

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
  if (clean.length !== 8) return new Date().toISOString().slice(0, 10);
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

function addDaysToISO(dateISO: string, days: number): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function NovaRenovacaoContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSelectMedId = searchParams.get("medicamento_id");

  const { user } = useAuth();
  const { medicamentos, updateMedicamento } = useMedicamentos();
  const { addRenovacao } = useRenovacoes();
  const { farmacias } = useFarmacias();
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();
  const { locais } = useLocais();
  const persons = usePersons() as Person[];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [personId, setPersonId] = useState<string>(persons[0]?.id || "");
  const [medicamentoId, setMedicamentoId] = useState("");
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [dataDisplay, setDataDisplay] = useState(formatDateToDisplay(todayISO));
  const [proximaDisplay, setProximaDisplay] = useState("");

  const [medicoId, setMedicoId] = useState("");
  const [medicoNome, setMedicoNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [hospitalNome, setHospitalNome] = useState("");
  const [localId, setLocalId] = useState("");
  const [localNome, setLocalNome] = useState("");

  const [registrarCompra, setRegistrarCompra] = useState(false);
  const [preco, setPreco] = useState("");
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState("30");
  const [lote, setLote] = useState("");
  const [validadeProduto, setValidadeProduto] = useState("");

  const [tipoAquisicao, setTipoAquisicao] = useState<"comprado" | "gratuito">("comprado");
  const [dataProximaRetirada, setDataProximaRetirada] = useState("");
  const [exigeNovaReceita, setExigeNovaReceita] = useState(false);

  const [modalAlertaAberto, setModalAlertaAberto] = useState(false);
  const [mensagemAlertaRegulatorio, setMensagemAlertaRegulatorio] = useState("");
  const [forcarRegistroReceita, setForcarRegistroReceita] = useState(false);

  const [observacoes, setObservacoes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedMedicamento = medicamentos.find((m) => m.id === medicamentoId);
  const selectedFarmacia = farmacias.find((f) => f.id === farmaciaId);
  const selectedMedico = medicos.find((m) => m.id === medicoId);
  const selectedHospital = hospitais.find((h) => h.id === hospitalId);
  const selectedLocal = locais.find((l) => l.id === localId);

  const { analisePreco, calcularValidadePadrao } = useRenovacaoInteligente(
    medicamentoId,
    farmaciaId,
    preco
  );

  useEffect(() => {
    if (autoSelectMedId && medicamentos.length > 0 && !medicamentoId) {
      const med = medicamentos.find((m) => m.id === autoSelectMedId);
      if (med) {
        handleSelectMedicamento(med);
      }
    }
  }, [autoSelectMedId, medicamentos, medicamentoId]);

  const handleSelectMedicamento = (item: Medicamento) => {
    trigger("vibrate");
    setMedicamentoId(item.id!);

    if (item.medico_id) {
      setMedicoId(item.medico_id);
      const mObj = medicos.find((m) => m.id === item.medico_id);
      if (mObj) setMedicoNome(mObj.nome);
    } else if (item.medico) {
      setMedicoNome(item.medico);
    }

    const tipo = item.tipo_receita as TipoReceita;
    const currentISO = parseDateToISO(dataDisplay);
    const proxISO = calcularValidadePadrao(tipo, currentISO);
    setProximaDisplay(formatDateToDisplay(proxISO));
  };

  useEffect(() => {
    if (selectedMedicamento && dataDisplay.length === 10) {
      const tipo = selectedMedicamento.tipo_receita as TipoReceita;
      const currentISO = parseDateToISO(dataDisplay);
      const proxISO = calcularValidadePadrao(tipo, currentISO);
      setProximaDisplay(formatDateToDisplay(proxISO));
    }
  }, [dataDisplay, selectedMedicamento, calcularValidadePadrao]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type.startsWith("image") ? "image" : "pdf",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trigger("vibrate");
      setLocalFile(file);
      setAttachment({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: `renovacao_${Date.now()}.jpg`,
        type: "image",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!medicamentoId) newErrors.medicamentoId = "Selecione o medicamento";
    if (!dataDisplay || dataDisplay.length < 10) newErrors.data = "Data inválida";

    if (
      selectedMedicamento &&
      selectedMedicamento.tipo_receita === "amarela" &&
      registrarCompra &&
      !forcarRegistroReceita
    ) {
      const qtd = Number(quantidadeAdicionar) || 0;
      if (qtd > 30) {
        setMensagemAlertaRegulatorio(
          `Este medicamento (${selectedMedicamento.nome}) utiliza Receita Amarela, cujo limite regulatório padrão é de 30 dias por via. A quantidade informada (${qtd} unidades) excede o período permitido.`
        );
        setModalAlertaAberto(true);
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }

    setLoading(true);
    try {
      let anexoUrl: string | undefined;

      if (localFile && user) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          anexoUrl = url;
          if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
        }
      }

      const dataISO = parseDateToISO(dataDisplay);
      const proximaISO =
        proximaDisplay.length === 10 ? parseDateToISO(proximaDisplay) : addDaysToISO(dataISO, 30);
      const precoNumerico = preco
        ? parseFloat(preco.replace(/\./g, "").replace(",", "."))
        : undefined;
      const quantidadeNum = registrarCompra ? Number(quantidadeAdicionar) || 0 : undefined;

      await addRenovacao({
        person_id: personId || undefined,
        medicamento_id: medicamentoId,
        medico_id: medicoId || undefined,
        farmacia_id: farmaciaId || undefined,
        hospital_id: hospitalId || undefined,
        local_id: localId || undefined,
        tipo_aquisicao: tipoAquisicao,
        data_proxima_retirada: tipoAquisicao === "gratuito" ? dataProximaRetirada : undefined,
        exige_nova_receita: tipoAquisicao === "gratuito" ? exigeNovaReceita : undefined,
        quantidade: quantidadeNum,
        preco: precoNumerico,
        lote: lote.trim() || undefined,
        validade_produto: validadeProduto || undefined,
        data: dataISO,
        anexo_url: anexoUrl,
        observacoes: observacoes.trim() || undefined,
      });

      const dadosUpdate: Partial<Medicamento> = {
        data_receita: dataISO,
        proxima_renovacao: proximaISO,
        medico_id: medicoId || undefined,
        medico: medicoNome || undefined,
      };

      if (registrarCompra && selectedMedicamento) {
        const estoqueAtual = Number(selectedMedicamento.estoque_quantidade) || 0;
        dadosUpdate.estoque_quantidade = estoqueAtual + (quantidadeNum || 0);
        dadosUpdate.estoque_data_referencia = getLocalTodayISO();
        if (selectedFarmacia) {
          dadosUpdate.farmacia = selectedFarmacia.nome;
          dadosUpdate.farmacia_id = selectedFarmacia.id;
        }
      }

      await updateMedicamento(medicamentoId, dadosUpdate);

      trigger("success");
      showToast("Renovação registrada com sucesso", "success");
      router.back();
    } catch (error) {
      trigger("error");
      showToast("Erro ao salvar renovação", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileWarning size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Nova receita / Renovação</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {persons.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
            >
              <p className="mb-3 text-sm font-medium text-ink-primary">
                Para quem? <span className="text-coral">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {persons.map((person) => {
                  const active = personId === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => {
                        trigger("vibrate");
                        setPersonId(person.id!);
                      }}
                      className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                        active
                          ? "border-ice bg-ice/12 text-ice"
                          : "border-surface-border/50 bg-surface-raised text-ink-muted"
                      }`}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              Medicamento Vinculado <span className="text-coral">*</span>
            </label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsMedModalOpen(true);
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${
                errors.medicamentoId ? "border-coral/50" : "border-surface-border/50"
              } bg-surface-raised flex items-center justify-between`}
            >
              <span>
                {selectedMedicamento
                  ? `${selectedMedicamento.nome} · ${selectedMedicamento.dosagem}`
                  : "Selecionar medicamento"}
              </span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.02 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Prescritor</label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsDoctorModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                {selectedMedico ? selectedMedico.nome : medicoNome || "Selecionar médico..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.03 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Hospital</label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsHospitalModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" />
                {selectedHospital ? selectedHospital.nome : hospitalNome || "Selecionar hospital..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Local / Posto</label>
            <button
              onClick={() => {
                trigger("vibrate");
                setIsLocalModalOpen(true);
              }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" />
                {selectedLocal ? selectedLocal.nome : localNome || "Selecionar local..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Data da Renovação *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={dataDisplay}
                    onChange={(e) => setDataDisplay(handleDateMask(e.target.value))}
                    maxLength={10}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
                {errors.data && <p className="mt-1 text-xs text-coral">{errors.data}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Próxima Validade</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={proximaDisplay}
                    onChange={(e) => setProximaDisplay(handleDateMask(e.target.value))}
                    maxLength={10}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
              </div>
            </div>
          </motion.div>

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
                  setRegistrarCompra(true);
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  tipoAquisicao === "comprado"
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                Comprado
              </button>
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setTipoAquisicao("gratuito");
                  setRegistrarCompra(false);
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  tipoAquisicao === "gratuito"
                    ? "border-emerald-500 bg-emerald-500/12 text-emerald-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }`}
              >
                Gratuito (SUS)
              </button>
            </div>
          </motion.div>

          {tipoAquisicao === "comprado" ? (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.07 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Store size={16} className="text-ice" />
                <h3 className="text-sm font-semibold text-ink-primary">Dados da Compra</h3>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Farmácia</label>
                <button
                  type="button"
                  onClick={() => setIsPharmacyModalOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                >
                  <span className="truncate font-medium text-ink-primary">
                    {selectedFarmacia ? selectedFarmacia.nome : farmaciaNome || "Onde comprou?"}
                  </span>
                  <span className="text-xs font-bold text-ice">Selecionar</span>
                </button>
              </div>

              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Preço (R$)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="0,00"
                    value={preco}
                    onChange={(e) => {
                      const masked = handleCurrencyMask(e.target.value);
                      setPreco(masked);
                    }}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
                {analisePreco && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {analisePreco.diff > 0 ? (
                      <>
                        <TrendingDown size={14} className="text-emerald-400" />
                        <span className="text-emerald-400">
                          {analisePreco.farmaciaAnteriorName
                            ? `R$ ${analisePreco.diff.toFixed(2).replace(".", ",")} mais barato que em ${analisePreco.farmaciaAnteriorName}`
                            : `R$ ${analisePreco.diff.toFixed(2).replace(".", ",")} mais barato que a média`
                          }
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingUp size={14} className="text-coral" />
                        <span className="text-coral">
                          {analisePreco.farmaciaAnteriorName
                            ? `R$ ${Math.abs(analisePreco.diff).toFixed(2).replace(".", ",")} mais caro que em ${analisePreco.farmaciaAnteriorName}`
                            : `R$ ${Math.abs(analisePreco.diff).toFixed(2).replace(".", ",")} acima da média`
                          }
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary flex items-center gap-2">
                  <PackagePlus size={16} className="text-ink-muted" />
                  Quantidade adicionada ao estoque
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={quantidadeAdicionar}
                  onChange={(e) => setQuantidadeAdicionar(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Lote (opcional)"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Lote..."
                />
                <Input
                  label="Validade (opcional)"
                  value={validadeProduto}
                  onChange={(e) => setValidadeProduto(handleDateMask(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.07 }}
              className="rounded-[28px] border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check size={16} />
                </div>
                <h3 className="text-sm font-semibold text-emerald-400">Retirada Gratuita</h3>
                <span className="ml-auto text-xs text-emerald-400/60">Sem custo registrado</span>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Farmácia / Posto de Retirada</label>
                <button
                  type="button"
                  onClick={() => setIsPharmacyModalOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left"
                >
                  <span className="truncate font-medium text-ink-primary">
                    {selectedFarmacia ? selectedFarmacia.nome : farmaciaNome || "Onde retirou?"}
                  </span>
                  <span className="text-xs font-bold text-ice">Selecionar</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Data agendada para próxima retirada</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={dataProximaRetirada}
                    onChange={(e) => setDataProximaRetirada(handleDateMask(e.target.value))}
                    maxLength={10}
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 font-mono text-sm outline-none focus:border-ice/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="exigeNovaReceita"
                  checked={exigeNovaReceita}
                  onChange={(e) => setExigeNovaReceita(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border/50 bg-surface-raised text-ice focus:ring-ice/20"
                />
                <label htmlFor="exigeNovaReceita" className="text-sm text-ink-primary cursor-pointer">
                  Levar nova receita na próxima retirada?
                </label>
              </div>
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <TextArea
              label="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Retirada mensal, farmácia de confiança..."
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.09 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-3 block text-sm font-medium text-ink-primary">Foto da Receita (opcional)</label>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"
                >
                  <Upload size={18} />
                  <span className="text-xs font-semibold">Anexar</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-4 text-ink-muted hover:border-ice/40 hover:text-ice"
                >
                  <Camera size={18} />
                  <span className="text-xs font-semibold">Foto</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">
                  {attachment.type === "image" ? (
                    <img src={attachment.url} className="h-full w-full object-cover" />
                  ) : (
                    <FileWarning size={20} className="text-coral m-auto" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p>
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Salvar Histórico"}
          </Button>
        </div>

        <ModalAlertaReceita
          isOpen={modalAlertaAberto}
          mensagem={mensagemAlertaRegulatorio}
          onAjustar={() => {
            trigger("vibrate");
            setQuantidadeAdicionar("30");
            setModalAlertaAberto(false);
          }}
          onForcar={() => {
            trigger("vibrate");
            setForcarRegistroReceita(true);
            setModalAlertaAberto(false);
          }}
        />

        <SelectionModal<Medicamento>
          isOpen={isMedModalOpen}
          onClose={() => setIsMedModalOpen(false)}
          onSelect={handleSelectMedicamento}
          items={medicamentos}
          title="Selecionar medicamento"
          renderItem={(item) => (
            <div>
              <p className="font-medium">{item.nome}</p>
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
            setMedicoNome(item.nome);
            setMedicoId(item.id!);
          }}
          items={medicos}
          title="Selecionar médico"
          placeholder="Buscar médico..."
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
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

        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setHospitalNome(item.nome);
            setHospitalId(item.id!);
          }}
          items={hospitais}
          title="Selecionar Hospital"
          placeholder="Buscar hospital..."
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
          createNewLabel="Cadastrar Hospital"
        />

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setLocalNome(item.nome);
            setLocalId(item.id!);
          }}
          items={locais}
          title="Selecionar Local / Posto"
          placeholder="Buscar local..."
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
          createNewLabel="Cadastrar Local"
        />

        <SelectionModal<Farmacia>
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          onSelect={(item) => {
            trigger("vibrate");
            setFarmaciaNome(item.nome);
            setFarmaciaId(item.id!);
          }}
          items={farmacias}
          title="Selecionar farmácia"
          placeholder="Buscar farmácia..."
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
          createNewLabel="Cadastrar Farmácia"
        />
      </main>
    </PageTransition>
  );
}

export default function NovaRenovacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void flex items-center justify-center">
          <Loader2 className="animate-spin text-ice" size={24} />
        </div>
      }
    >
      <NovaRenovacaoContent />
    </Suspense>
  );
}