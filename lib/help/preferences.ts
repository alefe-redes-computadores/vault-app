const VERSION = "v1";

export function helpPreferenceKey(userId: string, topicId: string): string {
  return `vault:help:${VERSION}:${encodeURIComponent(userId)}:${encodeURIComponent(topicId)}`;
}

export function hasSeenHelp(storage: Pick<Storage, "getItem">, userId: string, topicId: string): boolean {
  if (!userId) return true;
  try { return storage.getItem(helpPreferenceKey(userId, topicId)) === "seen"; }
  catch { return true; }
}

export function markHelpSeen(storage: Pick<Storage, "setItem">, userId: string, topicId: string): boolean {
  if (!userId) return false;
  try {
    storage.setItem(helpPreferenceKey(userId, topicId), "seen");
    return true;
  } catch { return false; }
}
