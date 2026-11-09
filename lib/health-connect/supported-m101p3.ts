import type { HealthMetric } from "@/lib/health-profile/types";

/**
 * M101 P3: PWA/JS pode estar em uma versão posterior ao APK instalado.
 * O plugin Android anterior à P3 não retorna `supported`, portanto a HRV
 * deve ficar desabilitada sem impedir a sincronização dos sete tipos antigos.
 *
 * O resultado é uma seleção para leitura, nunca uma concessão de permissões.
 * `granted` é verificado separadamente pelo Health Connect nativo.
 */
export function filterReadableConnectTypesM101P3(
  selected: readonly HealthMetric[],
  supported: readonly HealthMetric[] | null | undefined
): HealthMetric[] {
  const hrvSupported = Array.isArray(supported) && supported.includes("hrv_rmssd");
  return [...new Set(selected)].filter(type => type !== "hrv_rmssd" || hrvSupported);
}
