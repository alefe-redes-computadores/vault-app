export type HealthReminderFrequency = "daily" | "weekly" | "custom";
export type HealthReminderStatus = "active" | "paused";

export interface HealthReminderRule {
  id: string;
  user_id: string;
  person_id: string;
  title: string;
  body?: string;
  target_type: string;
  target_route: string;
  time: string;
  frequency: HealthReminderFrequency;
  weekdays: number[];
  status: HealthReminderStatus;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export type CreateHealthReminderInput = Omit<HealthReminderRule, "id" | "user_id" | "created_at" | "updated_at" | "synced">;
export type UpdateHealthReminderInput = Partial<Omit<CreateHealthReminderInput, "person_id">>;
