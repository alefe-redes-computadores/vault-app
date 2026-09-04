// components/SplashScreen.tsx
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  ShieldCheck,
} from "lucide-react";

interface SplashScreenProps {
  children: React.ReactNode;
  minDisplayTime?: number;
}

const SPLASH_SESSION_KEY =
  "@vault:splash-shown";

export function SplashScreen({
  children,
  minDisplayTime = 650,
}: SplashScreenProps) {
  const reduceMotion =
    useReducedMotion();

  const [
    isVisible,
    setIsVisible,
  ] = useState(true);

  useEffect(() => {
    let alreadyShown =
      false;

    try {
      alreadyShown =
        sessionStorage.getItem(
          SPLASH_SESSION_KEY
        ) === "true";
    } catch {
      /*
       * Algumas WebViews podem bloquear
       * o armazenamento de sessão.
       */
    }

    if (alreadyShown) {
      setIsVisible(false);
      return;
    }

    try {
      sessionStorage.setItem(
        SPLASH_SESSION_KEY,
        "true"
      );
    } catch {
      /*
       * O splash continua funcional
       * mesmo sem persistência.
       */
    }

    const duration =
      reduceMotion
        ? 120
        : Math.max(
            350,
            minDisplayTime
          );

    const timer =
      window.setTimeout(
        () => {
          setIsVisible(false);
        },
        duration
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    minDisplayTime,
    reduceMotion,
  ]);

  return (
    <>
      {children}

      <AnimatePresence
        initial={false}
      >
        {isVisible && (
          <motion.div
            key="vault-splash"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-void px-6"
            initial={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
              scale:
                reduceMotion
                  ? 1
                  : 1.015,
            }}
            transition={{
              duration:
                reduceMotion
                  ? 0.08
                  : 0.2,

              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }}
            role="status"
            aria-label="Abrindo o Vault"
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-ice/10 blur-3xl" />

              <motion.div
                initial={
                  reduceMotion
                    ? false
                    : {
                        opacity: 0,
                        scale: 0.9,
                        y: 6,
                      }
                }
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.28,

                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }}
                className="ring-gradient glow-ice flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
              >
                <ShieldCheck
                  size={34}
                  className="text-void"
                  strokeWidth={1.9}
                />
              </motion.div>

              <motion.div
                initial={
                  reduceMotion
                    ? false
                    : {
                        opacity: 0,
                        y: 5,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.22,

                  delay:
                    reduceMotion
                      ? 0
                      : 0.08,
                }}
                className="mt-5 text-center"
              >
                <h1 className="text-gradient font-display text-2xl font-semibold tracking-tight">
                  Vault
                </h1>

                <p className="mt-1 text-xs text-ink-muted">
                  Sua vida organizada e protegida
                </p>
              </motion.div>

              {!reduceMotion && (
                <motion.div
                  className="mt-5 h-0.5 w-16 overflow-hidden rounded-full bg-surface-raised"
                  aria-hidden="true"
                >
                  <motion.div
                    className="h-full rounded-full bg-ice"
                    initial={{
                      x: "-100%",
                    }}
                    animate={{
                      x: "100%",
                    }}
                    transition={{
                      duration: 0.55,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
