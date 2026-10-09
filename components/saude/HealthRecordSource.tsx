"use client";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { HealthDeviceIcon } from "./HealthDeviceIcon";
import type { RegistroSaude } from "@/lib/types";
export function HealthRecordSource({ record }: { record: RegistroSaude }) {
  const { devices } = useHealthProfile();
  const d = devices.find((d) => d.id === record.device_id);
  if (!record.source && !record.device_id && !record.inicio_em) return null;
  return (
    <section className="mb-4 rounded-2xl border border-surface-border bg-surface p-4">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
        Origem do registro
      </p>
      <p className="mt-2 text-xs text-ink-primary">
        {record.source === "samsung_manual"
          ? "Samsung Health · informado manualmente"
          : record.source === "health_connect"
          ? "Samsung Health · Health Connect"
          : "Registro manual"}
      </p>
      {d && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
          <HealthDeviceIcon kind={d.kind} color={d.color} size={16} />
          {d.name}
          {!d.active ? " · arquivado" : ""}
        </p>
      )}
      {record.inicio_em && record.fim_em && (
        <p className="mt-2 text-xs text-ink-muted">
          {new Date(record.inicio_em).toLocaleString("pt-BR")} →{" "}
          {new Date(record.fim_em).toLocaleString("pt-BR")}
        </p>
      )}
    </section>
  );
}
