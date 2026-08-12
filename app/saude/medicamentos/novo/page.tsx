"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Pill,
  Upload,
  Camera,
  X,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  Clock,
  Circle,
  Droplet,
  Syringe,
  Square,
  Check,
  Palette,
  ArrowRightLeft,
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import {
  suggestRenewalDate,
  VALIDADE_RECEITA_DIAS,
  TIPO_RECEITA_LABELS,
} from "@/lib/health-utils";
import {
  scheduleDoseNotifications,
  requestNotificationPermission,
} from "@/lib/dose-notifications";
import { db, safeAddTratamento } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Attachment, Document, TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { BottomSheet } from "@/components/ui/BottomSheet";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const TIPO_OPTIONS: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

const SHAPES = [
  { id: "comprimido", label: "Comprimido", icon: Circle },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gota", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: Square },
] as const;

const COLORS = [
  "#EF4444", // Vermelho
  "#F97316", // Laranja
  "#F59E0B", // Amarelo
  "#10B981", // Verde
  "#3B82F6", // Azul
  "#8B5CF6", // Roxo
  "#EC4899", // Rosa
  "#A16207", // Marrom/Dourado
  "#6B7280", // Cinza
  "#FFFFFF", // Branco
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NovoMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const persons = usePersons();
  const { addDocument } = useSafeDb();
  const { addMedicamento, medicamentos: allMedicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Estados Base
  const [personId, setPersonId] = useState<string>(persons[0]?.id || "");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [medicoId, setMedicoId] = useState<string>("");
  const [farmaciaId, setFarmaciaId] = useState<string>("");
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceita, setDataReceita] = useState("");
  const [proximaRenovacao, setProximaRenovacao] = useState("");
  const [renovacaoEditadaManualmente, setRenovacaoEditadaManualmente] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Aparência e Status do Medicamento
  const [status, setStatus] = useState<"ativo" | "descontinuado">("ativo");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<"capsula" | "comprimido" | "gota" | "injecao" | "adesivo">("comprimido");
  const [corPrincipal, setCorPrincipal] = useState(COLORS[4]); 
  const [corSecundaria, setCorSecundaria] = useState(COLORS[9]); 

  // NOVO: Estados para Substituição/Descontinuação Dinâmica
  const [motivoDescontinucao, setMotivoDescontinucao] = useState<"simples" | "substituido">("simples");
  const [medicamentoSubstitutoId, setMedicamentoSubstitutoId] = useState<string>("");
  const [dataSubstituicao, setDataSubstituicao] = useState(todayISO());
  const [isSubstitutoModalOpen, setIsSubstitutoModalOpen] = useState(false);

  // Tratamentos
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const [tratamentoId, setTratamentoId] = useState<string>("");
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [isCreatingTratamento, setIsCreatingTratamento] = useState(false);
  const [newTratamentoName, setNewTratamentoName] = useState("");
  const [isSavingTratamento, setIsSavingTratamento] = useState(false);

  // Estoque
  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferencia, setEstoqueDataReferencia] = useState(todayISO());
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId);
  const selectedTratamento = tratamentos.find((t: any) => String(t.id) === tratamentoId);
  const medicamentoSubstituto = allMedicamentos.find((m: any) => m.id === medicamentoSubstitutoId);
  const diasValidade = VALIDADE_RECEITA_DIAS[tipoReceita];

  const handleDataReceitaChange = (value: string) => {
    setDataReceita(value);
    if (diasValidade && !renovacaoEditadaManualmente && value) {
      setProximaRenovacao(suggestRenewalDate(value, tipoReceita));
    }
  };

  const handleTipoReceitaChange = (tipo: TipoReceita) => {
    trigger("vibrate");
    setTipoReceita(tipo);
    const dias = VALIDADE_RECEITA_DIAS[tipo];
    if (dias && dataReceita && !renovacaoEditadaManualmente) {
      setProximaRenovacao(suggestRenewalDate(dataReceita, tipo));
    }
  };

  const toggleEstoque = () => {
    trigger("vibrate");
    setEstoqueAtivo((prev) => !prev);
  };

  const updateHorario = (index: number, value: string) => {
    setHorarios((prev) => prev.map((h, i) => (i === index ? value : h)));
  };

  const addHorario = () => {
    trigger("vibrate");
    setHorarios((prev) => [...prev, ""]);
  };

  const removeHorario = (index: number) => {
    trigger("vibrate");
    setHorarios((prev) => prev.filter((_, i) => i !== index));
  };

  const consumoDiario = horarios.filter((h) => h).length * (Number(estoqueUnidadePorDose) || 1);
  const diasEstimados =
    estoqueAtivo && consumoDiario > 0 && Number(estoqueQuantidade) > 0
      ? Math.floor(Number(estoqueQuantidade) / consumoDiario)
      : null;

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
        name: `receita_${Date.now()}.jpg`,
        type: "image",
        uploaded_at: new Date().toISOString(),
      });
    }
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  const handleCreateTratamento = async () => {
    if (!newTratamentoName.trim()) return;
    setIsSavingTratamento(true);
    trigger("vibrate");
    try {
      const id = await safeAddTratamento({
        user_id: user?.id || "",
        nome: newTratamentoName.trim(),
        status: "ativo",
      });
      setTratamentoId(id);
      trigger("success");
      setIsCreatingTratamento(false);
      setNewTratamentoName("");
    } catch (error) {
      console.error(error);
      trigger("error");
    } finally {
      setIsSavingTratamento(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!personId) newErrors.personId = "Selecione uma pessoa";
    if (!nome.trim()) newErrors.nome = "Nome do medicamento é obrigatório";
    if (!dosagem.trim()) newErrors.dosagem = "Dosagem é obrigatória";
    if (!medicoId) newErrors.medicoId = "Selecione o médico";
    if (!dataReceita) newErrors.dataReceita = "Data da receita é obrigatória";
    if (!proximaRenovacao) newErrors.proximaRenovacao = "Data da próxima renovação é obrigatória";

    if (estoqueAtivo) {
      if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) {
        newErrors.estoqueQuantidade = "Informe a quantidade atual";
      }
      if (!estoqueDataReferencia) {
        newErrors.estoqueDataReferencia = "Informe a data dessa contagem";
      }
      const horariosPreenchidos = horarios.filter((h) => h);
      if (horariosPreenchidos.length === 0) {
        newErrors.horarios = "Adicione pelo menos um horário";
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
    setUploadProgress(0);

    try {
      const docData: Omit<Document, "id" | "created_at" | "updated_at" | "synced"> = {
        user_id: user?.id || "",
        person_id: personId,
        category_id: "saude",
        type: "receita",
        title: `Receita — ${nome.trim()}`,
        description: observacoes.trim() || undefined,
        metadata: {
          medication: nome.trim(),
          dosage: dosagem.trim(),
          doctor: selectedMedico?.nome || "",
          pharmacy: selectedFarmacia?.nome || "",
          prescription_date: dataReceita,
          renewal_date: proximaRenovacao,
          tratamento_id: tratamentoId || undefined, 
        },
        attachments: attachment ? [attachment] : [],
        is_favorite: false,
      };

      const docId = await addDocument(docData);

      if (localFile && user && attachment) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          await db.documents.update(docId, {
            attachments: [{ ...attachment, url }],
            updated_at: new Date().toISOString(),
            synced: false,
          });
          setUploadProgress(100);
          URL.revokeObjectURL(attachment.url);
        }
      }

      const horariosFiltrados = horarios.filter((h) => h);

      const medicamentoId = await addMedicamento({
        document_id: docId,
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        medico: selectedMedico?.nome || "",
        farmacia: selectedFarmacia?.nome || undefined,
        data_receita: dataReceita,
        proxima_renovacao: proximaRenovacao,
        observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita,
        
        status: status,
        forma_farmaceutica: formaFarmaceutica,
        cor_principal: corPrincipal,
        cor_secundaria: formaFarmaceutica === "capsula" ? corSecundaria : undefined,

        // Metadados dinâmicos de descontinuação/substituição para relatórios futuros
        ...(status === "descontinuado" && {
          motivo_descontinucao: motivoDescontinucao,
          medicamento_substituto_id: motivoDescontinucao === "substituido" ? medicamentoSubstitutoId : undefined,
          medicamento_substituto_nome: motivoDescontinucao === "substituido" ? medicamentoSubstituto?.nome : undefined,
          data_substituicao: dataSubstituicao,
        }),

        estoque_quantidade: estoqueAtivo ? Number(estoqueQuantidade) : undefined,
        estoque_data_referencia: estoqueAtivo ? estoqueDataReferencia : undefined,
        estoque_horarios: estoqueAtivo ? horariosFiltrados : undefined,
        estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) || 1 : undefined,
        estoque_unidade_medida: estoqueAtivo ? estoqueUnidade.trim() || "comprimido(s)" : undefined,
      });

      if (estoqueAtivo && horariosFiltrados.length > 0) {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDoseNotifications({
            id: medicamentoId,
            nome: nome.trim(),
            dosagem: dosagem.trim(),
            estoque_horarios: horariosFiltrados,
          } as any);
        }
      }

      trigger("success");
      router.push("/saude");
    } catch (error) {
      console.error("Erro ao salvar medicamento:", error);
      trigger("error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const renderColorPicker = (label: string, selected: string, onSelect: (color: string) => void) => (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium text-ink-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { trigger("vibrate"); onSelect(c); }}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform active:scale-90 ${selected === c ? "border-ice" : "border-surface-border/50 shadow-sm"}`}
            style={{ backgroundColor: c }}
          >
            {selected === c && (<Check size={14} color={c === "#FFFFFF" ? "#000" : "#FFF"} />)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">Novo medicamento</h1>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Pessoa <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((person: any) => {
                const active = personId === person.id;
                return (
                  <button
                    key={person.id}
                    onClick={() => { trigger("vibrate"); setPersonId(person.id!); }}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                      active ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
            {errors.personId && <p className="mt-2 text-xs text-coral">{errors.personId}</p>}
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.01 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Status do Tratamento</p>
            <div className="flex rounded-xl bg-surface-raised p-1 border border-surface-border/50">
              <button
                onClick={() => { trigger("vibrate"); setStatus("ativo"); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  status === "ativo" ? "bg-emerald-500/15 text-emerald-400 shadow-sm" : "text-ink-muted hover:text-ink-primary"
                }`}
              >
                Em Uso (Ativo)
              </button>
              <button
                onClick={() => { trigger("vibrate"); setStatus("descontinuado"); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  status === "descontinuado" ? "bg-coral/15 text-coral shadow-sm" : "text-ink-muted hover:text-ink-primary"
                }`}
              >
                Descontinuado
              </button>
            </div>

            {/* MODAL DINÂMICO DE DESCONTINUAÇÃO / SUBSTITUIÇÃO */}
            <AnimatePresence>
              {status === "descontinuado" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3 border-t border-surface-border/40 pt-4">
                    <p className="text-xs font-medium text-ink-muted">Como este medicamento foi encerrado?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { trigger("vibrate"); setMotivoDescontinucao("simples"); }}
                        className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-all ${
                          motivoDescontinucao === "simples" ? "border-coral bg-coral/12 text-coral" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        Apenas Encerrado
                      </button>
                      <button
                        onClick={() => { trigger("vibrate"); setMotivoDescontinucao("substituido"); }}
                        className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-medium transition-all ${
                          motivoDescontinucao === "substituido" ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"
                        }`}
                      >
                        <ArrowRightLeft size={13} /> Substituído por outro
                      </button>
                    </div>

                    {motivoDescontinucao === "substituido" && (
                      <div className="space-y-3 rounded-2xl bg-surface-raised p-3 border border-surface-border/50">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-muted">Qual medicamento assumiu o lugar?</label>
                          <button
                            onClick={() => { trigger("vibrate"); setIsSubstitutoModalOpen(true); }}
                            className="w-full rounded-xl border border-surface-border/50 bg-surface px-3 py-2.5 text-left text-xs font-medium text-ink-primary"
                          >
                            {medicamentoSubstituto ? medicamentoSubstituto.nome : "Selecionar medicamento substituto..."}
                          </button>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-muted">Data da substituição</label>
                          <input
                            type="date"
                            value={dataSubstituicao}
                            onChange={(e) => setDataSubstituicao(e.target.value)}
                            className="w-full rounded-xl border border-surface-border/50 bg-surface px-3 py-2 text-xs text-ink-primary outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.04 }} className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Tratamento (Opcional)</label>
              <button
                onClick={() => { trigger("vibrate"); setIsTratamentoModalOpen(true); }}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors"
              >
                {selectedTratamento ? selectedTratamento.nome : "Vincular a um tratamento"}
              </button>
            </div>

            <Input label="Medicamento" placeholder="Ex: Losartana, Sertralina..." value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} required />
            <Input label="Dosagem" placeholder="Ex: 50mg, 1x ao dia" value={dosagem} onChange={(e) => setDosagem(e.target.value)} error={errors.dosagem} required />
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico <span className="text-coral">*</span></label>
                <button
                  onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-xs font-medium text-ink-primary transition-colors ${errors.medicoId ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised`}
                >
                  <span className="truncate block">{selectedMedico ? selectedMedico.nome : "Selecionar"}</span>
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-primary">Farmácia</label>
                <button
                  onClick={() => { trigger("vibrate"); setIsPharmacyModalOpen(true); }}
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3 text-left text-xs font-medium text-ink-primary transition-colors"
                >
                  <span className="truncate block">{selectedFarmacia ? selectedFarmacia.nome : "Selecionar"}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* MÓDULO PREMIUM DE APARÊNCIA */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.05 }} className="rounded-[28px] border border-ice/20 bg-ice/5 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Palette size={16} className="text-ice" />
                  <h2 className="font-display text-lg font-semibold text-ink-primary">Aparência</h2>
               </div>
               
               <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-surface border border-surface-border/50 shadow-sm">
                 {formaFarmaceutica === "capsula" ? (
                   <div className="flex h-5 w-10 overflow-hidden rounded-full border border-black/10 shadow-sm">
                     <div className="h-full w-1/2" style={{ backgroundColor: corPrincipal }} />
                     <div className="h-full w-1/2" style={{ backgroundColor: corSecundaria }} />
                   </div>
                 ) : formaFarmaceutica === "comprimido" ? (
                   <div className="h-6 w-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: corPrincipal }} />
                 ) : formaFarmaceutica === "gota" ? (
                   <Droplet size={22} fill={corPrincipal} color={corPrincipal === "#FFFFFF" ? "#e5e7eb" : corPrincipal} />
                 ) : formaFarmaceutica === "injecao" ? (
                   <Syringe size={22} color={corPrincipal === "#FFFFFF" ? "#e5e7eb" : corPrincipal} />
                 ) : (
                   <div className="h-6 w-6 rounded-md border border-black/10 shadow-sm" style={{ backgroundColor: corPrincipal }} />
                 )}
               </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-ink-muted">Formato</p>
                <div className="grid grid-cols-5 gap-2">
                  {SHAPES.map((shape) => {
                    const isActive = formaFarmaceutica === shape.id;
                    const Icon = shape.icon;
                    return (
                      <button
                        key={shape.id}
                        onClick={() => { trigger("vibrate"); setFormaFarmaceutica(shape.id as any); }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 transition-all active:scale-95 ${
                          isActive ? "border-ice bg-ice/15 text-ice" : "border-surface-border/50 bg-surface text-ink-muted hover:text-ink-primary"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-[9px] font-medium">{shape.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-surface p-4 border border-surface-border/50">
                {renderColorPicker(
                  formaFarmaceutica === "capsula" ? "Cor da Esquerda" : "Cor Principal",
                  corPrincipal,
                  setCorPrincipal
                )}
                {formaFarmaceutica === "capsula" &&
                  renderColorPicker("Cor da Direita", corSecundaria, setCorSecundaria)}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-ink-primary">Dados da Receita</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {TIPO_OPTIONS.map((tipo) => {
                const active = tipoReceita === tipo;
                return (
                  <button
                    key={tipo}
                    onClick={() => handleTipoReceitaChange(tipo)}
                    className={`rounded-2xl border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                      active
                        ? tipo === "comum" ? "border-ice bg-ice/12 text-ice" : "border-violet-400 bg-violet-400/12 text-violet-300"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    {TIPO_RECEITA_LABELS[tipo]}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Prescrição <span className="text-coral">*</span></label>
                <input
                  type="date"
                  value={dataReceita}
                  onChange={(e) => handleDataReceitaChange(e.target.value)}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${errors.dataReceita ? "border-coral/50" : "border-surface-border/50"}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-primary">Renovar em <span className="text-coral">*</span></label>
                <input
                  type="date"
                  value={proximaRenovacao}
                  onChange={(e) => {
                    setProximaRenovacao(e.target.value);
                    setRenovacaoEditadaManualmente(true);
                  }}
                  className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none transition-all duration-200 focus:border-ice/50 focus:ring-2 focus:ring-ice/15 ${errors.proximaRenovacao ? "border-coral/50" : "border-surface-border/50"}`}
                />
              </div>
            </div>
            
            {diasValidade && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-violet-400/8 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-violet-300" />
                <p className="text-xs leading-5 text-ink-muted">
                  Receita {TIPO_RECEITA_LABELS[tipoReceita].toLowerCase()} vale{" "}
                  <span className="font-medium text-ink-primary">{diasValidade} dias</span>.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.08 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <button onClick={toggleEstoque} className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice"><Package size={16} /></div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink-primary">Controle de Estoque</p>
                  <p className="text-xs text-ink-muted">Lembrete de doses e vencimento</p>
                </div>
              </div>
              <div className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-border"}`}>
                <div className={`h-5 w-5 rounded-full bg-void transition-transform ${estoqueAtivo ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            <AnimatePresence>
              {estoqueAtivo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 space-y-3 border-t border-surface-border/40 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-ink-primary">Quantidade atual <span className="text-coral">*</span></label>
                        <input type="number" min="0" placeholder="Ex: 30" value={estoqueQuantidade} onChange={(e) => setEstoqueQuantidade(e.target.value)} className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none ${errors.estoqueQuantidade ? "border-coral/50" : "border-surface-border/50"}`} />
                      </div>
                      <Input label="Unidade" placeholder="comprimido(s)" value={estoqueUnidade} onChange={(e) => setEstoqueUnidade(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-ink-primary">Contado em <span className="text-coral">*</span></label>
                        <input type="date" value={estoqueDataReferencia} onChange={(e) => setEstoqueDataReferencia(e.target.value)} className={`w-full rounded-2xl border bg-surface-raised px-4 py-3 text-ink-primary outline-none ${errors.estoqueDataReferencia ? "border-coral/50" : "border-surface-border/50"}`} />
                      </div>
                      <Input label="Unid. por dose" type="number" min="1" value={estoqueUnidadePorDose} onChange={(e) => setEstoqueUnidadePorDose(e.target.value)} />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-medium text-ink-primary">Horários de dose <span className="text-coral">*</span></label>
                        <button onClick={addHorario} className="flex items-center gap-1 text-xs font-medium text-ice hover:text-ice/80"><Plus size={13} /> Adicionar</button>
                      </div>
                      <div className="space-y-2">
                        {horarios.map((horario, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                              <input type="time" value={horario} onChange={(e) => updateHorario(index, e.target.value)} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-9 pr-3 text-ink-primary outline-none" />
                            </div>
                            {horarios.length > 1 && (
                              <button onClick={() => removeHorario(index)} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-border/40 hover:text-coral"><Trash2 size={14} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {diasEstimados !== null && (
                      <div className="rounded-2xl bg-ice/8 px-3 py-2.5 text-xs text-ink-muted">
                        Com esse ritmo, dá pra <span className="font-medium text-ink-primary">{diasEstimados} dia{diasEstimados !== 1 ? "s" : ""}</span> a partir da data contada.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.10 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Notas (opcional)" placeholder="Ex: tomar em jejum, horário fixo..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.28, delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-primary">Foto da receita (opcional)</label>
            </div>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={loading}><Upload size={16} /> Arquivo</Button>
                <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => cameraInputRef.current?.click()} disabled={loading}><Camera size={16} /> Câmera</Button>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border/40">
                    {attachment.type === "image" ? <ImageIcon size={16} className="text-ice" /> : <FileText size={16} className="text-ice" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p>
                  </div>
                  <button onClick={removeAttachment} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-border/40 hover:text-ink-primary" disabled={loading}><X size={14} /></button>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading} className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10">
            {loading ? <><Loader2 size={16} className="animate-spin" /> {uploadProgress > 0 ? "Enviando receita..." : "Salvando..."}</> : <><Save size={16} /> Salvar medicamento</>}
          </Button>
        </div>

        {/* Modal de Seleção de Medicamento Substituto */}
        <SelectionModal
          isOpen={isSubstitutoModalOpen}
          onClose={() => setIsSubstitutoModalOpen(false)}
          onSelect={(item: any) => {
            trigger("vibrate");
            setMedicamentoSubstitutoId(item.id!);
          }}
          items={allMedicamentos}
          title="Selecionar Medicamento Substituto"
          placeholder="Buscar medicamento..."
          renderItem={(item: any) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome} <span className="text-xs text-ink-muted">({item.dosagem})</span></p>
            </div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
        />

        <SelectionModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} onSelect={(item: any) => { trigger("vibrate"); setTratamentoId(item.id!); }} items={tratamentos} title="Vincular a Tratamento" placeholder="Buscar tratamento..." renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsTratamentoModalOpen(false); trigger("vibrate"); setIsCreatingTratamento(true); }} createNewLabel="Novo Tratamento" />
        
        <BottomSheet isOpen={isCreatingTratamento} onClose={() => { trigger("vibrate"); setIsCreatingTratamento(false); setNewTratamentoName(""); }} title="Cadastrar Tratamento">
          <div className="space-y-4 px-1 pb-2">
            <Input label="Nome" placeholder="Ex: Fisioterapia, Acompanhamento..." value={newTratamentoName} onChange={(e) => setNewTratamentoName(e.target.value)} autoFocus />
            <Button variant="primary" fullWidth onClick={handleCreateTratamento} disabled={isSavingTratamento || !newTratamentoName.trim()} className="flex items-center justify-center gap-2">
              {isSavingTratamento ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar e selecionar
            </Button>
          </div>
        </BottomSheet>

        <SelectionModal isOpen={isDoctorModalOpen} onClose={() => setIsDoctorModalOpen(false)} onSelect={(item: any) => { trigger("vibrate"); setMedicoId(item.id!); }} items={medicos} title="Selecionar médico" placeholder="Buscar médico..." renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsDoctorModalOpen(false); trigger("vibrate"); router.push("/saude/medicos/novo"); }} createNewLabel="Criar médico" />
        <SelectionModal isOpen={isPharmacyModalOpen} onClose={() => setIsPharmacyModalOpen(false)} onSelect={(item: any) => { trigger("vibrate"); setFarmaciaId(item.id!); }} items={farmacias} title="Selecionar farmácia" placeholder="Buscar farmácia..." renderItem={(item: any) => (<div><p className="font-medium text-ink-primary">{item.nome}</p></div>)} getItemId={(item: any) => item.id!} getItemLabel={(item: any) => item.nome} onCreateNew={() => { setIsPharmacyModalOpen(false); trigger("vibrate"); router.push("/saude/farmacias/novo"); }} createNewLabel="Criar farmácia" />
      </main>
    </PageTransition>
  );
}
