"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, FileText, FlaskConical, FolderLock, Landmark, Pill, Stethoscope, Syringe } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import type { AlertaVisaoGeral } from "@/lib/health-insights";
import type { AlertLevel } from "@/lib/health-utils";

export type DashboardAlertKind =
  | AlertaVisaoGeral["tipo"]
  | "documento";

export type DashboardAlert = {
  id: string;

  title: string;

  subtitle: string;

  level: AlertLevel;

  kind: DashboardAlertKind;

  href: string;

  daysUntil:
    | number
    | null;

  icon:
    ReactNode;

  color: string;
};

export function getAlertIcon(
  kind: DashboardAlertKind
): ReactNode {
  switch (kind) {
    case "consulta":
      return (
        <Stethoscope size={17} />
      );

    case "exame":
      return (
        <FlaskConical size={17} />
      );

    case "cirurgia":
      return (
        <Syringe size={17} />
      );

    case "receita":
      return (
        <FileText size={17} />
      );

    case "estoque":
      return (
        <Pill size={17} />
      );

    case "sus":
      return (
        <Landmark size={17} />
      );

    case "documento":
      return (
        <FolderLock size={17} />
      );

    default:
      return (
        <AlertCircle size={17} />
      );
  }
}

function getAlertKindLabel(
  kind: DashboardAlertKind
): string {
  switch (kind) {
    case "consulta":
      return "Consulta";

    case "exame":
      return "Exame";

    case "cirurgia":
      return "Cirurgia";

    case "receita":
      return "Receita";

    case "estoque":
      return "Estoque";

    case "sus":
      return "SUS";

    case "documento":
      return "Documento";

    default:
      return "Saúde";
  }
}

function getAlertBadgeLabel(
  alert: DashboardAlert
): string {
  if (
    alert.kind === "estoque" &&
    alert.daysUntil !== null &&
    alert.daysUntil >= 0
  ) {
    if (
      alert.daysUntil === 0
    ) {
      return "Sem estoque";
    }

    return `~${alert.daysUntil} ${
      alert.daysUntil === 1
        ? "dia"
        : "dias"
    }`;
  }

  if (
    alert.daysUntil !== null
  ) {
    if (
      alert.daysUntil < 0
    ) {
      const overdue =
        Math.abs(
          alert.daysUntil
        );

      return `${overdue} ${
        overdue === 1
          ? "dia"
          : "dias"
      } atrás`;
    }

    if (
      alert.daysUntil === 0
    ) {
      return "Hoje";
    }

    return `${alert.daysUntil} ${
      alert.daysUntil === 1
        ? "dia"
        : "dias"
    }`;
  }

  switch (alert.level) {
    case "urgente":
      return "Urgente";

    case "atencao":
      return "Atenção";

    default:
      return "Informação";
  }
}

export function AlertRow({
  alert,
}: {
  alert: DashboardAlert;
}) {
  const router = useRouter();

  const {
    trigger,
  } = useHapticFeedback();

  return (
    <button
      onClick={() => {
        trigger("vibrate");

        router.push(
          alert.href
        );
      }}
      className="flex w-full min-w-0 items-center justify-between gap-3 rounded-[22px] border bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985]"
      style={{
        borderColor:
          `${alert.color}30`,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor:
              `${alert.color}18`,

            color:
              alert.color,
          }}
        >
          {alert.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-md border border-surface-border/40 bg-surface-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              {getAlertKindLabel(
                alert.kind
              )}
            </span>
          </div>

          <p className="line-clamp-1 text-xs font-bold leading-tight text-ink-primary">
            {alert.title}
          </p>

          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-ink-muted">
            {alert.subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{
            backgroundColor:
              `${alert.color}18`,

            color:
              alert.color,
          }}
        >
          {getAlertBadgeLabel(
            alert
          )}
        </span>

        <ChevronRight
          size={14}
          className="text-ink-faint"
        />
      </div>
    </button>
  );
}
