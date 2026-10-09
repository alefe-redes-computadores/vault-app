import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import {
  enfileirarOperacao,
  solicitarProcessamentoSync,
} from "@/lib/sync/enfileirarOperacao";
import type { HealthProfile, HealthDevice } from "@/lib/health-profile/types";
import {
  DEVICE_KINDS,
  METRICS,
  SKIN_TONES,
} from "@/lib/health-profile/types";
import { validDate } from "@/lib/health-profile/metrics";
import { getLocalTodayISO } from "@/lib/health-utils";
async function owner(pid: string) {
  const { data, error } = await getLocalFirstAuthUser();
  if (error || !data.user || !pid)
    throw new Error("Pessoa ativa não identificada.");
  const p = await db.persons.get(pid);
  if (!p || p.user_id !== data.user.id)
    throw new Error("Pessoa não pertence à conta atual.");
  return data.user.id;
}
export const healthProfileRepository = {
  async overview(pid: string) {
    const uid = await owner(pid);
    const [person, profile, devices] = await Promise.all([
      db.persons.get(pid),
      db.health_profiles.get(pid),
      db.health_devices.where("person_id").equals(pid).toArray(),
    ]);
    return {
      person,
      profile: profile?.user_id === uid ? profile : undefined,
      devices: devices.filter((d) => d.user_id === uid),
    };
  },
  async saveProfile(
    pid: string,
    input: Pick<HealthProfile, "birth_date" | "height_cm" | "skin_tone">
  ) {
    const uid = await owner(pid);
    if (
      input.birth_date &&
      (!validDate(input.birth_date) ||
        input.birth_date > getLocalTodayISO() ||
        input.birth_date < "1900-01-01")
    )
      throw new Error("Confira a data de nascimento.");
    if (
      input.height_cm !== null &&
      (!Number.isFinite(input.height_cm) ||
        input.height_cm < 30 ||
        input.height_cm > 250)
    )
      throw new Error("Altura deve ser informada em centímetros.");
    if (!SKIN_TONES.includes(input.skin_tone))
      throw new Error("Escolha uma cor de perfil.");
    await db.transaction("rw", [db.health_profiles, db.syncQueue], async () => {
      const old = await db.health_profiles.get(pid);
      if (old && old.user_id !== uid)
        throw new Error("Perfil pertence a outra conta.");
      const now = new Date().toISOString(),
        row: HealthProfile = {
          ...input,
          id: pid,
          user_id: uid,
          person_id: pid,
          created_at: old?.created_at || now,
          updated_at: now,
          synced: false,
        };
      await db.health_profiles.put(row);
      await enfileirarOperacao("health_profiles", old ? "update" : "add", row, {
        dispatchSync: false,
      });
    });
    solicitarProcessamentoSync();
  },
  async saveDevice(
    pid: string,
    input: Pick<
      HealthDevice,
      "kind" | "name" | "color" | "side" | "capabilities"
    >,
    deviceId?: string
  ) {
    const uid = await owner(pid);
    if (
      !DEVICE_KINDS[input.kind] ||
      !input.name.trim() ||
      input.name.trim().length > 100 ||
      !/^#[0-9a-f]{6}$/i.test(input.color) ||
      !["left", "right", "none"].includes(input.side) ||
      input.capabilities.some((k) => !METRICS[k])
    )
      throw new Error("Confira os dados do aparelho.");
    const id = deviceId || crypto.randomUUID();
    await db.transaction("rw", [db.health_devices, db.syncQueue], async () => {
      const old = await db.health_devices.get(id);
      if (deviceId && (!old || old.user_id !== uid || old.person_id !== pid))
        throw new Error("Aparelho não pertence à pessoa ativa.");
      const now = new Date().toISOString(),
        row: HealthDevice = {
          ...input,
          color: input.color.toLowerCase(),
          name: input.name.trim(),
          capabilities: [...new Set(input.capabilities)],
          id,
          user_id: uid,
          person_id: pid,
          active: old?.active ?? true,
          created_at: old?.created_at || now,
          updated_at: now,
          synced: false,
        };
      await db.health_devices.put(row);
      await enfileirarOperacao("health_devices", old ? "update" : "add", row, {
        dispatchSync: false,
      });
    });
    solicitarProcessamentoSync();
    return id;
  },
  async setDeviceActive(pid: string, id: string, active: boolean) {
    const uid = await owner(pid);
    await db.transaction("rw", [db.health_devices, db.syncQueue], async () => {
      const old = await db.health_devices.get(id);
      if (!old || old.user_id !== uid || old.person_id !== pid)
        throw new Error("Aparelho não pertence à pessoa ativa.");
      const row = {
        ...old,
        active,
        updated_at: new Date().toISOString(),
        synced: false,
      };
      await db.health_devices.put(row);
      await enfileirarOperacao("health_devices", "update", row, {
        dispatchSync: false,
      });
    });
    solicitarProcessamentoSync();
  },
};
