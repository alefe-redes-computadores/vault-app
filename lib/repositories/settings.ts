// lib/repositories/settings.ts

import { db, safeAddSettings, safeUpdateSettings } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { AppSettings } from "@/lib/types";

export const settingsRepository = {
  async getByUserId(userId: string): Promise<AppSettings | null> {
  if (!userId) return null;
  return (await db.settings.where("user_id").equals(userId).first()) ?? null;
},

  async getDefaultPersonId(userId: string): Promise<string | null> {
    const settings = await this.getByUserId(userId);
    return settings?.default_person_id || null;
  },

  async setDefaultPersonId(userId: string, personId: string): Promise<void> {
    if (!userId) throw new Error("User ID é obrigatório");

    const existing = await this.getByUserId(userId);

    if (!existing) {
      const id = await safeAddSettings({
        user_id: userId,
        default_person_id: personId,
      });

      await enfileirarOperacao("settings", "add", {
        id,
        user_id: userId,
        default_person_id: personId,
      });
    } else {
      await safeUpdateSettings(existing.id!, {
        default_person_id: personId,
      });

      await enfileirarOperacao("settings", "update", {
        id: existing.id,
        user_id: userId,
        default_person_id: personId,
      });
    }
  },
};