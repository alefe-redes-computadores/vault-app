/**
 * M46 — interface mínima para o reconhecimento de fala oferecido pelo navegador.
 * O VAULT não envia áudio nem guarda transcrições; alguns navegadores, porém,
 * podem processar a fala em serviços remotos. Exigir consentimento em cada uso.
 */
export interface VaultSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
export type VaultSpeechConstructor = new () => VaultSpeechRecognition;
type SpeechEnvironment = {
  SpeechRecognition?: VaultSpeechConstructor;
  webkitSpeechRecognition?: VaultSpeechConstructor;
};

/** No SSR e em WebViews incompatíveis, permanece busca digitada. */
export function getVaultSpeechConstructor(environment?: SpeechEnvironment | null): VaultSpeechConstructor | null {
  if (!environment) return null;
  const candidate = environment.SpeechRecognition ?? environment.webkitSpeechRecognition;
  return typeof candidate === "function" ? candidate : null;
}

export function browserSupportsVaultSpeech(): boolean {
  if (typeof window === "undefined") return false;
  return !!getVaultSpeechConstructor(window as unknown as SpeechEnvironment);
}

export function createVaultSpeechRecognition(): VaultSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Constructor = getVaultSpeechConstructor(window as unknown as SpeechEnvironment);
  return Constructor ? new Constructor() : null;
}

/** Nenhuma transcrição vazia, gigante ou com caracteres de controle entra na busca. */
export function normalizeSpeechCommand(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160);
}
