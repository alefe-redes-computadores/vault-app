import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";
import { normalizeRegistroSaudeFields } from "@/lib/health-records";
import {
  validDate,
  validateMetric,
  sleepDuration,
} from "@/lib/health-profile/metrics";
import { METRICS, type HealthMetric } from "@/lib/health-profile/types";
import { getLocalTodayISO } from "@/lib/health-utils";
import type { RegistroSaude } from "@/lib/types";
export interface MeasurementInput {
  id: string;
  type: HealthMetric;
  value: number;
  second?: number;
  date: string;
  time: string;
  deviceId: string | null;
  source: "manual" | "samsung_manual";
  start?: string;
  end?: string;
  notes: string;
}
export async function saveHealthMeasurement(
  pid: string,
  input: MeasurementInput
) {
  const { data, error } = await getLocalFirstAuthUser();
  if (error || !data.user || !pid)
    throw new Error("Pessoa ativa não identificada.");
  const uid = data.user.id,
    person = await db.persons.get(pid);
  if (!person || person.user_id !== uid)
    throw new Error("Pessoa não pertence à conta atual.");
  if (
    !METRICS[input.type] ||
    !validDate(input.date) ||
    input.date > getLocalTodayISO() ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
    new Date(`${input.date}T${input.time}`).getTime() > Date.now()
  )
    throw new Error("Confira data e horário do registro.");
  if (!["manual", "samsung_manual"].includes(input.source))
    throw new Error("Fonte inválida.");
  validateMetric(input.type, input.value, input.second);
  if (
    input.type === "sono" &&
    sleepDuration(input.start || "", input.end || "") !== input.value
  )
    throw new Error("A duração deve corresponder ao período do sono.");
  const def = METRICS[input.type],
    stamp = new Date().toISOString();
  const raw: RegistroSaude = {
    id: input.id,
    user_id: uid,
    person_id: pid,
    categoria: def.category,
    tipo: input.type,
    nome: def.label,
    data: input.date,
    horario: input.time,
    device_id: input.deviceId,
    source: input.source,
    source_record_id: null,
    inicio_em: input.type === "sono" ? input.start : null,
    fim_em: input.type === "sono" ? input.end : null,
    valor_numerico: input.type === "pressao_arterial" ? undefined : input.value,
    valor_medicao:
      input.type === "pressao_arterial"
        ? `${input.value}/${input.second}`
        : `${input.value} ${def.unit}`,
    unidade_medida: def.unit,
    duracao_minutos: ["sono", "caminhada"].includes(input.type)
      ? input.value
      : undefined,
    observacoes: input.notes.trim(),
    created_at: stamp,
    updated_at: stamp,
    synced: false,
  };
  const row = { ...raw, ...normalizeRegistroSaudeFields(raw) };
  await db.transaction(
    "rw",
    [db.persons, db.health_devices, db.registros_saude, db.syncQueue],
    async () => {
      const fresh = await db.persons.get(pid);
      if (!fresh || fresh.user_id !== uid)
        throw new Error("Pessoa não pertence à conta atual.");
      if (input.deviceId) {
        const dev = await db.health_devices.get(input.deviceId);
        if (
          !dev ||
          dev.user_id !== uid ||
          dev.person_id !== pid ||
          !dev.active ||
          !dev.capabilities.includes(input.type)
        )
          throw new Error("Aparelho não disponível para esta medida.");
      }
      const existing = await db.registros_saude.get(input.id);
      if (existing) {
        if (
          existing.person_id !== pid ||
          existing.user_id !== uid ||
          existing.tipo !== row.tipo ||
          existing.valor_medicao !== row.valor_medicao ||
          existing.data !== row.data ||
          existing.horario !== row.horario ||
          existing.device_id !== row.device_id ||
          existing.inicio_em !== row.inicio_em ||
          existing.fim_em !== row.fim_em
        )
          throw new Error("Registro já existe com outros dados.");
        return;
      }
      if (input.type === "sono") {
        const records = await db.registros_saude
          .where("person_id")
          .equals(pid)
          .toArray();
        if (
          records.some(
            (r) =>
              r.user_id === uid &&
              r.tipo === "sono" &&
              r.inicio_em === input.start &&
              r.fim_em === input.end
          )
        )
          throw new Error(
            "Esse período de sono já foi registrado. Confira a Linha de cuidado."
          );
      }
      await db.registros_saude.add(row);
      await enfileirarOperacao("registros_saude", "add", row, {
        dispatchSync: false,
      });
    }
  );
  solicitarProcessamentoSync();
  return input.id;
}
