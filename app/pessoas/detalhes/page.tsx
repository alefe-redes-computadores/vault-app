// app/pessoas/detalhes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit3,
  Mail,
  Phone,
  User,
  FileText,
  Pill,
  Stethoscope,
  Calendar,
  Activity,
  Loader2,
  ChevronRight,
  Users,
  CheckCircle,
  Star,
  FolderHeart,
  Brain,
  Flame,
  HeartPulse,
  ShieldAlert,
  Trash2,
  Plus,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { personsRepository } from "@/lib/repositories/persons";
import type { Person, Document, Medicamento, Consulta, Exame, Cirurgia, Tratamento, Cid } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMounted } from "@/hooks/useMounted";

function getTratamentoIcon(nome: string) {
  const n = (nome || "").toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function getStatusColor(status: string) {
  switch (status) {
    case "ativo": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "concluido": return "text-ice bg-ice/10 border-ice/20";
    case "suspenso": return "text-coral bg-coral/10 border-coral/20";
    default: return "text-ink-muted bg-surface-border/20 border-surface-border/30";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ativo": return "Em andamento";
    case "concluido": return "Concluído";
    case "suspenso": return "Suspenso";
    default: return status;
  }
}

export default function PessoaDetalhesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { activePersonId, changePerson } = useActivePersonId();
  const { user } = useAuth();
  const mounted = useMounted();

  const [isLoading, setIsLoading] = useState(true);
  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const person = useLiveQuery(
    () => (id ? db.persons.get(id) : undefined),
    [id]
  );

  const documentos = useLiveQuery(
    () => (id ? db.documents.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const medicamentos = useLiveQuery(
    () => (id ? db.medicamentos.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const consultas = useLiveQuery(
    () => (id ? db.consultas.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const exames = useLiveQuery(
    () => (id ? db.exames.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const cirurgias = useLiveQuery(
    () => (id ? db.cirurgias.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const tratamentos = useLiveQuery(
    () => (id ? db.tratamentos.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const cids = useLiveQuery(
    () => (id ? db.cids.where("person_id").equals(id).toArray() : []),
    [id]
  );

  const isDefault = activePersonId === id;

  useEffect(() => {
    if (id === undefined) return;
    if (person !== undefined) {
      setIsLoading(false);
    }
  }, [person, id]);

  useEffect(() => {
    if (!id) {
      router.push("/pessoas");
      return;
    }
  }, [id, router]);

  // ✅ TODOS OS HOOKS JÁ FORAM CHAMADOS ACIMA
  if (!mounted) return <DetailSkeleton />;

  const handleSetDefault = async () => {
    if (!id || !person || !user) return;
    setIsSettingDefault(true);
    trigger("vibrate");
    try {
      await changePerson(id);
      trigger("success");
      showToast(`${person.name} definido como padrão`, "success");
      setShowDefaultModal(false);
    } catch (error) {
      console.error("Erro ao definir pessoa padrão:", error);
      trigger("error");
      showToast("Erro ao definir pessoa padrão", "error");
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    trigger("vibrate");
    try {
      await personsRepository.delete(id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sync:process"));
      }
      trigger("success");
      showToast(`${person?.name} removido(a) com sucesso`, "success");
      router.push("/pessoas");
    } catch (error) {
      console.error("Erro ao remover pessoa:", error);
      trigger("error");
      showToast("Erro ao remover pessoa", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const menuOptions = [
    { id: "adicionar-documento", label: "Adicionar Documento", icon: FileText, path: `/novo?person_id=${id}` },
    { id: "adicionar-medicamento", label: "Adicionar Medicamento", icon: Pill, path: `/saude/medicamentos/novo?person_id=${id}` },
    { id: "adicionar-consulta", label: "Adicionar Consulta", icon: Stethoscope, path: `/saude/consultas/nova?person_id=${id}` },
    { id: "adicionar-exame", label: "Adicionar Exame", icon: Activity, path: `/saude/exames/novo?person_id=${id}` },
    { id: "editar-pessoa", label: "Editar Pessoa", icon: Edit3, path: `/pessoas/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading || person === undefined) {
    return (
      <PageTransition>
        <DetailSkeleton />
      </PageTransition>
    );
  }

  if (!person) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-void px-5 pt-6">
          <div className="rounded-[28px] border border-surface-border/50 bg-surface px-5 py-8 text-center shadow-sm">
            <p className="text-ink-muted">Pessoa não encontrada.</p>
            <Button
              variant="secondary"
              onClick={() => router.push("/pessoas")}
              className="mt-4"
            >
              Voltar
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const medicamentosAtivos = (medicamentos || []).filter((m) => m.status !== "descontinuado");
  const consultasFuturas = (consultas || []).filter((c) => c.data >= new Date().toISOString().slice(0, 10));
  const examesPendentes = (exames || []).filter((e) => e.data_retorno && new Date(e.data_retorno) >= new Date());

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
                <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">
                  {person.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => { trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                >
                  <Plus size={18} />
                </button>
                <AnimatePresence>
                  {isMenuFlutuanteOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        onClick={() => setIsMenuFlutuanteOpen(false)}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                      >
                        <div className="px-3 pb-2 pt-3.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">Adicionar</p>
                        </div>
                        <div className="px-1.5 pb-2">
                          {menuOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                              <button
                                key={option.id}
                                onClick={() => handleMenuOptionClick(option.path)}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                  <Icon size={15} />
                                </div>
                                <span className="text-sm font-medium text-ink-primary">
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {!isDefault && (
                <button
                  onClick={() => setShowDefaultModal(true)}
                  className="flex h-10 items-center gap-1.5 rounded-full border border-ice/20 bg-ice/10 px-3.5 py-2 text-xs font-semibold text-ice transition-all active:scale-95 hover:bg-ice/20"
                >
                  <Star size={14} />
                  Definir padrão
                </button>
              )}
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/pessoas/editar?id=${id}`);
                }}
                aria-label="Editar pessoa"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              >
                <Edit3 size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95 hover:bg-coral/20"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 object-cover cursor-pointer"
                style={{ borderColor: `${person.color || "#38BDF8"}55` }}
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/pessoas/editar?id=${id}`);
                }}
                title="Clique para editar a foto"
              >
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt={person.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User size={36} style={{ color: person.color || "#38BDF8" }} />
                )}
                <div className="absolute bottom-0 right-0 rounded-full bg-void/80 border border-surface-border p-0.5">
                  <div className="rounded-full bg-ice/20 p-0.5">
                    <Edit3 size={12} className="text-ice" />
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-2xl font-bold text-ink-primary truncate">
                    {person.name}
                  </h2>
                  {isDefault && (
                    <span className="flex items-center gap-0.5 rounded-full bg-ice/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ice border border-ice/20">
                      <CheckCircle size={12} />
                      Padrão
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1.5">
                  {person.email && (
                    <div className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <Mail size={14} className="shrink-0" />
                      <span>{person.email}</span>
                    </div>
                  )}
                  {person.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <Phone size={14} className="shrink-0" />
                      <span>{person.phone}</span>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <p className="text-sm text-ink-faint">Sem informações de contato</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 }}
              className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm text-center"
            >
              <FileText size={20} className="mx-auto text-ice" />
              <p className="mt-2 font-mono text-2xl font-bold text-ink-primary">
                {documentos?.length || 0}
              </p>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider">Documentos</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.06 }}
              className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm text-center"
            >
              <Pill size={20} className="mx-auto text-emerald-400" />
              <p className="mt-2 font-mono text-2xl font-bold text-ink-primary">
                {medicamentosAtivos.length}
              </p>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider">Medicamentos ativos</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.08 }}
              className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm text-center"
            >
              <FolderHeart size={20} className="mx-auto text-violet-400" />
              <p className="mt-2 font-mono text-2xl font-bold text-ink-primary">
                {tratamentos?.length || 0}
              </p>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider">Tratamentos</p>
            </motion.div>
          </div>

          {tratamentos && tratamentos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.1 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <FolderHeart size={16} className="text-violet-400" />
                Tratamentos em andamento
              </h3>
              <div className="space-y-2">
                {tratamentos.filter((t) => t.status === "ativo").slice(0, 3).map((t) => {
                  const Icon = getTratamentoIcon(t.nome);
                  const cor = t.cor || "#8B5CF6";
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/saude/tratamentos/detalhes?id=${t.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left active:scale-[0.98] transition-all"
                      style={{ borderLeft: `4px solid ${cor}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${cor}20`, color: cor }}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="truncate text-sm font-medium text-ink-primary">
                          {t.nome}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusColor(t.status)}`}>
                        {getStatusLabel(t.status)}
                      </span>
                    </button>
                  );
                })}
                {tratamentos.filter((t) => t.status === "ativo").length > 3 && (
                  <button
                    onClick={() => router.push("/saude/tratamentos")}
                    className="text-xs text-ice font-medium flex items-center gap-1 ml-1 mt-1"
                  >
                    Ver todos ({tratamentos.filter((t) => t.status === "ativo").length})
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {cids && cids.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.12 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <FileText size={16} className="text-ice" />
                Diagnósticos (CIDs)
              </h3>
              <div className="flex flex-wrap gap-2">
                {cids.slice(0, 5).map((cid) => (
                  <span
                    key={cid.id}
                    className="rounded-full bg-violet-400/10 border border-violet-400/20 px-3 py-1 text-xs font-medium text-violet-300"
                  >
                    {cid.codigo} - {cid.descricao}
                  </span>
                ))}
                {cids.length > 5 && (
                  <span className="text-xs text-ink-muted">+{cids.length - 5} outros</span>
                )}
              </div>
            </motion.div>
          )}

          {(documentos && documentos.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.14 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <FileText size={16} className="text-ice" />
                Últimos documentos
              </h3>
              <div className="space-y-2">
                {documentos.slice(0, 3).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/detalhes?id=${doc.id}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left active:scale-[0.98] transition-all"
                  >
                    <span className="truncate text-sm font-medium text-ink-primary">
                      {doc.title}
                    </span>
                    <ChevronRight size={16} className="text-ink-faint shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {(consultas && consultas.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.16 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <Stethoscope size={16} className="text-ice" />
                Próximas consultas
              </h3>
              <div className="space-y-2">
                {consultasFuturas.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/saude/consultas/detalhes?id=${c.id}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left active:scale-[0.98] transition-all"
                  >
                    <div>
                      <span className="text-sm font-medium text-ink-primary">
                        {c.especialidade}
                      </span>
                      <p className="text-xs text-ink-muted">Dr(a). {c.medico}</p>
                    </div>
                    <span className="text-xs text-ice font-mono font-bold">
                      {new Date(c.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {(exames && exames.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.18 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <Activity size={16} className="text-coral" />
                Exames pendentes
              </h3>
              <div className="space-y-2">
                {examesPendentes.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => router.push(`/saude/exames/detalhes?id=${e.id}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left active:scale-[0.98] transition-all"
                  >
                    <span className="truncate text-sm font-medium text-ink-primary">
                      {e.nome}
                    </span>
                    <span className="text-xs text-coral font-mono font-bold">
                      {e.data_retorno ? new Date(e.data_retorno).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "Sem prazo"}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {!documentos?.length && !medicamentos?.length && !consultas?.length && !exames?.length && !tratamentos?.length && !cids?.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.2 }}
              className="rounded-[24px] border border-dashed border-surface-border/50 bg-surface/30 p-8 text-center"
            >
              <Users size={28} className="mx-auto text-ink-faint" />
              <p className="mt-3 text-sm text-ink-muted">Nenhum dado vinculado a esta pessoa ainda.</p>
              <p className="text-xs text-ink-faint">Comece cadastrando documentos, medicamentos ou consultas.</p>
            </motion.div>
          )}
        </section>

        <ConfirmationModal
          isOpen={showDefaultModal}
          onClose={() => setShowDefaultModal(false)}
          onConfirm={handleSetDefault}
          title="Definir pessoa padrão"
          message={`Definir "${person.name}" como a pessoa padrão? Ela será selecionada automaticamente ao abrir o aplicativo.`}
          confirmLabel="Definir"
          cancelLabel="Cancelar"
          isLoading={isSettingDefault}
          type="info"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Remover pessoa"
          message={`Tem certeza que deseja remover "${person.name}"? Todos os dados vinculados a esta pessoa (documentos, medicamentos, consultas, exames, cirurgias, tratamentos e CIDs) também serão removidos permanentemente.`}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          isLoading={isDeleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}