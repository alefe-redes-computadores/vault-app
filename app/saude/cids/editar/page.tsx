// app/saude/cids/editar/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Loader2, Stethoscope, Building2, MapPin, Upload, X, Eraser,
  FolderHeart, Pill, Calendar, FlaskConical, ExternalLink
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { SelectionModal } from "@/components/SelectionModal";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useToast } from "@/components/ToastProvider";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { uploadFile } from "@/lib/supabase/storage";
import { useAuth } from "@/hooks/useAuth";
import { cidsRepository } from "@/lib/repositories/cids";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Medico, Hospital, LocalSaude, Cid, Tratamento, Medicamento, Consulta, Exame } from "@/lib/types";
import { getClinicalTheme } from "@/lib/health-utils";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

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
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();
  const { locais } = useLocais();
  const { run, isSubmitting } = useSubmitAction();
  const isSubmitLocked = useRef(false);

  const [cid, setCid] = useState<Cid | null>(null);
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

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), [], []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), [], []) || [];
  const consultas = useLiveQuery(() => db.consultas.toArray(), [], []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), [], []) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/cids");
      return;
    }
    const loadCid = async () => {
      const data = await cidsRepository.getById(id);
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
  }, [id, router]);

  const selectedMedico = medicos.find((m) => m.id === medicoId);
  const selectedHospital = hospitais.find((h) => h.id === hospitalId);
  const selectedLocal = locais.find((l) => l.id === localId);

  const tratamentosVinculados = useMemo(() => {
    if (!id) return [];
    return tratamentos.filter((t: Tratamento) => t.cid_ids && t.cid_ids.includes(id));
  }, [tratamentos, id]);

  const medicamentosVinculados = useMemo(() => {
    if (!id || tratamentosVinculados.length === 0) return [];
    const tratIds = new Set(tratamentosVinculados.map(t => t.id));
    return medicamentos.filter((m: Medicamento) => m.tratamento_ids && m.tratamento_ids.some(tid => tratIds.has(tid)));
  }, [medicamentos, tratamentosVinculados]);

  const consultasVinculadas = useMemo(() => {
    if (!id) return [];
    return consultas.filter((c: Consulta) => (c.medico_id && selectedMedico && c.medico_id === selectedMedico.id)).sort((a, b) => b.data.localeCompare(a.data));
  }, [consultas, selectedMedico]);

  const examesVinculados = useMemo(() => {
    if (!id) return [];
    const tratIds = new Set(tratamentosVinculados.map(t => t.id));
    return exames.filter((e: Exame) => e.tratamento_ids && e.tratamento_ids.some(tid => tratIds.has(tid))).sort((a, b) => b.data.localeCompare(a.data));
  }, [exames, tratamentosVinculados]);

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

  const handleSubmit = () => {
    trigger("vibrate");
    if (!validate()) {
      trigger("error");
      return;
    }
    if (!id) return;

    if (isSubmitLocked.current || isSubmitting) return;
    isSubmitLocked.current = true;

    run(
      async () => {
        try {
          const dataISO = dataDiagnostico
            ? dataDiagnostico.split("/").reverse().join("-")
            : undefined;

          await cidsRepository.update(id, {
            codigo: codigo.trim(),
            descricao: descricao.trim(),
            data_diagnostico: dataISO,
            medico_id: medicoId || undefined,
            hospital_id: hospitalId || undefined,
            local_id: localId || undefined,
            observacoes: observacoes.trim() || undefined,
            anexo_url: anexoUrl || undefined,
          });
        } finally {
          isSubmitLocked.current = false;
        }
      },
      {
        successMessage: "CID atualizado com sucesso!",
        errorMessage: "Erro ao atualizar CID",
        goBackOnSuccess: true,
      }
    );
  };

  if (isLoading) return <DetailSkeleton />;
  if (!cid) return null;

  const theme = getClinicalTheme(descricao || codigo || "Geral");
  const PreviewIcon = theme.icon;

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">
                Editar CID ({codigo})
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className={`rounded-[28px] border bg-surface p-5 shadow-sm transition-all duration-300 ${theme.borderClass}`}
            style={{ borderLeft: `6px solid ${theme.hex}` }}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}>
                <PreviewIcon size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${theme.textClass}`}>
                  {codigo || "CÓDIGO CID"}
                </p>
                <h2 className="font-display text-base font-semibold text-ink-primary mt-0.5 line-clamp-2">
                  {descricao || "A prévia do seu diagnóstico aparecerá aqui"}
                </h2>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.02 }}
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
            variants={fadeUp}
            initial="initial"
            animate="animate"
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
                aria-label="Data do diagnóstico"
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.06 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Médico que diagnosticou</label>
              {medicoId && selectedMedico && (
                <button
                  type="button"
                  onClick={() => { trigger("vibrate"); setMedicoId(""); }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  aria-label="Limpar médico"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => { trigger("vibrate"); setIsMedicoModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
              type="button"
              aria-label="Selecionar médico"
            >
              <span className="flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                {selectedMedico ? selectedMedico.nome : "Selecionar médico..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Hospital</label>
              {hospitalId && selectedHospital && (
                <button
                  type="button"
                  onClick={() => { trigger("vibrate"); setHospitalId(""); }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  aria-label="Limpar hospital"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => { trigger("vibrate"); setIsHospitalModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
              type="button"
              aria-label="Selecionar hospital"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" />
                {selectedHospital ? selectedHospital.nome : "Selecionar hospital..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-primary">Local / Posto</label>
              {localId && selectedLocal && (
                <button
                  type="button"
                  onClick={() => { trigger("vibrate"); setLocalId(""); }}
                  className="flex items-center gap-1 text-[10px] font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-md uppercase"
                  aria-label="Limpar local"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
            <button
              onClick={() => { trigger("vibrate"); setIsLocalModalOpen(true); }}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-left text-ink-primary transition-colors hover:border-ice/50 flex items-center justify-between"
              type="button"
              aria-label="Selecionar local"
            >
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" />
                {selectedLocal ? selectedLocal.nome : "Selecionar local..."}
              </span>
              <span className="text-xs text-ice font-medium">Alterar</span>
            </button>
          </motion.div>

          {(tratamentosVinculados.length > 0 || medicamentosVinculados.length > 0 || consultasVinculadas.length > 0 || examesVinculados.length > 0) && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.11 }}
              className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-4"
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">
                Hub de Condição (Vinculados)
              </h2>

              {tratamentosVinculados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-violet-400 uppercase">Tratamentos ({tratamentosVinculados.length})</p>
                  {tratamentosVinculados.map((t) => (
                    <div key={t.id} onClick={() => router.push(`/saude/tratamentos/detalhes?id=${t.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                      <div className="flex items-center gap-2.5">
                        <FolderHeart size={14} className="text-violet-400" />
                        <span className="text-xs font-semibold text-ink-primary">{t.nome}</span>
                      </div>
                      <ExternalLink size={14} className="text-ink-faint" />
                    </div>
                  ))}
                </div>
              )}

              {medicamentosVinculados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-amber-400 uppercase">Medicamentos ({medicamentosVinculados.length})</p>
                  {medicamentosVinculados.map((m) => (
                    <div key={m.id} onClick={() => router.push(`/saude/medicamentos/detalhes?id=${m.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                      <div className="flex items-center gap-2.5">
                        <Pill size={14} className="text-amber-400" />
                        <span className="text-xs font-semibold text-ink-primary">{m.nome}</span>
                      </div>
                      <ExternalLink size={14} className="text-ink-faint" />
                    </div>
                  ))}
                </div>
              )}

              {consultasVinculadas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-ice uppercase">Consultas ({consultasVinculadas.length})</p>
                  {consultasVinculadas.map((c) => (
                    <div key={c.id} onClick={() => router.push(`/saude/consultas/detalhes?id=${c.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                      <div className="flex items-center gap-2.5">
                        <Calendar size={14} className="text-ice" />
                        <span className="text-xs font-semibold text-ink-primary">{c.especialidade} ({formatDateToDisplay(c.data)})</span>
                      </div>
                      <ExternalLink size={14} className="text-ink-faint" />
                    </div>
                  ))}
                </div>
              )}

              {examesVinculados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-emerald-400 uppercase">Exames ({examesVinculados.length})</p>
                  {examesVinculados.map((e) => (
                    <div key={e.id} onClick={() => router.push(`/saude/exames/detalhes?id=${e.id}`)} className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 cursor-pointer" role="button" tabIndex={0}>
                      <div className="flex items-center gap-2.5">
                        <FlaskConical size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-ink-primary">{e.nome} ({formatDateToDisplay(e.data)})</span>
                      </div>
                      <ExternalLink size={14} className="text-ink-faint" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
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
                    type="button"
                    aria-label="Remover anexo"
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
                    type="button"
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
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
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
  return <Suspense fallback={<DetailSkeleton />}><EditarCidContent /></Suspense>;
}