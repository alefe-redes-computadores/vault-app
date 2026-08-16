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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useMedicos } from "@/hooks/useMedicos";
import { useHapticFeedback } from "@/lib/haptics";
import { uploadFile } from "@/lib/supabase/storage";
import { VALIDADE_RECEITA_DIAS, getLocalTodayISO } from "@/lib/health-utils";
import type { Attachment, TipoReceita } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/PageTransition";
import { SelectionModal } from "@/components/SelectionModal";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSelectMedId = searchParams.get("medicamento_id");
  
  const { user } = useAuth();
  const { medicamentos, updateMedicamento } = useMedicamentos();
  const { addRenovacao } = useRenovacoes();
  const { farmacias } = useFarmacias();
  const { medicos } = useMedicos();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [medicamentoId, setMedicamentoId] = useState("");
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isEstabelecimentoModalOpen, setIsEstabelecimentoModalOpen] = useState(false);
  
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dataDisplay, setDataDisplay] = useState(formatDateToDisplay(todayISO));
  const [proximaDisplay, setProximaDisplay] = useState("");
  
  const [medicoId, setMedicoId] = useState("");
  const [medicoNome, setMedicoNome] = useState("");
  const [farmaciaId, setFarmaciaId] = useState("");
  const [farmaciaNome, setFarmaciaNome] = useState("");
  const [estabelecimentoId, setEstabelecimentoId] = useState("");
  const [estabelecimentoNome, setEstabelecimentoNome] = useState("");

  // ✅ CORRIGIDO: db.hospitais em vez de db.table("hospitais")
  const estabelecimentos = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const [registrarCompra, setRegistrarCompra] = useState(false);
  const [preco, setPreco] = useState("");
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState("30");
  const [lote, setLote] = useState("");
  const [validadeProduto, setValidadeProduto] = useState("");
  
  const [modalAlertaAberto, setModalAlertaAberto] = useState(false);
  const [mensagemAlertaRegulatorio, setMensagemAlertaRegulatorio] = useState("");
  const [forcarRegistroReceita, setForcarRegistroReceita] = useState(false);

  const [observacoes, setObservacoes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedMedicamento = medicamentos.find((m: any) => m.id === medicamentoId);
  const selectedFarmacia = farmacias.find((f: any) => f.id === farmaciaId);
  const selectedMedico = medicos.find((m: any) => m.id === medicoId);

  const { analisePreco, calcularValidadePadrao } = useRenovacaoInteligente(medicamentoId, farmaciaId, preco);

  useEffect(() => {
    if (autoSelectMedId && medicamentos.length > 0 && !medicamentoId) {
      const med = medicamentos.find((m: any) => m.id === autoSelectMedId);
      if (med) {
        handleSelectMedicamento(med);
      }
    }
  }, [autoSelectMedId, medicamentos, medicamentoId]);

  const handleSelectMedicamento = (item: any) => {
    trigger("vibrate");
    setMedicamentoId(item.id!);
    
    if (item.medico_id) {
      setMedicoId(item.medico_id);
      const mObj = medicos.find((m: any) => m.id === item.medico_id);
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

    if (selectedMedicamento && selectedMedicamento.tipo_receita === "amarela" && registrarCompra && !forcarRegistroReceita) {
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
      const proximaISO = proximaDisplay.length === 10 ? parseDateToISO(proximaDisplay) : addDaysToISO(dataISO, 30);
      const precoNumerico = preco ? parseFloat(preco.replace(/\./g, "").replace(",", ".")) : undefined;
      const quantidadeNum = registrarCompra ? Number(quantidadeAdicionar) || 0 : undefined;

      await addRenovacao({
        medicamento_id: medicamentoId,
        medico_id: medicoId || undefined,
        estabelecimento_id: estabelecimentoId || undefined,
        farmacia_id: farmaciaId || undefined,
        quantidade: quantidadeNum,
        preco: precoNumerico,
        lote: lote.trim() || undefined,
        validade_produto: validadeProduto || undefined,
        data: dataISO,
        anexo_url: anexoUrl,
        observacoes: observacoes.trim() || undefined,
      });

      const dadosUpdate: any = {
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
      if (autoSelectMedId) {
        router.back();
      } else {
        router.push("/saude");
      }
    } catch (error) {
      console.error("Erro ao salvar renovação relacional:", error);
      trigger("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95">
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
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Medicamento Vinculado <span className="text-coral">*</span></label>
            <button onClick={() => { trigger("vibrate"); setIsMedModalOpen(true); }} className={`w-full rounded-2xl border px-4 py-3 text-left text-ink-primary transition-colors ${errors.medicamentoId ? "border-coral/50" : "border-surface-border/50"} bg-surface-raised flex items-center justify-between`}>
              <span>{selectedMedicamento ? `${selectedMedicamento.nome} · ${selectedMedicamento.dosagem}` : "Selecionar medicamento"}</span>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.02 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico Prescritor</label>
            <button onClick={() => { trigger("vibrate"); setIsDoctorModalOpen(true); }} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                {selectedMedico ? selectedMedico.nome : (medicoNome || "Selecionar médico...")}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Unidade / Estabelecimento Emissor</label>
            <button onClick={() => { trigger("vibrate"); setIsEstabelecimentoModalOpen(true); }} className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" />
                {estabelecimentoNome || "Selecionar posto, hospital ou clínica..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="grid grid-cols-2 gap-3 rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data da receita <span className="text-coral">*</span></label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataDisplay} 
                  onChange={(e) => setDataDisplay(handleDateMask(e.target.value))} 
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Válida até</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={proximaDisplay} 
                  onChange={(e) => setProximaDisplay(handleDateMask(e.target.value))} 
                  className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3 text-ink-primary font-mono text-sm" 
                />
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <button 
              onClick={() => { trigger("vibrate"); setRegistrarCompra(!registrarCompra); }} 
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <PackagePlus size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink-primary">Já comprou / Repôs estoque?</p>
                  <p className="text-xs text-ink-muted">Adicionar custo, farmácia, lote e unidades</p>
                </div>
              </div>
              <div className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${registrarCompra ? "bg-emerald-400" : "bg-surface-border"}`}>
                <div className={`h-5 w-5 rounded-full bg-void transition-transform ${registrarCompra ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            <AnimatePresence>
              {registrarCompra && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }} 
                  exit={{ opacity: 0, height: 0 }} 
                  transition={{ duration: 0.22 }} 
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3.5 border-t border-surface-border/40 pt-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-ink-primary">Preço pago (R$)</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={preco}
                          onChange={(e) => setPreco(handleCurrencyMask(e.target.value))}
                          className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-10 pr-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice"
                        />
                      </div>
                      {analisePreco && (
                        <div className={`mt-2 flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium ${analisePreco.diff < 0 ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-amber-400/10 text-amber-300 border border-amber-400/20"}`}>
                          {analisePreco.diff < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                          <span>
                            {analisePreco.diff < 0
                              ? `Você economizou R$ ${Math.abs(analisePreco.diff).toFixed(2).replace(".", ",")} em relação à compra anterior (${analisePreco.farmaciaAnteriorName})!`
                              : `Este mês está R$ ${analisePreco.diff.toFixed(2).replace(".", ",")} mais caro que na compra anterior.`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-primary">Farmácia da Compra</label>
                      <button 
                        onClick={() => { trigger("vibrate"); setIsPharmacyModalOpen(true); }} 
                        className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Store size={16} className="text-ink-muted" />
                          {selectedFarmacia ? selectedFarmacia.nome : (farmaciaNome || "Selecionar farmácia cadastrada...")}
                        </span>
                        <span className="text-xs text-ice font-medium">Alterar</span>
                      </button>
                    </div>

                    <Input 
                      label="Quantidade comprada (comprimidos/unidades)" 
                      type="number" 
                      min="1" 
                      inputMode="numeric" 
                      value={quantidadeAdicionar} 
                      onChange={(e) => setQuantidadeAdicionar(e.target.value)} 
                      placeholder="Ex: 30"
                    />

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Input 
                        label="Lote do Remédio (opcional)" 
                        placeholder="Ex: LOT-2026-X" 
                        value={lote} 
                        onChange={(e) => setLote(e.target.value)} 
                      />
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-ink-primary">Validade Caixa</label>
                        <input 
                          type="date" 
                          value={validadeProduto} 
                          onChange={(e) => setValidadeProduto(e.target.value)} 
                          className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary text-sm outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <TextArea label="Notas (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações do médico, orientações..." />
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.12 }} className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
             <div className="mb-3"><label className="block text-sm font-medium text-ink-primary">Foto da Receita</label></div>
            {!attachment ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} />Upload</Button>
                <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}><Camera size={16} />Câmera</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-3 py-3">
                <ImageIcon size={16} className="text-ice" />
                <p className="truncate text-sm font-medium flex-1">{attachment.name}</p>
                <button onClick={removeAttachment} className="text-ink-muted"><X size={14} /></button>
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

        <SelectionModal 
          isOpen={isMedModalOpen} 
          onClose={() => setIsMedModalOpen(false)} 
          onSelect={handleSelectMedicamento} 
          items={medicamentos} 
          title="Selecionar medicamento" 
          renderItem={(item: any) => <div><p className="font-medium">{item.nome}</p><p className="text-xs text-ink-muted">{item.dosagem}</p></div>} 
          getItemId={(item: any) => item.id!} 
          getItemLabel={(item: any) => item.nome} 
          onCreateNew={() => {}} 
          createNewLabel="" 
        />

        <SelectionModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setMedicoNome(item.nome); setMedicoId(item.id); }}
          items={medicos}
          title="Selecionar médico"
          placeholder="Buscar médico..."
          renderItem={(item: any) => (
            <div><p className="font-medium text-ink-primary">{item.nome}</p>{item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}</div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsDoctorModalOpen(false); router.push("/saude/medicos/novo"); }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal
          isOpen={isEstabelecimentoModalOpen}
          onClose={() => setIsEstabelecimentoModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setEstabelecimentoNome(item.nome); setEstabelecimentoId(item.id); }}
          items={estabelecimentos}
          title="Selecionar Estabelecimento"
          placeholder="Buscar posto, hospital ou clínica..."
          renderItem={(item: any) => (
            <div><p className="font-medium text-ink-primary">{item.nome}</p>{item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}</div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsEstabelecimentoModalOpen(false); router.push("/saude/hospitais/novo"); }}
          createNewLabel="Cadastrar Unidade"
        />

        <SelectionModal
          isOpen={isPharmacyModalOpen}
          onClose={() => setIsPharmacyModalOpen(false)}
          onSelect={(item: any) => { trigger("vibrate"); setFarmaciaNome(item.nome); setFarmaciaId(item.id); }}
          items={farmacias}
          title="Selecionar farmácia"
          placeholder="Buscar farmácia..."
          renderItem={(item: any) => (
            <div><p className="font-medium text-ink-primary">{item.nome}</p>{item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}</div>
          )}
          getItemId={(item: any) => item.id!}
          getItemLabel={(item: any) => item.nome}
          onCreateNew={() => { setIsPharmacyModalOpen(false); router.push("/saude/farmacias/novo"); }}
          createNewLabel="Cadastrar Farmácia"
        />
      </main>
    </PageTransition>
  );
}

export default function NovaRenovacaoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><Loader2 className="animate-spin text-ice" size={24} /></div>}>
      <NovaRenovacaoContent />
    </Suspense>
  );
}