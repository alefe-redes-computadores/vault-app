"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Save, Pill, Upload, Camera, X, FileText, Package, Plus, Trash2, Clock,
  Activity, Stethoscope, Droplet, Syringe, StickyNote, Palette, AlertTriangle, ArrowRight, Info
} from "lucide-react";
import { usePersons } from "@/hooks/usePersons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { suggestRenewalDate, VALIDADE_RECEITA_DIAS, TIPO_RECEITA_LABELS, getLocalTodayISO } from "@/lib/health-utils";
import { scheduleDoseNotifications, requestNotificationPermission } from "@/lib/dose-notifications";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Attachment, Document, TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { SeletorReceita } from "@/components/saude/SeletorReceita";
import { CalculadoraGotas } from "@/components/saude/CalculadoraGotas";
import { SeletorTratamentoModal } from "@/components/saude/SeletorTratamentoModal";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

// MÁSCARAS E HELPERS
function mascaraData(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{4})\d+?$/, '$1');
}
function isoParaBr(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function brParaIso(br: string) {
  const parts = br.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// ICONE CUSTOMIZADO COMPRIMIDO PARTIDO
const SplitPillIcon = ({ size, fill = "currentColor" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={fill} />
    <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
  </svg>
);

const FORMATOS = [
  { id: "comprimido", label: "Inteiro", icon: Pill },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
];

const CORES_DISPONIVEIS = ["#FFFFFF", "#FCA5A5", "#F87171", "#FBBF24", "#34D399", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6", "#9CA3AF"];

export default function NovoMedicamentoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const persons = usePersons();
  const { addDocument } = useSafeDb();
  const { addMedicamento } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Estados Base
  const [personId, setPersonId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [dosagem, setDosagem] = useState("");
  const [medicoId, setMedicoId] = useState<string>("");
  const [medicoNome, setMedicoNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState<string>("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Upload de Arquivos
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Receita e Datas Customizadas
  const [tipoReceita, setTipoReceita] = useState<TipoReceita>("comum");
  const [dataReceitaTexto, setDataReceitaTexto] = useState("");
  const [proximaRenovacaoTexto, setProximaRenovacaoTexto] = useState("");

  // Visuais
  const [formato, setFormato] = useState("comprimido");
  const [cores, setCores] = useState<string[]>(["#FFFFFF"]);
  const isGotas = formato === "gota";

  // Lógica Gotas / Estoque
  const [mlTotal, setMlTotal] = useState("");
  const [gotasPorMl, setGotasPorMl] = useState("20");
  const [estoqueGotasCalculado, setEstoqueGotasCalculado] = useState(0);
  const [estoqueAtivo, setEstoqueAtivo] = useState(false);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState("");
  const [estoqueDataReferenciaTexto, setEstoqueDataReferenciaTexto] = useState(isoParaBr(new Date().toISOString().slice(0, 10)));
  const [estoqueUnidade, setEstoqueUnidade] = useState("comprimido(s)");
  const [estoqueUnidadePorDose, setEstoqueUnidadePorDose] = useState("1");
  const [horarios, setHorarios] = useState<string[]>([""]);

  // Modais
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isTratamentoModalOpen, setIsTratamentoModalOpen] = useState(false);
  const [tratamentosSelecionados, setTratamentosSelecionados] = useState<string[]>([]);

  // Validações
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeFields, setShakeFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Consultas Dexie
  const medicamentosQuery = useLiveQuery(() => db.table("medicamentos").toArray(), []) || [];
  const selectedMedico = medicos.find((m: any) => m.id === medicoId);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId);

  // --- INTELIGÊNCIAS DE UX ---
  
  // 1. Verificar Duplicidade em Tempo Real
  const medicamentoDuplicado = nome.length > 2 
    ? medicamentosQuery.find((m: any) => m.nome.toLowerCase() === nome.toLowerCase().trim() && m.status !== "descontinuado")
    : null;

  // 2. Preencher cor e pessoa padrão
  useEffect(() => {
    if (persons.length > 0 && !personId) {
      setPersonId(persons[0].id!);
    }
  }, [persons, personId]);

  // 3. Atualizar Unidade por dose ao trocar formato
  const handleFormatoChange = (novoFormato: string) => {
    trigger("vibrate");
    setFormato(novoFormato);
    if (novoFormato === "partido") setEstoqueUnidadePorDose("0.5");
    else if (novoFormato !== "gota") setEstoqueUnidadePorDose("1");
    if (novoFormato !== "gota") setEstoqueGotasCalculado(0);
  };

  // ✅ Função toggleCor restaurada no componente
  const toggleCor = (hex: string) => {
    trigger("vibrate");
    setCores(prev => {
      if (prev.includes(hex)) return prev.filter((c) => c !== hex);
      if (prev.length >= 2) return [prev[1], hex];
      return [...prev, hex];
    });
  };

  // 4. Tratamento Completo de Upload
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
    if (attachment?.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setLocalFile(null);
    trigger("vibrate");
  };

  // 5. Cálculo de Datas Automáticas
  const handleDataReceitaBlur = () => {
    const isoData = brParaIso(dataReceitaTexto);
    if (!isoData) return;
    const dias = VALIDADE_RECEITA_DIAS[tipoReceita];
    if (dias) {
      const novaData = suggestRenewalDate(isoData, tipoReceita);
      setProximaRenovacaoTexto(isoParaBr(novaData));
    }
  };

  const isReceitaVencida = () => {
    const isoReceita = brParaIso(dataReceitaTexto);
    if (!isoReceita) return false;
    const expDate = new Date(suggestRenewalDate(isoReceita, tipoReceita));
    return expDate < new Date();
  };

  const triggerShake = (fieldNames: string[]) => {
    trigger("error");
    setShakeFields(fieldNames);
    setTimeout(() => setShakeFields([]), 600);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const shakeList: string[] = [];

    if (!personId) { newErrors.personId = "Obrigatório"; shakeList.push("personId"); }
    if (!nome.trim()) { newErrors.nome = "Obrigatório"; shakeList.push("nome"); }
    if (!dosagem.trim()) { newErrors.dosagem = "Obrigatório"; shakeList.push("dosagem"); }
    if (!dataReceitaTexto || dataReceitaTexto.length < 10) { newErrors.dataReceitaTexto = "Data inválida"; shakeList.push("dataReceitaTexto"); }

    if (estoqueAtivo) {
      if (!estoqueQuantidade || Number(estoqueQuantidade) <= 0) { newErrors.estoqueQuantidade = "Faltou quantidade"; shakeList.push("estoqueQuantidade"); }
      if (horarios.filter(Boolean).length === 0) { newErrors.horarios = "Adicione um horário"; shakeList.push("horarios"); }
    }

    setErrors(newErrors);
    if (shakeList.length > 0) {
      triggerShake(shakeList);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return Object.keys(newErrors).length === 0;
  };

  // --- RENDERS E ESTILOS ---
  const SelectedFormatIcon = FORMATOS.find((f) => f.id === formato)?.icon || Pill;
  const hasTwoColors = cores.length === 2 && (formato === "comprimido" || formato === "partido");
  const gradientId = `split-novo`;

  const handleSubmit = async () => {
    if (!validate()) return;
    
    if (!estoqueAtivo && confirm("Você não preencheu o estoque atual. Deseja salvar mesmo assim para ter controle de histórico de receitas?") === false) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      const dataReceitaISO = brParaIso(dataReceitaTexto);
      const proximaRenovacaoISO = brParaIso(proximaRenovacaoTexto);
      const estoqueDataReferenciaISO = brParaIso(estoqueDataReferenciaTexto);
      const quantidadeEstoqueFinal = isGotas ? (estoqueGotasCalculado > 0 ? estoqueGotasCalculado : Number(estoqueQuantidade) || 0) : Number(estoqueQuantidade) || 0;
      const horariosFiltrados = horarios.filter(Boolean);

      const docData: any = {
        user_id: user?.id || "", person_id: personId, category_id: "saude", type: "receita",
        title: `Receita — ${nome.trim()}`, description: observacoes.trim() || undefined,
        metadata: { medication: nome.trim(), dosage: dosagem.trim(), prescription_date: dataReceitaISO, renewal_date: proximaRenovacaoISO, tratamento_ids: tratamentosSelecionados, tipo_receita: tipoReceita, formato, status: "ativo" },
        attachments: attachment ? [attachment] : [], is_favorite: false,
      };

      const docId = await addDocument(docData);

      if (localFile && user && attachment) {
        const { url, error } = await uploadFile(user.id, localFile, "saude");
        if (!error && url) {
          await db.documents.update(docId, { attachments: [{ ...attachment, url }], updated_at: new Date().toISOString(), synced: false });
          setUploadProgress(100);
        }
      }

      const medicamentoId = await addMedicamento({
        document_id: docId, person_id: personId, nome: nome.trim(), dosagem: dosagem.trim(), formato, cores,
        medico: selectedMedico?.nome || medicoNome.trim(), medico_id: medicoId || undefined, 
        farmacia: selectedFarmacia?.nome || farmaciaNome.trim(), farmacia_id: farmaciaId || undefined,
        data_receita: dataReceitaISO, proxima_renovacao: proximaRenovacaoISO, observacoes: observacoes.trim() || undefined,
        tipo_receita: tipoReceita, tratamento_ids: tratamentosSelecionados, status: "ativo",
        estoque_quantidade: estoqueAtivo ? quantidadeEstoqueFinal : undefined, estoque_data_referencia: estoqueAtivo ? estoqueDataReferenciaISO : undefined,
        estoque_horarios: estoqueAtivo ? horariosFiltrados : undefined, estoque_unidade_por_dose: estoqueAtivo ? Number(estoqueUnidadePorDose) : undefined,
        estoque_unidade_medida: estoqueAtivo ? (isGotas ? "gota(s)" : estoqueUnidade) : undefined,
      } as any);

      if (estoqueAtivo && horariosFiltrados.length > 0) {
        const granted = await requestNotificationPermission();
        if (granted) await scheduleDoseNotifications({ id: medicamentoId, nome: nome.trim(), dosagem: dosagem.trim(), estoque_horarios: horariosFiltrados } as any);
      }

      trigger("success");
      router.replace("/saude");
    } catch (error) { trigger("error"); } finally { setLoading(false); setUploadProgress(0); }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="50%" stopColor={cores[0] || "#9CA3AF"} />
              <stop offset="50%" stopColor={cores.length === 2 ? cores[1] : (cores[0] || "#9CA3AF")} />
            </linearGradient>
          </defs>
        </svg>

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"><ArrowLeft size={18} className="text-ink-primary" /></button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold text-ink-primary">Novo medicamento</h1>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div variants={fadeUp} initial="initial" animate="animate" className={`rounded-[28px] border bg-surface p-4 shadow-sm transition-all ${shakeFields.includes('personId') ? 'animate-shake border-coral/80 shadow-coral/20' : 'border-surface-border/50'}`}>
            <p className="mb-3 text-sm font-medium text-ink-primary">Para quem é? <span className="text-coral">*</span></p>
            <div className="flex flex-wrap gap-2">
              {persons.map((p: any) => (
                <button type="button" key={p.id} onClick={() => { trigger("vibrate"); setPersonId(p.id!); }} className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${personId === p.id ? "border-ice bg-ice/12 text-ice" : "border-surface-border/50 bg-surface-raised text-ink-muted"}`}>{p.name}</button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className={`transition-all ${shakeFields.includes('nome') ? 'animate-shake' : ''}`}>
              <Input label="Medicamento" placeholder="Ex: Sertralina" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} />
            </div>
            
            <AnimatePresence>
              {medicamentoDuplicado && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-center justify-between rounded-xl bg-amber-400/10 border border-amber-400/30 p-3 mt-1">
                    <div className="flex items-center gap-2 text-amber-300 text-xs">
                      <AlertTriangle size={14} /> Você já cadastrou este remédio.
                    </div>
                    <button onClick={() => router.push(`/saude/medicamentos/editar?id=${medicamentoDuplicado.id}`)} className="text-[10px] font-bold text-void bg-amber-400 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                      Editar <ArrowRight size={10}/>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`transition-all ${shakeFields.includes('dosagem') ? 'animate-shake' : ''}`}>
              <Input label={isGotas ? "Dosagem por dose (ex: 20 gotas)" : "Dosagem (ex: 50mg)"} value={dosagem} onChange={(e) => setDosagem(e.target.value)} error={errors.dosagem} />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2"><Palette size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Identidade Visual</h3></div>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {FORMATOS.map((item) => {
                const isActive = formato === item.id;
                const Icon = item.icon;
                return (
                  <button type="button" key={item.id} onClick={() => handleFormatoChange(item.id)} className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all ${isActive ? "border-ice bg-ice/15 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted"}`}>
                    <Icon size={20} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 0 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <p className="mb-2 text-xs text-ink-muted">Cores (Até 2 para pílulas)</p>
            <div className="flex flex-wrap gap-2.5">
              {CORES_DISPONIVEIS.map((hex) => (
                <button type="button" key={hex} onClick={() => toggleCor(hex)} className={`h-8 w-8 rounded-full border-2 transition-all ${cores.includes(hex) ? "scale-110 border-ice" : "border-transparent"}`} style={{ backgroundColor: hex }} />
              ))}
            </div>
            
            <div className="mt-4 flex justify-center">
              <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-surface-border bg-void/50 shadow-inner">
                <SelectedFormatIcon size={32} fill={hasTwoColors ? `url(#${gradientId})` : (cores[0] || "#9CA3AF")} stroke="none" />
              </div>
            </div>
          </motion.div>

          <CalculadoraGotas isAtivo={isGotas} onToggle={(ativo) => { setFormato(ativo ? "gota" : "comprimido"); }} mlTotal={mlTotal} setMlTotal={setMlTotal} gotasPorMl={gotasPorMl} setGotasPorMl={setGotasPorMl} onEstoqueCalculado={(v) => { setEstoqueGotasCalculado(v); if(estoqueAtivo) setEstoqueQuantidade(String(v)); }} />

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <SeletorReceita selected={tipoReceita} onChange={(t) => { setTipoReceita(t); handleDataReceitaBlur(); }} />
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className={`transition-all ${shakeFields.includes('dataReceitaTexto') ? 'animate-shake' : ''}`}>
                <Input label="Data da receita *" placeholder="DD/MM/AAAA" value={dataReceitaTexto} onChange={(e) => setDataReceitaTexto(mascaraData(e.target.value))} onBlur={handleDataReceitaBlur} maxLength={10} inputMode="numeric" error={errors.dataReceitaTexto} />
              </div>
              <Input label="Validade estimada" placeholder="DD/MM/AAAA" value={proximaRenovacaoTexto} onChange={(e) => setProximaRenovacaoTexto(mascaraData(e.target.value))} maxLength={10} inputMode="numeric" />
            </div>

            <AnimatePresence>
              {isReceitaVencida() && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-coral/10 border border-coral/30 p-3 text-coral">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <p className="text-[11px] font-medium leading-tight">Receita antiga/vencida. O cadastro será salvo apenas para histórico de tratamento.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-ink-primary">Controle de Estoque</h3>
              <button onClick={() => setEstoqueAtivo(!estoqueAtivo)} className={`h-6 w-11 rounded-full p-0.5 transition-colors ${estoqueAtivo ? "bg-ice" : "bg-surface-raised border border-surface-border"}`}>
                <div className={`h-5 w-5 rounded-full bg-void shadow-sm transition-transform ${estoqueAtivo ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <AnimatePresence>
              {estoqueAtivo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-2 overflow-hidden">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Quantidade Atual" type="number" inputMode="numeric" value={estoqueQuantidade} onChange={(e) => setEstoqueQuantidade(e.target.value)} />
                    <Input label="Quanto é 1 dose?" type="number" inputMode="decimal" step="0.5" placeholder={formato === "partido" ? "0.5" : "1"} value={estoqueUnidadePorDose} onChange={(e) => setEstoqueUnidadePorDose(e.target.value)} />
                  </div>
                  
                  <div>
                    <label className="text-sm text-ink-muted mb-2 flex items-center justify-between">Horários (HH:MM) <button onClick={() => setHorarios([...horarios, ""])} className="text-ice font-bold text-xs">+ ADD</button></label>
                    <div className="flex flex-wrap gap-2">
                      {horarios.map((h, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input type="text" placeholder="08:00" value={h} maxLength={5} onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "");
                            if(v.length > 2) v = v.substring(0,2) + ":" + v.substring(2);
                            const n = [...horarios]; n[i] = v; setHorarios(n);
                          }} className="w-16 bg-surface-raised border border-surface-border rounded-xl text-center py-2 text-sm font-mono focus:border-ice outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Stethoscope size={16} className="text-ice" />
              <h3 className="text-sm font-semibold text-ink-primary">Rede de Apoio</h3>
            </div>
            <div className="space-y-3">
              <button type="button" onClick={() => setIsDoctorModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border bg-surface-raised px-4 py-3 text-left border-surface-border/50">
                <span className="block truncate font-medium text-ink-primary">{selectedMedico?.nome || medicoNome || "Selecionar médico..."}</span>
                <span className="text-xs font-medium text-ice">Alterar</span>
              </button>
              <button type="button" onClick={() => setIsPharmacyModalOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left">
                <span className="truncate font-medium text-ink-primary">{selectedFarmacia?.nome || farmaciaNome || "Selecionar farmácia..."}</span>
                <span className="text-xs font-medium text-ice">Alterar</span>
              </button>
            </div>
          </motion.div>

          {/* UPLOAD DE RECEITA */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2"><FileText size={16} className="text-ice" /><div><h3 className="text-sm font-semibold text-ink-primary">Anexo / Foto da Receita</h3></div></div>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { trigger("vibrate"); fileInputRef.current?.click(); }} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-5 text-ink-muted hover:border-ice/40 hover:text-ice"><Upload size={20} /><span className="text-xs font-semibold">Arquivo</span></button>
                <button type="button" onClick={() => { trigger("vibrate"); cameraInputRef.current?.click(); }} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border/60 bg-surface-raised px-4 py-5 text-ink-muted hover:border-ice/40 hover:text-ice"><Camera size={20} /><span className="text-xs font-semibold">Tirar foto</span></button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                <div className="flex h-11 w-11 overflow-hidden rounded-xl bg-surface">{attachment.type === "image" ? <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" /> : <FileText size={20} className="text-coral m-auto" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-primary">{attachment.name}</p></div>
                <button type="button" onClick={removeAttachment} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/5 text-coral"><X size={16} /></button>
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3"><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-ice transition-all" style={{ width: `${uploadProgress}%` }} /></div></div>
            )}
          </motion.div>

          <SeletorTratamentoModal isOpen={isTratamentoModalOpen} onClose={() => setIsTratamentoModalOpen(false)} selectedIds={tratamentosSelecionados} onChange={setTratamentosSelecionados} personId={personId} />
          
          {/* ✅ CORREÇÃO APLICADA: Modais tipados estritamente, sem a prop selectedId e com renderItem obrigatório */}
          <SelectionModal 
            isOpen={isDoctorModalOpen} 
            onClose={() => setIsDoctorModalOpen(false)} 
            title="Selecionar médico" 
            items={medicos} 
            getItemId={(item: any) => item.id!} 
            getItemLabel={(item: any) => item.nome} 
            onSelect={(item: any) => { trigger("vibrate"); setMedicoId(item.id); setMedicoNome(item.nome); setIsDoctorModalOpen(false); }} 
            renderItem={(item: any) => (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ice/10 text-ice shrink-0"><Stethoscope size={14} /></div>
                <div><p className="font-medium text-ink-primary">{item.nome}</p>{item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}</div>
              </div>
            )}
          />
          
          <SelectionModal 
            isOpen={isPharmacyModalOpen} 
            onClose={() => setIsPharmacyModalOpen(false)} 
            title="Selecionar farmácia" 
            items={farmacias} 
            getItemId={(item: any) => item.id!} 
            getItemLabel={(item: any) => item.nome} 
            onSelect={(item: any) => { trigger("vibrate"); setFarmaciaId(item.id); setFarmaciaNome(item.nome); setIsPharmacyModalOpen(false); }} 
            renderItem={(item: any) => (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shrink-0"><Store size={14} /></div>
                <div className="min-w-0"><p className="truncate font-medium text-ink-primary">{item.nome}</p>{item.endereco && <p className="truncate text-xs text-ink-muted">{item.endereco}</p>}</div>
              </div>
            )}
          />

        </section>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-surface-border/30 bg-void/90 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <Button type="button" onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : <><Save size={18} /> Salvar medicamento</>}
          </Button>
        </div>
      </main>
    </PageTransition>
  );
}
