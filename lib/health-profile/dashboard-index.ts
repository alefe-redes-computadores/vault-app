import type { RegistroSaude } from "@/lib/types";
import type { HealthDevice, HealthMetric } from "./types";

const DASHBOARD_METRICS = new Set<HealthMetric>(["sono", "peso", "pressao_arterial", "frequencia_cardiaca", "oxigenacao", "caminhada"]);

export function buildHealthDashboardIndex(input: {
  records: RegistroSaude[];
  devices: HealthDevice[];
  personId: string;
  userId: string;
  today: string;
}) {
  const records: RegistroSaude[] = [];
  const latestByMetric = new Map<HealthMetric, RegistroSaude>();
  for (const record of input.records) {
    if (record.person_id !== input.personId || record.user_id !== input.userId || record.data > input.today || !DASHBOARD_METRICS.has(record.tipo as HealthMetric)) continue;
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
