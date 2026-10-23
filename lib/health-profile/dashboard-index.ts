import type { RegistroSaude } from "@/lib/types";
import type { HealthDevice, HealthMetric } from "./types";

const DASHBOARD_METRICS = new Set<HealthMetric>(["sono", "peso", "pressao_arterial", "frequencia_cardiaca", "oxigenacao", "caminhada"]);
function validDashboardDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split("-").map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}

export function buildHealthDashboardIndex(input: {
  records: RegistroSaude[];
  devices: HealthDevice[];
  personId: string;
  userId: string;
  today: string;
}) {
  const records: RegistroSaude[] = [];
  const latestByMetric = new Map<HealthMetric, RegistroSaude>();
  const seen = new Set<string>();
  if (!input.personId || !input.userId || !validDashboardDate(input.today)) {
    return {records,latestByMetric,deviceById:new Map<string,HealthDevice>(),activeDevices:[] as HealthDevice[],archivedDevices:[] as HealthDevice[]};
  }
  for (const record of input.records) {
    if (record.person_id !== input.personId || record.user_id !== input.userId || !validDashboardDate(record.data) || record.data > input.today || !DASHBOARD_METRICS.has(record.tipo as HealthMetric)) continue;
    const identity = record.source_record_id ? `source:${record.source || ""}:${record.device_id || ""}:${record.source_record_id}` : record.id ? `id:${record.id}` : `legacy:${record.tipo}:${record.data}:${record.horario}:${record.valor_numerico ?? ""}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    records.push(record);
  }
  records.sort((left, right) => `${right.data}T${right.horario || "00:00"}`.localeCompare(`${left.data}T${left.horario || "00:00"}`));
  for (const record of records) if (!latestByMetric.has(record.tipo as HealthMetric)) latestByMetric.set(record.tipo as HealthMetric, record);

  const deviceById = new Map<string, HealthDevice>();
  const activeDevices: HealthDevice[] = [];
  const archivedDevices: HealthDevice[] = [];
  for (const device of input.devices) {
    if (device.person_id !== input.personId || device.user_id !== input.userId) continue;
    deviceById.set(device.id, device);
    (device.active ? activeDevices : archivedDevices).push(device);
  }
  return { records, latestByMetric, deviceById, activeDevices, archivedDevices };
}
