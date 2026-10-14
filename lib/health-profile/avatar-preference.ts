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

export function avatarRenderRatio(deviceRatio: number, dragging: boolean): number {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  return Math.min(ratio, dragging ? 1 : 1.5);
}

export function avatarZoom(value: number): number {
  return Number.isFinite(value) ? Math.max(80, Math.min(130, value)) : 100;
}
