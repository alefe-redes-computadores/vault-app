// lib/repositories/settings.ts
import { db } from "@/lib/db";
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
    const now = new Date().toISOString();

    if (!existing) {
      const id = crypto.randomUUID();
      const newSettings: AppSettings = {
        id,
        user_id: userId,
        default_person_id: personId,
        created_at: now,
        updated_at: now,
        synced: false,
      };

      await db.transaction("rw", [db.settings, db.syncQueue], async () => {
        await db.settings.add(newSettings);
        await enfileirarOperacao("settings", "add", newSettings);
      });
    } else {
      const payload = {
        default_person_id: personId,
        updated_at: now,
        synced: false,
      };

      await db.transaction("rw", [db.settings, db.syncQueue], async () => {
        await db.settings.update(existing.id!, payload);
        await enfileirarOperacao("settings", "update", {
          id: existing.id,
          user_id: userId,
          default_person_id: personId,
        });
      });
    }
  },
};
