"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Pill,
  FileWarning,
  CalendarClock,
  Stethoscope,
  Building2,
  ChevronRight,
  PackageX,
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  getMedicamentoAlerts,
  getDocumentAlerts,
  getUpcomingAppointments,
  getEstoqueAlerts,
  alertLevelColor,
  alertLevelLabel,
  estoqueLevelLabel,
  isControlada,
  TIPO_RECEITA_LABELS,
  type HealthAlert,
} from "@/lib/health-utils";

function AlertRow({ alert }: { alert: HealthAlert }) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const color = alertLevelColor(alert.level);
  const controlada = isControlada(alert.tipoReceita);

  return (
    <button
      onClick={() => {
        trigger("vibrate");
        router.push(alert.href);
      }}
      className="flex w-full items-center gap-3 rounded-[22px] border bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
      style={{ borderColor: `${color}30` }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}18` }}
      >
        {alert.kind === "medicamento" ? (
          <Pill size={18} style={{ color }} />
        ) : (
          <FileWarning size={18} style={{ color }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-ink-primary">
            {alert.title}
          </p>
          {controlada && alert.tipoReceita && (
            <span className="shrink-0 rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-300">
              {TIPO_RECEITA_LABELS[alert.tipoReceita]}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink-muted">{alert.subtitle}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {alertLevelLabel(alert.level, alert.daysUntil)}
      </span>
    </button>
  );
}

function EstoqueRow({ alert }: { alert: HealthAlert }) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const color = alertLevelColor(alert.level);

  return (
    <button
      onClick={() => {
        trigger("vibrate");
        router.push(alert.href);
      }}
      className="flex w-full items-center gap-3 rounded-[22px] border bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
      style={{ borderColor: `${color}30` }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}18` }}
      >
        <PackageX size={18} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-primary">
          {alert.title}
        </p>
        <p className="truncate text-xs text-ink-muted">{alert.subtitle}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {estoqueLevelLabel(alert.level, alert.daysUntil)}
      </span>
    </button>
  );
}

function AppointmentRow({ alert }: { alert: HealthAlert }) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  return (
    <button
      onClick={() => {
        trigger("vibrate");
        router.push(alert.href);
      }}
      className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/12">
        <CalendarClock size={18} className="text-ice" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-primary">
          {alert.title}
        </p>
        <p className="truncate text-xs text-ink-muted">{alert.subtitle}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-ink-muted">
        {alert.daysUntil === 0 ? "Hoje" : `Em ${alert.daysUntil}d`}
      </span>
    </button>
  );
}

export default function SaudePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const documents = useDocuments();
  const { medicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();

  const medAlerts = useMemo(
    () => getMedicamentoAlerts(medicamentos || []),
    [medicamentos]
  );
  const docAlerts = useMemo(
    () => getDocumentAlerts(documents || []),
    [documents]
  );
  const estoqueAlerts = useMemo(
    () => getEstoqueAlerts(medicamentos || []),
    [medicamentos]
  );
  const appointments = useMemo(
    () => getUpcomingAppointments(documents || []),
    [documents]
  );

  const allAlerts = useMemo(
    () => [...medAlerts, ...docAlerts].sort((a, b) => a.daysUntil - b.daysUntil),
    [medAlerts, docAlerts]
  );

  const isLoading = documents === undefined || medicamentos === undefined;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const totalAlertas = allAlerts.length + estoqueAlerts.length;

  const quickActions = [
    { id: "novo-medicamento", label: "Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
    { id: "nova-renovacao", label: "Renovação", icon: FileWarning, path: "/saude/renovacao/nova" },
    { id: "novo-medico", label: "Médico", icon: Stethoscope, path: "/saude/medicos/novo" },
    { id: "nova-farmacia", label: "Farmácia/Hospital", icon: Building2, path: "/saude/locais/novo" },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
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

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Heart size={18} className="text-coral" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Saúde
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {totalAlertas > 0
                  ? `${totalAlertas} alerta${totalAlertas !== 1 ? "s" : ""} para revisar`
                  : "Tudo em dia por aqui"}
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-5">
          {/* Ações rápidas */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="grid grid-cols-4 gap-2"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(action.path);
                  }}
                  className="flex flex-col items-center gap-2 rounded-[20px] border border-surface-border/50 bg-surface p-3 text-center transition-all active:scale-[0.95] hover:bg-surface-raised/80"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice">
                    <Icon size={17} />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-ink-muted">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Estoque acabando */}
          {estoqueAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.02 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <PackageX size={15} className="text-coral" />
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Estoque acabando
                </h2>
              </div>
              <div className="space-y-2.5">
                {estoqueAlerts.map((alert) => (
                  <EstoqueRow key={`estoque-${alert.id}`} alert={alert} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Alertas de renovação */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.04 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <FileWarning size={15} className="text-coral" />
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Precisa de atenção
              </h2>
            </div>

            {allAlerts.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface px-4 py-6 text-center">
                <p className="text-sm text-ink-muted">
                  Nenhum medicamento ou receita vencendo nos próximos dias.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {allAlerts.map((alert) => (
                  <AlertRow key={`${alert.kind}-${alert.id}`} alert={alert} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Próximas consultas */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.08 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock size={15} className="text-ice" />
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Próximas consultas e exames
              </h2>
            </div>

            {appointments.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface px-4 py-6 text-center">
                <p className="text-sm text-ink-muted">
                  Nada agendado nos próximos 30 dias.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {appointments.map((appt) => (
                  <AppointmentRow key={appt.id} alert={appt} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Rede de saúde cadastrada */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="rounded-[24px] border border-surface-border/50 bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Sua rede
              </h2>
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/rede");
                }}
                className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-primary"
              >
                Ver tudo
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-surface-raised/60 py-3">
                <p className="font-display text-lg font-semibold text-ink-primary">
                  {(medicos || []).length}
                </p>
                <p className="text-[10px] text-ink-muted">Médicos</p>
              </div>
              <div className="rounded-2xl bg-surface-raised/60 py-3">
                <p className="font-display text-lg font-semibold text-ink-primary">
                  {(farmacias || []).length}
                </p>
                <p className="text-[10px] text-ink-muted">Farmácias</p>
              </div>
              <div className="rounded-2xl bg-surface-raised/60 py-3">
                <p className="font-display text-lg font-semibold text-ink-primary">
                  {(hospitais || []).length}
                </p>
                <p className="text-[10px] text-ink-muted">Hospitais</p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}
