"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Pill,
  Building2,
  Stethoscope,
  FolderOpen,
  Calendar,
  ChevronRight,
  Search,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CATEGORIES } from "@/lib/types";

const cardMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22 },
};

export default function SaudeDocumentosPage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const documents = useDocuments();
  const { medicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();

  const [filtroTab, setFiltroTab] = useState<"todos" | "receitas" | "prontuarios" | "laudos">("todos");
  const [busca, setBusca] = useState("");

  // Filtra apenas documentos da categoria 'saude'
  const documentosSaude = useMemo(() => {
    if (!documents) return [];
    return documents.filter((d: any) => {
      const matchCategory = d.category_id === "saude";
      const matchTab =
        filtroTab === "todos"
          ? true
          : filtroTab === "receitas"
          ? d.type === "receita"
          : filtroTab === "prontuarios"
          ? d.type === "prontuario" || d.type === "cirurgia"
          : filtroTab === "laudos"
          ? d.type === "laudo" || d.type === "exame_sangue" || d.type === "exame_imagem"
          : true;

      const matchBusca =
        !busca ||
        d.title.toLowerCase().includes(busca.toLowerCase()) ||
        d.type.toLowerCase().includes(busca.toLowerCase());

      return matchCategory && matchTab && matchBusca;
    });
  }, [documents, filtroTab, busca]);

  // Agrupamento Inteligente (Pai e Filho)
  // 1. Receitas agrupadas por nome do Medicamento
  // 2. Prontuários agrupados por Hospital
  // 3. Laudos agrupados por Médico
  const documentosAgrupados = useMemo(() => {
    const grupos: Record<string, { nomePai: string; tipo: string; icone: any; documentos: any[] }> = {};

    documentosSaude.forEach((doc: any) => {
      let chavePai = "Outros Documentos de Saúde";
      let tipoPai = "geral";
      let iconePai = FolderOpen;

      if (doc.type === "receita") {
        const medNome = doc.metadata?.medication || "Medicamento Geral";
        chavePai = `Remédio: ${medNome}`;
        tipoPai = "medicamento";
        iconePai = Pill;
      } else if (doc.type === "prontuario" || doc.type === "cirurgia") {
        const hospId = doc.metadata?.hospital;
        const hospObj = hospitais?.find((h: any) => h.id === hospId || h.nome === hospId);
        chavePai = `Hospital: ${hospObj?.nome || hospId || "Hospital / Clínica"}`;
        tipoPai = "hospital";
        iconePai = Building2;
      } else if (doc.type === "laudo" || doc.type === "consulta" || doc.type === "encaminhamento") {
        const docId = doc.metadata?.doctor;
        const docObj = medicos?.find((m: any) => m.id === docId || m.nome === docId);
        chavePai = `Médico: ${docObj?.nome || docId || "Profissional de Saúde"}`;
        tipoPai = "medico";
        iconePai = Stethoscope;
      }

      if (!grupos[chavePai]) {
        grupos[chavePai] = {
          nomePai: chavePai,
          tipo: tipoPai,
          icone: iconePai,
          documentos: [],
        };
      }
      grupos[chavePai].documentos.push(doc);
    });

    return Object.values(grupos);
  }, [documentosSaude, medicos, hospitais]);

  const isLoading = documents === undefined || medicamentos === undefined;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* HEADER DA PÁGINA */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Acervo Clínico
              </p>
              <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-primary">
                Documentos de Saúde
              </h1>
            </div>
          </div>

          {/* BARRA DE PESQUISA */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Buscar receitas, laudos, exames..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised py-3 pl-10 pr-4 text-sm text-ink-primary outline-none transition-colors focus:border-ice/50"
            />
          </div>

          {/* ABAS DE FILTRO RÁPIDO */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "todos", label: "Todos" },
              { id: "receitas", label: "Receitas" },
              { id: "prontuarios", label: "Prontuários" },
              { id: "laudos", label: "Laudos & Exames" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  trigger("vibrate");
                  setFiltroTab(tab.id as any);
                }}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  filtroTab === tab.id
                    ? "border-ice bg-ice/12 text-ice"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* LISTAGEM AGRUPADA POR PAIS E FILHOS */}
        <section className="space-y-5 px-5 pt-5">
          {documentosAgrupados.length === 0 ? (
            <motion.div
              {...cardMotion}
              className="rounded-[28px] border border-dashed border-surface-border/60 bg-surface/40 px-6 py-12 text-center"
            >
              <FolderOpen size={36} className="mx-auto text-ink-faint mb-2" />
              <p className="text-sm font-medium text-ink-primary">Nenhum documento encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">
                Tente mudar o filtro ou adicione um novo documento de saúde.
              </p>
            </motion.div>
          ) : (
            documentosAgrupados.map((grupo, idx) => {
              const IconPai = grupo.icone;
              return (
                <motion.div
                  key={grupo.nomePai}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: idx * 0.04 }}
                  className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm"
                >
                  {/* CABEÇALHO DO GRUPO (ENTIDADE PAI) */}
                  <div className="mb-3 flex items-center gap-3 border-b border-surface-border/40 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <IconPai size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-sm font-semibold text-ink-primary">
                        {grupo.nomePai}
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        {grupo.documentos.length} arquivo{grupo.documentos.length !== 1 ? "s" : ""} vinculado{grupo.documentos.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* LISTA DOS FILHOS (DOCUMENTOS) */}
                  <div className="space-y-2">
                    {grupo.documentos.map((doc: any) => {
                      // Extrai o mês/ano se houver nas datas para criar a tag elegante (ex: FEV/26)
                      const dataDoc = doc.metadata?.prescription_date || doc.metadata?.date || doc.created_at;
                      let tagMesAno = "";
                      try {
                        const d = new Date(dataDoc);
                        if (!isNaN(d.getTime())) {
                          const mes = d.toLocaleString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
                          const ano = String(d.getFullYear()).slice(-2);
                          tagMesAno = `${mes}/${ano}`;
                        }
                      } catch {
                        tagMesAno = "";
                      }

                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            trigger("vibrate");
                            router.push(`/detalhes?id=${doc.id}`);
                          }}
                          className="group flex cursor-pointer items-center justify-between rounded-2xl border border-surface-border/40 bg-surface-raised p-3 transition-all active:scale-[0.985] hover:border-ice/30"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-ink-primary group-hover:text-ice transition-colors">
                                {doc.title}
                              </p>
                              {tagMesAno && (
                                <span className="shrink-0 rounded-md border border-surface-border/60 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-muted">
                                  {tagMesAno}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-ink-muted capitalize">
                              Tipo: {doc.type.replace("_", " ")}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {doc.attachments && doc.attachments.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-ink-faint">
                                <Paperclip size={12} />
                                {doc.attachments.length}
                              </span>
                            )}
                            <ChevronRight size={16} className="text-ink-faint transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}
