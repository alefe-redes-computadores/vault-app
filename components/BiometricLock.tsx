"use client";

import { useState, useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { isVaultNative } from "@/lib/native-runtime";
import { motion } from "framer-motion";
import { Fingerprint, ShieldAlert } from "lucide-react";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useBiometric } from "@/hooks/useBiometric";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

interface BiometricLockProps {
  children: React.ReactNode;
}

export function BiometricLock({ children }: BiometricLockProps) {
  const { isEnabled } = useBiometricPreference();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(!isEnabled);
  const [authError, setAuthError] = useState<string | null>(null);
  const hasAutoPrompted = useRef(false);

  // VAULT_BIOMETRIC_LIFECYCLE_V32
  // A preferência é carregada depois do primeiro render. Quando ela chega
  // habilitada, o Vault precisa efetivamente entrar em estado bloqueado.
  useEffect(() => {
    if (!isEnabled) {
      setIsAuthenticated(true);
      hasAutoPrompted.current = false;
      return;
    }

    setIsAuthenticated(false);
    hasAutoPrompted.current = false;
  }, [isEnabled]);

  // VAULT_BIOMETRIC_LIFECYCLE_V41
  //
  // Android também sinaliza inactive ao abrir UI nativa transitória
  // (biometria, seletor de arquivos, câmera etc.). Não bloqueamos nesse
  // instante: medimos a ausência e decidimos somente quando o app volta.
  // O overlay de lock também deixa os children montados, preservando
  // formulários, wizard, File/Blob e demais estados locais.
  const backgroundedAtRef = useRef<number | null>(null);
  const filePickerArmedAtRef = useRef<number | null>(null);
  const biometricArmedAtRef = useRef<number | null>(null);
  const nativeUiTransitionRef = useRef<"file" | "biometric" | null>(null);
  // VAULT_BIOMETRIC_POLICY_V53
  // Biometria V2: uma troca rápida de aplicativo não deve transformar o Vault
  // em um segundo despertador. O lock volta somente após uma ausência real
  // prolongada. UI nativa (arquivo/câmera/biometria) continua tendo precedência
  // e é consumida como transição única pelas proteções V42.1/V50.2.
  const REAL_BACKGROUND_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos
  const FILE_PICKER_ARM_WINDOW_MS = 2500;
  const BIOMETRIC_ARM_WINDOW_MS = 5000;

  // VAULT_BIOMETRIC_TRANSITION_V50_2
  // "biometric" só vira transição nativa quando o Android realmente
  // emitir inactive logo após iniciarmos a autenticação. Isso evita:
  // 1) limpar a exceção cedo demais no finally (race com appState active);
  // 2) deixar uma exceção biométrica solta que poderia engolir uma saída real.

  // VAULT_NATIVE_UI_TRANSITION_V42_1
  // O clique apenas arma o picker por uma janela curta. A exceção só nasce
  // se o Android realmente emitir inactive logo depois. No retorno consumimos
  // exatamente uma transição nativa, sem uma janela cega de vários minutos.
  useEffect(() => {
    if (!isEnabled || !isVaultNative()) return;

    const armFilePicker = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "file") return;
      filePickerArmedAtRef.current = Date.now();
    };

    document.addEventListener("click", armFilePicker, true);
    return () => document.removeEventListener("click", armFilePicker, true);
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !isVaultNative()) return;

    let removeListener: (() => void) | undefined;

    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        const now = Date.now();
        const fileArmedAt = filePickerArmedAtRef.current;
        const biometricArmedAt = biometricArmedAtRef.current;
        filePickerArmedAtRef.current = null;
        biometricArmedAtRef.current = null;

        if (
          nativeUiTransitionRef.current === null &&
          fileArmedAt !== null &&
          now - fileArmedAt <= FILE_PICKER_ARM_WINDOW_MS
        ) {
          nativeUiTransitionRef.current = "file";
        } else if (
          nativeUiTransitionRef.current === null &&
          biometricArmedAt !== null &&
          now - biometricArmedAt <= BIOMETRIC_ARM_WINDOW_MS
        ) {
          nativeUiTransitionRef.current = "biometric";
        }

        backgroundedAtRef.current = now;
        return;
      }

      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      filePickerArmedAtRef.current = null;
      biometricArmedAtRef.current = null;

      if (backgroundedAt === null) return;

      if (nativeUiTransitionRef.current !== null) {
        nativeUiTransitionRef.current = null;
        return;
      }

      const awayForMs = Date.now() - backgroundedAt;

      // Troca rápida de app / multitarefa: mantém a sessão desbloqueada.
      // Ausência prolongada: exige biometria novamente. Não persistimos essa
      // janela em storage; se o WebView/processo reiniciar, o estado inicial
      // continua bloqueado e a biometria é exigida normalmente.
      if (awayForMs < REAL_BACKGROUND_THRESHOLD_MS) return;

      setIsAuthenticated(false);
      setAuthError(null);
      hasAutoPrompted.current = false;
    }).then((handle) => {
      removeListener = () => void handle.remove();
    });

    return () => removeListener?.();
  }, [isEnabled]);

  const { isAvailable, isLoading, authenticate } = useBiometric({
    title: "Desbloquear Vault",
    subtitle: "Use sua impressão digital ou Face ID para acessar",
    description: "Mantenha seus documentos seguros",
    fallbackTitle: "Usar senha",
    onSuccess: () => {
      setAuthError(null);
      setIsAuthenticated(true);
      trigger("success");
      showToast("Autenticado com sucesso!", "success");
    },
    onError: (error) => {
      trigger("error");
      setAuthError(
        error?.message?.includes("cancel")
          ? "Autenticação cancelada"
          : "Não foi possível reconhecer sua biometria. Tente novamente."
      );
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.remove("biometric-locked");
    } else {
      document.body.classList.add("biometric-locked");
    }
    window.dispatchEvent(new Event("biometric:lockchange"));
  }, [isAuthenticated]);

  const runBiometricAuthentication = () => {
    const armedAt = Date.now();
    biometricArmedAtRef.current = armedAt;

    void authenticate().finally(() => {
      // O Promise pode resolver antes do appState active no Android.
      // Mantemos apenas a armação temporária; sem inactive correspondente
      // ela expira e nunca vira exceção de lifecycle.
      window.setTimeout(() => {
        if (biometricArmedAtRef.current === armedAt) {
          biometricArmedAtRef.current = null;
        }
      }, BIOMETRIC_ARM_WINDOW_MS);
    });
  };

  // Dispara a biometria automaticamente assim que a tela de bloqueio aparece
  // (só uma vez, evita loop se o usuário cancelar)
  useEffect(() => {
    if (!isEnabled || isAuthenticated || isLoading) return;
    if (hasAutoPrompted.current) return;
    if (!isAvailable) return; // ainda checando disponibilidade

    hasAutoPrompted.current = true;
    runBiometricAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isAuthenticated, isAvailable, isLoading]);

  const handleAuthenticate = () => {
    trigger("vibrate");
    setAuthError(null);
    runBiometricAuthentication();
  };

  const handleContinueWithoutBiometric = () => {
    trigger("vibrate");
    setIsAuthenticated(true);
  };

  if (!isEnabled) return <>{children}</>;

  return (
    <>
      <div
        aria-hidden={!isAuthenticated}
        className={isAuthenticated ? "" : "pointer-events-none select-none"}
      >
        {children}
      </div>

      {!isAuthenticated && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-void px-6">
          <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-sm rounded-[32px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-vault"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-ice/15 bg-surface-raised">
          <motion.div
            animate={isLoading ? { scale: [1, 1.06, 1] } : {}}
            transition={{
              duration: 1.1,
              repeat: isLoading ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <Fingerprint size={38} className="text-ice" strokeWidth={1.7} />
          </motion.div>
        </div>

        <h1 className="mt-6 font-display text-xl font-semibold text-ink-primary">
          Desbloquear Vault
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          {isLoading
            ? "Verificando sua biometria..."
            : authError
            ? authError
            : isAvailable === false
            ? "Biometria não configurada neste aparelho"
            : "Use a biometria para continuar com segurança"}
        </p>

        {isLoading && (
          <div className="mt-7 flex items-center justify-center gap-2.5">
            {[0, 0.18, 0.36].map((delay) => (
              <motion.div
                key={delay}
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.25, 1, 0.25],
                }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }}
                className="h-2.5 w-2.5 rounded-full bg-ice/45"
              />
            ))}
          </div>
        )}

        {authError && !isLoading && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-coral">
            <ShieldAlert size={13} />
            <span>{authError}</span>
          </div>
        )}

        {!isLoading && isAvailable !== false && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            onClick={handleAuthenticate}
            className="mt-7 rounded-full bg-ice/10 px-4 py-2 text-sm font-medium text-ice transition-colors active:scale-95 hover:bg-ice/15"
          >
            {authError ? "Tentar novamente" : "Desbloquear"}
          </motion.button>
        )}

        {!isLoading && isAvailable === false && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            onClick={handleContinueWithoutBiometric}
            className="mt-7 rounded-full bg-ice/10 px-4 py-2 text-sm font-medium text-ice transition-colors active:scale-95 hover:bg-ice/15"
          >
            Continuar mesmo assim
          </motion.button>
        )}
          </motion.div>
        </div>
      )}
    </>
  );
}
