// app/(app)/layout.tsx
"use client";

import {
  Suspense,
  useEffect,
} from "react";

import {
  usePathname,
} from "next/navigation";

import type {
  Viewport,
} from "next";

import {
  Space_Grotesk,
  Inter,
  IBM_Plex_Mono,
} from "next/font/google";

import "./globals.css";

import {
  Providers,
} from "@/components/Providers";

import {
  SplashScreen,
} from "@/components/SplashScreen";

import {
  BiometricLock,
} from "@/components/BiometricLock";

import {
  ErrorBoundary,
} from "@/components/ErrorBoundary";

import {
  ThemeProvider,
} from "@/components/ThemeProvider";

import {
  RouteProgress,
} from "@/components/loading/RouteProgress";

import {
  PersonProvider,
} from "@/contexts/PersonContext";

import {
  PersonSelector,
} from "@/components/PersonSelector";

import {
  SyncStatusIndicator,
} from "@/components/SyncStatusIndicator";

import {
  ToastProvider,
} from "@/components/ToastProvider";

const display =
  Space_Grotesk({
    subsets: [
      "latin",
    ],
    weight: [
      "500",
      "600",
      "700",
    ],
    variable:
      "--font-display",
  });

const body =
  Inter({
    subsets: [
      "latin",
    ],
    weight: [
      "400",
      "500",
      "600",
    ],
    variable:
      "--font-body",
  });

const mono =
  IBM_Plex_Mono({
    subsets: [
      "latin",
    ],
    weight: [
      "400",
      "500",
    ],
    variable:
      "--font-mono",
  });

export const viewport:
  Viewport = {
  themeColor:
    "#06090E",

  width:
    "device-width",

  initialScale:
    1,

  maximumScale:
    1,

  userScalable:
    false,
};

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const pathname =
    usePathname();

  const isAuthPage =
    pathname ===
      "/login" ||
    pathname ===
      "/auth/callback";

  // ==========================================================
  // ERUDA / MOBILE DEBUG
  // ==========================================================

  useEffect(
    () => {
      if (
        typeof window !==
          "undefined" &&
        !document.getElementById(
          "eruda-script"
        )
      ) {
        const script =
          document.createElement(
            "script"
          );

        script.id =
          "eruda-script";

        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/eruda/3.0.1/eruda.min.js";

        script.onload =
          () => {
            const erudaWindow =
              window as typeof window & {
                eruda?: {
                  init: () => void;
                };
              };

            erudaWindow.eruda?.init();
          };

        document.body.appendChild(
          script
        );
      }
    },
    []
  );

  // ==========================================================
  // CAPACITOR SAFE AREA REFLOW
  // ==========================================================

  useEffect(
    () => {
      const forceReflow =
        () => {
          void window.innerHeight;

          document.body.style.paddingTop =
            "0.1px";

          window.setTimeout(
            () => {
              document.body.style.paddingTop =
                "0px";
            },
            50
          );
        };

      forceReflow();
    },
    [
      pathname,
    ]
  );

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="manifest"
          href="/manifest.json"
        />

        <link
          rel="apple-touch-icon"
          href="/icon-192x192.png"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta
          name="theme-color"
          content="#06090E"
        />

        <meta
          name="msapplication-TileColor"
          content="#06090E"
        />

        <meta
          name="msapplication-TileImage"
          content="/icon-144x144.png"
        />
      </head>

      <body className="min-h-[100dvh] bg-void pb-safe font-body antialiased transition-colors duration-300">
        <Suspense
          fallback={
            null
          }
        >
          <RouteProgress />
        </Suspense>

        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="vault-theme"
          >
            {/*
             * ORDEM IMPORTANTE:
             *
             * ToastProvider precisa envolver PersonProvider
             * porque PersonProvider usa useToast().
             *
             * PersonProvider precisa envolver Providers
             * porque Providers usa useActivePersonId().
             */}
            <ToastProvider>
              <PersonProvider>
                <Providers>
                  <SplashScreen>
                    <BiometricLock>
                      {!isAuthPage && (
                        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 py-3 backdrop-blur-xl">
                          <div className="flex min-w-0 items-center gap-3">
                            <SyncStatusIndicator />
                          </div>

                          <Suspense
                            fallback={
                              <div className="h-8 w-8 animate-pulse rounded-full bg-surface-raised" />
                            }
                          >
                            <PersonSelector />
                          </Suspense>
                        </header>
                      )}

                      {
                        children
                      }
                    </BiometricLock>
                  </SplashScreen>
                </Providers>
              </PersonProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}