// app/saude/cids/editar/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Stethoscope,
  Building2,
  MapPin,
  Upload,
  X,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { SelectionModal } from "@/components/SelectionModal";
import { useCids } from "@/hooks/useCids";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useToast } from "@/components/ToastProvider";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { uploadFile } from "@/lib/supabase/storage";
import { useAuth } from "@/hooks/useAuth";
import type { Medico, Hospital, LocalSaude } from "@/lib/types";

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

function formatDateToDisplay(isoStr?: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function EditarCidContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuth();
  const { getCid, updateCid } = useCids();
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();
  const { locais } = useLocais();

  const [cid, setCid] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataDiagnostico, setDataDiagnostico] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [localId, setLocalId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push("/saude/cids");
      return;
    }
    const loadCid = async () => {
      const data = await getCid(id);
      if (data) {
        setCid(data);
        setCodigo(data.codigo || "");
        setDescricao(data.descricao || "");
        setDataDiagnostico(data.data_diagnostico ? formatDateToDisplay(data.data_diagnostico) : "");
        setMedicoId(data.medico_id || "");
        setHospitalId(data.hospital_id || "");
        setLocalId(data.local_id || "");
        setObservacoes(data.observacoes || "");
        setAnexoUrl(data.anexo_url || "");
      } else {
        router.push("/saude/cids");
      }
      setIsLoading(false);
    };
    loadCid();
  }, [id, router, getCid]);

  const selectedMedico = medicos.find((m) => m.id === medicoId);
  const selectedHospital = hospitais.find((h) => h.id === hospitalId);
  const selectedLocal = locais.find((l) => l.id === localId);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!codigo.trim()) newErrors.codigo = "Código é obrigatório";
    if (!descricao.trim()) newErrors.descricao = "Descrição é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    trigger("vibrate");
    setLocalFile(file);
    if (user) {
      const { url, error } = await uploadFile(user.id, file, "saude");
      if (!error && url) {
        setAnexoUrl(url);
        showToast("Arquivo anexado", "success");
      } else {
        showToast("Erro ao fazer upload", "error");
      }
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }
    setLoading(true);
    try {
      const dataISO = dataDiagnostico
        ? dataDiagnostico.split("/").reverse().join("-")
        : undefined;

      await updateCid(id!, {
        codigo: codigo.trim(),
        descricao: descricao.trim(),
        data_diagnostico: dataISO,
        medico_id: medicoId || undefined,
        hospital_id: hospitalId || undefined,
        local_id: localId || undefined,
        observacoes: observacoes.trim() || undefined,
        anexo_url: anexoUrl || undefined,
      });

      trigger("success");
      showToast("CID atualizado com sucesso!", "success");
      router.back();
    } catch (error) {
      console.error("Erro ao atualizar CID:", error);
      trigger("error");
      showToast("Erro ao atualizar CID", "error");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!cid) return null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-400">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">
                Editar CID
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4"
          >
            <Input
              label="Código CID *"
              placeholder="Ex: F90.0"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              error={errors.codigo}
            />
            <Input
              label="Descrição *"
              placeholder="Ex: Transtorno de déficit de atenção / hiperatividade"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              error={errors.descricao}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-primary">Data do Diagnóstico</label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={dataDiagnostico}
                onChange={(e) => setDataDiagnostico(handleDateMask(e.target.value))}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary font-mono text-sm outline-none focus:border-ice"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Médico que diagnosticou</label>
            <button
              onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                {selectedMedico ? selectedMedico.nome : "Selecionar médico..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Hospital</label>
            <button
              onClick={() => { trigger("vibrate"); setIsHospitalModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" />
                {selectedHospital ? selectedHospital.nome : "Selecionar hospital..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">Local / Posto</label>
            <button
              onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" />
                {selectedLocal ? selectedLocal.nome : "Selecionar local..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3"
          >
            <TextArea
              label="Observações"
              placeholder="Sintomas, histórico familiar, etc."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">Laudo / Anexo</label>
              {anexoUrl ? (
                <div className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3">
                  <span className="text-sm text-ink-primary truncate">{localFile?.name || "Arquivo anexado"}</span>
                  <button
                    onClick={() => { trigger("vibrate"); setAnexoUrl(""); setLocalFile(null); }}
                    className="text-coral"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="flex-1"
                  >
                    <Upload size={16} /> Anexar
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border/40 bg-void/88 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <SelectionModal<Medico>
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setMedicoId(item.id!); }}
          items={medicos}
          title="Selecionar Médico"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.especialidade && <p className="text-xs text-ink-muted">{item.especialidade}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
        />

        <SelectionModal<Hospital>
          isOpen={isHospitalModalOpen}
          onClose={() => setIsHospitalModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setHospitalId(item.id!); }}
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
        />

        <SelectionModal<LocalSaude>
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={(item) => { trigger("vibrate"); setLocalId(item.id!); }}
          items={locais}
          title="Selecionar Local"
          renderItem={(item) => (
            <div>
              <p className="font-medium text-ink-primary">{item.nome}</p>
              {item.endereco && <p className="text-xs text-ink-muted">{item.endereco}</p>}
            </div>
          )}
          getItemId={(item) => item.id!}
          getItemLabel={(item) => item.nome}
        />
      </main>
    </PageTransition>
  );
}

export default function EditarCidPage() {
  return <Suspense fallback={<LoadingSkeleton />}><EditarCidContent /></Suspense>;
}