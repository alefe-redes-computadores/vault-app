// app/saude/registros/detalhes/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Pill,
  ChevronRight,
  TrendingUp,
  Flame,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useToast } from "@/components/ToastProvider";
import { registrosSaudeRepository } from "@/lib/repositories/registrosSaude";
import {
  getRegistroTheme,
  getClinicalTheme,
} from "@/lib/health-utils";
import { analisarRegistroSaude } from "@/lib/health-insights";
import {
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

/* ============================================================
   HELPERS
   ============================================================ */

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

function getTratamentoIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("tdah")) return Activity;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) {
    return AlertTriangle;
  }
  return Activity;
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

export default function DetalhesRegistroSaudePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id");
  const id = rawId ? String(rawId) : null; // BLINDAGEM 1: Garante que o ID é string ou null

  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const [isDeleting, setIsDeleting] = useState(false);

  /* ==========================================================
     DEXIE
     ========================================================== */

  const registro = useLiveQuery<any>(
    () => {
      if (!id) return Promise.resolve(null); // BLINDAGEM 2: Previne erro de Keypath
      return db.table("registros_saude").get(id);
    },
    [id]
  );

  const medicamento = useLiveQuery<any>(
    () => {
      if (!registro?.medicamento_id) return Promise.resolve(null);
      return db.medicamentos.get(registro.medicamento_id);
    },
    [registro?.medicamento_id]
  );

  const tratamentos = useLiveQuery<any[]>(
    async () => {
      if (!registro?.tratamento_ids || !Array.isArray(registro.tratamento_ids) || registro.tratamento_ids.length === 0) {
        return [];
      }
      return db.tratamentos
        .where("id")
        .anyOf(registro.tratamento_ids)
        .toArray();
    },
    [registro?.tratamento_ids]
  );

  const cids = useLiveQuery<any[]>(
    async () => {
      if (!registro?.cid_ids || !Array.isArray(registro.cid_ids) || registro.cid_ids.length === 0) {
        return [];
      }
      return db.cids
        .where("id")
        .anyOf(registro.cid_ids)
        .toArray();
    },
    [registro?.cid_ids]
  );

  const historicoSimilar = useLiveQuery<any[]>(
    async () => {
      if (!registro?.nome || !registro?.id) return [];
      
      // BLINDAGEM 3: Filtragem em memória para evitar erro de parse no IndexedDB
      const todosSimilares = await db
        .table("registros_saude")
        .where("nome")
        .equals(registro.nome)
        .toArray();
        
      return todosSimilares
        .filter((r: any) => String(r.id) !== String(registro.id))
        .reverse()
        .slice(0, 3);
    },
    [registro?.nome, registro?.id]
  );

  /* ==========================================================
     ESTADOS DE CARREGAMENTO
     ========================================================== */

  // Aguarda carregar o banco e a URL (Impede flash branco ou erros)
  if (id === null || registro === undefined) {
    return <CardListSkeleton />;
  }

  if (registro === null) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-void p-5 text-center">
          <p className="mb-4 text-ink-muted">
            Registro não encontrado.
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-surface-border bg-surface-raised px-4 py-2 text-ink-primary"
          >
            Voltar
          </button>
        </main>
      </PageTransition>
    );
  }

  /* ==========================================================
     DADOS DERIVADOS
     ========================================================== */

  const theme = getRegistroTheme(registro.nome);
  const IconComp = theme.icon;

  const insight = analisarRegistroSaude(
    registro.nome,
    registro.valor_medicao,
    registro.intensidade,
    registro.observacoes
  );

  /* ==========================================================
     AÇÕES
     ========================================================== */

  const handleDelete = async () => {
    if (!id || isDeleting) return;

    trigger("vibrate");

    if (
      !confirm(
        "Tem certeza que deseja excluir este registro de saúde?"
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      await registrosSaudeRepository.delete(id);

      trigger("success");
      showToast("Registro excluído com sucesso", "success");

      router.replace("/saude/registros");
    } catch (error) {
      console.error(error);

      trigger("error");
      showToast("Erro ao excluir registro", "error");

      setIsDeleting(false);
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-32">
        {/* ======================================================
            HEADER
            ====================================================== */}

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
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-ice" />

                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                    Prontuário
                  </p>
                </div>

                <h1 className="mt-0.5 truncate font-display text-xl font-semibold text-ink-primary">
                  Detalhes do Registro
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.push(
                    `/saude/registros/editar?id=${id}`
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
                aria-label="Editar registro"
              >
                <Edit3 size={16} />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition-all active:scale-95 disabled:opacity-50"
                aria-label="Excluir registro"
              >
                {isDeleting ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ======================================================
            CONTEÚDO
            ====================================================== */}

        <section className="space-y-5 px-5 pt-6">
          {/* ====================================================
              CARD PRINCIPAL
              ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            style={{
              borderLeft: `6px solid ${theme.hex}`,
            }}
            className="rounded-[32px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            {/* Identificação */}

            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm"
                style={{
                  backgroundColor: `${theme.hex}15`,
                  borderColor: `${theme.hex}40`,
                  color: theme.hex,
                }}
              >
                <IconComp size={28} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {registro.categoria}
                </p>

                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {registro.nome}
                </h2>
              </div>
            </div>

            {/* Data e horário */}

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-border/40 pt-4">
              <DetailInfoRow
                icon={<Calendar size={16} />}
                iconClassName="bg-ice/10 text-ice"
                label="Data"
              >
                <p className="font-mono text-xs font-semibold text-ink-primary">
                  {formatDateToDisplay(registro.data)}
                </p>
              </DetailInfoRow>

              <DetailInfoRow
                icon={<Clock size={16} />}
                iconClassName="bg-ice/10 text-ice"
                label="Horário"
              >
                <p className="font-mono text-xs font-semibold text-ink-primary">
                  {registro.horario}
                </p>
              </DetailInfoRow>
            </div>

            {/* Intensidade */}

            {registro.intensidade !== undefined && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-muted">
                    Intensidade Relatada
                  </span>

                  <span className="font-mono font-bold text-ice">
                    {registro.intensidade} / 10
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full bg-ice"
                    style={{
                      width: `${(registro.intensidade / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Valor da medição */}

            {registro.valor_medicao && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
                <span className="text-xs font-medium text-ink-muted">
                  Valor da Medição
                </span>

                <span className="font-mono text-sm font-bold text-ice">
                  {registro.valor_medicao}
                </span>
              </div>
            )}
          </motion.div>

          {/* ====================================================
              INSIGHT
              ==================================================== */}

          {insight && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.02 }}
              className={`rounded-[24px] border p-4 shadow-sm ${
                insight.status === "critico"
                  ? "border-coral/30 bg-coral/10"
                  : insight.status === "alerta"
                  ? "border-amber-400/30 bg-amber-400/10"
                  : insight.status === "atencao"
                  ? "border-ice/30 bg-ice/10"
                  : "border-emerald-400/30 bg-emerald-400/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    insight.status === "critico"
                      ? "border-coral/40 bg-coral/20 text-coral"
                      : insight.status === "alerta"
                      ? "border-amber-400/40 bg-amber-400/20 text-amber-400"
                      : insight.status === "atencao"
                      ? "border-ice/40 bg-ice/20 text-ice"
                      : "border-emerald-400/40 bg-emerald-400/20 text-emerald-400"
                  }`}
                >
                  {insight.status === "critico" ||
                  insight.status === "alerta" ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider ${
                      insight.status === "critico"
                        ? "text-coral"
                        : insight.status === "alerta"
                        ? "text-amber-400"
                        : insight.status === "atencao"
                        ? "text-ice"
                        : "text-emerald-400"
                    }`}
                  >
                    {insight.titulo}
                  </h3>

                  <p className="mt-1 text-xs leading-snug text-ink-primary">
                    {insight.mensagem}
                  </p>

                  <p className="mt-1.5 text-[11px] italic text-ink-muted">
                    {insight.recomendacao}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====================================================
              CRUZAMENTO RELACIONAL
              ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.04 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Activity size={15} />}
              title="Cruzamento Relacional"
            />

            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {/* Medicamento */}

              {medicamento ? (
                <div
                  onClick={() => {
                    trigger("vibrate");
                    router.push(
                      `/saude/medicamentos/detalhes?id=${medicamento.id}`
                    );
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-surface-border/50 bg-surface-raised p-3 transition-all hover:border-surface-border active:scale-[0.98]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                      <Pill size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-primary">
                        Medicamento Relacionado
                      </p>

                      <p className="truncate text-[11px] text-ink-muted">
                        {medicamento.nome} ({medicamento.dosagem})
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="shrink-0 text-ink-muted"
                  />
                </div>
              ) : (
                <p className="text-xs italic text-ink-muted">
                  Nenhum medicamento vinculado a este registro.
                </p>
              )}

              {/* Tratamentos */}

              {tratamentos && tratamentos.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-surface-border/30 pt-4">
                  <p className="text-xs font-bold uppercase text-ink-muted">
                    Tratamentos Associados
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {tratamentos.map((t: any) => {
                      const Icon = getTratamentoIcon(t.nome);

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            trigger("vibrate");
                            router.push(
                              `/saude/tratamentos/detalhes?id=${t.id}`
                            );
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 transition-colors hover:bg-violet-400/20 active:scale-95"
                        >
                          <Icon
                            size={14}
                            className="text-violet-400"
                          />

                          <span className="text-xs font-medium text-violet-300">
                            {t.nome}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CIDs */}

              {cids && cids.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-surface-border/30 pt-4">
                  <p className="text-xs font-bold uppercase text-ink-muted">
                    CIDs Vinculados
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {cids.map((c: any) => {
                      const cTheme = getClinicalTheme(
                        c.descricao || c.codigo
                      );

                      const CIcon = cTheme.icon;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            trigger("vibrate");
                            router.push(
                              `/saude/cids/detalhes?id=${c.id}`
                            );
                          }}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors hover:opacity-80 active:scale-95 ${cTheme.tagClass}`}
                        >
                          <CIcon size={14} />

                          <span className="text-xs font-medium">
                            {c.codigo} - {c.descricao}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ====================================================
              ÚLTIMAS OCORRÊNCIAS
              ==================================================== */}

          {historicoSimilar && historicoSimilar.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.06 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<TrendingUp size={15} />}
                title="Últimas Ocorrências"
              />

              <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <div className="space-y-2">
                  {historicoSimilar.map((r: any) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          `/saude/registros/detalhes?id=${r.id}`
                        );
                      }}
                      className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-surface-border active:scale-[0.98]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 font-mono text-xs text-ink-muted">
                          {formatDateToDisplay(r.data)}
                        </span>

                        {r.intensidade !== undefined && (
                          <span className="font-mono text-xs text-ink-faint">
                            Nível {r.intensidade}/10
                          </span>
                        )}

                        {r.valor_medicao && (
                          <span className="truncate font-mono text-xs text-ice">
                            {r.valor_medicao}
                          </span>
                        )}
                      </div>

                      <ChevronRight
                        size={14}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ====================================================
              ANOTAÇÕES
              ==================================================== */}

          {registro.observacoes && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Activity size={15} />}
                title="Anotações"
              />

              <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-primary">
                  {registro.observacoes}
                </p>
              </div>
            </motion.div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
