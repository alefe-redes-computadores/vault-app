import type { HealthMetric } from "@/lib/health-profile/types";
export const SAMSUNG_ORIGIN = "com.sec.android.app.shealth";
export const CONNECT_METRICS: HealthMetric[] = ["sono", "peso", "pressao_arterial", "frequencia_cardiaca", "oxigenacao", "caminhada"];
export interface ConnectRecord {
  id: string;
  origin: string;
  type: HealthMetric;
  time: string;
  value: number;
  second?: number;
  start?: string;
  end?: string;
  dailyAverage?: boolean;
}
/** Configuration belongs to this phone and account, never to the active-person default. */
export interface ConnectConnection {
  id: string;
  user_id: string;
  person_id: string;
  revision: string;
  types: HealthMetric[];
  device_ids: Partial<Record<HealthMetric, string>>;
  auto_sync: boolean;
  last_synced: string | null;
  last_error: string | null;
}
export interface ConnectImport {
  id: string;
  user_id: string;
  person_id: string;
  record_id: string;
}
export interface ConnectStatus {
  availability: "available" | "update_required" | "unavailable" | "web" | "apk_update";
  granted: HealthMetric[];
}
