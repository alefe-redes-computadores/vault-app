const ERUDA_SCRIPT_ID = "vault-eruda-script";
const ERUDA_STORAGE_KEY = "@vault:diagnostics:eruda-enabled";
const ERUDA_SOURCE =
  "https://cdnjs.cloudflare.com/ajax/libs/eruda/3.0.1/eruda.min.js";

type ErudaApi = {
  init: () => void;
  destroy: () => void;
};

type ErudaWindow = Window & {
  eruda?: ErudaApi;
  __vaultErudaInitialized?: boolean;
};

function browserWindow(): ErudaWindow | null {
  return typeof window === "undefined" ? null : (window as ErudaWindow);
}

export function isErudaPreferenceEnabled(): boolean {
  const target = browserWindow();
  return target?.localStorage.getItem(ERUDA_STORAGE_KEY) === "true";
}

export async function enableEruda(): Promise<void> {
  const target = browserWindow();
  if (!target) throw new Error("Console indisponível fora do navegador.");

  if (target.eruda) {
    if (!target.__vaultErudaInitialized) {
      target.eruda.init();
      target.__vaultErudaInitialized = true;
    }
    target.localStorage.setItem(ERUDA_STORAGE_KEY, "true");
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(ERUDA_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing || document.createElement("script");

    const finish = () => {
      if (!target.eruda) {
        reject(new Error("O console foi baixado, mas não ficou disponível."));
        return;
      }

      if (!target.__vaultErudaInitialized) {
        target.eruda.init();
        target.__vaultErudaInitialized = true;
      }

      resolve();
    };

    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Falha ao baixar o console avançado.")),
      { once: true }
    );

    if (!existing) {
      script.id = ERUDA_SCRIPT_ID;
      script.src = ERUDA_SOURCE;
      script.async = true;
      document.body.appendChild(script);
    } else if (target.eruda) {
      finish();
    }
  });

  target.localStorage.setItem(ERUDA_STORAGE_KEY, "true");
}

export function disableEruda(): void {
  const target = browserWindow();
  if (!target) return;

  if (target.__vaultErudaInitialized) {
    target.eruda?.destroy();
  }

  target.__vaultErudaInitialized = false;
  target.localStorage.removeItem(ERUDA_STORAGE_KEY);
}
