import { normalizeAvatarStyle, type AvatarStyle } from "./avatar-style";
export type AvatarMode = 'illustration' | '3d';

/** Visual-only, scoped to the account and active person; never synced as health data. */
export function avatarPreferenceKey(userId: string, personId: string): string | undefined {
  return userId && personId ? `vault:avatar:v1:${encodeURIComponent(userId)}:${encodeURIComponent(personId)}` : undefined;
}

export function parseAvatarMode(value: string | null): AvatarMode {
  try {
    const saved = JSON.parse(value || 'null');
    if (saved?.version === 1 && (saved.mode === 'illustration' || saved.mode === '3d')) return saved.mode;
  } catch { /* Corrupt or unavailable local preferences keep the default. */ }
  return '3d';
}

export function avatarRenderRatio(
  deviceRatio: number,
  dragging: boolean,
  compact = false,
  constrainedDevice = false
): number {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const ceiling = dragging ? 1 : constrainedDevice ? 1.15 : compact ? 1.3 : 1.5;
  return Math.min(ratio, ceiling);
}

export function avatarConstrainedDevice(capabilities: {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  reducedMotion?: boolean;
}): boolean {
  if (capabilities.reducedMotion) return true;
  if (typeof capabilities.hardwareConcurrency === "number" && capabilities.hardwareConcurrency <= 4) return true;
  if (typeof capabilities.deviceMemory === "number" && capabilities.deviceMemory <= 4) return true;
  return false;
}

export function avatarZoom(value: number): number {
  return Number.isFinite(value) ? Math.max(80, Math.min(130, value)) : 100;
}

export type AvatarSize='compact'|'expanded'|'hidden';
export function parseAvatarSize(value:string|null):AvatarSize {
 try{const saved=JSON.parse(value||'null');if(saved?.version===1&&['compact','expanded','hidden'].includes(saved.size))return saved.size;}catch{}
 return 'compact';
}

/** V155: appearance is saved in the same account/person-scoped local preference. */
export function parseAvatarStyle(value: string | null): AvatarStyle {
  try {
    const saved = JSON.parse(value || 'null');
    if (saved?.version === 1) return normalizeAvatarStyle(saved.appearance);
  } catch { /* Existing/corrupt preferences fall back safely. */ }
  return normalizeAvatarStyle(null);
}
export function avatarDisplayName(value: unknown, personName = ""): string {
  const preferred = typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 32)
    : "";
  if (preferred) return preferred;
  const firstName = personName.trim().split(/\s+/)[0]?.slice(0, 32);
  return firstName || "Meu Avatar";
}
export function parseAvatarName(value: string | null, personName = ""): string {
  try {
    const saved = JSON.parse(value || "null");
    if (saved?.version === 1) return avatarDisplayName(saved.name, personName);
  } catch { /* Corrupt local preferences use the active person's identity. */ }
  return avatarDisplayName(null, personName);
}
export function avatarPreferencePayload(mode: AvatarMode, size: AvatarSize, appearance: AvatarStyle, name?: string) {
  return JSON.stringify({ version: 1, mode, size, appearance: normalizeAvatarStyle(appearance), ...(name ? { name: avatarDisplayName(name) } : {}) });
}
